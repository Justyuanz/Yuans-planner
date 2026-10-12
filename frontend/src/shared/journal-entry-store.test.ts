import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import {
  filterJournalEntries,
  journalEntries,
  JOURNAL_ENTRIES_STORAGE_KEY,
  normalizeJournalEntry
} from "./journal-entry-store";

function storeWithEntries(entries: unknown): PlannerStore {
  return { [JOURNAL_ENTRIES_STORAGE_KEY]: JSON.stringify(entries) };
}

describe("journal entry storage compatibility", () => {
  it("keeps dated content, tracker-only, and duration-only entries", () => {
    const entries = journalEntries(storeWithEntries([
      null,
      { id: "blank", date: "2026-08-01", title: "  ", content: "   " },
      { id: "tracker", date: "2026-08-01", tracker: { energy: " LOW ", context: " late night " } },
      { id: "missing-date", content: "hello" },
      { id: "content", date: "2026-08-02", title: " Soft day ", content: "I wrote something." },
      { id: "duration", date: "2026-08-03", durationMinutes: 15 }
    ]));

    expect(entries.map(({ id }) => id)).toEqual(["duration", "content", "tracker"]);
    expect(entries[1]).toMatchObject({ title: "Soft day", durationMinutes: 0 });
    expect(entries[2]).toMatchObject({
      durationMinutes: 0,
      tracker: { context: "late night", energy: "low", focus: "" }
    });
  });

  it("sorts by date and update time, then filters every searchable field", () => {
    const entries = journalEntries(storeWithEntries([
      { id: "older", date: "2026-08-02", content: "Older" },
      {
        id: "newer-updated",
        date: "2026-08-03",
        title: "Rainy",
        content: "Soft little cafe day.",
        tracker: { energy: "low", context: "late bedtime" },
        updatedAt: "2026-08-03T10:00:00.000Z"
      },
      {
        id: "newer-later",
        date: "2026-08-03",
        title: "Sunny",
        content: "Went skating after class.",
        updatedAt: "2026-08-03T12:00:00.000Z"
      }
    ]));

    expect(entries.map(({ id }) => id)).toEqual(["newer-later", "newer-updated", "older"]);
    ["cafe", "2026-08-03", "rainy", "low", "bedtime"].forEach((query) => {
      expect(filterJournalEntries(entries, query).some(({ id }) => id === "newer-updated"))
        .toBe(true);
    });
    expect(filterJournalEntries(entries, "sunny").map(({ id }) => id)).toEqual(["newer-later"]);
  });

  it("clamps finite minutes and never invents time for invalid legacy values", () => {
    expect(normalizeJournalEntry({ date: "2026-09-07", durationMinutes: 15 })?.durationMinutes)
      .toBe(15);
    expect(normalizeJournalEntry({ date: "2026-09-07", title: "Edited", durationMinutes: 15 })?.durationMinutes)
      .toBe(15);
    expect(normalizeJournalEntry({ date: "2026-09-07", content: "Old entry" })?.durationMinutes)
      .toBe(0);
    expect(normalizeJournalEntry({ date: "2026-09-07", content: "Old entry", durationMinutes: -1 })?.durationMinutes)
      .toBe(0);
    expect(normalizeJournalEntry({ date: "2026-09-07", content: "Old entry", durationMinutes: Infinity })?.durationMinutes)
      .toBe(0);
    expect(normalizeJournalEntry({ date: "2026-09-07", durationMinutes: 1500 })?.durationMinutes)
      .toBe(1440);
  });
});
