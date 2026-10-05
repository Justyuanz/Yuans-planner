const test = require("node:test");
const assert = require("node:assert/strict");
const agentCore = require("../frontend/js/agent-core.js");

function makeTask(id, label, hours, done) {
  return {
    id: id,
    label: label,
    activity: "portfolioJobPrep",
    hours: hours || 0,
    timerSeconds: 0,
    timerStartedAt: null,
    done: Boolean(done),
    createdAt: "2026-08-06T09:00:00.000Z"
  };
}

test("simplify_today hides tasks instead of deleting them", function () {
  const result = agentCore.applyAction("simplify_today", {
    todayDateKey: "2026-08-06",
    dayState: "tired",
    todayTasks: [
      makeTask("a", "09 Deep work", 1, false),
      makeTask("b", "11 Admin", 0.5, false),
      makeTask("c", "14 Review", 0.5, false),
      makeTask("d", "Read notes", 0.25, false)
    ],
    tomorrowTasks: [],
    agentState: {}
  });

  assert.equal(result.changed, true);
  assert.equal(result.todayTasks.length, 4);
  assert.deepEqual(result.agentState.hiddenTaskIdsByDate["2026-08-06"].length, 2);
});

test("move_one_task moves one unfinished task to tomorrow and undo restores both days", function () {
  const result = agentCore.applyAction("move_one_task", {
    todayDateKey: "2026-08-06",
    dayState: "okay",
    todayTasks: [
      makeTask("a", "09 Deep work", 1, false),
      makeTask("b", "19 Email cleanup", 0.5, false)
    ],
    tomorrowTasks: [],
    agentState: {},
    idFactory: function () { return "new-task"; }
  });

  assert.equal(result.changed, true);
  assert.equal(result.todayTasks.length, 1);
  assert.equal(result.tomorrowTasks.length, 1);
  assert.match(result.message, /moved to tomorrow/i);

  const undone = agentCore.undoAction(result.undo);
  assert.equal(undone.todayTasks.length, 2);
  assert.equal(undone.tomorrowTasks.length, 0);
});

test("adjust_morning_block updates a timed morning task without deleting anything", function () {
  const result = agentCore.applyAction("adjust_morning_block", {
    todayDateKey: "2026-08-06",
    dayState: "tired",
    todayTasks: [
      makeTask("a", "09 Morning routine", 1, false),
      makeTask("b", "13 Study C++", 1, false)
    ],
    tomorrowTasks: [],
    agentState: {}
  });

  assert.equal(result.changed, true);
  assert.equal(result.todayTasks[0].label, "10:00 Morning routine");
  assert.equal(result.todayTasks.length, 2);
});

test("break_task_down keeps the original task and adds smaller helper steps", function () {
  const result = agentCore.applyAction("break_task_down", {
    todayDateKey: "2026-08-06",
    dayState: "low-focus",
    todayTasks: [
      makeTask("a", "Study C++", 1, false)
    ],
    tomorrowTasks: [],
    agentState: {},
    idFactory: function (prefix) { return prefix + "-child"; }
  });

  assert.equal(result.changed, true);
  assert.equal(result.todayTasks.length, 4);
  assert.equal(result.todayTasks[0].label, "Study C++");
});

test("question-aware suggestions prioritize moving a task when asked directly", function () {
  const actions = agentCore.proposeActions({
    question: "Which task should I move to tomorrow?",
    dayState: "okay",
    todayTasks: [
      makeTask("a", "09 Deep work", 1, false),
      makeTask("b", "19 Email cleanup", 0.5, false)
    ],
    recentTaskHistory: [],
    metrics: {}
  });

  assert.equal(actions[0].id, "move_one_task");
});

test("question-aware suggestions still offer simplification for one-thing questions with heavy carryover", function () {
  const actions = agentCore.proposeActions({
    question: "What should I do next if I only do one thing?",
    dayState: "okay",
    todayTasks: [
      makeTask("a", "09 Deep work", 1, false),
      makeTask("b", "11 Admin", 0.5, false),
      makeTask("c", "14 Review", 0.5, false)
    ],
    recentTaskHistory: [],
    metrics: {
      carryoverIndicators: {
        carryoverRate: 0.25
      }
    }
  });

  assert.equal(actions[0].id, "simplify_today");
});

test("normalizeDayState accepts the new positive good state", function () {
  assert.equal(agentCore.normalizeDayState("good"), "good");
});
