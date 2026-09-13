const assert = require("node:assert/strict");
const test = require("node:test");

const mindCore = require("../frontend/js/mind-core");
const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-12";
const TASK_STORAGE_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const GUITAR_SESSIONS_KEY = "hivePlanner.guitar.sessions";
const SKATE_SESSIONS_KEY = "hivePlanner.skate.sessions";

function readStoredList(data, key) {
  return JSON.parse(data[key] || "[]");
}

function findActivityTask(tasks, activityId) {
  return tasks.find(function (task) {
    return task.activity === activityId;
  });
}

function recordedHours(tasks, sessions, activityId) {
  const task = findActivityTask(tasks, activityId);
  const taskHours = task ? task.hours : 0;
  return taskHours + mindCore.sessionHours(sessions);
}

async function finishGuitarSession(browser) {
  await browser.evaluate(`(() => {
    document.getElementById("startGuitarSession").click();
    document.getElementById("finishGuitarSession").click();
    document.getElementById("guitarDurationMinutes").value = "30";
    document.getElementById("guitarSessionForm").dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);
}

async function finishSkateSession(browser) {
  await browser.evaluate(`(() => {
    document.getElementById("startSkateSession").click();
    document.getElementById("finishSkateSession").click();
    document.getElementById("skateDurationMinutes").value = "45";
    document.getElementById("skateSessionDate").value = "${TEST_DATE}";
    document.getElementById("skateFeedbackForm").dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);
}

async function waitForSessionData(server) {
  return server.waitFor(async function () {
    const data = await server.readPlannerData();
    const tasks = readStoredList(data, TASK_STORAGE_KEY);
    const guitarSessions = readStoredList(data, GUITAR_SESSIONS_KEY);
    const skateSessions = readStoredList(data, SKATE_SESSIONS_KEY);
    return tasks.length === 2 && guitarSessions.length === 1 && skateSessions.length === 1
      ? { tasks, guitarSessions, skateSessions }
      : null;
  });
}

test("finished Guitar and Skate sessions sync to tasks without double-counting time", { timeout: 30_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#tasksMount .empty") !== null');
  await finishGuitarSession(planner.browser);
  await finishSkateSession(planner.browser);

  const data = await waitForSessionData(planner.server);
  const guitarTask = findActivityTask(data.tasks, "guitar");
  const skateTask = findActivityTask(data.tasks, "skate");

  assert.equal(guitarTask.done, true);
  assert.equal(guitarTask.hours, 0.5);
  assert.equal(data.guitarSessions[0].trackedInTask, true);
  assert.equal(recordedHours(data.tasks, data.guitarSessions, "guitar"), 0.5);

  assert.equal(skateTask.done, true);
  assert.equal(skateTask.hours, 0.75);
  assert.equal(data.skateSessions[0].trackedInTask, true);
  assert.equal(recordedHours(data.tasks, data.skateSessions, "skate"), 0.75);

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.querySelectorAll(".task").length === 2');
  assert.deepEqual(planner.browser.errors(), []);
});
