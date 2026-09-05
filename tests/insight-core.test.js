const test = require("node:test");
const assert = require("node:assert/strict");
const insightCore = require("../frontend/js/insight-core.js");

function makeTask(label, hours, done, timerSeconds) {
  return {
    label,
    hours,
    done: Boolean(done),
    timerSeconds: timerSeconds || 0
  };
}

test("buildMetrics returns stable zeroed metrics for empty data", function () {
  const metrics = insightCore.buildMetrics({
    currentDateKey: "2026-08-06",
    taskMap: {},
    activityLog: [],
    lookbackDays: 7
  });

  assert.equal(metrics.todaySummary.plannedCount, 0);
  assert.equal(metrics.dailyTaskAverages.plannedAverage, 0);
  assert.equal(metrics.hourGapAverages.averageGap, 0);
  assert.equal(metrics.morningOverrun.averageOverrun, 0);
  assert.equal(metrics.eveningLoad.averageEveningHours, 0);
  assert.equal(metrics.editFrequency.averageEditsPerDay, 0);
  assert.equal(metrics.carryoverIndicators.carryoverRate, 0);
  assert.equal(metrics.unscheduledTaskCounts.latestUnscheduledCount, 0);
});

test("buildMetrics calculates task averages, hour gaps, evening load, and unscheduled counts", function () {
  const metrics = insightCore.buildMetrics({
    currentDateKey: "2026-08-06",
    lookbackDays: 4,
    taskMap: {
      "2026-08-03": [
        makeTask("09 Deep work", 1.5, true),
        makeTask("19 Guitar", 0.5, false),
        makeTask("Laundry", 0.25, false)
      ],
      "2026-08-04": [
        makeTask("10 Study", 1, true),
        makeTask("13 Admin", 1, false)
      ],
      "2026-08-05": [
        makeTask("08 Warmup", 0.5, true),
        makeTask("18 Review", 1, true)
      ],
      "2026-08-06": [
        makeTask("09 C++ eval", 1.5, false),
        makeTask("18 Review", 1, false),
        makeTask("Read notes", 0.5, false)
      ]
    },
    activityLog: [
      { action: "task_updated", entityType: "task", entityId: "t1", dateKey: "2026-08-05" },
      { action: "planned_hours_updated", entityType: "planned_hours", entityId: "study", dateKey: "2026-08-06" }
    ]
  });

  assert.equal(metrics.todaySummary.plannedCount, 3);
  assert.equal(metrics.dailyTaskAverages.sampleSize, 3);
  assert.equal(metrics.dailyTaskAverages.plannedAverage, 2.33);
  assert.equal(metrics.dailyTaskAverages.completedAverage, 1.33);
  assert.equal(metrics.hourGapAverages.plannedAverage, 1.92);
  assert.equal(metrics.hourGapAverages.completedAverage, 1.33);
  assert.equal(metrics.hourGapAverages.averageGap, 0.58);
  assert.equal(metrics.eveningLoad.latestEveningTaskCount, 1);
  assert.equal(metrics.unscheduledTaskCounts.latestUnscheduledCount, 1);
  assert.equal(metrics.editFrequency.latestEditCount, 1);
});

test("selectWindowSummaries respects lookback range and current-day inclusion", function () {
  const summaries = insightCore.buildDailySummaries({
    "2026-08-01": [makeTask("09 A", 1, true)],
    "2026-08-03": [makeTask("09 B", 1, true)],
    "2026-08-05": [makeTask("09 C", 1, true)],
    "2026-08-06": [makeTask("09 D", 1, true)]
  });

  const withoutCurrent = insightCore.selectWindowSummaries(summaries, "2026-08-06", 3, false);
  const withCurrent = insightCore.selectWindowSummaries(summaries, "2026-08-06", 3, true);

  assert.deepEqual(withoutCurrent.map(function (item) { return item.dateKey; }), ["2026-08-05"]);
  assert.deepEqual(withCurrent.map(function (item) { return item.dateKey; }), ["2026-08-05", "2026-08-06"]);
});

test("calculateMorningOverrun uses logged hour changes for morning tasks only", function () {
  const summaries = insightCore.buildDailySummaries({
    "2026-08-04": [
      makeTask("09 Shower + ready", 2.5, true),
      makeTask("18 Review", 1, true)
    ],
    "2026-08-05": [
      makeTask("10 Commute + settle", 2, true)
    ],
    "2026-08-06": [
      makeTask("09 Focus", 1, false)
    ]
  });

  const overrun = insightCore.calculateMorningOverrun(summaries, [
    {
      action: "task_updated",
      entityType: "task",
      entityId: "m1",
      field: "hours",
      dateKey: "2026-08-04",
      after: 1,
      meta: { label: "09 Shower + ready" }
    },
    {
      action: "task_updated",
      entityType: "task",
      entityId: "m2",
      field: "hours",
      dateKey: "2026-08-05",
      after: 0.75,
      meta: { label: "10 Commute + settle" }
    },
    {
      action: "task_updated",
      entityType: "task",
      entityId: "e1",
      field: "hours",
      dateKey: "2026-08-04",
      after: 1,
      meta: { label: "18 Review" }
    }
  ], "2026-08-06", 3);

  assert.equal(overrun.plannedAverage, 0.88);
  assert.equal(overrun.actualAverage, 2.25);
  assert.equal(overrun.averageOverrun, 1.38);
});

test("buildMetrics ignores invalid task-map keys and malformed activity entries safely", function () {
  const metrics = insightCore.buildMetrics({
    currentDateKey: "2026-08-06",
    lookbackDays: 5,
    taskMap: {
      invalid: [makeTask("09 Wrong", 1, true)],
      "2026-08-05": [makeTask("10 Valid", 1, false), makeTask("Read 20 pages", 0.5, false)],
      "2026-08-06": [makeTask("11 Valid", 1, true)]
    },
    activityLog: [
      null,
      { action: "task_updated", entityType: "task", entityId: "x", dateKey: "bad-date" },
      { action: "task_updated", entityType: "task", entityId: "y", dateKey: "2026-08-05" }
    ]
  });

  assert.equal(metrics.dailySummaries.length, 2);
  assert.equal(metrics.unscheduledTaskCounts.averageUnscheduledCount, 0.5);
  assert.equal(metrics.editFrequency.latestEditCount, 0);
  assert.equal(metrics.carryoverIndicators.unfinishedTotal, 2);
});

test("buildMetrics ignores non-finite task and money durations", function () {
  const metrics = insightCore.buildMetrics({
    currentDateKey: "2026-08-08",
    taskMap: {
      "2026-08-07": [
        { label: "09 Corrupt timer", timerSeconds: Infinity, hours: Infinity, done: true },
        { label: "10 Invalid values", timerSeconds: "not-a-number", hours: "not-a-number", done: true }
      ]
    },
    moneyTransactions: [
      { date: "2026-08-07", amountCents: Infinity, categoryId: "groceries" }
    ]
  });

  assert.equal(metrics.hourGapAverages.plannedAverage, 0);
  assert.equal(metrics.hourGapAverages.completedAverage, 0);
  assert.equal(metrics.foodSpendingOnHighEditDays.lowerEditAverageFoodCents, 0);
});

test("calculateCarryoverIndicators spots unfinished tasks that reappear later", function () {
  const summaries = insightCore.buildDailySummaries({
    "2026-08-03": [
      makeTask("09 Study C++", 1, false),
      makeTask("Laundry", 0.5, false)
    ],
    "2026-08-04": [
      makeTask("10 Study C++", 1, true),
      makeTask("Walk", 0.25, false)
    ],
    "2026-08-05": [
      makeTask("11 Walk", 0.25, true)
    ],
    "2026-08-06": [
      makeTask("12 Focus", 1, false)
    ]
  });

  const carryover = insightCore.calculateCarryoverIndicators(summaries, "2026-08-06", 4);

  assert.equal(carryover.unfinishedTotal, 3);
  assert.equal(carryover.carriedForwardTotal, 2);
  assert.equal(carryover.carryoverRate, 0.67);
});

test("buildMetrics calculates cross-domain patterns from tasks, edits, money, and journal data", function () {
  const metrics = insightCore.buildMetrics({
    currentDateKey: "2026-08-07",
    lookbackDays: 7,
    taskMap: {
      "2026-08-01": [makeTask("09 Study C++", 1, true), makeTask("19 Review", 1, false)],
      "2026-08-02": [makeTask("09 Leetcode", 1, true), makeTask("11 Admin", 1, true)],
      "2026-08-03": [makeTask("09 C++", 1, false), makeTask("10 Leetcode", 1, false), makeTask("11 Admin", 1, false), makeTask("12 Python", 1, false), makeTask("19 Review", 1, false), makeTask("20 Guitar", 1, false)],
      "2026-08-04": [makeTask("09 Deep work", 1, true), makeTask("18 Guitar", 1, true)],
      "2026-08-05": [makeTask("08 Shower", 0.5, true), makeTask("09 Plan", 0.5, true), makeTask("10 C++", 1, false), makeTask("11 Leetcode", 1, false), makeTask("12 Python", 1, false), makeTask("19 Review", 1, false)],
      "2026-08-06": [makeTask("09 Focus", 1, true), makeTask("10 Admin", 1, true)]
    },
    activityLog: [
      { action: "task_updated", entityType: "task", entityId: "a1", dateKey: "2026-08-01" },
      { action: "task_updated", entityType: "task", entityId: "a2", dateKey: "2026-08-03" },
      { action: "task_updated", entityType: "task", entityId: "a3", dateKey: "2026-08-03" },
      { action: "task_updated", entityType: "task", entityId: "a4", dateKey: "2026-08-03" },
      { action: "planned_hours_updated", entityType: "planned_hours", entityId: "p1", dateKey: "2026-08-03" },
      { action: "task_updated", entityType: "task", entityId: "a5", dateKey: "2026-08-04" },
      { action: "task_updated", entityType: "task", entityId: "a6", dateKey: "2026-08-05" },
      { action: "task_updated", entityType: "task", entityId: "a7", dateKey: "2026-08-05" },
      { action: "task_updated", entityType: "task", entityId: "a8", dateKey: "2026-08-05" },
      { action: "planned_hours_updated", entityType: "planned_hours", entityId: "p2", dateKey: "2026-08-05" }
    ],
    moneyTransactions: [
      { id: "m1", date: "2026-08-01", amountCents: 700, categoryId: "groceries" },
      { id: "m2", date: "2026-08-02", amountCents: 800, categoryId: "eating-out" },
      { id: "m3", date: "2026-08-03", amountCents: 2200, categoryId: "groceries" },
      { id: "m4", date: "2026-08-04", amountCents: 600, categoryId: "groceries" },
      { id: "m5", date: "2026-08-05", amountCents: 1800, categoryId: "eating-out" },
      { id: "m6", date: "2026-08-06", amountCents: 500, categoryId: "groceries" }
    ],
    journalEntries: [
      { date: "2026-08-01", title: "A", content: "A fairly reflective journal note with a decent amount of detail.", tracker: { energy: "good" } },
      { date: "2026-08-02", title: "B", content: "Another pretty detailed entry that has enough length to compare.", tracker: { energy: "good" } },
      { date: "2026-08-03", title: "C", content: "Short note.", tracker: { energy: "good" } },
      { date: "2026-08-04", title: "D", content: "Longer calm-day reflection with more words and specifics included.", tracker: { energy: "low" } },
      { date: "2026-08-05", title: "E", content: "Brief.", tracker: { energy: "good" } },
      { date: "2026-08-06", title: "F", content: "A fuller note again with a more settled tone and extra detail.", tracker: { energy: "empty" } }
    ]
  });

  assert.equal(metrics.foodSpendingOnHighEditDays.highEditDays, 2);
  assert.equal(metrics.foodSpendingOnHighEditDays.lowerEditDays, 4);
  assert.equal(metrics.lateStudyCorrelation.lateStudyDays, 3);
  assert.equal(metrics.simpleMorningCorrelation.simpleMorningDays, 2);
  assert.equal(metrics.simpleMorningCorrelation.completionRateDifference > 0, true);
  assert.equal(metrics.journalBehaviorOnOverloadedDays.overloadedDays, 2);
  assert.equal(metrics.energyCrashPattern.lowEnergyDays, 2);
  assert.equal(metrics.energyCrashPattern.otherDays, 3);
  assert.equal(metrics.energyCrashPattern.previousEveningDifference > 0, true);
});
