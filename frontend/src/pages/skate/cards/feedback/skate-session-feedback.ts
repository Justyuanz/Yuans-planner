import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { isSkateIntensity, normalizeSkateIntensity, type SkateIntensity } from "@/pages/skate/skate-intensity";
import { SKATE_SESSIONS_STORAGE_KEY } from "../roadmap/skate-roadmap";
import { linkSkateSessionToTodayTask } from "@/pages/skate/skate-session-task-sync";
import {
  decodeSkateCoachTemplate,
  type SkateCoachTemplate,
  type SkateWarmupItem
} from "@/pages/skate/skate-session-template";
import {
  SKATE_CURRENT_SESSION_STORAGE_KEY,
  SKATE_SETTINGS_STORAGE_KEY
} from "@/pages/skate/skate-settings";
import { strictDateKey } from "@/shared/planner-date";

export const SKATE_COACH_TEMPLATE_STORAGE_KEY = "hivePlanner.skate.coachTemplate";
export { SKATE_CURRENT_SESSION_STORAGE_KEY, SKATE_SETTINGS_STORAGE_KEY } from "@/pages/skate/skate-settings";

interface FocusCardState {
  goals: [boolean, boolean, boolean];
  note: string;
  status: "not-started" | "learning" | "almost-there" | "consistent";
}

interface CurrentSkateSession {
  expandedStage: "warmup" | "focus" | "skill" | "";
  focusCards: {
    flat: FocusCardState;
    transition: FocusCardState;
  };
  focusDone: boolean;
  plannedIntensity: SkateIntensity;
  selectedFlat: string;
  selectedTransition: string;
  skillChecks: boolean[];
  skillDone: boolean;
  warmupChecks: Record<string, boolean>;
  warmupDone: boolean;
}

export interface SkateFeedbackValue {
  confidence: number;
  dateKey: string;
  durationMinutes: number;
  improvedNote: string;
  intensity: unknown;
  nextFocusNote: string;
  progressToday: number;
}

export interface SkateFeedbackRequest {
  dateKey: string;
  durationMinutes: number;
  hint: string;
  intensity: SkateIntensity;
  revision: number;
}

export interface SkateSessionHeroSnapshot {
  attemptBudget: string;
  benchmarkLabel: string;
  benchmarkVisible: boolean;
  blockLabel: string;
  flowFocus: string;
  mainFocus: string;
}

interface SkateSessionSaveOptions {
  hero: SkateSessionHeroSnapshot;
  nowIso: string;
  sessionId: string;
  sessionStartedAt: string | null;
  todayKey: string;
}

export interface SkateSessionSaveResult {
  linkedTaskLabel: string | null;
  message: string;
  savedSession: Record<string, unknown>;
  writes: PlannerStoreWrite[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const FOCUS_STATUSES = ["not-started", "learning", "almost-there", "consistent"] as const;

function parsedValue(rawValue: string | undefined): unknown {
  try {
    return rawValue === undefined ? null : JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function storedRecord(rawValue: string | undefined): Record<string, unknown> {
  const value = parsedValue(rawValue);
  return isRecord(value) ? { ...value } : {};
}

function storedArray(rawValue: string | undefined): unknown[] {
  const value = parsedValue(rawValue);
  return Array.isArray(value) ? value.map((entry: unknown) => entry) : [];
}


function localDateKey(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function sessionDateKey(value: unknown): string {
  if (!isRecord(value)) return "";
  const explicit = strictDateKey(value.dateKey);
  if (explicit) return explicit;
  const finishedAt = typeof value.finishedAt === "string" ? new Date(value.finishedAt) : null;
  return finishedAt !== null && Number.isFinite(finishedAt.getTime()) ? localDateKey(finishedAt) : "";
}

export function feedbackIntensityForDate(
  store: PlannerStore,
  dateKey: string,
  todayKey: string,
  todayIntensity: unknown
): SkateIntensity {
  const safeDateKey = strictDateKey(dateKey);
  const settings = storedRecord(store[SKATE_SETTINGS_STORAGE_KEY]);
  const intensityByDate = isRecord(settings.intensityByDate) ? settings.intensityByDate : {};
  const savedIntensity = intensityByDate[safeDateKey];
  if (isSkateIntensity(savedIntensity)) return savedIntensity;
  const sessions = storedArray(store[SKATE_SESSIONS_STORAGE_KEY]);
  const latest = sessions.filter((session) => sessionDateKey(session) === safeDateKey).at(-1);
  if (isRecord(latest) && isSkateIntensity(latest.intensity)) return latest.intensity;
  return safeDateKey === todayKey ? normalizeSkateIntensity(todayIntensity) : "yellow";
}

function scaleValue(value: unknown): number {
  const number = Number(value) || 3;
  return Math.max(1, Math.min(5, number));
}

function durationMinutes(value: unknown, fallback = 45): number {
  return Math.max(1, Number(value) || fallback);
}

function focusCard(value: unknown): FocusCardState {
  const card = isRecord(value) ? value : {};
  const status = FOCUS_STATUSES.find((candidate) => candidate === card.status) ?? "not-started";
  const goals = Array.isArray(card.goals) ? card.goals : [];
  return {
    status,
    goals: [Boolean(goals[0]), Boolean(goals[1]), Boolean(goals[2])],
    note: typeof card.note === "string" ? card.note : ""
  };
}

function flatWarmups(template: SkateCoachTemplate): SkateWarmupItem[] {
  return template.warmupGroups.flatMap((group) => group.items);
}

function defaultCurrentSession(template: SkateCoachTemplate): CurrentSkateSession {
  return {
    warmupChecks: Object.fromEntries(flatWarmups(template).map((item) => [item.id, false])),
    warmupDone: false,
    selectedFlat: template.focusSuggestions.flat[0] ?? "",
    selectedTransition: template.focusSuggestions.transition[0] ?? "",
    focusCards: { flat: focusCard(null), transition: focusCard(null) },
    focusDone: false,
    skillChecks: template.skillBuilder.switchItems.map(() => false),
    skillDone: false,
    plannedIntensity: "yellow",
    expandedStage: "warmup"
  };
}

function currentSession(rawValue: string | undefined, template: SkateCoachTemplate): CurrentSkateSession {
  const value = storedRecord(rawValue);
  const warmupChecks = isRecord(value.warmupChecks) ? value.warmupChecks : {};
  const rawFocusCards = isRecord(value.focusCards) ? value.focusCards : {};
  const skillChecks = Array.isArray(value.skillChecks) ? value.skillChecks : [];
  const expanded = ["warmup", "focus", "skill", ""].find((stage) => stage === value.expandedStage);
  return {
    warmupChecks: Object.fromEntries(flatWarmups(template).map((item) => [
      item.id,
      Boolean(warmupChecks[item.id])
    ])),
    warmupDone: Boolean(value.warmupDone),
    selectedFlat: typeof value.selectedFlat === "string" && value.selectedFlat.trim()
      ? value.selectedFlat.trim() : template.focusSuggestions.flat[0] ?? "",
    selectedTransition: typeof value.selectedTransition === "string" && value.selectedTransition.trim()
      ? value.selectedTransition.trim() : template.focusSuggestions.transition[0] ?? "",
    focusCards: {
      flat: focusCard(rawFocusCards.flat),
      transition: focusCard(rawFocusCards.transition)
    },
    focusDone: Boolean(value.focusDone),
    skillChecks: template.skillBuilder.switchItems.map((_, index) => Boolean(skillChecks[index])),
    skillDone: Boolean(value.skillDone),
    plannedIntensity: normalizeSkateIntensity(value.plannedIntensity),
    expandedStage: (expanded ?? "warmup") as CurrentSkateSession["expandedStage"]
  };
}

function datedSessionWindow(dateKey: string, minutes: number): { finishedAt: string; startedAt: string } {
  const [year = 0, month = 0, day = 0] = dateKey.split("-").map(Number);
  const finishMs = Date.UTC(year, month - 1, day, 12);
  return {
    startedAt: new Date(finishMs - minutes * 60_000).toISOString(),
    finishedAt: new Date(finishMs).toISOString()
  };
}

export function humanSkateDate(dateKey: string): string {
  const [year = 0, month = 0, day = 0] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function settingsWithIntensity(rawValue: string | undefined, dateKey: string, intensity: SkateIntensity) {
  const settings = storedRecord(rawValue);
  const intensityByDate = isRecord(settings.intensityByDate) ? settings.intensityByDate : {};
  return {
    ...settings,
    intensityByDate: { ...intensityByDate, [dateKey]: intensity }
  };
}

function savedSession(
  session: CurrentSkateSession,
  template: SkateCoachTemplate,
  feedback: SkateFeedbackValue,
  options: SkateSessionSaveOptions,
  dateKey: string,
  intensity: SkateIntensity,
  minutes: number,
  linkedTaskLabel: string | null
): Record<string, unknown> {
  const currentWindow = options.sessionStartedAt && dateKey === options.todayKey
    ? { startedAt: options.sessionStartedAt, finishedAt: options.nowIso }
    : datedSessionWindow(dateKey, minutes);
  const warmups = flatWarmups(template);
  const improvedNote = feedback.improvedNote.trim();
  const nextFocusNote = feedback.nextFocusNote.trim();
  const progressToday = scaleValue(feedback.progressToday);
  return {
    id: options.sessionId,
    focus: [session.selectedFlat, session.selectedTransition].filter(Boolean).join(" · "),
    mainFocus: options.hero.mainFocus,
    flowFocus: options.hero.flowFocus,
    blockLabel: options.hero.blockLabel,
    warmups: warmups.filter((item) => session.warmupChecks[item.id]).map((item) => item.name).join(", "),
    warmupItems: template.warmupGroups,
    learningItems: [
      { kind: "flat", name: session.selectedFlat, ...session.focusCards.flat },
      { kind: "transition", name: session.selectedTransition, ...session.focusCards.transition }
    ],
    checked: warmups.map((item) => Boolean(session.warmupChecks[item.id])),
    note: [session.focusCards.flat.note, session.focusCards.transition.note].filter(Boolean).join(" | "),
    feedbackNote: [improvedNote, nextFocusNote].filter(Boolean).join(" | "),
    legSoreness: 3,
    skateQuality: progressToday,
    confidence: scaleValue(feedback.confidence),
    progressToday,
    intensity,
    attemptBudget: options.hero.attemptBudget,
    benchmarkDone: options.hero.benchmarkVisible,
    benchmarkLabel: options.hero.benchmarkLabel,
    improvedNote,
    nextFocusNote,
    sessionPlan: {
      selectedFlat: session.selectedFlat,
      selectedTransition: session.selectedTransition,
      focusCards: session.focusCards,
      skillChecks: session.skillChecks,
      plannedIntensity: intensity
    },
    durationHours: minutes / 60,
    trackedInTask: linkedTaskLabel !== null,
    dateKey,
    ...currentWindow
  };
}

export function buildSkateSessionSave(
  store: PlannerStore,
  feedback: SkateFeedbackValue,
  options: SkateSessionSaveOptions
): SkateSessionSaveResult {
  const template = decodeSkateCoachTemplate(store[SKATE_COACH_TEMPLATE_STORAGE_KEY]);
  const session = currentSession(store[SKATE_CURRENT_SESSION_STORAGE_KEY], template);
  const dateKey = strictDateKey(feedback.dateKey) || options.todayKey;
  const minutes = durationMinutes(feedback.durationMinutes);
  const intensity = normalizeSkateIntensity(feedback.intensity);
  const taskKey = `hivePlanner.dailyTasks.${options.todayKey}`;
  const taskResult = dateKey === options.todayKey
    ? linkSkateSessionToTodayTask(store[taskKey], minutes / 60, options.nowIso)
    : null;
  const linkedTaskLabel = taskResult?.label ?? null;
  const newSession = savedSession(
    session,
    template,
    feedback,
    options,
    dateKey,
    intensity,
    minutes,
    linkedTaskLabel
  );
  const sessions = storedArray(store[SKATE_SESSIONS_STORAGE_KEY]);
  sessions.push(newSession);
  const writes: PlannerStoreWrite[] = [];
  if (taskResult !== null) writes.push({ key: taskKey, value: JSON.stringify(taskResult.tasks) });
  writes.push(
    {
      key: SKATE_SETTINGS_STORAGE_KEY,
      value: JSON.stringify(settingsWithIntensity(store[SKATE_SETTINGS_STORAGE_KEY], dateKey, intensity))
    },
    { key: SKATE_CURRENT_SESSION_STORAGE_KEY, value: JSON.stringify(defaultCurrentSession(template)) },
    // The appended session is the completion marker, so persist its dependent writes first.
    { key: SKATE_SESSIONS_STORAGE_KEY, value: JSON.stringify(sessions) }
  );
  const message = linkedTaskLabel !== null
    ? `Session saved and added to "${linkedTaskLabel}".`
    : dateKey === options.todayKey
      ? "Session saved. No matching skate task was found today."
      : `Session saved for ${humanSkateDate(dateKey)}.`;
  return { linkedTaskLabel, message, savedSession: newSession, writes };
}
