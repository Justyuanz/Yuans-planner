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

test("datedSessionWindow keeps a retro log anchored to the chosen calendar date", () => {
  const window = skateSessionCore.datedSessionWindow("2026-08-30", 90);

  assert.equal(window.finishedAt.slice(0, 10), "2026-08-30");
  assert.equal(window.startedAt.slice(0, 10), "2026-08-30");
  assert.ok(Date.parse(window.finishedAt) > Date.parse(window.startedAt));
});

test("session helpers ignore invalid timer and duration values", () => {
  const elapsed = skateSessionCore.elapsedTaskSeconds({
    timerSeconds: Infinity,
    timerStartedAt: "not-a-date"
  }, Date.parse("2026-08-07T12:30:00Z"));
  const total = skateSessionCore.boardHoursTotalFromSessions([
    { durationHours: Infinity },
    { durationHours: "not-a-number" },
    { durationHours: 0.5 }
  ]);

  assert.equal(elapsed, 0);
  assert.equal(total, 0.5);
});

test('session intensity preserves every choice and rejects invalid colors', () => {
  for (const color of ['blue', 'yellow', 'green']) {
    assert.equal(skateSessionCore.sessionIntensity(color, 'yellow'), color);
  }
  assert.equal(skateSessionCore.sessionIntensity(undefined, 'green'), 'green');
  assert.equal(skateSessionCore.sessionIntensity('gray', 'invalid'), 'yellow');
});

test('session date prefers the logged day and uses local time for older sessions', () => {
  assert.equal(skateSessionCore.sessionDateKey({dateKey:'2026-09-08', finishedAt:'2026-09-07T21:30:00Z'}), '2026-09-08');
  const stamp = new Date(2026, 8, 8, 0, 30).toISOString();
  assert.equal(skateSessionCore.sessionDateKey({finishedAt:stamp}), '2026-09-08');
  assert.equal(skateSessionCore.sessionDateKey({finishedAt:'invalid'}), '');
});
