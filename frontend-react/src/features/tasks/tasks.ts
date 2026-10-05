import type { PlannerStoreWrite } from "../../api/planner-store";
import { normalizeActivityId, type ActivityId } from "../activity-categories/activity-categories";
import { isRecord } from "../../shared/is-record";

export const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";
const MAX_TASK_TIMER_SECONDS = 8 * 60 * 60;
const TASK_LABEL_RENAMES: Readonly<Record<string, string>> = {
  "Leetcode morning": "Portfolio / Job Prep",
  "C++ one task": "Transcendence",
  "Python afternoon": "Mobile Development"
};

export interface PlannerTask {
  activity: ActivityId;
  createdAt: string;
  done: boolean;
  hours: number;
  id: string;
  label: string;
  reminderMinutes: number;
  reminderSentAt: string;
  reminderSentFor: string;
  scheduledTime: string;
  sourceEventId: string;
  timerSeconds: number;
  timerStartedAt: string | null;
  useSourceEventReminder: boolean;
}

export type TaskLogAction =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_done_changed"
  | "task_timer_started"
  | "task_timer_paused"
  | "task_timer_ended";

interface BuildTaskWritesInput {
  action: TaskLogAction;
  after: unknown;
  before: unknown;
  dateKey: string;
  existingLog: string | undefined;
  field: string;
  logId: string;
  taskId: string;
  tasks: readonly PlannerTask[];
  timestamp: string;
}

interface ActivityLogEntry {
  action: string;
  after: unknown;
  before: unknown;
  dateKey: string;
  entityId: string;
  entityType: string;
  field: string;
  id: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

function numberInRange(value: unknown, maximum: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

function normalizeClockValue(value: string): string {
  const text = value.trim().toLowerCase();
  const amPm = /^(\d{1,2})(?::(\d{2}))?\s*([ap])(?:\.?m\.?)?$/i.exec(text);
  const colon = /^(\d{1,2}):(\d{2})$/.exec(text);
  let hours: number;
  let minutes: number;
  if (amPm) {
    hours = Number(amPm[1]);
    minutes = Number(amPm[2] ?? 0);
    if (hours < 1 || hours > 12) return "";
    hours = hours === 12 ? 0 : hours;
    if (amPm[3]?.toLowerCase() === "p") hours += 12;
  } else if (colon) {
    hours = Number(colon[1]);
    minutes = Number(colon[2]);
  } else if (/^\d{1,2}$/.test(text)) {
    hours = Number(text);
    minutes = 0;
  } else if (/^\d{3,4}$/.test(text)) {
    hours = Number(text.slice(0, -2));
    minutes = Number(text.slice(-2));
  } else {
    return "";
  }
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeScheduledTime(value: unknown): string {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!text) return "";
  const parts = text.replace(/\s*[–—]\s*/g, "-").replace(/\s+to\s+/gi, "-")
    .split("-").map((part) => part.trim()).filter(Boolean);
  const start = normalizeClockValue(parts[0] ?? "");
  if (!start) return "";
  const end = parts.length > 1 ? normalizeClockValue(parts[1] ?? "") : "";
  return end ? `${start}-${end}` : start;
}

export function normalizeReminderMinutes(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
}

function normalizeTask(candidate: unknown, fallbackCreatedAt: string, index: number): PlannerTask | null {
  if (!isRecord(candidate) || typeof candidate.label !== "string" || !candidate.label.trim()) return null;
  const sourceEventId = typeof candidate.sourceEventId === "string" ? candidate.sourceEventId : "";
  const startedAt = typeof candidate.timerStartedAt === "string"
    && Number.isFinite(Date.parse(candidate.timerStartedAt)) ? candidate.timerStartedAt : null;
  const label = candidate.label.trim();
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `task-${index}`,
    label: TASK_LABEL_RENAMES[label] ?? label,
    activity: normalizeActivityId(candidate.activity ?? candidate.track),
    hours: numberInRange(candidate.hours, 24),
    timerSeconds: numberInRange(candidate.timerSeconds, MAX_TASK_TIMER_SECONDS),
    timerStartedAt: startedAt,
    done: Boolean(candidate.done),
    createdAt: typeof candidate.createdAt === "string" && candidate.createdAt
      ? candidate.createdAt : fallbackCreatedAt,
    sourceEventId,
    useSourceEventReminder: sourceEventId ? candidate.useSourceEventReminder !== false : false,
    scheduledTime: normalizeScheduledTime(candidate.scheduledTime),
    reminderMinutes: normalizeReminderMinutes(candidate.reminderMinutes),
    reminderSentAt: typeof candidate.reminderSentAt === "string" ? candidate.reminderSentAt : "",
    reminderSentFor: typeof candidate.reminderSentFor === "string" ? candidate.reminderSentFor : ""
  };
}

function scheduledMinutes(task: PlannerTask): number | null {
  const scheduled = task.scheduledTime.split("-")[0] ?? "";
  const match = /^(\d{2}):(\d{2})$/.exec(scheduled);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function decodeTasks(rawValue: string | undefined, fallbackCreatedAt: string): PlannerTask[] {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((candidate, index) => normalizeTask(candidate, fallbackCreatedAt, index))
      .filter((task): task is PlannerTask => task !== null)
      .sort((left, right) => {
        const leftTime = scheduledMinutes(left);
        const rightTime = scheduledMinutes(right);
        if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
        if (leftTime !== null && rightTime === null) return -1;
        if (leftTime === null && rightTime !== null) return 1;
        return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
      });
  } catch {
    return [];
  }
}

export function decodeHiddenTaskIds(rawValue: string | undefined, dateKey: string): string[] {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : {};
    if (!isRecord(parsed) || !isRecord(parsed.hiddenTaskIdsByDate)) return [];
    const ids = parsed.hiddenTaskIdsByDate[dateKey];
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string" && Boolean(id))
      : [];
  } catch {
    return [];
  }
}

export function elapsedTaskSeconds(task: PlannerTask, nowMs: number): number {
  const base = numberInRange(task.timerSeconds, MAX_TASK_TIMER_SECONDS);
  if (!task.timerStartedAt) return base;
  const startedMs = Date.parse(task.timerStartedAt);
  if (!Number.isFinite(startedMs)) return base;
  return numberInRange(base + Math.max(0, Math.floor((nowMs - startedMs) / 1000)), MAX_TASK_TIMER_SECONDS);
}

export function hoursFromSeconds(seconds: number): number {
  return Math.round((numberInRange(seconds, MAX_TASK_TIMER_SECONDS) / 3600) * 100) / 100;
}

export function displayTaskLabel(task: PlannerTask): string {
  if (!task.scheduledTime || /(?:^|\s)\d{1,2}(?::\d{2})?(?:\s*[ap]m)?(?:\s|$)/i.test(task.label)) {
    return task.label;
  }
  return `${task.scheduledTime} ${task.label}`;
}

function normalizeLogEntries(rawValue: string | undefined): ActivityLogEntry[] {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).filter((entry) =>
      typeof entry.action === "string" && typeof entry.timestamp === "string"
      && typeof entry.entityType === "string" && typeof entry.entityId === "string"
    ).map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      timestamp: String(entry.timestamp),
      action: String(entry.action),
      entityType: String(entry.entityType),
      entityId: String(entry.entityId),
      dateKey: typeof entry.dateKey === "string" ? entry.dateKey : "",
      field: typeof entry.field === "string" ? entry.field : "",
      before: entry.before,
      after: entry.after,
      meta: isRecord(entry.meta) ? { ...entry.meta } : {}
    }));
  } catch {
    return [];
  }
}

export function buildTaskWrites(input: BuildTaskWritesInput): PlannerStoreWrite[] {
  const task = input.tasks.find(({ id }) => id === input.taskId);
  const reference = task ?? (isRecord(input.before) ? input.before : null);
  const log = normalizeLogEntries(input.existingLog);
  log.push({
    id: input.logId,
    timestamp: input.timestamp,
    action: input.action,
    entityType: "task",
    entityId: input.taskId,
    dateKey: input.dateKey,
    field: input.field,
    before: input.before,
    after: input.after,
    meta: {
      activity: isRecord(reference) ? reference.activity : "other",
      label: isRecord(reference) ? reference.label : ""
    }
  });
  return [
    { key: `hivePlanner.dailyTasks.${input.dateKey}`, value: JSON.stringify(input.tasks) },
    { key: ACTIVITY_LOG_KEY, value: JSON.stringify(log) }
  ];
}
