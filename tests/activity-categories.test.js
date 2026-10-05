const test = require("node:test");
const assert = require("node:assert/strict");
const categories = require("../frontend/js/activity-categories.js");

test("legacy tracked activities migrate to the production replacements", function () {
  assert.equal(categories.normalizeActivityId("lc"), "portfolioJobPrep");
  assert.equal(categories.normalizeActivityId("cpp"), "transcendence");
  assert.equal(categories.normalizeActivityId("fso"), "transcendence");
  assert.equal(categories.normalizeActivityId("python"), "mobileDevelopment");
  assert.equal(categories.normalizeActivityId("p90x3"), "gym");
});

test("migration preserves task details and combines planned hours", function () {
  const tasks = categories.migrateTasks([
    { id: "one", label: "Practice", activity: "cpp", hours: 2 },
    { id: "two", label: "Apply", track: "lc", hours: 1 }
  ]);
  assert.deepEqual(tasks.map(function (task) { return task.activity; }), ["transcendence", "portfolioJobPrep"]);
  assert.equal(tasks[0].hours, 2);
  assert.equal(tasks[1].track, undefined);
  assert.deepEqual(categories.migratePlannedHours({
    cpp: 2,
    fso: 3,
    transcendence: 4,
    python: 1,
    futureActivity: { preserve: true }
  }), {
    transcendence: 9,
    mobileDevelopment: 1,
    futureActivity: { preserve: true }
  });
});

test("calendar categories and activity-log values migrate without changing unrelated fields", function () {
  const events = categories.migrateEvents([
    { id: "coding", category: "Coding" },
    { id: "python", category: "Python" },
    { id: "leetcode", category: "LeetCode" },
    { id: "future", category: "Future category" }
  ]);
  assert.deepEqual(events.map(function (event) { return event.category; }), [
    "Transcendence",
    "Mobile Development",
    "Portfolio / Job Prep",
    "Future category"
  ]);
  const entry = categories.migrateValue({
    action: "task_updated",
    field: "done",
    meta: { activity: "python", preserve: true }
  }, "");
  assert.equal(entry.field, "done");
  assert.equal(entry.meta.activity, "mobileDevelopment");
  assert.equal(entry.meta.preserve, true);
});
