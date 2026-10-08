const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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

const REACT_READY = `(() => {
  const frame = document.querySelector("iframe");
  const root = frame && frame.contentDocument;
  return root
    && root.getElementById("tasksMount")?.dataset.reactOwned === "true"
    && root.getElementById("taskForm")?.dataset.reactOwned === "true"
    && root.querySelectorAll(".task").length === 2;
})()`;

function clipExpression(react) {
  return `(() => {
    const frame = ${react ? "document.querySelector('iframe')" : "null"};
    const root = frame ? frame.contentDocument : document;
    const rect = root.querySelector(".tasks-card").getBoundingClientRect();
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frameRect.x + rect.x + (frame ? 0 : root.defaultView.scrollX),
      y: frameRect.y + rect.y + (frame ? 0 : root.defaultView.scrollY),
      width: rect.width,
      height: Math.min(rect.height, 680)
    };
  })()`;
}

async function scrollToTasks(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const root = ${documentExpression};
    root.documentElement.style.scrollBehavior = "auto";
    const mascot = root.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    root.querySelector(".tasks-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function taskContract(documentExpression) {
  return `(() => {
    const root = ${documentExpression};
    const view = root.defaultView;
    const card = root.querySelector(".tasks-card");
    const rows = [...root.querySelectorAll(".task-card")];
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        display: style.display,
        gap: style.gap,
        height: rect.height,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      form: pick(root.getElementById("taskForm")),
      rows: rows.map((row) => ({
        text: row.textContent.replace(/\\s+/g, " ").trim(),
        visual: pick(row)
      }))
    };
  })()`;
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
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React task tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await putTasks(planner.server.url);

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height);
    await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
    await planner.browser.waitForExpression('document.querySelectorAll(".task").length === 2');
    await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
    await scrollToTasks(planner.browser, "document");
    const legacyContract = await planner.browser.evaluate(taskContract("document"));
    const legacyScreenshot = await planner.browser.captureScreenshot(clipExpression(false));

    await planner.browser.open(`${preview.url}/?view=legacyShell&date=${TEST_DATE}`);
    await planner.browser.waitForExpression(REACT_READY);
    await planner.browser.waitForExpression(
      'document.querySelector("iframe").contentDocument.documentElement.dataset.plannerReady === "true"'
    );
    await scrollToTasks(planner.browser, 'document.querySelector("iframe").contentDocument');
    const reactContract = await planner.browser.evaluate(
      taskContract('document.querySelector("iframe").contentDocument')
    );
    const reactScreenshot = await planner.browser.captureScreenshot(clipExpression(true));

    assert.deepEqual(reactContract, legacyContract);
    const comparison = compareScreenshots(reactScreenshot, legacyScreenshot);
    assert.equal(comparison.matches, true, `${width}px task screenshot: ${JSON.stringify(comparison)}`);
  }

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(`${preview.url}/?view=legacyShell&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_READY);
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const root = frame.contentDocument;
    const input = root.getElementById("taskTitle");
    const setter = Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value").set;
    setter.call(input, "React TypeScript task");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    root.querySelector(".task-form-add").click();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label }) => label === "React TypeScript task");
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    const root = document.querySelector("iframe")?.contentDocument;
    return [...(root?.querySelectorAll(".task-title") || [])]
      .some((node) => node.textContent.includes("React TypeScript task"));
  })()`);

  await planner.browser.evaluate(`(() => {
    const root = document.querySelector("iframe").contentDocument;
    const title = [...root.querySelectorAll(".task-title")]
      .find((node) => node.textContent.includes("React TypeScript task"));
    title.closest("button").click();
  })()`);
  await planner.browser.waitForExpression(
    'document.querySelector("iframe").contentDocument.querySelector(".task-title-input") !== null'
  );
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const root = frame.contentDocument;
    const input = root.querySelector(".task-title-input");
    const setter = Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value").set;
    setter.call(input, "Edited React task");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new frame.contentWindow.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    }));
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label }) => label === "Edited React task");
  });

  await planner.browser.evaluate(`(() => {
    const root = document.querySelector("iframe").contentDocument;
    const title = [...root.querySelectorAll(".task-title")]
      .find((node) => node.textContent.includes("Edited React task"));
    title.closest(".task-card").querySelector(".task-check").click();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks.some(({ label, done }) => label === "Edited React task" && done === true);
  });

  await planner.browser.evaluate(`(() => {
    const root = document.querySelector("iframe").contentDocument;
    root.querySelector('[aria-label="Delete Edited React task"]').click();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return !tasks.some(({ label }) => label === "Edited React task");
  });
  assert.deepEqual(planner.browser.errors(), []);
});

test("React owns calendar-linked task reconciliation", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React task tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await putTasks(planner.server.url);
  await putStoredValue(planner.server.url, EVENTS_KEY, "[]");
  await planner.browser.open(`${preview.url}/?view=legacyShell&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_READY);
  await planner.browser.waitForExpression(
    'document.querySelector("iframe")?.contentDocument?.documentElement?.dataset.plannerReady === "true"'
  );

  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const root = frame.contentDocument;
    const setInput = (id, value) => {
      const input = root.getElementById(id);
      const setter = Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
    };
    frame.contentWindow.YuanCalendarTaskSync.mergeLinkedTasks = () => {
      throw new Error("React tasks must not use legacy calendar reconciliation");
    };
    setInput("eventDate", "${TEST_DATE}");
    setInput("eventTitle", "Calendar React task");
    setInput("eventStartTime", "10:15");
    setInput("eventEndTime", "11:00");
    root.getElementById("eventForm").dispatchEvent(new frame.contentWindow.Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);
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
  await planner.browser.waitForExpression(REACT_READY.replace("=== 2", "=== 3"));
  const reloadedData = await planner.server.readPlannerData();
  const reloadedTasks = JSON.parse(reloadedData[TASK_KEY] || "[]");
  assert.equal(reloadedTasks.filter(({ sourceEventId }) => sourceEventId === linkedTask.sourceEventId).length, 1);

  await planner.browser.evaluate(`(async () => {
    const frameWindow = document.querySelector("iframe").contentWindow;
    await frameWindow.fetch("/api/kv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "${EVENTS_KEY}", value: "[]" })
    });
    frameWindow.localStorage.setItem("${EVENTS_KEY}", "[]");
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
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React task tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

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

  await planner.browser.open(`${preview.url}/?view=legacyShell&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_READY.replace("=== 2", "=== 1"));
  await planner.browser.waitForExpression(`(() => {
    const root = document.querySelector("iframe")?.contentDocument;
    return root?.documentElement?.dataset.plannerReady === "true"
      && root.querySelector(".agent-focus-banner") !== null;
  })()`);
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    frame.contentWindow.YuanPlannerDashboardInsightBridge.undoAgentAction = () => {
      throw new Error("React tasks must not use the legacy agent undo bridge");
    };
    frame.contentDocument.querySelector(".agent-focus-actions button:last-child").click();
  })()`);

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
  await planner.browser.waitForExpression(REACT_READY);
  await planner.browser.waitForExpression(`(() => {
    const root = document.querySelector("iframe")?.contentDocument;
    return root?.documentElement?.dataset.plannerReady === "true"
      && root.querySelector(".agent-focus-banner") === null;
  })()`);
  assert.deepEqual(planner.browser.errors(), []);
});
