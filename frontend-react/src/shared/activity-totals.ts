import type { PlannerStore } from "../api/planner-store";
import { isRecord } from "./is-record";
import { normalizeActivityId, type TrackedActivityId } from "./activity-categories";
import { addDays, dateKeyFromValue, toDateKey } from "./planner-date";

// The activity-hour totals engine: it reads tasks, physical logs, and Skate and
// Guitar sessions out of the store and sums hours per tracked activity over a
// period. Three surfaces share it — the Life Pie card, the Skate hero, and
// Planned vs actual — which is why it lives here and not under one of them.

export type ActivityPeriod = "day" | "week" | "month" | "all";

export type ActivityTotals = Record<TrackedActivityId, number>;

interface DateRange {
  end: string;
  start: string;
}

const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
const PHYSICAL_LOGS_KEY = "hivePlanner.physical.logs";
const SKATE_SESSIONS_KEY = "hivePlanner.skate.sessions";
const GUITAR_SESSIONS_KEY = "hivePlanner.guitar.sessions";
const MAX_TASK_HOURS = 24;
const MAX_TASK_TIMER_SECONDS = 8 * 60 * 60;

function emptyTotals(): ActivityTotals {
  return {
    transcendence: 0,
    mobileDevelopment: 0,
    portfolioJobPrep: 0,
    skate: 0,
    gym: 0,
    guitar: 0
  };
}

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

function storedArray(store: PlannerStore, key: string): unknown[] {
  const parsed = parseStoredJson(store[key]);
  return Array.isArray(parsed) ? parsed : [];
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value: unknown, maximum: number): number {
  return Math.min(maximum, Math.max(0, finiteNumber(value)));
}

function rangeForPeriod(period: ActivityPeriod, today: Date): DateRange | null {
  if (period === "all") {
    return null;
  }
  if (period === "day") {
    const dateKey = toDateKey(today);
    return { start: dateKey, end: dateKey };
  }
  if (period === "month") {
    return {
      start: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    };
  }

  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(today, mondayOffset);
  return { start: toDateKey(start), end: toDateKey(addDays(start, 6)) };
}

function normalizedDateKey(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return toDateKey(date);
}

function isInRange(dateKey: string, range: DateRange | null): boolean {
  if (range === null) {
    return true;
  }
  const normalized = normalizedDateKey(dateKey);
  return normalized >= range.start && normalized <= range.end;
}

function taskActivity(task: Readonly<Record<string, unknown>>): TrackedActivityId | "other" {
  const requested = [task.activity, task.track].find(Boolean);
  return normalizeActivityId(requested);
}

function timerStartedAt(value: unknown): number | null {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hoursFromSeconds(seconds: number): number {
  return Math.round((clamp(seconds, MAX_TASK_TIMER_SECONDS) / 3600) * 100) / 100;
}

function taskHours(
  task: Readonly<Record<string, unknown>>,
  dateKey: string,
  todayKey: string,
  nowMs: number
): number {
  const manualHours = clamp(task.hours, MAX_TASK_HOURS);
  const savedSeconds = clamp(task.timerSeconds, MAX_TASK_TIMER_SECONDS);
  const startedAt = timerStartedAt(task.timerStartedAt);

  if (dateKey !== todayKey) {
    return savedSeconds > 0 ? hoursFromSeconds(savedSeconds) : manualHours;
  }
  if (startedAt === null && savedSeconds <= 0) {
    return manualHours;
  }

  const elapsedSeconds = startedAt === null ? 0 : Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  return hoursFromSeconds(savedSeconds + elapsedSeconds);
}

function addTaskTotals(
  totals: ActivityTotals,
  store: PlannerStore,
  range: DateRange | null,
  todayKey: string,
  nowMs: number
): void {
  Object.entries(store).forEach(([key, rawValue]) => {
    if (!key.startsWith(DAILY_TASKS_PREFIX)) {
      return;
    }
    const dateKey = key.slice(DAILY_TASKS_PREFIX.length);
    if (!isInRange(dateKey, range)) {
      return;
    }
    const parsed = parseStoredJson(rawValue);
    if (!Array.isArray(parsed)) {
      return;
    }
    parsed.forEach((candidate) => {
      if (!isRecord(candidate) || typeof candidate.label !== "string" || !candidate.label.trim()) {
        return;
      }
      const activityId = taskActivity(candidate);
      if (activityId !== "other") {
        totals[activityId] += taskHours(candidate, dateKey, todayKey, nowMs);
      }
    });
  });
}

function physicalActivity(name: string): "skate" | "gym" | null {
  const normalized = name.toLowerCase();
  if (normalized.includes("skate")) {
    return "skate";
  }
  return normalized.includes("rest") ? null : "gym";
}

function addPhysicalLogs(
  totals: ActivityTotals,
  store: PlannerStore,
  range: DateRange | null
): void {
  storedArray(store, PHYSICAL_LOGS_KEY).forEach((candidate) => {
    if (!isRecord(candidate) || typeof candidate.date !== "string" || !candidate.date
      || typeof candidate.name !== "string" || !candidate.name) {
      return;
    }
    const dateKey = candidate.date;
    if (!isInRange(dateKey, range)) {
      return;
    }
    const status = typeof candidate.status === "string"
      && ["done", "modified", "skipped"].includes(candidate.status)
      ? candidate.status
      : "done";
    if (status !== "done" && status !== "modified") {
      return;
    }
    const activityId = physicalActivity(candidate.name);
    if (activityId !== null) {
      totals[activityId] += Math.max(0, finiteNumber(candidate.minutes)) / 60;
    }
  });
}


function sessionHours(sessions: readonly unknown[], range: DateRange | null): number {
  return sessions.reduce<number>((sum, candidate) => {
    if (!isRecord(candidate) || candidate.trackedInTask || !candidate.finishedAt) {
      return sum;
    }
    const dateKey = typeof candidate.dateKey === "string" && candidate.dateKey
      ? candidate.dateKey
      : dateKeyFromValue(candidate.finishedAt);
    const hours = finiteNumber(candidate.durationHours);
    return dateKey && isInRange(dateKey, range) ? sum + Math.max(0, hours) : sum;
  }, 0);
}

function addSessions(
  totals: ActivityTotals,
  store: PlannerStore,
  range: DateRange | null
): void {
  totals.skate += sessionHours(storedArray(store, SKATE_SESSIONS_KEY), range);
  totals.guitar += sessionHours(storedArray(store, GUITAR_SESSIONS_KEY), range);
}

export function activityTotalsForPeriod(
  store: PlannerStore,
  period: ActivityPeriod,
  today: Date,
  nowMs: number
): ActivityTotals {
  const totals = emptyTotals();
  const range = rangeForPeriod(period, today);
  addTaskTotals(totals, store, range, toDateKey(today), nowMs);
  addPhysicalLogs(totals, store, range);
  addSessions(totals, store, range);
  return totals;
}
