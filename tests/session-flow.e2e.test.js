const assert = require("node:assert/strict");
const test = require("node:test");

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
  const standaloneHours = sessions.reduce(function (total, session) {
    return session.trackedInTask ? total : total + (Number(session.durationHours) || 0);
  }, 0);
  return taskHours + standaloneHours;
}

async function finishGuitarSession(browser) {
  await browser.evaluate('document.getElementById("startGuitarSession").click()');
  await browser.evaluate('document.getElementById("finishGuitarSession").click()');
  await browser.waitForExpression('document.getElementById("guitarSessionDialog").open');
  await browser.evaluate(`(() => {
    const duration = document.getElementById("guitarDurationMinutes");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(duration, "30");
    document.getElementById("guitarSessionForm").requestSubmit();
  })()`);
}

async function finishSkateSession(browser) {
  await browser.evaluate('document.getElementById("startSkateSession").click()');
  await browser.evaluate('document.getElementById("finishSkateSession").click()');
  await browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  await browser.evaluate(`(() => {
    const duration = document.getElementById("skateDurationMinutes");
    const sessionDate = document.getElementById("skateSessionDate");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(duration, "45");
    setter.call(sessionDate, "${TEST_DATE}");
    document.getElementById("skateFeedbackForm").requestSubmit();
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
  await planner.browser.open(`${planner.server.url}/?view=guitarView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await finishGuitarSession(planner.browser);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_STORAGE_KEY] || "[]");
    const sessions = JSON.parse(data[GUITAR_SESSIONS_KEY] || "[]");
    return tasks.some(({ activity }) => activity === "guitar") && sessions.length === 1;
  });

  await planner.browser.open(`${planner.server.url}/?view=skateView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
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

  await planner.browser.open(`${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelectorAll(".task").length === 2');
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(planner.browser.errors(), []);
});
