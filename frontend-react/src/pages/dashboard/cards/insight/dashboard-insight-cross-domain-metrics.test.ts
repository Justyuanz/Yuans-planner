import { describe, expect, it } from "vitest";

import { buildDailyTaskSummaries } from "./dashboard-insight-task-summaries";
import { buildDashboardCrossDomainMetrics } from "./dashboard-insight-cross-domain-metrics";

function task(label: string, hours: unknown, done: boolean) {
  return { done, hours, label, timerSeconds: 0 };
}

describe("buildDashboardCrossDomainMetrics", () => {
  it("returns stable empty metrics for malformed inputs", () => {
    const metrics = buildDashboardCrossDomainMetrics({
      activityLog: "invalid",
      currentDateKey: "2026-08-07",
      dailySummaries: [],
      journalEntries: { invalid: true },
      lookbackDays: 7,
      moneyState: null,
      moneyTransactions: [{ amountCents: Infinity, categoryId: "groceries", date: "2026-08-06" }]
    });

    expect(metrics.moneySummary).toEqual({
      available: false,
      availableWeekCents: 0,
      availableWeekLabel: "",
      flexibleRemainingCents: 0,
      flexibleRemainingLabel: "",
      sampleSize: 0
    });
    expect(metrics.foodSpendingOnHighEditDays).toEqual({
      averageFoodDifferenceCents: 0,
      highEditAverageFoodCents: 0,
      highEditDays: 0,
      lowerEditAverageFoodCents: 0,
      lowerEditDays: 0,
      sampleSize: 0
    });
    expect(metrics.energyCrashPattern.sampleSize).toBe(0);
    expect(metrics.journalBehaviorOnOverloadedDays.sampleSize).toBe(0);
    expect(metrics.lateStudyCorrelation.sampleSize).toBe(0);
    expect(metrics.simpleMorningCorrelation.sampleSize).toBe(0);
  });

  it("normalizes the legacy Money summary and fallback labels", () => {
    const metrics = buildDashboardCrossDomainMetrics({
      activityLog: [],
      currentDateKey: "2026-08-07",
      dailySummaries: [],
      journalEntries: [],
      lookbackDays: 7,
      moneyState: {
        month: {
          availableWeek: "EUR -12.00",
          availableWeekCents: -1200,
          flexibleRemainingCents: -500
        }
      },
      moneyTransactions: []
    });

    expect(metrics.moneySummary).toEqual({
      available: true,
      availableWeekCents: -1200,
      availableWeekLabel: "EUR -12.00",
      flexibleRemainingCents: -500,
      flexibleRemainingLabel: "-500",
      sampleSize: 1
    });
  });

  it("matches the legacy cross-domain pattern calculations", () => {
    const dailySummaries = buildDailyTaskSummaries({
      "2026-08-01": [task("09 Study C++", 1, true), task("19 Review", 1, false)],
      "2026-08-02": [task("09 Leetcode", 1, true), task("11 Admin", 1, true)],
      "2026-08-03": [
        task("09 C++", 1, false), task("10 Leetcode", 1, false),
        task("11 Admin", 1, false), task("12 Python", 1, false),
        task("19 Review", 1, false), task("20 Guitar", 1, false)
      ],
      "2026-08-04": [task("09 Deep work", 1, true), task("18 Guitar", 1, true)],
      "2026-08-05": [
        task("08 Shower", 0.5, true), task("09 Plan", 0.5, true),
        task("10 C++", 1, false), task("11 Leetcode", 1, false),
        task("12 Python", 1, false), task("19 Review", 1, false)
      ],
      "2026-08-06": [task("09 Focus", 1, true), task("10 Admin", 1, true)]
    });
    const metrics = buildDashboardCrossDomainMetrics({
      currentDateKey: "2026-08-07",
      lookbackDays: 7,
      dailySummaries,
      activityLog: [
        { action: "task_updated", dateKey: "2026-08-01" },
        { action: "task_updated", dateKey: "2026-08-03" },
        { action: "task_updated", dateKey: "2026-08-03" },
        { action: "task_updated", dateKey: "2026-08-03" },
        { action: "planned_hours_updated", dateKey: "2026-08-03" },
        { action: "task_updated", dateKey: "2026-08-04" },
        { action: "task_updated", dateKey: "2026-08-05" },
        { action: "task_updated", dateKey: "2026-08-05" },
        { action: "task_updated", dateKey: "2026-08-05" },
        { action: "planned_hours_updated", dateKey: "2026-08-05" }
      ],
      moneyTransactions: [
        { date: "2026-08-01", amountCents: 700, categoryId: "groceries" },
        { date: "2026-08-02", amountCents: 800, categoryId: "eating-out" },
        { date: "2026-08-03", amountCents: 2200, categoryId: "groceries" },
        { date: "2026-08-04", amountCents: 600, categoryId: "groceries" },
        { date: "2026-08-05", amountCents: 1800, categoryId: "eating-out" },
        { date: "2026-08-06", amountCents: 500, categoryId: "groceries" }
      ],
      journalEntries: [
        { date: "2026-08-01", title: "A", content: "A fairly reflective journal note with a decent amount of detail.", tracker: { energy: "good" } },
        { date: "2026-08-02", title: "B", content: "Another pretty detailed entry that has enough length to compare.", tracker: { energy: "good" } },
        { date: "2026-08-03", title: "C", content: "Short note.", tracker: { energy: "good" } },
        { date: "2026-08-04", title: "D", content: "Longer calm-day reflection with more words and specifics included.", tracker: { energy: "low" } },
        { date: "2026-08-05", title: "E", content: "Brief.", tracker: { energy: "good" } },
        { date: "2026-08-06", title: "F", content: "A fuller note again with a more settled tone and extra detail.", tracker: { energy: "empty" } }
      ],
      moneyState: null
    });

    expect(metrics.foodSpendingOnHighEditDays).toMatchObject({
      highEditDays: 2,
      lowerEditDays: 4,
      highEditAverageFoodCents: 2000,
      lowerEditAverageFoodCents: 650,
      averageFoodDifferenceCents: 1350
    });
    expect(metrics.lateStudyCorrelation.lateStudyDays).toBe(3);
    expect(metrics.simpleMorningCorrelation.simpleMorningDays).toBe(2);
    expect(metrics.simpleMorningCorrelation.completionRateDifference).toBeGreaterThan(0);
    expect(metrics.journalBehaviorOnOverloadedDays.overloadedDays).toBe(2);
    expect(metrics.energyCrashPattern.lowEnergyDays).toBe(2);
    expect(metrics.energyCrashPattern.otherDays).toBe(3);
    expect(metrics.energyCrashPattern.previousEveningDifference).toBeGreaterThan(0);
  });

  it("keeps only the latest four low-energy evidence dates", () => {
    const taskMap = Object.fromEntries(Array.from({ length: 7 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return [`2026-08-${day}`, [task("19 Review", 2, false)]];
    }));
    const journalEntries = Array.from({ length: 6 }, (_, index) => {
      const day = String(index + 2).padStart(2, "0");
      return { date: `2026-08-${day}`, content: "Tracked", tracker: { energy: "low" } };
    });
    const metrics = buildDashboardCrossDomainMetrics({
      activityLog: [],
      currentDateKey: "2026-08-08",
      dailySummaries: buildDailyTaskSummaries(taskMap),
      journalEntries,
      lookbackDays: 8,
      moneyState: null,
      moneyTransactions: []
    });

    expect(metrics.energyCrashPattern.lowEnergyDates).toEqual([
      "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"
    ]);
  });
});
