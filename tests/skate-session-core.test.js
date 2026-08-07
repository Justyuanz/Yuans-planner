const test = require("node:test");
const assert = require("node:assert/strict");

const skateSessionCore = require("../frontend/js/skate-session-core.js");

test("applySessionDurationToTasks finishes the matching skate task and carries timer time into hours", () => {
  const nowMs = Date.parse("2026-08-07T12:30:00Z");
  const result = skateSessionCore.applySessionDurationToTasks([
    {
      id: "task-1",
      label: "Skate today",
      activity: "skate",
      done: false,
      timerStartedAt: "2026-08-07T12:00:00Z",
      timerSeconds: 600,
      hours: 0.17
    },
    {
      id: "task-2",
      label: "Study block",
      activity: "python",
      done: false,
      timerStartedAt: null,
      timerSeconds: 0,
      hours: 0
    }
  ], "skate", 0.5, nowMs);

  assert.equal(result.linkedTaskLabel, "Skate today");
  assert.equal(result.tasks[0].done, true);
  assert.equal(result.tasks[0].timerStartedAt, null);
  assert.equal(result.tasks[0].timerSeconds, 4200);
  assert.equal(result.tasks[0].hours, 1.17);
  assert.equal(result.tasks[1].done, false);
});

test("boardHoursTotalFromSessions sums finished session duration", () => {
  const total = skateSessionCore.boardHoursTotalFromSessions([
    { durationHours: 0.75 },
    { durationHours: 1.25 },
    { durationHours: 0 },
    null
  ]);

  assert.equal(total, 2);
});

test("applySessionDurationToTasks creates a done skate task when none exists yet", () => {
  const nowMs = Date.parse("2026-08-07T18:52:00Z");
  const result = skateSessionCore.applySessionDurationToTasks([], "skate", 0.25, nowMs);

  assert.equal(result.linkedTaskLabel, "Skate session");
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].activity, "skate");
  assert.equal(result.tasks[0].done, true);
  assert.equal(result.tasks[0].hours, 0.25);
  assert.equal(result.tasks[0].timerSeconds, 900);
});
