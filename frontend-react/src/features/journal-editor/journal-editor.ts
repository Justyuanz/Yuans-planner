import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { decodeActivityLog } from "../../shared/activity-log";
import {
  hasJournalTrackerContent,
  journalEntries,
  JOURNAL_ENTRIES_STORAGE_KEY,
  normalizeJournalTracker,
  type JournalEnergyState,
  type JournalEntry,
  type JournalFocusState,
  type JournalTracker
} from "../journal/journal-entry-store";

export const JOURNAL_ACTIVITY_LOG_KEY = "hivePlanner.activityLog";

export interface JournalEditorDraft {
  content: string;
  durationMinutes: string;
  title: string;
  tracker: JournalTracker;
}

interface JournalEntryIdentity {
  activityId: string;
  entryId: string;
  timestamp: string;
}

export interface JournalEntryUpdate {
  nextStore: PlannerStore;
  writes: readonly PlannerStoreWrite[];
}

export const JOURNAL_ENERGY_OPTIONS: readonly {
  id: Exclude<JournalEnergyState, "">;
  label: string;
}[] = [
  { id: "empty", label: "Empty" },
  { id: "low", label: "Low" },
  { id: "okay", label: "Okay" },
  { id: "good", label: "Good" },
  { id: "strong", label: "Strong" }
];

export const JOURNAL_FOCUS_OPTIONS: readonly {
  id: Exclude<JournalFocusState, "">;
  label: string;
}[] = [
  { id: "foggy", label: "Foggy" },
  { id: "wavy", label: "Wavy" },
  { id: "steady", label: "Steady" },
  { id: "clear", label: "Clear" }
];

function durationMinutes(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1440, Math.max(0, number)) : 0;
}

function emptyDraft(): JournalEditorDraft {
  return {
    content: "",
    durationMinutes: "",
    title: "",
    tracker: { context: "", energy: "", focus: "" }
  };
}

export function buildJournalEditorDraft(store: PlannerStore, date: string): JournalEditorDraft {
  const entry = journalEntries(store).find((candidate) => candidate.date === date);
  if (entry === undefined) return emptyDraft();
  return {
    content: entry.content,
    durationMinutes: entry.durationMinutes ? String(entry.durationMinutes) : "",
    title: entry.title,
    tracker: entry.tracker
  };
}

function normalizedDraft(draft: JournalEditorDraft): Omit<JournalEntry, "createdAt" | "date" | "id" | "updatedAt"> {
  return {
    content: draft.content,
    durationMinutes: durationMinutes(draft.durationMinutes),
    title: draft.title.trim(),
    tracker: normalizeJournalTracker(draft.tracker)
  };
}

function hasDraftContent(draft: ReturnType<typeof normalizedDraft>): boolean {
  return Boolean(
    draft.durationMinutes
    || draft.title
    || draft.content.trim()
    || hasJournalTrackerContent(draft.tracker)
  );
}

function activityWrite(
  store: PlannerStore,
  action: "journal_entry_created" | "journal_entry_updated" | "journal_entry_deleted",
  before: JournalEntry | null,
  after: JournalEntry | null,
  date: string,
  entityId: string,
  identity: JournalEntryIdentity
): PlannerStoreWrite {
  const log = decodeActivityLog(store[JOURNAL_ACTIVITY_LOG_KEY]);
  log.push({
    action,
    after,
    before,
    dateKey: date,
    entityId,
    entityType: "journal_entry",
    field: "",
    id: identity.activityId,
    meta: { source: "journal-editor" },
    timestamp: identity.timestamp
  });
  return { key: JOURNAL_ACTIVITY_LOG_KEY, value: JSON.stringify(log) };
}

export function buildJournalEntryUpdate(
  store: PlannerStore,
  date: string,
  draft: JournalEditorDraft,
  identity: JournalEntryIdentity
): JournalEntryUpdate | null {
  const entries = journalEntries(store);
  const existingIndex = entries.findIndex((entry) => entry.date === date);
  const existingEntry = entries[existingIndex] ?? null;
  const normalized = normalizedDraft(draft);

  if (!hasDraftContent(normalized)) {
    if (existingEntry === null) return null;
    entries.splice(existingIndex, 1);
    const writes = [
      { key: JOURNAL_ENTRIES_STORAGE_KEY, value: JSON.stringify(entries) },
      activityWrite(store, "journal_entry_deleted", existingEntry, null, date, existingEntry.id, identity)
    ];
    return {
      nextStore: { ...store, ...Object.fromEntries(writes.map((write) => [write.key, write.value])) },
      writes
    };
  }

  const nextEntry: JournalEntry = {
    ...normalized,
    createdAt: existingEntry === null ? identity.timestamp : existingEntry.createdAt,
    date,
    id: existingEntry === null ? identity.entryId : existingEntry.id,
    updatedAt: identity.timestamp
  };
  if (existingIndex === -1) entries.push(nextEntry);
  else entries[existingIndex] = nextEntry;

  const writes = [
    { key: JOURNAL_ENTRIES_STORAGE_KEY, value: JSON.stringify(entries) },
    activityWrite(
      store,
      existingEntry === null ? "journal_entry_created" : "journal_entry_updated",
      existingEntry,
      nextEntry,
      date,
      nextEntry.id,
      identity
    )
  ];
  return {
    nextStore: { ...store, ...Object.fromEntries(writes.map((write) => [write.key, write.value])) },
    writes
  };
}

export function longJournalDate(dateKey: string): string {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "short",
    year: "numeric"
  });
}
