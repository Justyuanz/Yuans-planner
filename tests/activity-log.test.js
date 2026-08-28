const test = require("node:test");
const assert = require("node:assert/strict");
const activityLog = require("../frontend/js/activity-log.js");

test("normalizeEntries keeps only valid activity records and sorts them", function () {
  const entries = activityLog.normalizeEntries([
    null,
    { action: "task_created" },
    {
      id: "b",
      timestamp: "2026-08-06T10:00:00.000Z",
      action: "task_created",
      entityType: "task",
      entityId: "task-b"
    },
    {
      id: "a",
      timestamp: "2026-08-06T09:00:00.000Z",
      action: "task_updated",
      entityType: "task",
      entityId: "task-a",
      field: "hours",
      before: 1,
      after: 3
    }
  ]);

  assert.deepEqual(entries.map(function (entry) { return entry.id; }), ["a", "b"]);
});

test("createEntry clones before and after payloads", function () {
  const before = { label: "Study", hours: 1 };
  const after = { label: "Study", hours: 3 };
  const entry = activityLog.createEntry({
    id: "activity-1",
    timestamp: "2026-08-06T10:00:00.000Z",
    action: "task_updated",
    entityType: "task",
    entityId: "task-1",
    field: "hours",
    before,
    after
  });

  before.hours = 9;
  after.hours = 12;

  assert.equal(entry.before.hours, 1);
  assert.equal(entry.after.hours, 3);
});

test("createEntry rejects unknown actions", function () {
  const entry = activityLog.createEntry({
    id: "activity-2",
    timestamp: "2026-08-06T10:00:00.000Z",
    action: "not_real",
    entityType: "task",
    entityId: "task-1"
  });

  assert.equal(entry, null);
});

test("createEntry accepts agent and day-state actions", function () {
  const entry = activityLog.createEntry({
    id: "activity-3",
    timestamp: "2026-08-06T10:00:00.000Z",
    action: "agent_action_applied",
    entityType: "agent_action",
    entityId: "simplify_today"
  });

  const dayStateEntry = activityLog.createEntry({
    id: "activity-4",
    timestamp: "2026-08-06T10:01:00.000Z",
    action: "day_state_updated",
    entityType: "day_state",
    entityId: "2026-08-06"
  });

  assert.equal(entry.action, "agent_action_applied");
  assert.equal(dayStateEntry.action, "day_state_updated");
});
