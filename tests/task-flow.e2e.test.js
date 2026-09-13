const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-12";
const TASK_STORAGE_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;

async function waitForStoredTasks(server, predicate) {
  return server.waitFor(async function () {
    const data = await server.readPlannerData();
    const tasks = JSON.parse(data[TASK_STORAGE_KEY] || "[]");
    return predicate(tasks) ? tasks : null;
  });
}

async function createTaskThroughForm(browser) {
  await browser.evaluate(`(() => {
    document.getElementById("taskTitle").value = "Browser task";
    document.getElementById("taskTime").value = "09:30";
    document.getElementById("taskReminder").value = "10";
    document.getElementById("taskActivity").value = "cpp";
    document.getElementById("taskForm").dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);
}

async function editOnlyTask(browser) {
  await browser.evaluate('document.querySelector(".task-title-button").click()');
  await browser.waitForExpression('document.querySelector(".task-title-input") !== null');
  await browser.evaluate(`(() => {
    const titleInput = document.querySelector(".task-title-input");
    titleInput.value = "Focused browser task";
    document.querySelector(".task-editor-activity").value = "python";
    document.querySelector(".task-editor-time").value = "10:15";
    document.querySelector(".task-editor-reminder").value = "15";
    titleInput.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    }));
  })()`);
}

async function deleteOnlyTask(browser) {
  await browser.evaluate(`document.querySelector('[aria-label="Delete Focused browser task"]').click()`);
}

test("legacy app starts and preserves task create, edit, delete, and refresh behavior", { timeout: 30_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const { browser, server } = planner;

  await browser.open(`${server.url}/?date=${TEST_DATE}`);
  await browser.waitForExpression('document.querySelector("#tasksMount .empty") !== null');
  assert.deepEqual(browser.errors(), []);

  await createTaskThroughForm(browser);
  const createdTasks = await waitForStoredTasks(server, function (tasks) {
    return tasks.length === 1 && tasks[0].label === "Browser task";
  });
  assert.equal(createdTasks[0].scheduledTime, "09:30");
  assert.equal(createdTasks[0].reminderMinutes, 10);
  assert.equal(createdTasks[0].activity, "cpp");

  await browser.reload();
  await browser.waitForExpression('document.querySelector(".task-title")?.textContent.includes("Browser task")');

  await editOnlyTask(browser);
  const editedTasks = await waitForStoredTasks(server, function (tasks) {
    return tasks.length === 1 && tasks[0].label === "Focused browser task";
  });
  assert.equal(editedTasks[0].scheduledTime, "10:15");
  assert.equal(editedTasks[0].reminderMinutes, 15);
  assert.equal(editedTasks[0].activity, "python");

  await browser.reload();
  await browser.waitForExpression('document.querySelector(".task-title")?.textContent.includes("Focused browser task")');
  await deleteOnlyTask(browser);
  await waitForStoredTasks(server, function (tasks) {
    return tasks.length === 0;
  });

  await browser.reload();
  await browser.waitForExpression('document.getElementById("progressText")?.textContent === "0 / 0 tasks done today"');
  assert.equal(await browser.evaluate('document.querySelectorAll(".task").length'), 0);
  assert.deepEqual(browser.errors(), []);
});
