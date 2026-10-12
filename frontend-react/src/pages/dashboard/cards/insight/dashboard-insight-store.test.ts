import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import {
  buildDashboardInsightFromStore,
  buildDashboardInsightHistoryFromStore,
  buildDashboardInsightMetricsFromStore
} from "./dashboard-insight-store";

const REFERENCE_DATE = new Date(2026, 7, 7);

function stored(value: unknown): string {
  return JSON.stringify(value);
}

function activityEntry(id: string) {
  return {
    action: "task_updated",
    dateKey: "2026-08-05",
    entityId: "task-1",
    entityType: "task",
    id,
    timestamp: `2026-08-05T10:00:0${id.slice(-1)}.000Z`
  };
}

describe("buildDashboardInsightMetricsFromStore", () => {
  it("returns stable empty metrics for missing and malformed compatibility values", () => {
    const store: PlannerStore = {
      "hivePlanner.activityLog": "not-json",
      "hivePlanner.dailyTasks.2026-08-06": "{}",
      "hivePlanner.journal.entries": "false",
      "hivePlanner.money.settings": "[]",
      "hivePlanner.money.transactions": "not-json"
    };

    const metrics = buildDashboardInsightMetricsFromStore(store, REFERENCE_DATE);

    expect(metrics.currentDateKey).toBe("2026-08-07");
    expect(metrics.lookbackDays).toBe(14);
    expect(metrics.dailySummaries).toEqual([
      expect.objectContaining({ dateKey: "2026-08-06", plannedCount: 0 })
    ]);
    expect(metrics.todaySummary).toEqual(expect.objectContaining({
      dateKey: "2026-08-07",
      plannedCount: 0
    }));
    expect(metrics.editFrequency.sampleSize).toBe(14);
    expect(metrics.energyCrashPattern.sampleSize).toBe(0);
    expect(metrics.moneySummary).toEqual(expect.objectContaining({
      available: true,
      availableWeekCents: 3132,
      flexibleRemainingCents: 26111
    }));
  });

  it("decodes and composes task, activity, Money, and Journal values without mutation", () => {
    const store: PlannerStore = {
      "hivePlanner.activityLog": stored([
        activityEntry("log-1"),
        activityEntry("log-2"),
        activityEntry("log-3")
      ]),
      "hivePlanner.dailyTasks.2026-08-05": stored([
        { done: false, hours: 2, label: "19 Review", timerSeconds: 0 }
      ]),
      "hivePlanner.dailyTasks.2026-08-06": stored([
        { done: true, hours: 1, label: "09 Focus", timerSeconds: 0 }
      ]),
      "hivePlanner.dailyTasks.2026-08-07": stored([
        { done: false, hours: 1, label: "09 First", timerSeconds: 0 },
        { done: false, hours: 1, label: "10 Second", timerSeconds: 0 },
        { done: false, hours: 1, label: "11 Third", timerSeconds: 0 },
        { done: false, hours: 1, label: "12 Fourth", timerSeconds: 0 }
      ]),
      "hivePlanner.journal.entries": stored([
        { content: "Tracked", date: "2026-08-06", tracker: { energy: "low" } }
      ]),
      "hivePlanner.money.settings": stored({
        categories: [{ budgetCents: 3100, id: "groceries", kind: "flex", name: "Groceries" }]
      }),
      "hivePlanner.money.transactions": stored([
        { amountCents: 1200, categoryId: "groceries", date: "2026-08-05", id: "txn-1" }
      ])
    };
    const before = JSON.stringify(store);

    const metrics = buildDashboardInsightMetricsFromStore(store, REFERENCE_DATE, 7);

    expect(metrics.todaySummary.plannedCount).toBe(4);
    expect(metrics.dailyTaskAverages).toEqual(expect.objectContaining({ sampleSize: 2 }));
    expect(metrics.foodSpendingOnHighEditDays).toEqual(expect.objectContaining({
      highEditAverageFoodCents: 1200,
      highEditDays: 1
    }));
    expect(metrics.energyCrashPattern).toEqual(expect.objectContaining({
      lowEnergyDays: 1,
      lowEnergyPreviousEveningHours: 2
    }));
    expect(metrics.moneySummary).toEqual(expect.objectContaining({
      available: true,
      flexibleRemainingCents: 16011
    }));
    expect(JSON.stringify(store)).toBe(before);
  });
});

describe("buildDashboardInsightFromStore", () => {
  it("derives the visible card directly from stored metrics", () => {
    const store: PlannerStore = {
      "hivePlanner.dailyTasks.2026-08-01": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-02": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-03": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-04": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-05": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-06": stored([
        { done: true, hours: 1, label: "09 Done" }
      ]),
      "hivePlanner.dailyTasks.2026-08-07": stored([
        { done: false, hours: 1, label: "09 One" },
        { done: false, hours: 1, label: "10 Two" },
        { done: false, hours: 1, label: "11 Three" },
        { done: false, hours: 1, label: "12 Four" }
      ])
    };

    expect(buildDashboardInsightFromStore(store, REFERENCE_DATE)).toEqual(expect.objectContaining({
      modeText: "reality · 6 days",
      title: "Your mornings are usually taking longer than planned."
    }));
    expect(buildDashboardInsightHistoryFromStore(store, REFERENCE_DATE)).toEqual(expect.objectContaining({
      isEmpty: false,
      rangeLabel: "Last 14 days through 2026-08-07"
    }));
  });
});
