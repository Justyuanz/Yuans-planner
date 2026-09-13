import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { buildEnergyTrail } from "./energy-trail";

const TODAY = new Date(2026, 8, 13);

function populatedStore(): PlannerStore {
  return {
    "hivePlanner.journal.entries": JSON.stringify([
      { id: "ignored", date: "2026-09-13", content: "No valid tracker", tracker: { energy: "wired" } },
      { id: "good", date: "2026-09-12", tracker: { energy: "good", focus: "clear", context: " Early night. " } },
      { id: "empty", date: "2026-09-11", tracker: { energy: "empty", focus: "foggy" } },
      { id: "low", date: "2026-09-10", tracker: { energy: "low" } },
      { id: "okay", date: "2026-09-09", tracker: { energy: "okay", focus: "steady" } },
      { id: "strong", date: "2026-09-08", tracker: { energy: "strong" } },
      { id: "focus", date: "2026-09-07", tracker: { focus: "wavy" } },
      { id: "context", date: "2026-09-06", tracker: { context: "Travel day." } },
      { id: "trimmed", date: "2026-09-05", tracker: { energy: "good" } }
    ]),
    "hivePlanner.dailyTasks.2026-09-09": JSON.stringify([
      { label: "19:00 Study", hours: 2 }
    ]),
    "hivePlanner.dailyTasks.2026-09-10": JSON.stringify([
      { label: "20:00 Study", hours: 4 }
    ]),
    "hivePlanner.dailyTasks.2026-09-11": JSON.stringify([
      { label: "18:30 Guitar", hours: 1 }
    ])
  };
}

describe("Energy trail model", () => {
  it("matches the seven-row legacy order, labels, and context fallback", () => {
    const model = buildEnergyTrail(populatedStore(), TODAY);

    expect(model.items).toEqual([
      { id: "good", date: "2026-09-12", dateLabel: "Sat Sep 12", summary: "Energy Good · Focus Clear", context: "Early night." },
      { id: "empty", date: "2026-09-11", dateLabel: "Fri Sep 11", summary: "Energy Empty · Focus Foggy", context: "" },
      { id: "low", date: "2026-09-10", dateLabel: "Thu Sep 10", summary: "Energy Low", context: "" },
      { id: "okay", date: "2026-09-09", dateLabel: "Wed Sep 9", summary: "Energy Okay · Focus Steady", context: "" },
      { id: "strong", date: "2026-09-08", dateLabel: "Tue Sep 8", summary: "Energy Strong", context: "" },
      { id: "focus", date: "2026-09-07", dateLabel: "Mon Sep 7", summary: "Focus Wavy", context: "" },
      { id: "context", date: "2026-09-06", dateLabel: "Sun Sep 6", summary: "Check-in saved", context: "Travel day." }
    ]);
    expect(model.patternText).toBe(
      "Low-energy check-ins have recently followed evenings averaging 3h, compared with 1h before steadier days."
    );
  });

  it("uses the stable empty state for missing and malformed journal data", () => {
    const stores: PlannerStore[] = [
      {},
      { "hivePlanner.journal.entries": "not-json" },
      { "hivePlanner.journal.entries": "{}" },
      { "hivePlanner.journal.entries": JSON.stringify([null, { date: "", tracker: { energy: "low" } }]) }
    ];

    stores.forEach((store) => {
      expect(buildEnergyTrail(store, TODAY)).toEqual({
        items: [],
        patternText: "Once a few rough days are logged, this will compare what tended to come before them."
      });
    });
  });

  it("requires two rough days and respects legacy task-hour normalization", () => {
    const store: PlannerStore = {
      "hivePlanner.journal.entries": JSON.stringify([
        { date: "2026-09-12", tracker: { energy: "low" } },
        { date: "2026-09-10", tracker: { energy: "empty" } },
        { date: "2026-09-08", tracker: { energy: "good" } }
      ]),
      "hivePlanner.dailyTasks.2026-09-11": JSON.stringify([
        { label: "18:00 Timer", hours: 20, timerSeconds: 3600 }
      ]),
      "hivePlanner.dailyTasks.2026-09-09": JSON.stringify([
        { label: "23:59 Capped", hours: 99 },
        { label: "17:59 Too early", hours: 8 },
        { label: "25:00 Invalid", hours: 8 },
        { label: "", hours: 8 }
      ]),
      "hivePlanner.dailyTasks.2026-09-07": JSON.stringify([
        { label: "20:00 Calm", timerSeconds: 18_000 }
      ])
    };

    expect(buildEnergyTrail(store, TODAY).patternText).toBe(
      "Low-energy check-ins have recently followed evenings averaging 12.5h, compared with 5h before steadier days."
    );

    const oneRoughDay = {
      ...store,
      "hivePlanner.journal.entries": JSON.stringify([
        { date: "2026-09-12", tracker: { energy: "low" } },
        { date: "2026-09-08", tracker: { energy: "good" } }
      ])
    };
    expect(buildEnergyTrail(oneRoughDay, TODAY).patternText).toBe(
      "Once a few rough days are logged, this will compare what tended to come before them."
    );
  });
});
