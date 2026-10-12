const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  clipExpression,
  expectedTaskContract,
  expectedTaskScreenshot,
  taskContract
} = require("./helpers/task-card-contract");

const TEST_DATE = "2026-10-05";
const TOMORROW_DATE = "2026-10-06";
const EVENTS_KEY = "hivePlanner.events";
const TASK_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const TOMORROW_TASK_KEY = `hivePlanner.dailyTasks.${TOMORROW_DATE}`;
const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";
const AGENT_UI_STATE_KEY = "hivePlanner.agent.uiState";
const AGENT_UNDO_KEY = "hivePlanner.agent.undo";
const TASKS = [
  {
    id: "task-migrate-1",
    label: "Build the task boundary",
    activity: "transcendence",
    hours: 1.25,
    timerSeconds: 4500,
    timerStartedAt: null,
    done: false,
    createdAt: "2026-10-05T08:00:00.000Z",
    scheduledTime: "09:30",
    reminderMinutes: 10,
    reminderSentAt: "",
    reminderSentFor: ""
  },
  {
    id: "task-migrate-2",
    label: "Call the dentist",
    activity: "other",
    hours: 0,
    timerSeconds: 0,
    timerStartedAt: null,
    done: true,
    createdAt: "2026-10-05T09:00:00.000Z",
    scheduledTime: "",
    reminderMinutes: 0,
    reminderSentAt: "",
    reminderSentFor: ""
  }
];

function directReady(taskCount) {
  return `document.documentElement.dataset.plannerReady === "true"
    && document.querySelector("iframe") === null
    && document.querySelectorAll(".task").length === ${taskCount}`;
}

// The animated mascot is hidden before capture so it cannot add noise, while
// its layout space is preserved.
async function scrollToTasks(browser) {
  await browser.evaluate(`(() => {
    const root = document;
    root.documentElement.style.scrollBehavior = "auto";
    const mascot = root.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    root.querySelector(".tasks-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`);
}

async function putTasks(serverUrl) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: TASK_KEY, value: JSON.stringify(TASKS) })
  });
  assert.equal(response.ok, true);
}

async function putStoredValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value })
  });
  assert.equal(response.ok, true);
}

test("React tasks preserve the legacy design and task lifecycle", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await putTasks(planner.server.url);
  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height);
    await planner.browser.open(pageUrl);
    await planner.browser.waitForExpression(directReady(2));
    await scrollToTasks(planner.browser);
    assert.deepEqual(await planner.browser.evaluate(taskContract()), expectedTaskContract(width < 500));
    const comparison = compareScreenshotSignature(
      await planner.browser.captureScreenshot(clipExpression()),
      expectedTaskScreenshot(width < 500)
    );
    assert.equal(comparison.matches, true, `${width}px task screenshot: ${JSON.stringify(comparison)}`);
  }

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(directReady(2));
  await planner.browser.evaluate(`(() => {
    const setInput = (selector, value) => {
      const input = document.querySelector(selector);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const setSelect = (selector, value) => {
      const select = document.querySelector(selector);
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setInput("#taskTitle", "React TypeScript task");
    setInput("#taskTime", "09:30");
    setSelect("#taskReminder", "10");
    setSelect("#taskActivity", "transcendence");
    document.getElementById("taskForm").requestSubmit();
  })()`);
  const createdTask = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.find(({ label }) => label === "React TypeScript task");
  });
  assert.deepEqual({
    activity: createdTask.activity,
    reminderMinutes: createdTask.reminderMinutes,
    scheduledTime: createdTask.scheduledTime
  }, {
    activity: "transcendence",
    reminderMinutes: 10,
    scheduledTime: "09:30"
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    return [...document.querySelectorAll(".task-title")]
      .some((node) => node.textContent.includes("React TypeScript task"));
  })()`);

  await planner.browser.evaluate(`(() => {
    const title = [...document.querySelectorAll(".task-title")]
      .find((node) => node.textContent.includes("React TypeScript task"));
    title.closest("button").click();
  })()`);
  await planner.browser.waitForExpression('document.querySelector(".task-title-input") !== null');
  await planner.browser.evaluate(`(() => {
    const input = document.querySelector(".task-editor-time");
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "10:15");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.blur();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label, scheduledTime }) => (
      label === "React TypeScript task" && scheduledTime === "10:15"
    ));
  });
  await planner.browser.evaluate(`(() => {
    const select = document.querySelector(".task-editor-activity");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, "mobileDevelopment");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ activity, label }) => (
      activity === "mobileDevelopment" && label === "React TypeScript task"
    ));
  });
  await planner.browser.evaluate(`(() => {
    const select = document.querySelector(".task-editor-reminder");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, "15");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label, reminderMinutes }) => (
      label === "React TypeScript task" && reminderMinutes === 15
    ));
  });
  await planner.browser.evaluate(`(() => {
    const input = document.querySelector(".task-title-input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Edited React task");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    }));
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ activity, label, reminderMinutes, scheduledTime }) => (
      activity === "mobileDevelopment"
      && label === "Edited React task"
      && reminderMinutes === 15
      && scheduledTime === "10:15"
    ));
  });

  await planner.browser.evaluate(`(() => {
    const title = [...document.querySelectorAll(".task-title")]
      .find((node) => node.textContent.includes("Edited React task"));
    title.closest(".task-card").querySelector(".task-check").click();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label, done }) => label === "Edited React task" && done === true);
  });

  await planner.browser.evaluate(`(() => {
    document.querySelector('[aria-label="Delete Edited React task"]').click();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return !tasks.some(({ label }) => label === "Edited React task");
  });
  await planner.browser.reload();
  await planner.browser.waitForExpression(directReady(2));
  assert.equal(await planner.browser.evaluate(`(() => (
    [...document.querySelectorAll(".task-title")]
      .some((node) => node.textContent.includes("Edited React task"))
  ))()`), false);
  assert.deepEqual(planner.browser.errors(), []);
});

test("React owns calendar-linked task reconciliation", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await putTasks(planner.server.url);
  const calendarEvent = {
    category: "Transcendence",
    date: TEST_DATE,
    endTime: "11:00",
    id: "calendar-react-event",
    reminderMinutes: 0,
    startTime: "10:15",
    title: "Calendar React task"
  };
  await putStoredValue(planner.server.url, EVENTS_KEY, JSON.stringify([calendarEvent]));
  await planner.browser.open(`${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(directReady(3));
  const linkedTask = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const events = JSON.parse(data[EVENTS_KEY] || "[]");
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    const event = events.find(({ title }) => title === "Calendar React task");
    return event && tasks.find(({ sourceEventId }) => sourceEventId === event.id);
  });
  assert.deepEqual({
    activity: linkedTask.activity,
    done: linkedTask.done,
    label: linkedTask.label,
    reminderMinutes: linkedTask.reminderMinutes,
    scheduledTime: linkedTask.scheduledTime,
    useSourceEventReminder: linkedTask.useSourceEventReminder
  }, {
    activity: "transcendence",
    done: false,
    label: "Calendar React task",
    reminderMinutes: 0,
    scheduledTime: "10:15",
    useSourceEventReminder: true
  });
  assert.deepEqual(planner.browser.errors(), []);

  await planner.browser.reload();
  await planner.browser.waitForExpression(directReady(3));
  const reloadedData = await planner.server.readPlannerData();
  const reloadedTasks = JSON.parse(reloadedData[TASK_KEY] || "[]");
  assert.equal(reloadedTasks.filter(({ sourceEventId }) => sourceEventId === linkedTask.sourceEventId).length, 1);

  await planner.browser.evaluate(`(async () => {
    const value = "[]";
    await fetch("/api/kv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "${EVENTS_KEY}", value })
    });
    localStorage.setItem("${EVENTS_KEY}", value);
    window.dispatchEvent(new StorageEvent("storage", {
      key: "${EVENTS_KEY}",
      newValue: value
    }));
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.every(({ sourceEventId }) => sourceEventId !== linkedTask.sourceEventId);
  });
  assert.deepEqual(planner.browser.errors(), []);
});

test("React owns agent undo persistence without the legacy bridge", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  const tomorrowBefore = [{
    ...TASKS[0],
    id: "task-tomorrow-restored",
    label: "Restored tomorrow task"
  }];
  const agentBefore = {
    dayStates: { [TEST_DATE]: "okay" },
    hiddenTaskIdsByDate: {}
  };
  const agentAfter = {
    dayStates: { [TEST_DATE]: "okay" },
    hiddenTaskIdsByDate: { [TEST_DATE]: ["task-migrate-2"] }
  };
  const undoEntry = {
    actionId: "simplify_today",
    actionLabel: "Simplify today",
    snapshot: {
      actionId: "simplify_today",
      after: {
        agentState: agentAfter,
        plannedHours: {},
        todayTasks: TASKS,
        tomorrowTasks: []
      },
      before: {
        agentState: agentBefore,
        plannedHours: {},
        todayTasks: TASKS,
        tomorrowTasks: tomorrowBefore
      }
    },
    todayKey: TEST_DATE,
    tomorrowKey: TOMORROW_DATE
  };
  await putTasks(planner.server.url);
  await putStoredValue(planner.server.url, TOMORROW_TASK_KEY, "[]");
  await putStoredValue(planner.server.url, EVENTS_KEY, "[]");
  await putStoredValue(planner.server.url, ACTIVITY_LOG_KEY, "[]");
  await putStoredValue(planner.server.url, AGENT_UI_STATE_KEY, JSON.stringify(agentAfter));
  await putStoredValue(planner.server.url, AGENT_UNDO_KEY, JSON.stringify([undoEntry]));

  await planner.browser.open(`${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(directReady(1));
  await planner.browser.waitForExpression('document.querySelector(".agent-focus-banner") !== null');
  await planner.browser.evaluate(
    'document.querySelector(".agent-focus-actions button:last-child").click()'
  );

  const persisted = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const undoStack = JSON.parse(data[AGENT_UNDO_KEY] || "null");
    const todayTasks = JSON.parse(data[TASK_KEY] || "null");
    const tomorrowTasks = JSON.parse(data[TOMORROW_TASK_KEY] || "null");
    const agentState = JSON.parse(data[AGENT_UI_STATE_KEY] || "null");
    const log = JSON.parse(data[ACTIVITY_LOG_KEY] || "null");
    if (undoStack?.length !== 0 || log?.length !== 1) return null;
    return { agentState, log, todayTasks, tomorrowTasks };
  });
  const normalizedTasks = (tasks) => tasks.map((task) => ({
    ...task,
    sourceEventId: "",
    useSourceEventReminder: false
  }));
  assert.deepEqual(persisted.todayTasks, normalizedTasks(TASKS));
  assert.deepEqual(persisted.tomorrowTasks, normalizedTasks(tomorrowBefore));
  assert.deepEqual(persisted.agentState, agentBefore);
  assert.deepEqual(persisted.log[0], {
    action: "agent_action_undone",
    after: undoEntry.snapshot.before,
    before: undoEntry.snapshot.after,
    dateKey: TEST_DATE,
    entityId: "simplify_today",
    entityType: "agent_action",
    field: "",
    id: persisted.log[0].id,
    meta: { label: "Simplify today" },
    timestamp: persisted.log[0].timestamp
  });
  assert.match(persisted.log[0].id, /^activity-/);
  assert.equal(Number.isNaN(Date.parse(persisted.log[0].timestamp)), false);
  assert.deepEqual(planner.browser.errors(), []);

  await planner.browser.reload();
  await planner.browser.waitForExpression(directReady(2));
  await planner.browser.waitForExpression('document.querySelector(".agent-focus-banner") === null');
  assert.deepEqual(planner.browser.errors(), []);
});
