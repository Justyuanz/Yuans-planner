const test = require("node:test");
const assert = require("node:assert/strict");

const calendarTaskSync = require("../frontend/js/calendar-task-sync.js");

test("activityIdForCategory keeps the legacy calendar-to-task mapping", function () {
  assert.equal(calendarTaskSync.activityIdForCategory("Study/school"), "cpp");
  assert.equal(calendarTaskSync.activityIdForCategory("Skate"), "skate");
  assert.equal(calendarTaskSync.activityIdForCategory("Gym"), "p90x3");
  assert.equal(calendarTaskSync.activityIdForCategory("Guitar"), "guitar");
  assert.equal(calendarTaskSync.activityIdForCategory("Finnish"), "other");
  assert.equal(calendarTaskSync.activityIdForCategory("Personal"), "other");
});

test("createTaskFromEvent preserves schedule and source-reminder behavior", function () {
  const task = calendarTaskSync.createTaskFromEvent(
    {
      id: "event-1",
      title: "Study block",
      category: "Study/school",
      startTime: "09:00",
      reminderMinutes: 15
    },
    {
      id: "calendar-task-1",
      createdAt: "2026-09-12T08:00:00.000Z",
      scheduledTime: "09:00",
      reminderMinutes: 15
    }
  );

  assert.deepEqual(task, {
    id: "calendar-task-1",
    label: "Study block",
    activity: "cpp",
    hours: 0,
    timerSeconds: 0,
    timerStartedAt: null,
    done: false,
    createdAt: "2026-09-12T08:00:00.000Z",
    sourceEventId: "event-1",
    useSourceEventReminder: true,
    scheduledTime: "09:00",
    reminderMinutes: 15
  });
});

test("mergeLinkedTasks keeps user state, removes stale links, and adds missing events once", function () {
  const manualTask = { id: "manual", label: "Manual", sourceEventId: "" };
  const existingLinkedTask = {
    id: "linked-a",
    label: "User-edited label",
    sourceEventId: "event-a",
    done: true,
    timerSeconds: 120
  };
  const staleLinkedTask = { id: "stale", label: "Stale", sourceEventId: "event-old" };
  const events = [
    { id: "event-a", title: "Current A" },
    { id: "event-b", title: "Current B" }
  ];

  const result = calendarTaskSync.mergeLinkedTasks(
    [manualTask, existingLinkedTask, staleLinkedTask],
    events,
    function (event) {
      return { id: "linked-" + event.id, label: event.title, sourceEventId: event.id };
    }
  );

  assert.equal(result.changed, true);
  assert.equal(result.importedCount, 1);
  assert.deepEqual(result.tasks, [
    manualTask,
    existingLinkedTask,
    { id: "linked-event-b", label: "Current B", sourceEventId: "event-b" }
  ]);

  const stable = calendarTaskSync.mergeLinkedTasks(result.tasks, events, function () {
    throw new Error("A stable sync must not create another linked task.");
  });
  assert.equal(stable.changed, false);
  assert.equal(stable.importedCount, 0);
  assert.deepEqual(stable.tasks, result.tasks);
});

test("mergeLinkedTasks treats malformed collections as empty", function () {
  assert.deepEqual(calendarTaskSync.mergeLinkedTasks(null, null, function () {}), {
    tasks: [],
    changed: false,
    importedCount: 0
  });
});
