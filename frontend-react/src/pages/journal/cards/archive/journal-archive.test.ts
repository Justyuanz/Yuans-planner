import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { buildJournalArchive } from "./journal-archive";

const SELECTED_DATE = "2026-09-14";

function storeWithEntries(entries: unknown): PlannerStore {
  return { "hivePlanner.journal.entries": JSON.stringify(entries) };
}

describe("Journal archive model", () => {
  it("uses the legacy empty states for missing, malformed, and non-array storage", () => {
    const stores: PlannerStore[] = [
      {},
      { "hivePlanner.journal.entries": "not-json" },
      { "hivePlanner.journal.entries": "{}" },
      storeWithEntries([null, { date: "", content: "Missing date" }, { date: "2026-09-14", content: "  " }])
    ];

    stores.forEach((store) => {
      expect(buildJournalArchive(store, SELECTED_DATE, "")).toEqual({
        emptyText: "Your old journals will stack here as soon as you write one.",
        items: []
      });
    });

    expect(buildJournalArchive({}, SELECTED_DATE, "missing")).toEqual({
      emptyText: "No journal entry matches that search yet.",
      items: []
    });
  });

  // The preview is cut at 132 characters. Every other case in this file is
  // short enough to pass through untouched, so the cutting branch itself was
  // never exercised.
  it("cuts a long preview at the legacy length and keeps a short one whole", () => {
    const justShort = "a".repeat(132);
    const justLong = "a".repeat(133);

    const [shortItem] = buildJournalArchive(
      storeWithEntries([{ id: "short", date: SELECTED_DATE, content: justShort }]), SELECTED_DATE, ""
    ).items;
    expect(shortItem?.preview).toBe(justShort);

    const [longItem] = buildJournalArchive(
      storeWithEntries([{ id: "long", date: SELECTED_DATE, content: justLong }]), SELECTED_DATE, ""
    ).items;
    expect(longItem?.preview).toBe(`${"a".repeat(131)}\u2026`);
    expect(longItem?.preview).toHaveLength(132);
  });

  // Trailing spaces are trimmed before the ellipsis, so the cut never leaves a
  // gap in front of it.
  it("trims the space before the ellipsis when the cut lands on one", () => {
    const text = `${"b".repeat(130)} ccc`;
    const [item] = buildJournalArchive(
      storeWithEntries([{ id: "spaced", date: SELECTED_DATE, content: text }]), SELECTED_DATE, ""
    ).items;
    expect(item?.preview).toBe(`${"b".repeat(130)}\u2026`);
  });

  it("normalizes entries and matches legacy ordering, labels, metadata, and previews", () => {
    const model = buildJournalArchive(storeWithEntries([
      { id: "older", date: "2026-09-13", content: "Cafe notes after class." },
      {
        id: "first",
        date: SELECTED_DATE,
        title: " Soft start ",
        content: "I felt   calm.\nThen I took a walk.",
        durationMinutes: 15,
        tracker: { energy: "GOOD", focus: " clear ", context: "Outside walk. " },
        createdAt: "2026-09-14T08:00:00.000Z",
        updatedAt: "2026-09-14T10:00:00.000Z"
      },
      {
        id: "later-update",
        date: SELECTED_DATE,
        content: "Later update",
        createdAt: "2026-09-14T07:00:00.000Z",
        updatedAt: "2026-09-14T11:00:00.000Z"
      },
      { id: "tracker", date: "2026-09-12", tracker: { energy: "low", focus: "foggy", context: " Late night. " } },
      { id: "duration", date: "2026-09-11", durationMinutes: "9999" },
      { id: "long", date: "2026-09-10", content: "x".repeat(150) },
      { id: "invalid-duration", date: "2026-09-09", durationMinutes: "not-a-number" },
      { id: "invalid-tracker", date: "2026-09-08", tracker: { energy: "wired", focus: 12 } }
    ]), SELECTED_DATE, "");

    expect(model.emptyText).toBe("");
    expect(model.items).toEqual([
      {
        active: true,
        date: SELECTED_DATE,
        dateLabel: "Mon Sep 14",
        id: "later-update",
        meta: "",
        preview: "Later update",
        title: "Mon Sep 14"
      },
      {
        active: true,
        date: SELECTED_DATE,
        dateLabel: "Mon Sep 14",
        id: "first",
        meta: "Energy Good · Focus Clear · Outside walk.",
        preview: "I felt calm. Then I took a walk.",
        title: "Soft start"
      },
      {
        active: false,
        date: "2026-09-13",
        dateLabel: "Sun Sep 13",
        id: "older",
        meta: "",
        preview: "Cafe notes after class.",
        title: "Sun Sep 13"
      },
      {
        active: false,
        date: "2026-09-12",
        dateLabel: "Sat Sep 12",
        id: "tracker",
        meta: "Energy Low · Focus Foggy · Late night.",
        preview: "Energy: low · Focus: foggy · Late night.",
        title: "Sat Sep 12"
      },
      {
        active: false,
        date: "2026-09-11",
        dateLabel: "Fri Sep 11",
        id: "duration",
        meta: "",
        preview: "A tiny note lives here.",
        title: "Fri Sep 11"
      },
      {
        active: false,
        date: "2026-09-10",
        dateLabel: "Thu Sep 10",
        id: "long",
        meta: "",
        preview: `${"x".repeat(131)}…`,
        title: "Thu Sep 10"
      }
    ]);
  });

  it("filters case-insensitively across every legacy search field", () => {
    const store = storeWithEntries([
      {
        id: "match",
        date: "2026-09-12",
        title: "Rainy day",
        content: "A tiny cafe visit.",
        tracker: { energy: "low", focus: "foggy", context: "Late bedtime" }
      },
      { id: "other", date: "2026-09-11", title: "Sunny", content: "Went skating." }
    ]);

    ["2026-09-12", "RAINY", "cafe", "low", "foggy", "bedtime"].forEach((query) => {
      expect(buildJournalArchive(store, SELECTED_DATE, `  ${query}  `).items.map((item) => item.id))
        .toEqual(["match"]);
    });
    expect(buildJournalArchive(store, SELECTED_DATE, "missing")).toEqual({
      emptyText: "No journal entry matches that search yet.",
      items: []
    });
  });
});
