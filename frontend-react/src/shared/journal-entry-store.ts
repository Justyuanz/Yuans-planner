import type { PlannerStore } from "../api/planner-store";
import { isRecord } from "./is-record";

export type JournalEnergyState = "" | "empty" | "low" | "okay" | "good" | "strong";
export type JournalFocusState = "" | "foggy" | "wavy" | "steady" | "clear";

export interface JournalTracker {
  context: string;
  energy: JournalEnergyState;
  focus: JournalFocusState;
}

export interface JournalEntry {
  content: string;
  createdAt: string;
  date: string;
  durationMinutes: number;
  id: string;
  title: string;
  tracker: JournalTracker;
  updatedAt: string;
}

export const JOURNAL_ENTRIES_STORAGE_KEY = "hivePlanner.journal.entries";

const ENERGY_STATES = ["", "empty", "low", "okay", "good", "strong"] as const;
const FOCUS_STATES = ["", "foggy", "wavy", "steady", "clear"] as const;

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

function normalizedChoice<T extends string>(value: unknown, allowed: readonly T[]): T {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.includes(normalized as T) ? normalized as T : allowed[0]!;
}

function finiteClamped(value: unknown, maximum: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

export function normalizeJournalTracker(candidate: unknown): JournalTracker {
  const tracker = isRecord(candidate) ? candidate : {};
  return {
    context: typeof tracker.context === "string" ? tracker.context.trim() : "",
    energy: normalizedChoice(tracker.energy, ENERGY_STATES),
    focus: normalizedChoice(tracker.focus, FOCUS_STATES)
  };
}

export function hasJournalTrackerContent(tracker: JournalTracker): boolean {
  return Boolean(tracker.energy || tracker.focus || tracker.context);
}

export function normalizeJournalEntry(candidate: unknown): JournalEntry | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const date = typeof candidate.date === "string" ? candidate.date.trim() : "";
  if (!date) {
    return null;
  }
  const content = typeof candidate.content === "string" ? candidate.content : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const tracker = normalizeJournalTracker(candidate.tracker);
  const durationMinutes = finiteClamped(candidate.durationMinutes, 1440);
  if (!(durationMinutes || title || content.trim() || hasJournalTrackerContent(tracker))) {
    return null;
  }
  const createdAt = typeof candidate.createdAt === "string" && candidate.createdAt
    ? candidate.createdAt
    : "";
  return {
    content,
    createdAt,
    date,
    durationMinutes,
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `journal-${date}`,
    title,
    tracker,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt
      ? candidate.updatedAt
      : createdAt
  };
}

function compareEntriesNewestFirst(left: JournalEntry, right: JournalEntry): number {
  return right.date.localeCompare(left.date)
    || right.updatedAt.localeCompare(left.updatedAt)
    || right.createdAt.localeCompare(left.createdAt)
    || right.id.localeCompare(left.id);
}

export function journalEntries(store: PlannerStore): JournalEntry[] {
  const parsed = parseStoredJson(store[JOURNAL_ENTRIES_STORAGE_KEY]);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map(normalizeJournalEntry)
    .filter((entry): entry is JournalEntry => entry !== null)
    .sort(compareEntriesNewestFirst);
}

export function filterJournalEntries(
  entries: readonly JournalEntry[],
  query: string
): JournalEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...entries];
  }
  return entries.filter((entry) => [
    entry.date,
    entry.title,
    entry.content,
    entry.tracker.energy,
    entry.tracker.focus,
    entry.tracker.context
  ].join("\n").toLowerCase().includes(normalizedQuery));
}
