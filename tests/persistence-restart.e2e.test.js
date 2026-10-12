const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

// Everything the planner saves goes to SQLite through the Python process. Every
// other test only proves data survives a page reload, which a warm in-memory
// cache would also pass. This one restarts the process against the same
// database file, so only a real write to disk can satisfy it.

const TEST_DATE = "2026-11-12";
const TASK_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const JOURNAL_KEY = "hivePlanner.journalEntries";
const BUDGET_KEY = "hivePlanner.money.budgets";

function setFieldsAndSubmit() {
  return `(() => {
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
    setInput("#taskTitle", "Survives a restart");
    setInput("#taskTime", "07:45");
    setSelect("#taskReminder", "15");
    setSelect("#taskActivity", "guitar");
    document.getElementById("taskForm").requestSubmit();
  })()`;
}

function renderedTaskLabels() {
  return `(() => Array.from(document.querySelectorAll(".task-title")).map((node) => node.textContent.trim()))()`;
}

test("planner data written through the UI outlives a server restart", async function (t) {
  const planner = await startBrowserPlanner(t);
  if (!planner) return;

  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(
    `Boolean(document.documentElement.dataset.plannerReady === "true" && document.getElementById("taskForm"))`
  );

  // A task created through the form, not seeded through the API, so the write
  // path under test is the one the user actually uses.
  await planner.browser.evaluate(setFieldsAndSubmit());
  const createdTask = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    return JSON.parse(data[TASK_KEY] || "[]").find(({ label }) => label === "Survives a restart");
  });
  assert.deepEqual({
    activity: createdTask.activity,
    reminderMinutes: createdTask.reminderMinutes,
    scheduledTime: createdTask.scheduledTime
  }, {
    activity: "guitar",
    reminderMinutes: 15,
    scheduledTime: "07:45"
  });

  // Two more keys written straight through the API, to prove the restart keeps
  // the whole store rather than only the key the UI happened to touch last.
  for (const [key, value] of [
    [JOURNAL_KEY, { [TEST_DATE]: { text: "Rested well.", mood: "calm" } }],
    [BUDGET_KEY, { categories: { Groceries: 250 }, legacyRootField: "keep-root" }]
  ]) {
    const response = await fetch(`${planner.server.url}/api/kv`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify(value) })
    });
    assert.equal(response.ok, true);
  }

  const before = await planner.server.readPlannerData();

  await planner.server.restart();

  // The fresh process must serve the same bytes, read from the database file.
  const after = await planner.server.readPlannerData();
  assert.deepEqual(after[TASK_KEY], before[TASK_KEY], "tasks changed across the restart");
  assert.deepEqual(after[JOURNAL_KEY], before[JOURNAL_KEY], "journal changed across the restart");
  assert.deepEqual(after[BUDGET_KEY], before[BUDGET_KEY], "budgets changed across the restart");
  assert.equal(JSON.parse(after[BUDGET_KEY]).legacyRootField, "keep-root",
    "an unknown legacy field was dropped by the restart");

  // And the page must render it again from the restarted server.
  await planner.browser.reload();
  await planner.browser.waitForExpression(
    `Boolean(document.documentElement.dataset.plannerReady === "true" && document.querySelector(".task-title"))`
  );
  const labels = await planner.browser.evaluate(renderedTaskLabels());
  assert.ok(labels.includes("07:45 Survives a restart") || labels.includes("Survives a restart"),
    `the task did not render after the restart: ${JSON.stringify(labels)}`);

  assert.deepEqual(await planner.browser.errors(), []);
});
