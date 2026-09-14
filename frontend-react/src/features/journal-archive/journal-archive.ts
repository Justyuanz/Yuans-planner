import type { PlannerStore } from "../../api/planner-store";
import {
  filterJournalEntries,
  journalEntries,
  type JournalEntry,
  type JournalTracker
} from "../journal/journal-entry-store";

export interface JournalArchiveItem {
  active: boolean;
  date: string;
  dateLabel: string;
  id: string;
  meta: string;
  preview: string;
  title: string;
}

export interface JournalArchiveModel {
  emptyText: string;
  items: readonly JournalArchiveItem[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;
const ENERGY_LABELS: Readonly<Record<string, string>> = {
  empty: "Empty",
  low: "Low",
  okay: "Okay",
  good: "Good",
  strong: "Strong"
};
const FOCUS_LABELS: Readonly<Record<string, string>> = {
  foggy: "Foggy",
  wavy: "Wavy",
  steady: "Steady",
  clear: "Clear"
};
const PREVIEW_LENGTH = 132;

function humanDate(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return `${WEEKDAYS[date.getDay()] ?? ""} ${(MONTHS[date.getMonth()] ?? "").slice(0, 3)} ${date.getDate()}`;
}

function trackerMeta(tracker: JournalTracker): string {
  return [
    tracker.energy ? `Energy ${ENERGY_LABELS[tracker.energy] ?? tracker.energy}` : "",
    tracker.focus ? `Focus ${FOCUS_LABELS[tracker.focus] ?? tracker.focus}` : "",
    tracker.context
  ].filter(Boolean).join(" · ");
}

function buildPreview(entry: JournalEntry): string {
  let text = entry.content.replace(/\s+/g, " ").trim();
  if (!text && (entry.tracker.energy || entry.tracker.focus || entry.tracker.context)) {
    text = [
      entry.tracker.energy ? `Energy: ${entry.tracker.energy}` : "",
      entry.tracker.focus ? `Focus: ${entry.tracker.focus}` : "",
      entry.tracker.context
    ].filter(Boolean).join(" · ");
  }
  if (!text) {
    return "A tiny note lives here.";
  }
  return text.length <= PREVIEW_LENGTH
    ? text
    : `${text.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`;
}

export function buildJournalArchive(
  store: PlannerStore,
  selectedDate: string,
  query: string
): JournalArchiveModel {
  const entries = filterJournalEntries(journalEntries(store), query);
  return {
    emptyText: entries.length > 0
      ? ""
      : query
        ? "No journal entry matches that search yet."
        : "Your old journals will stack here as soon as you write one.",
    items: entries.map((entry) => {
      const dateLabel = humanDate(entry.date);
      return {
        active: entry.date === selectedDate,
        date: entry.date,
        dateLabel,
        id: entry.id,
        meta: trackerMeta(entry.tracker),
        preview: buildPreview(entry),
        title: entry.title || dateLabel
      };
    })
  };
}

