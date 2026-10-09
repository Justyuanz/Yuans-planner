import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { formatPlannerDate, lifePieTotalsForPeriod } from "../life-pie/life-pie-store";
import {
  isSkateIntensity,
  SKATE_INTENSITY_META,
  type SkateIntensity
} from "./skate-intensity";
import { SKATE_PROGRAM } from "./skate-program-data";
import { SKATE_SESSIONS_STORAGE_KEY } from "./skate-roadmap";
import {
  decodeSkateSettings,
  SKATE_SETTINGS_STORAGE_KEY,
  type SkateHeroSettingsAction,
  type SkateSettings
} from "./skate-settings";

const SKATE_SEASON_START = new Date(2026, 7, 29);
const SKATE_TOTAL_WEEKS = 21;
const DAY_MS = 86_400_000;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

export interface SkateHeroState {
  attemptBudget: string;
  benchmarkLabel: string;
  benchmarkVisible: boolean;
  blockLabel: string;
  boardHours: string;
  currentDay: string;
  dayCount: string;
  extraRestDay: string;
  finishDisabled: boolean;
  flowFocus: string;
  heroSubtitle: string;
  intensity: SkateIntensity;
  intensityDescription: string;
  intensityEffort: string;
  mainFocus: string;
  phaseBadge: string;
  restDay: string;
  sessionDaysCount: string;
  sessionHint: string;
  skateiqBlock: string;
  settingsNote: string;
  startDisabled: boolean;
  weekCount: string;
}

export type SkateHeroAction = SkateHeroSettingsAction
  | { action: "finish-session" }
  | { action: "log-session" }
  | { action: "start-session" };

type SkateProgramDay = typeof SKATE_PROGRAM.days[number];

function localDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function seasonDayNumber(date: Date): number {
  return Math.round((localDay(date).getTime() - SKATE_SEASON_START.getTime()) / DAY_MS) + 1;
}

function seasonWeekNumber(dayNumber: number): number {
  if (dayNumber <= 0) return 1;
  return Math.max(1, Math.min(SKATE_TOTAL_WEEKS, Math.floor((dayNumber - 1) / 7) + 1));
}

function selectedPlan(settings: SkateSettings, beforeSeason: boolean): SkateProgramDay {
  const dayNumber = beforeSeason ? 1 : settings.currentProgramDay;
  return SKATE_PROGRAM.days.find((day) => day.dayNumber === dayNumber) ?? SKATE_PROGRAM.days[0];
}

function restDaysLabel(settings: SkateSettings): string {
  const names = [WEEKDAYS[settings.restDayOfWeek]];
  if (settings.extraRestDayOfWeek !== null) {
    names.push(WEEKDAYS[settings.extraRestDayOfWeek]);
  }
  return names.join(" and ");
}

function storedArray(rawValue: string | undefined): unknown[] {
  try {
    const value: unknown = rawValue === undefined ? [] : JSON.parse(rawValue);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function sessionDateKey(session: Readonly<Record<string, unknown>>): string {
  if (typeof session.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(session.dateKey)) {
    const [year = 0, month = 0, day = 0] = session.dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (formatPlannerDate(date) === session.dateKey) return session.dateKey;
  }
  const date = typeof session.finishedAt === "string" ? new Date(session.finishedAt) : null;
  return date !== null && Number.isFinite(date.getTime()) ? formatPlannerDate(date) : "";
}

function weekRange(date: Date): { end: string; start: string } {
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { end: formatPlannerDate(end), start: formatPlannerDate(start) };
}

function sessionDaysThisWeek(store: PlannerStore, today: Date, beforeSeason: boolean): number {
  if (beforeSeason) return 0;
  const range = weekRange(today);
  const days = new Set<string>();
  storedArray(store[SKATE_SESSIONS_STORAGE_KEY]).forEach((candidate) => {
    if (!isRecord(candidate) || !candidate.finishedAt) return;
    const dateKey = sessionDateKey(candidate);
    if (dateKey >= range.start && dateKey <= range.end) days.add(dateKey);
  });
  return days.size;
}

function formatSkateHours(value: number): string {
  if (!value) return "0h";
  if (value < 0.1) return `${Math.max(1, Math.round(value * 60))}m`;
  return `${Math.round(value * 10) / 10}h`;
}

function heroSubtitle(
  plan: SkateProgramDay,
  settings: SkateSettings,
  referenceDate: Date,
  beforeSeason: boolean
): string {
  if (beforeSeason) return "Previewing Day 1 for Saturday, August 29, 2026.";
  const restLabel = restDaysLabel(settings);
  const isRestDay = settings.restDayOfWeek === referenceDate.getDay()
    || settings.extraRestDayOfWeek === referenceDate.getDay();
  return isRestDay
    ? `${restLabel} is your off-board day. SkateIQ stays on Day ${plan.dayNumber} until you change it.`
    : `${plan.summary} Rest days this week: ${restLabel}.`;
}

function settingsNote(
  plan: SkateProgramDay,
  settings: SkateSettings,
  referenceDate: Date,
  beforeSeason: boolean
): string {
  const restLabel = restDaysLabel(settings);
  const isRestDay = !beforeSeason && (settings.restDayOfWeek === referenceDate.getDay()
    || settings.extraRestDayOfWeek === referenceDate.getDay());
  return isRestDay
    ? `${restLabel} is off. The plan will stay on Day ${plan.dayNumber} until you move it.`
    : `Rest days: ${restLabel}. SkateIQ only moves when you change the day here.`;
}

export function buildSkateHeroState(
  store: PlannerStore,
  referenceDate: Date,
  nowMs: number = Date.now()
): SkateHeroState {
  const settings = decodeSkateSettings(store[SKATE_SETTINGS_STORAGE_KEY]);
  const seasonDay = seasonDayNumber(referenceDate);
  const beforeSeason = seasonDay <= 0;
  const plan = selectedPlan(settings, beforeSeason);
  const dateKey = formatPlannerDate(referenceDate);
  const savedIntensity = settings.intensityByDate[dateKey];
  const intensity = isSkateIntensity(savedIntensity) ? savedIntensity : plan.intensity;
  const intensityMeta = SKATE_INTENSITY_META[intensity];
  const sessionDays = sessionDaysThisWeek(store, referenceDate, beforeSeason);
  const availableDays = settings.extraRestDayOfWeek === null ? 6 : 5;
  const boardHours = lifePieTotalsForPeriod(store, "week", referenceDate, nowMs).skate;

  return {
    attemptBudget: intensityMeta.attempts,
    benchmarkLabel: plan.benchmarkLabel || "Benchmark",
    benchmarkVisible: plan.benchmark,
    blockLabel: `Day ${plan.dayNumber}`,
    boardHours: formatSkateHours(boardHours),
    currentDay: String(settings.currentProgramDay),
    dayCount: beforeSeason ? "Starts Aug 29" : `${settings.currentProgramDay} / 60`,
    extraRestDay: settings.extraRestDayOfWeek === null ? "" : String(settings.extraRestDayOfWeek),
    finishDisabled: true,
    flowFocus: plan.flow,
    heroSubtitle: heroSubtitle(plan, settings, referenceDate, beforeSeason),
    intensity,
    intensityDescription: `${intensityMeta.tone} · ${intensityMeta.description}`,
    intensityEffort: intensityMeta.effort,
    mainFocus: plan.mainFocus,
    phaseBadge: `${plan.phase} · Week ${plan.weekNumber}`,
    restDay: String(settings.restDayOfWeek),
    sessionDaysCount: `${sessionDays} / ${availableDays}`,
    sessionHint: "Hit start when the session begins. Or use \"Log past session\" / the roadmap if you forgot to save yesterday.",
    skateiqBlock: plan.skateiq,
    settingsNote: settingsNote(plan, settings, referenceDate, beforeSeason),
    startDisabled: false,
    weekCount: `${seasonWeekNumber(seasonDay)} / ${SKATE_TOTAL_WEEKS}`
  };
}
