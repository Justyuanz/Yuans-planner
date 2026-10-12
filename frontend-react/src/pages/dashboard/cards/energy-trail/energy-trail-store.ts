import type { PlannerStore } from "../../../../api/planner-store";
import { isRecord } from "../../../../shared/is-record";
import { journalEntries } from "../../../../shared/journal-entry-store";
import { toDateKey } from "../../../../shared/planner-date";
import { leadingTimeMinutes } from "../../../../shared/planner-time";

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

const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
const LOW_ENERGY_STATES = new Set(["empty", "low"]);
const MAX_TASK_HOURS = 24;
const MAX_TASK_TIMER_SECONDS = 8 * 60 * 60;
const EVENING_START_MINUTES = 18 * 60;
const LOOKBACK_DAYS = 14;

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

function finiteClamped(value: unknown, maximum: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

export function energyTrailEntries(store: PlannerStore): EnergyTrailEntry[] {
  return journalEntries(store)
    .filter((entry) => Boolean(
      entry.tracker.energy || entry.tracker.focus || entry.tracker.context
    ))
    .map((entry) => ({
      context: entry.tracker.context,
      createdAt: entry.createdAt,
      date: entry.date,
      energy: entry.tracker.energy,
      focus: entry.tracker.focus,
      id: entry.id,
      updatedAt: entry.updatedAt
    }))
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
    return toDateKey(new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + offset
    ));
  });
}

function previousDateKey(dateKey: string): string {
  return dateWindow(dateKey, 2)[0] ?? "";
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
    const startMinutes = leadingTimeMinutes(candidate.label);
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
  const todayKey = toDateKey(today);
  const windowDates = new Set(dateWindow(todayKey, LOOKBACK_DAYS));
  const summaryDates = new Set([...windowDates].filter((dateKey) => dateKey !== todayKey));
  const lowEveningHours: number[] = [];
  const otherEveningHours: number[] = [];

  journalEntries(store).forEach((entry) => {
    const previousDate = previousDateKey(entry.date);
    const taskKey = `${DAILY_TASKS_PREFIX}${previousDate}`;
    if (!entry.tracker.energy || !windowDates.has(entry.date) || !summaryDates.has(previousDate)
      || store[taskKey] === undefined) {
      return;
    }
    const target = LOW_ENERGY_STATES.has(entry.tracker.energy) ? lowEveningHours : otherEveningHours;
    target.push(eveningHours(store[taskKey]));
  });

  return {
    lowEnergyDays: lowEveningHours.length,
    lowEnergyPreviousEveningHours: Math.round(average(lowEveningHours) * 100) / 100,
    otherPreviousEveningHours: Math.round(average(otherEveningHours) * 100) / 100
  };
}
