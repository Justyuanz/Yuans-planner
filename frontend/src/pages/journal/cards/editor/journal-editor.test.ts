import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { JOURNAL_ENTRIES_STORAGE_KEY } from "@/shared/journal-entry-store";
import {
  buildJournalEditorDraft,
  buildJournalEntryUpdate,
  JOURNAL_ACTIVITY_LOG_KEY,
  longJournalDate,
  type JournalEditorDraft
} from "./journal-editor";

const DATE = "2026-09-14";
const IDENTITY = {
  activityId: "activity-1",
  entryId: "journal-1",
  timestamp: "2026-09-14T12:00:00.000Z"
};

function draft(overrides: Partial<JournalEditorDraft> = {}): JournalEditorDraft {
  return {
    content: "",
    durationMinutes: "",
    title: "",
    tracker: { context: "", energy: "", focus: "" },
    ...overrides
  };
}

function decodedWrite(update: NonNullable<ReturnType<typeof buildJournalEntryUpdate>>, key: string): unknown {
  const value = update.writes.find((write) => write.key === key)?.value ?? "null";
  return JSON.parse(value) as unknown;
}

describe("Journal editor persistence", () => {
  it("builds an empty editor for missing and malformed legacy storage", () => {
    const stores: PlannerStore[] = [
      {},
      { [JOURNAL_ENTRIES_STORAGE_KEY]: "not-json" },
      { [JOURNAL_ENTRIES_STORAGE_KEY]: "{}" }
    ];
    stores
      .forEach((store) => expect(buildJournalEditorDraft(store, DATE)).toEqual(draft()));
  });

  it("normalizes the selected legacy entry for editing", () => {
    const store: PlannerStore = {
      [JOURNAL_ENTRIES_STORAGE_KEY]: JSON.stringify([{
        content: "Keep whitespace\n",
        date: DATE,
        durationMinutes: 9999,
        id: "existing",
        title: " Soft start ",
        tracker: { context: " Outside. ", energy: "GOOD", focus: " clear " }
      }])
    };
    expect(buildJournalEditorDraft(store, DATE)).toEqual({
      content: "Keep whitespace\n",
      durationMinutes: "1440",
      title: "Soft start",
      tracker: { context: "Outside.", energy: "good", focus: "clear" }
    });
  });

  it("creates a normalized entry and matching audit record", () => {
    const update = buildJournalEntryUpdate({}, DATE, draft({
      content: "  Body stays raw.  ",
      durationMinutes: "1500",
      title: " Soft start ",
      tracker: { context: " Outside. ", energy: "good", focus: "clear" }
    }), IDENTITY)!;
    const entries = decodedWrite(update, JOURNAL_ENTRIES_STORAGE_KEY);
    expect(entries).toEqual([{
      content: "  Body stays raw.  ",
      createdAt: IDENTITY.timestamp,
      date: DATE,
      durationMinutes: 1440,
      id: IDENTITY.entryId,
      title: "Soft start",
      tracker: { context: "Outside.", energy: "good", focus: "clear" },
      updatedAt: IDENTITY.timestamp
    }]);
    expect(decodedWrite(update, JOURNAL_ACTIVITY_LOG_KEY)).toEqual([{
      action: "journal_entry_created",
      after: (entries as unknown[])[0],
      before: null,
      dateKey: DATE,
      entityId: IDENTITY.entryId,
      entityType: "journal_entry",
      field: "",
      id: IDENTITY.activityId,
      meta: { source: "journal-editor" },
      timestamp: IDENTITY.timestamp
    }]);
    expect(update.nextStore[JOURNAL_ENTRIES_STORAGE_KEY]).toBe(update.writes[0]?.value);
  });

  it("updates the first newest matching date while preserving identity and creation time", () => {
    const store: PlannerStore = {
      [JOURNAL_ENTRIES_STORAGE_KEY]: JSON.stringify([
        { content: "Older duplicate", date: DATE, id: "older", updatedAt: "2026-09-14T08:00:00.000Z" },
        { content: "Newest duplicate", createdAt: "created", date: DATE, id: "newest", updatedAt: "2026-09-14T10:00:00.000Z" }
      ])
    };
    const update = buildJournalEntryUpdate(store, DATE, draft({ title: "Updated" }), IDENTITY)!;
    const entries = decodedWrite(update, JOURNAL_ENTRIES_STORAGE_KEY) as { id: string; title: string; createdAt: string }[];
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: "newest", title: "Updated", createdAt: "created" });
    expect(entries[1]?.id).toBe("older");
    expect(decodedWrite(update, JOURNAL_ACTIVITY_LOG_KEY)).toEqual([
      expect.objectContaining({ action: "journal_entry_updated", entityId: "newest" })
    ]);
  });

  it("deletes an existing entry only when every editable field is empty", () => {
    const existing = { content: "Entry", date: DATE, id: "existing", createdAt: "created" };
    const update = buildJournalEntryUpdate({
      [JOURNAL_ENTRIES_STORAGE_KEY]: JSON.stringify([existing, { content: "Keep", date: "2026-09-13", id: "keep" }])
    }, DATE, draft({ content: "   ", durationMinutes: "invalid" }), IDENTITY)!;
    expect(decodedWrite(update, JOURNAL_ENTRIES_STORAGE_KEY)).toEqual([
      expect.objectContaining({ id: "keep" })
    ]);
    expect(decodedWrite(update, JOURNAL_ACTIVITY_LOG_KEY)).toEqual([
      expect.objectContaining({ action: "journal_entry_deleted", after: null, entityId: "existing" })
    ]);
    expect(buildJournalEntryUpdate({}, DATE, draft({ content: " " }), IDENTITY)).toBeNull();
  });

  it("preserves tracker-only and fractional-minute entries", () => {
    expect(decodedWrite(buildJournalEntryUpdate({}, DATE, draft({
      durationMinutes: "2.5",
      tracker: { context: "", energy: "low", focus: "" }
    }), IDENTITY)!, JOURNAL_ENTRIES_STORAGE_KEY)).toEqual([
      expect.objectContaining({ durationMinutes: 2.5, tracker: { context: "", energy: "low", focus: "" } })
    ]);
  });

  it("formats the paper date exactly like the legacy page", () => {
    expect(longJournalDate(DATE)).toBe("Mon, September 14, 2026");
  });
});
