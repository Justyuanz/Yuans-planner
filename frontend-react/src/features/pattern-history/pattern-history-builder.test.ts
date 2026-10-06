import { describe, expect, it } from "vitest";

import type { DashboardInsight } from "../dashboard-insight/dashboard-insight-rules";
import { buildPatternHistoryFromMetrics } from "./pattern-history-builder";

function insight(
  id: string,
  mode: DashboardInsight["mode"],
  priority: number
): DashboardInsight {
  return {
    actions: [
      { id: "first", label: "First action" },
      { id: "second", label: "Second action" },
      { id: "third", label: "Ignored action" }
    ],
    id,
    mode,
    priority,
    sampleSize: 8,
    title: `${id} title`,
    why: `${id} summary`
  };
}

const METRICS = {
  morningOverrun: { sampleSize: 8, plannedAverage: 1.24, actualAverage: 2.76 },
  todaySummary: { plannedCount: 6, plannedHours: 7.24 },
  dailyTaskAverages: { completedAverage: 3.24, plannedAverage: 5.76 },
  eveningLoad: {
    latestEveningHours: 3.24,
    latestEveningTaskCount: 4,
    averageEveningHours: 1.76
  },
  moneySummary: { availableWeekLabel: "EUR -12.00", flexibleRemainingLabel: "EUR -5.00" },
  vagueTaskFriction: {
    vagueOpenCount: 3,
    vagueCompletionRate: 0.244,
    specificCompletionRate: 0.756
  },
  hourGapAverages: { completedAverage: 3.24, plannedAverage: 5.76 },
  foodSpendingOnHighEditDays: {
    highEditDays: 4,
    highEditAverageFoodCents: 2155,
    lowerEditAverageFoodCents: 904
  },
  journalBehaviorOnOverloadedDays: {
    overloadedDays: 4,
    overloadedAverageLength: 48.4,
    regularAverageLength: 118.6
  },
  lateStudyCorrelation: {
    lateStudyDays: 4,
    lateStudyCompletionRate: 0.34,
    otherCompletionRate: 0.78
  },
  simpleMorningCorrelation: {
    simpleMorningDays: 4,
    simpleMorningCompletionRate: 0.81,
    complexMorningCompletionRate: 0.49
  },
  energyCrashPattern: {
    lowEnergyDays: 4,
    lowEnergyPreviousEveningHours: 3.24,
    otherPreviousEveningHours: 1.36
  }
};

describe("buildPatternHistoryFromMetrics", () => {
  it("preserves the fixed empty 14-day snapshot contract", () => {
    expect(buildPatternHistoryFromMetrics([], {}, "2026-09-14", 0)).toEqual({
      groups: [],
      isEmpty: true,
      rangeLabel: "Last 14 days through 2026-09-14"
    });
  });

  it("groups, sorts, and limits actions like the legacy history", () => {
    const model = buildPatternHistoryFromMetrics([
      insight("vague_task_friction", "focus", 80),
      insight("task_overpacking", "reality", 90),
      insight("reality_baseline_warning", "reality", 84)
    ], METRICS, "2026-09-14", 14);

    expect(model.groups.map((group) => ({
      ids: group.items.map((item) => item.id),
      mode: group.mode,
      title: group.title
    }))).toEqual([
      {
        ids: ["task_overpacking", "reality_baseline_warning"],
        mode: "reality",
        title: "Reality checks"
      },
      { ids: ["vague_task_friction"], mode: "focus", title: "Focus friction" }
    ]);
    expect(model.groups[0]?.items[0]?.actions).toEqual([
      { id: "first", label: "First action" },
      { id: "second", label: "Second action" }
    ]);
  });

  it("matches every legacy evidence format", () => {
    const ids: readonly [string, DashboardInsight["mode"]][] = [
      ["morning_overrun", "reality"],
      ["task_overpacking", "reality"],
      ["evening_overload", "reality"],
      ["too_much_money_spent", "reality"],
      ["vague_task_friction", "focus"],
      ["reality_baseline_warning", "reality"],
      ["food_spending_on_high_edit_days", "reality"],
      ["journal_behavior_on_overloaded_days", "focus"],
      ["late_study_completion_dip", "reality"],
      ["simple_morning_completion_boost", "focus"],
      ["low_energy_after_heavy_evening", "focus"]
    ];
    const model = buildPatternHistoryFromMetrics(
      ids.map(([id, mode], index) => insight(id, mode, 100 - index)),
      METRICS,
      "2026-09-14",
      14
    );
    const evidence = Object.fromEntries(model.groups.flatMap((group) => (
      group.items.map((item) => [item.id, item.evidence])
    )));

    expect(evidence).toEqual({
      morning_overrun: [
        "Recent sample: 8 days.",
        "Planned mornings averaged 1.2h.",
        "Actual mornings averaged 2.8h."
      ],
      task_overpacking: [
        "Today's plan holds 6 tasks.",
        "Recent completion average is 3.2 tasks/day.",
        "Recent planned average is 5.8 tasks/day."
      ],
      evening_overload: [
        "Today's evening load is 3.2h.",
        "That is spread across 4 tasks tonight.",
        "Recent evening average is 1.8h."
      ],
      too_much_money_spent: [
        "Weekly flexible room: EUR -12.00.",
        "Monthly flexible room: EUR -5.00."
      ],
      vague_task_friction: [
        "3 open tasks still look broad.",
        "Vague task completion rate: 24%.",
        "Specific task completion rate: 76%."
      ],
      reality_baseline_warning: [
        "Today's plan adds up to 7.2h.",
        "Recent completed average is 3.2h/day.",
        "Recent planned average is 5.8h/day."
      ],
      food_spending_on_high_edit_days: [
        "Higher-edit days: 4.",
        "Food average on high-edit days: EUR 21.55.",
        "Food average on calmer days: EUR 9.04."
      ],
      journal_behavior_on_overloaded_days: [
        "Overloaded days sampled: 4.",
        "Average journal length on overloaded days: 48 chars.",
        "Average journal length on lighter days: 119 chars."
      ],
      late_study_completion_dip: [
        "Late-study days sampled: 4.",
        "Completion on late-study days: 34%.",
        "Completion on other days: 78%."
      ],
      simple_morning_completion_boost: [
        "Simple mornings sampled: 4.",
        "Completion on simple-morning days: 81%.",
        "Completion on crowded-morning days: 49%."
      ],
      low_energy_after_heavy_evening: [
        "Low-energy days sampled: 4.",
        "Evening hours before low-energy days: 3.2h.",
        "Evening hours before steadier days: 1.4h."
      ]
    });
  });
});
