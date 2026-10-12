import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { addDays, isoWeekKey, strictDateKey, toDateKey } from "@/shared/planner-date";

export const BODY_SUPPORT_STORAGE_KEY = "hivePlanner.physical.logs";
export const BODY_SUPPORT_OPTIONS = [
  ["gym", "Gym"],
  ["judo", "Judo"],
  ["yoga", "Yoga"],
  ["stretch", "Stretch"],
  ["recovery", "Recovery"],
  ["walk", "Walk"],
  ["other", "Other"]
] as const;

export type BodySupportType = typeof BODY_SUPPORT_OPTIONS[number][0];
type BodySupportStatus = "done" | "modified" | "skipped";

export interface BodySupportLog {
  date: string;
  kind: BodySupportType;
  minutes: number;
  note: string;
  status: BodySupportStatus;
  type: string;
}

export interface BodySupportMetric {
  count: number;
  label: string;
  minutesLabel: string;
  note: string;
}

export interface BodySupportModel {
  metrics: BodySupportMetric[];
  weekLabel: string;
}

interface BodySupportInput {
  minutes: string;
  note: string;
  type: string;
}

interface BodySupportIdentity {
  id: string;
  timestamp: string;
}

export interface BodySupportUpdate {
  nextStore: PlannerStore;
  write: PlannerStoreWrite;
}

function parseStoredArray(rawValue: string | undefined): unknown[] {
  try {
    const parsed: unknown = rawValue === undefined ? [] : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeBodySupportType(value: unknown): BodySupportType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return BODY_SUPPORT_OPTIONS.some(([type]) => type === normalized)
    ? normalized as BodySupportType
    : "other";
}

function bodySupportLabel(type: BodySupportType): string {
  return BODY_SUPPORT_OPTIONS.find(([candidate]) => candidate === type)?.[1] ?? "Other";
}

function normalizedStatus(value: unknown): BodySupportStatus {
  return value === "modified" || value === "skipped" ? value : "done";
}

function normalizedMinutes(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}


export function decodeBodySupportLogs(rawValue: string | undefined): BodySupportLog[] {
  return parseStoredArray(rawValue).flatMap((candidate) => {
    if (!isRecord(candidate) || !candidate.name) return [];
    const date = strictDateKey(candidate.date);
    if (!date) return [];
    let requestedKind = candidate.name;
    if (candidate.kind) requestedKind = candidate.kind;
    const kind = normalizeBodySupportType(requestedKind);
    return [{
      date,
      kind,
      minutes: normalizedMinutes(candidate.minutes),
      note: typeof candidate.note === "string" ? candidate.note : "",
      status: normalizedStatus(candidate.status),
      type: bodySupportLabel(kind)
    }];
  });
}


function weekDateKeys(date: Date): { end: string; start: string } {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(date, mondayOffset);
  return { end: toDateKey(addDays(start, 6)), start: toDateKey(start) };
}

export function bodySupportLogsForWeek(store: PlannerStore, today: Date): BodySupportLog[] {
  const range = weekDateKeys(today);
  return decodeBodySupportLogs(store[BODY_SUPPORT_STORAGE_KEY]).filter((log) => (
    log.status !== "skipped" && log.date >= range.start && log.date <= range.end
  ));
}

function buildMetrics(logs: readonly BodySupportLog[]): BodySupportMetric[] {
  const metrics = new Map<string, { count: number; minutes: number; note: string }>();
  logs.forEach((log) => {
    const current = metrics.get(log.type) ?? { count: 0, minutes: 0, note: "" };
    current.count += 1;
    current.minutes += log.minutes;
    if (!current.note && log.note) current.note = log.note;
    metrics.set(log.type, current);
  });
  return [...metrics.entries()].sort(([leftLabel, left], [rightLabel, right]) => (
    right.count - left.count || leftLabel.localeCompare(rightLabel)
  )).map(([label, metric]) => ({
    count: metric.count,
    label,
    minutesLabel: metric.minutes ? `${metric.minutes} min` : "Logged",
    note: metric.note
  }));
}

export function buildBodySupportModel(store: PlannerStore, today: Date): BodySupportModel {
  return {
    metrics: buildMetrics(bodySupportLogsForWeek(store, today)),
    weekLabel: isoWeekKey(today)
  };
}

export function buildBodySupportUpdate(
  store: PlannerStore,
  input: BodySupportInput,
  today: Date,
  identity: BodySupportIdentity
): BodySupportUpdate {
  const type = normalizeBodySupportType(input.type);
  const logs = parseStoredArray(store[BODY_SUPPORT_STORAGE_KEY]);
  const entry = {
    id: identity.id,
    date: toDateKey(today),
    kind: type,
    name: bodySupportLabel(type),
    status: "done",
    minutes: normalizedMinutes(input.minutes),
    score: 0,
    note: input.note.trim(),
    createdAt: identity.timestamp
  };
  const value = JSON.stringify([...logs, entry]);
  const write = { key: BODY_SUPPORT_STORAGE_KEY, value };
  return { nextStore: { ...store, [BODY_SUPPORT_STORAGE_KEY]: value }, write };
}
