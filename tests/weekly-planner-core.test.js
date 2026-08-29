const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../frontend/js/weekly-planner-core.js");

function block(category, startTime, endTime) {
  return {
    id: category + "-" + startTime,
    category,
    title: core.categoryMeta(category).shortLabel,
    startTime,
    endTime
  };
}

test("missing Recovery Day fails validation", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "high" },
      { type: "high" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.validateWeekPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /Recovery Day/);
});

test("third High-Intensity Day fails validation", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "recovery" },
      { type: "high" },
      { type: "high" },
      { type: "high" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.validateWeekPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /two High-Intensity Days/i);
});

test("the only Recovery Day stays locked until another day becomes Recovery", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "recovery" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "high" },
      { type: "high" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.dayTypeChangeAllowed(plan, 0, "normal", [], { skateStreakActive: true });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /Keep one Recovery Day protected/i);
});

test("Recovery Day blocks non-skate activities and long skating", function () {
  const studyResult = core.canAddActivity("recovery", [], block("Study/school", "10:00", "10:30"), {
    skateStreakActive: true
  });
  const longSkateResult = core.canAddActivity("recovery", [], block("Skate", "10:00", "10:20"), {
    skateStreakActive: true
  });
  const shortSkateResult = core.canAddActivity("recovery", [], block("Skate", "10:00", "10:10"), {
    skateStreakActive: true
  });

  assert.equal(studyResult.allowed, false);
  assert.equal(longSkateResult.allowed, false);
  assert.equal(shortSkateResult.allowed, true);
});

test("capacity locking marks a full day and rejects another optional activity", function () {
  const activities = [
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "16:00")
  ];
  const summary = core.daySummary("normal", activities);
  const addResult = core.canAddActivity("normal", activities, block("Guitar", "19:00", "19:30"));

  assert.equal(summary.status, "Day full");
  assert.equal(summary.canAddActivity, false);
  assert.equal(addResult.allowed, false);
});

test("remaining capacity recommendations use only remaining points", function () {
  const onePointLeft = core.daySummary("normal", [
    block("Study/school", "10:00", "11:00")
  ]);
  const twoPointsLeft = core.daySummary("normal", [
    block("Study/school", "10:00", "10:30"),
    block("Guitar", "18:00", "18:30")
  ]);

  assert.equal(onePointLeft.remainingPoints, 2);
  assert.equal(onePointLeft.recommendedMaxMinutes, 90);
  assert.equal(twoPointsLeft.remainingPoints, 2);
  assert.equal(twoPointsLeft.recommendedMaxMinutes, 90);

  const shortOnly = core.daySummary("normal", [
    block("Study/school", "10:00", "11:40")
  ]);
  assert.equal(shortOnly.remainingPoints, 1);
  assert.equal(shortOnly.recommendedMaxMinutes, 30);

  const tooLong = core.canAddActivity("normal", [
    block("Study/school", "10:00", "11:40")
  ], block("Personal", "18:00", "18:45"));
  assert.equal(tooLong.allowed, false);
  assert.match(tooLong.reason, /short activity/i);
});

test("repeated categories stay as separate blocks in one day", function () {
  const activities = core.normalizeActivities([
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "16:00"),
    block("Study/school", "20:00", "21:00")
  ]);

  assert.deepEqual(activities.map(function (activity) {
    return activity.category + "@" + activity.startTime;
  }), [
    "Study/school@10:00",
    "Skate@15:00",
    "Study/school@20:00"
  ]);
});

test("moving or shortening a block recalculates remaining capacity", function () {
  const original = core.daySummary("high", [
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "16:30"),
    block("Gym", "19:00", "20:30")
  ]);
  const shortened = core.daySummary("high", [
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "15:30"),
    block("Gym", "19:00", "19:30")
  ]);

  assert.equal(original.remainingPoints, 0);
  assert.equal(shortened.remainingPoints, 1);
  assert.equal(shortened.status, "Only light activity fits");
});
