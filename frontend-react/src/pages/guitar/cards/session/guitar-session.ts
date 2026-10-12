import type { PlannerStore } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { GUITAR_FOCUS_STORAGE_KEY, GUITAR_NEXT_STEP_STORAGE_KEY } from "../goal/guitar-goal";
import { addDays, humanDate, toDateKey } from "@/shared/planner-date";

export const GUITAR_SESSIONS_STORAGE_KEY = "hivePlanner.guitar.sessions";
export const GUITAR_TARGET_STORAGE_KEY = "hivePlanner.guitar.weeklyTarget";

export interface GuitarHistoryItem {
  date: string;
  minutes: number;
  note: string;
  title: string;
}

export interface GuitarSessionDialogRequest {
  durationMinutes: number;
  revision: number;
}

export interface GuitarSummaryItem {
  label: string;
  value: string;
}

export interface GuitarSessionModel {
  finishDisabled: boolean;
  history: GuitarHistoryItem[];
  hint: string;
  plan: string;
  startDisabled: boolean;
  status: string;
  summary: GuitarSummaryItem[];
}


function parsedArray(rawValue: string | undefined): unknown[] {
  try {
    const parsed: unknown = rawValue === undefined ? [] : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function displaySessions(rawValue: string | undefined): Record<string, unknown>[] {
  return parsedArray(rawValue).filter(isRecord);
}


function weekRange(today: Date): { end: string; start: string } {
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const start = addDays(today, mondayOffset);
  return { start: toDateKey(start), end: toDateKey(addDays(start, 6)) };
}

function normalizedDateKey(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const [year = 0, month = 0, day = 0] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? toDateKey(date) : "";
}

function durationMinutes(session: Readonly<Record<string, unknown>>): number {
  return Math.round((Number(session.durationHours) || 0) * 60);
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Guitar parses a session key with zero defaults, so a partial key rolls back
// instead of clamping to the first of the month. Only the label is shared.
function humanGuitarDate(dateKey: string): string {
  const [year = 0, month = 0, day = 0] = dateKey.split("-").map(Number);
  return humanDate(new Date(year, month - 1, day));
}

function recentHistory(sessions: readonly Record<string, unknown>[]): GuitarHistoryItem[] {
  return [...sessions]
    .sort((left, right) => textValue(right.finishedAt).localeCompare(textValue(left.finishedAt)))
    .filter((session) => Boolean(normalizedDateKey(session.finishedAt)))
    .slice(0, 4)
    .map((session) => {
      const focus = textValue(session.focus);
      const nextStep = textValue(session.nextStep);
      return {
        date: humanGuitarDate(normalizedDateKey(session.finishedAt)),
        minutes: durationMinutes(session),
        note: textValue(session.note) || focus || nextStep || "Saved session",
        title: [focus, nextStep].filter(Boolean).join(" · ")
      };
    });
}

function timerLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function elapsedGuitarSessionSeconds(startedAt: string, nowMs: number): number {
  const startedMs = Date.parse(startedAt);
  return Number.isFinite(startedMs) ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;
}

export function guitarSessionDurationMinutes(startedAt: string, nowMs: number): number {
  return Math.max(1, Math.round(elapsedGuitarSessionSeconds(startedAt, nowMs) / 60));
}

function weeklyTarget(rawValue: string | undefined): number {
  return Math.max(1, Number(rawValue ?? "4") || 4);
}

function sessionPlan(
  startedAt: string | null,
  focus: string,
  nextStep: string,
  weekCount: number,
  weekMinutes: number,
  target: number
): string {
  if (startedAt !== null) {
    return `Session is live. Stay with ${focus || "the thing you came here to practise"} and save the real result after.`;
  }
  const remainingSessions = Math.max(0, target - weekCount);
  if (remainingSessions <= 0) {
    return "Weekly target reached. Keep the good part going."
      + (focus ? ` Current focus: ${focus}.` : "")
      + (nextStep ? ` Small practice: ${nextStep}.` : "");
  }
  const targetMinutes = target * 30;
  const remainingMinutes = Math.max(0, targetMinutes - weekMinutes);
  return `This week: ${weekMinutes} / ${targetMinutes} min. ${remainingSessions} more session${remainingSessions === 1 ? "" : "s"} and about ${remainingMinutes} min to hit the target.`
    + (nextStep ? ` Practice next: ${nextStep}.` : "")
    + (focus ? ` Current focus: ${focus}.` : "");
}

export function buildGuitarSessionModel(
  store: PlannerStore,
  today: Date,
  startedAt: string | null,
  nowMs: number,
  hintOverride: string | null = null
): GuitarSessionModel {
  const sessions = displaySessions(store[GUITAR_SESSIONS_STORAGE_KEY]);
  const range = weekRange(today);
  const weekSessions = sessions.filter((session) => {
    const dateKey = normalizedDateKey(session.finishedAt);
    return dateKey >= range.start && dateKey <= range.end;
  });
  const target = weeklyTarget(store[GUITAR_TARGET_STORAGE_KEY]);
  const weekCount = weekSessions.length;
  const weekMinutes = weekSessions.reduce((sum, session) => sum + durationMinutes(session), 0);
  const averageMinutes = weekCount ? Math.round(weekMinutes / weekCount) : 0;
  const focus = store[GUITAR_FOCUS_STORAGE_KEY] ?? "";
  const nextStep = store[GUITAR_NEXT_STEP_STORAGE_KEY] ?? "";
  const running = startedAt !== null;

  return {
    finishDisabled: !running,
    history: recentHistory(sessions),
    hint: hintOverride ?? (running
      ? "Finish when you stop. If a Guitar task exists today, the time can land there."
      : "If a Guitar task is on today’s dashboard, the finished time can land there too."),
    plan: sessionPlan(startedAt, focus, nextStep, weekCount, weekMinutes, target),
    startDisabled: running,
    status: running
      ? `Guitar session running · ${timerLabel(elapsedGuitarSessionSeconds(startedAt, nowMs))}`
      : "No active Guitar session.",
    summary: [
      { label: "This week", value: `${weekCount} / ${target}` },
      { label: "Weekly target", value: String(target) },
      { label: "Minutes played", value: `${weekMinutes} min` },
      { label: "Average session", value: averageMinutes ? `${averageMinutes} min` : "Not yet" }
    ]
  };
}

export function storedGuitarSessions(rawValue: string | undefined): unknown[] {
  return parsedArray(rawValue).map((session) => session);
}
