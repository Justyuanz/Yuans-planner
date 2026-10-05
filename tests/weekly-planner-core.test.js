const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../frontend/js/weekly-planner-core.js");

function block(category, startTime, endTime, effort) {
  return { category, title: core.categoryMeta(category).shortLabel, startTime, endTime, effort };
}

test("day budgets match Yuan's home, normal, and high-intensity planning styles", function () {
  assert.equal(core.dayTypeById("recovery").capacityLoad, 4.5);
  assert.equal(core.dayTypeById("normal").capacityLoad, 7);
  assert.equal(core.dayTypeById("high").capacityLoad, 9);
});

test("load changes continuously with duration instead of jumping at thresholds", function () {
  assert.equal(core.loadForActivity("Study/school", 60, "standard"), 1);
  assert.equal(core.loadForActivity("Study/school", 75, "standard"), 1.25);
  assert.equal(core.loadForActivity("Study/school", 300, "standard"), 5);
});

test("effort is user-selectable and changes the same activity's load", function () {
  assert.equal(core.loadForActivity("Skate", 90, "easy"), 1.35);
  assert.equal(core.loadForActivity("Skate", 90, "standard"), 1.8);
  assert.equal(core.loadForActivity("Skate", 90, "demanding"), 2.25);
  assert.equal(core.normalizeActivity(block("Transcendence", "10:00", "11:00")).effort, "standard");
});

test("physical categories use demanding as the compatible default effort", function () {
  assert.equal(core.normalizeActivity(block("Skate", "10:00", "11:00")).effort, "demanding");
  assert.equal(core.normalizeActivity(block("Gym", "10:00", "11:00")).load, 1.63);
});

test("normal day fits school, a short demanding skate, and simple supporting blocks", function () {
  const summary = core.daySummary("normal", [
    block("Study/school", "09:00", "13:30", "standard"),
    block("Skate", "15:00", "15:30", "demanding"),
    block("Guitar", "18:00", "18:30", "standard"),
    block("Chores/groceries", "19:00", "19:30", "standard")
  ]);

  assert.equal(summary.activityLoad, 6);
  assert.equal(summary.contextSwitchLoad, 0.25);
  assert.equal(summary.usedLoad, 6.25);
  assert.equal(summary.remainingLoad, 0.75);
  assert.equal(summary.status, "Space left");
});

test("recovery day allows a stay-home study day and light life maintenance", function () {
  const addResult = core.canAddActivity("recovery", [
    block("Study/school", "09:00", "12:30", "standard")
  ], block("Chores/groceries", "13:00", "14:00", "standard"));

  assert.equal(addResult.allowed, true);
  assert.equal(core.canAddActivity("recovery", [], block("Skate", "14:00", "14:45", "easy")).allowed, false);
});

test("preview shows the exact prospective total and explains an over-budget block", function () {
  const preview = core.previewActivityLoad("normal", [
    block("Study/school", "09:00", "14:00", "standard")
  ], block("Gym", "16:00", "18:00", "demanding"));

  assert.equal(preview.candidate.load, 3.25);
  assert.equal(preview.projected.usedLoad, 8.25);
  assert.equal(preview.allowed, false);
  assert.match(preview.reason, /over the 7 load-hour budget/i);
});

test("context-switch load starts with the fourth real activity and reminders stay free", function () {
  const summary = core.daySummary("normal", [
    block("Study/school", "09:00", "10:00"),
    block("Guitar", "11:00", "11:30"),
    block("Chores/groceries", "12:00", "12:30"),
    block("Personal", "13:00", "13:30"),
    { category: "Personal", title: "Call clinic", reminderOnly: true }
  ]);

  assert.equal(summary.contextSwitchLoad, 0.25);
  assert.equal(summary.activities[4].load, 0);
});

test("week validation still protects one recovery day and two high-intensity days", function () {
  const plan = core.normalizeWeekPlan({ days: [
    { type: "recovery" }, { type: "high" }, { type: "high" }, { type: "high" },
    { type: "normal" }, { type: "normal" }, { type: "normal" }
  ] }, "2026-W36");
  assert.equal(core.validateWeekPlan(plan).valid, false);
  assert.match(core.validateWeekPlan(plan).errors[0], /two High-Intensity Days/i);
});

test("Finnish retains its category and counts class time as study load", () => {
  assert.equal(core.normalizeCategory("Finnish"), "Finnish");
  assert.equal(core.categoryMeta("Finnish").className, "finnish-block");
  assert.equal(core.loadForActivity("Finnish", 195, "standard"), core.loadForActivity("Study/school", 195, "standard"));
});
