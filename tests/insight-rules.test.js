const test = require("node:test");
const assert = require("node:assert/strict");
const insightRules = require("../frontend/js/insight-rules.js");

test("rules do not fire on tiny sample sizes", function () {
  const insights = insightRules.deriveInsights({
    todaySummary: { plannedCount: 6, plannedHours: 7, eveningHours: 3, eveningTaskCount: 3 },
    dailyTaskAverages: { sampleSize: 2, completedAverage: 3 },
    hourGapAverages: { sampleSize: 2, completedAverage: 3 },
    morningOverrun: { sampleSize: 2, averageOverrun: 2, actualAverage: 3, plannedAverage: 1 },
    eveningLoad: { sampleSize: 2, latestEveningHours: 3, latestEveningTaskCount: 3, averageEveningHours: 1.5 },
    vagueTaskFriction: { sampleSize: 2, vagueOpenCount: 3, vagueCompletionRate: 0.2, specificCompletionRate: 0.8 }
  });

  assert.deepEqual(insights, []);
});

test("rule priority ordering is stable", function () {
  const insights = insightRules.deriveInsights({
    todaySummary: { plannedCount: 6, plannedHours: 7, eveningHours: 3, eveningTaskCount: 3 },
    dailyTaskAverages: { sampleSize: 8, completedAverage: 3 },
    hourGapAverages: { sampleSize: 8, completedAverage: 3.5 },
    morningOverrun: { sampleSize: 8, averageOverrun: 1.8, actualAverage: 2.8, plannedAverage: 1 },
    eveningLoad: { sampleSize: 8, latestEveningHours: 3.2, latestEveningTaskCount: 3, averageEveningHours: 1.6 },
    vagueTaskFriction: { sampleSize: 8, vagueOpenCount: 3, vagueCompletionRate: 0.2, specificCompletionRate: 0.8 },
    moneySummary: { available: true, sampleSize: 1, flexibleRemainingCents: -500, availableWeekCents: -1200 }
  });

  assert.deepEqual(
    insights.map(function (entry) { return entry.id; }),
    [
      "morning_overrun",
      "task_overpacking",
      "evening_overload",
      "reality_baseline_warning",
      "too_much_money_spent",
      "vague_task_friction"
    ]
  );
});

test("rule wording stays non-judgmental and insight shape is complete", function () {
  const topInsight = insightRules.selectTopInsight(insightRules.deriveInsights({
    todaySummary: { plannedCount: 6, plannedHours: 7, eveningHours: 3, eveningTaskCount: 3 },
    dailyTaskAverages: { sampleSize: 8, completedAverage: 3 },
    hourGapAverages: { sampleSize: 8, completedAverage: 3.5 },
    morningOverrun: { sampleSize: 8, averageOverrun: 1.8, actualAverage: 2.8, plannedAverage: 1.1 },
    eveningLoad: { sampleSize: 8, latestEveningHours: 3.2, latestEveningTaskCount: 3, averageEveningHours: 1.6 },
    vagueTaskFriction: { sampleSize: 8, vagueOpenCount: 3, vagueCompletionRate: 0.2, specificCompletionRate: 0.8 }
  }));

  assert.equal(typeof topInsight.id, "string");
  assert.equal(typeof topInsight.mode, "string");
  assert.equal(typeof topInsight.priority, "number");
  assert.equal(typeof topInsight.title, "string");
  assert.equal(typeof topInsight.why, "string");
  assert.ok(Array.isArray(topInsight.actions));
  assert.equal(typeof topInsight.actions[0].id, "string");
  assert.equal(typeof topInsight.actions[0].label, "string");
  assert.equal(typeof topInsight.sampleSize, "number");
  assert.equal(/behind|fail|lazy|bad/i.test(topInsight.title + " " + topInsight.why), false);
});

test("cross-domain rules fire with cautious wording only when group sizes are large enough", function () {
  const insights = insightRules.deriveInsights({
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

  assert.ok(insights.some(function (entry) { return entry.id === "low_energy_after_heavy_evening"; }));
  assert.ok(insights.some(function (entry) { return entry.id === "food_spending_on_high_edit_days"; }));
  assert.ok(insights.some(function (entry) { return entry.id === "journal_behavior_on_overloaded_days"; }));
  assert.ok(insights.some(function (entry) { return entry.id === "late_study_completion_dip"; }));
  assert.ok(insights.some(function (entry) { return entry.id === "simple_morning_completion_boost"; }));
  assert.equal(insights.every(function (entry) {
    return !/always|proves|definitely/i.test(entry.why);
  }), true);
});
