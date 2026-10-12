import { describe, expect, it } from "vitest";

import {
  deriveDashboardInsights,
  selectTopDashboardInsight
} from "./dashboard-insight-rules";

describe("deriveDashboardInsights", () => {
  it("does not fire rules for tiny or malformed samples", () => {
    expect(deriveDashboardInsights({
      todaySummary: { plannedCount: 6, plannedHours: 7 },
      dailyTaskAverages: { sampleSize: 2, completedAverage: 3 },
      hourGapAverages: { sampleSize: 2, completedAverage: 3 },
      morningOverrun: { sampleSize: 2, averageOverrun: 2, actualAverage: 3, plannedAverage: 1 },
      eveningLoad: {
        sampleSize: 2,
        latestEveningHours: 3,
        latestEveningTaskCount: 3,
        averageEveningHours: 1.5
      },
      vagueTaskFriction: {
        sampleSize: 2,
        vagueOpenCount: 3,
        vagueCompletionRate: 0.2,
        specificCompletionRate: 0.8
      }
    })).toEqual([]);
    expect(deriveDashboardInsights(null)).toEqual([]);
    expect(deriveDashboardInsights({ todaySummary: "invalid" })).toEqual([]);
  });

  it("preserves the legacy priority ordering", () => {
    const insights = deriveDashboardInsights({
      todaySummary: { plannedCount: 6, plannedHours: 7 },
      dailyTaskAverages: { sampleSize: 8, completedAverage: 3 },
      hourGapAverages: { sampleSize: 8, completedAverage: 3.5 },
      morningOverrun: { sampleSize: 8, averageOverrun: 1.8, actualAverage: 2.8, plannedAverage: 1 },
      eveningLoad: {
        sampleSize: 8,
        latestEveningHours: 3.2,
        latestEveningTaskCount: 3,
        averageEveningHours: 1.6
      },
      vagueTaskFriction: {
        sampleSize: 8,
        vagueOpenCount: 3,
        vagueCompletionRate: 0.2,
        specificCompletionRate: 0.8
      },
      moneySummary: {
        available: true,
        sampleSize: 1,
        flexibleRemainingCents: -500,
        availableWeekCents: -1200
      }
    });

    expect(insights.map(({ id }) => id)).toEqual([
      "morning_overrun",
      "task_overpacking",
      "evening_overload",
      "reality_baseline_warning",
      "too_much_money_spent",
      "vague_task_friction"
    ]);
  });

  it("preserves the complete non-judgmental top-insight contract", () => {
    const topInsight = selectTopDashboardInsight(deriveDashboardInsights({
      todaySummary: { plannedCount: 6, plannedHours: 7 },
      dailyTaskAverages: { sampleSize: 8, completedAverage: 3 },
      hourGapAverages: { sampleSize: 8, completedAverage: 3.5 },
      morningOverrun: { sampleSize: 8, averageOverrun: 1.8, actualAverage: 2.8, plannedAverage: 1.1 }
    }));

    expect(topInsight).toEqual({
      actions: [
        { id: "review_planned_hours", label: "Review planned hours" },
        { id: "focus_today_tasks", label: "Focus today's tasks" }
      ],
      id: "morning_overrun",
      mode: "reality",
      priority: 95,
      sampleSize: 8,
      title: "Your mornings are usually taking longer than planned.",
      why: "Across 8 recent days, morning blocks averaged 1.1h planned and 2.8h in practice."
    });
    expect(`${topInsight?.title} ${topInsight?.why}`).not.toMatch(/behind|fail|lazy|bad/i);
  });

  it("fires every cross-domain rule only with sufficient group evidence", () => {
    const insights = deriveDashboardInsights({
      todaySummary: { plannedCount: 3, plannedHours: 3 },
      energyCrashPattern: {
        sampleSize: 8,
        lowEnergyDays: 4,
        otherDays: 4,
        lowEnergyPreviousEveningHours: 3.2,
        otherPreviousEveningHours: 1.4,
        previousEveningDifference: 1.8
      },
      foodSpendingOnHighEditDays: {
        sampleSize: 8,
        highEditDays: 4,
        lowerEditDays: 4,
        highEditAverageFoodCents: 2100,
        lowerEditAverageFoodCents: 900,
        averageFoodDifferenceCents: 1200
      },
      journalBehaviorOnOverloadedDays: {
        sampleSize: 8,
        overloadedDays: 4,
        regularDays: 4,
        overloadedAverageLength: 48,
        regularAverageLength: 118
      },
      lateStudyCorrelation: {
        sampleSize: 8,
        lateStudyDays: 4,
        otherDays: 4,
        lateStudyCompletionRate: 0.32,
        otherCompletionRate: 0.68,
        completionRateDifference: 0.36
      },
      simpleMorningCorrelation: {
        sampleSize: 8,
        simpleMorningDays: 4,
        complexMorningDays: 4,
        simpleMorningCompletionRate: 0.75,
        complexMorningCompletionRate: 0.4,
        completionRateDifference: 0.35
      }
    });

    expect(insights.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "low_energy_after_heavy_evening",
      "food_spending_on_high_edit_days",
      "journal_behavior_on_overloaded_days",
      "late_study_completion_dip",
      "simple_morning_completion_boost"
    ]));
    expect(insights.every(({ why }) => !/always|proves|definitely/i.test(why))).toBe(true);
  });
});

describe("selectTopDashboardInsight", () => {
  it("returns null for an empty list", () => {
    expect(selectTopDashboardInsight([])).toBeNull();
  });
});
