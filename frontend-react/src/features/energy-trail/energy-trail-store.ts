import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { formatPlannerDate } from "../life-pie/life-pie-store";

export interface EnergyTrailEntry {
  context: string;
  createdAt: string;
  date: string;
  energy: string;
  focus: string;
  id: string;
  updatedAt: string;
}

export interface EnergyTrailPattern {
  lowEnergyDays: number;
  lowEnergyPreviousEveningHours: number;
  otherPreviousEveningHours: number;
}

const JOURNAL_ENTRIES_KEY = "hivePlanner.journal.entries";
const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
const ENERGY_STATES = ["", "empty", "low", "okay", "good", "strong"] as const;
const FOCUS_STATES = ["", "foggy", "wavy", "steady", "clear"] as const;
const LOW_ENERGY_STATES = new Set(["empty", "low"]);
const MAX_TASK_HOURS = 24;
const MAX_TASK_TIMER_SECONDS = 8 * 60 * 60;
const EVENING_START_MINUTES = 18 * 60;
const LOOKBACK_DAYS = 14;
const TASK_TIME_PATTERN = /^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/;

function parseStoredJson(rawValue: string | undefined): unknown {
  if (rawValue === undefined) {
    return null;
  }
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function normalizedChoice(value: unknown, allowed: readonly string[]): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.includes(normalized) ? normalized : "";
}

function finiteClamped(value: unknown, maximum: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

function normalizedEntry(candidate: unknown): EnergyTrailEntry | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const date = typeof candidate.date === "string" ? candidate.date.trim() : "";
  if (!date) {
    return null;
  }
  const tracker = isRecord(candidate.tracker) ? candidate.tracker : {};
  const energy = normalizedChoice(tracker.energy, ENERGY_STATES);
  const focus = normalizedChoice(tracker.focus, FOCUS_STATES);
  const context = typeof tracker.context === "string" ? tracker.context.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const content = typeof candidate.content === "string" ? candidate.content : "";
  const durationMinutes = finiteClamped(candidate.durationMinutes, 1440);
  if (!(durationMinutes || title || content.trim() || energy || focus || context)) {
    return null;
  }
  const createdAt = typeof candidate.createdAt === "string" && candidate.createdAt
    ? candidate.createdAt
    : "";
  return {
    context,
    createdAt,
    date,
    energy,
    focus,
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `journal-${date}`,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt
      ? candidate.updatedAt
      : createdAt
  };
}

function compareEntriesNewestFirst(left: EnergyTrailEntry, right: EnergyTrailEntry): number {
  return right.date.localeCompare(left.date)
    || right.updatedAt.localeCompare(left.updatedAt)
    || right.createdAt.localeCompare(left.createdAt)
    || right.id.localeCompare(left.id);
}

function journalEntries(store: PlannerStore): EnergyTrailEntry[] {
  const parsed = parseStoredJson(store[JOURNAL_ENTRIES_KEY]);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map(normalizedEntry)
    .filter((entry): entry is EnergyTrailEntry => entry !== null)
    .sort(compareEntriesNewestFirst);
}

export function energyTrailEntries(store: PlannerStore): EnergyTrailEntry[] {
  return journalEntries(store)
    .filter((entry) => Boolean(entry.energy || entry.focus || entry.context))
    .slice(0, 7);
}

function parseDateKey(dateKey: string): Date | null {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  return parts.length === 3 && year && month && day
    ? new Date(year, month - 1, day)
    : null;
}

function dateWindow(endDateKey: string, days: number): string[] {
  const endDate = parseDateKey(endDateKey);
  if (endDate === null) {
    return [];
  }
  return Array.from({ length: days }, (_, index) => {
    const offset = index - days + 1;
    return formatPlannerDate(new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + offset
    ));
  });
}

function previousDateKey(dateKey: string): string {
  return dateWindow(dateKey, 2)[0] ?? "";
}

function taskStartMinutes(label: string): number | null {
  const match = TASK_TIME_PATTERN.exec(label.trim());
  if (match === null) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  return hours <= 23 && minutes <= 59 ? (hours * 60) + minutes : null;
}

function effectiveTaskHours(task: Readonly<Record<string, unknown>>): number {
  const timerSeconds = finiteClamped(task.timerSeconds, MAX_TASK_TIMER_SECONDS);
  if (timerSeconds > 0) {
    return Math.round((timerSeconds / 3600) * 100) / 100;
  }
  return finiteClamped(task.hours, MAX_TASK_HOURS);
}

function eveningHours(rawValue: string | undefined): number {
  const parsed = parseStoredJson(rawValue);
  if (!Array.isArray(parsed)) {
    return 0;
  }
  const total = parsed.reduce<number>((sum, candidate) => {
    if (!isRecord(candidate) || typeof candidate.label !== "string" || !candidate.label.trim()) {
      return sum;
    }
    const startMinutes = taskStartMinutes(candidate.label);
    return startMinutes !== null && startMinutes >= EVENING_START_MINUTES
      ? sum + effectiveTaskHours(candidate)
      : sum;
  }, 0);
  return Math.round(total * 100) / 100;
}

function average(values: readonly number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function energyTrailPattern(store: PlannerStore, today: Date): EnergyTrailPattern {
  const todayKey = formatPlannerDate(today);
  const windowDates = new Set(dateWindow(todayKey, LOOKBACK_DAYS));
  const summaryDates = new Set([...windowDates].filter((dateKey) => dateKey !== todayKey));
  const lowEveningHours: number[] = [];
  const otherEveningHours: number[] = [];

  journalEntries(store).forEach((entry) => {
    const previousDate = previousDateKey(entry.date);
    const taskKey = `${DAILY_TASKS_PREFIX}${previousDate}`;
    if (!entry.energy || !windowDates.has(entry.date) || !summaryDates.has(previousDate)
      || store[taskKey] === undefined) {
      return;
    }
    const target = LOW_ENERGY_STATES.has(entry.energy) ? lowEveningHours : otherEveningHours;
    target.push(eveningHours(store[taskKey]));
  });

  return {
    lowEnergyDays: lowEveningHours.length,
    lowEnergyPreviousEveningHours: Math.round(average(lowEveningHours) * 100) / 100,
    otherPreviousEveningHours: Math.round(average(otherEveningHours) * 100) / 100
  };
}
