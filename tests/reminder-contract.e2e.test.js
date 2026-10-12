const assert = require("node:assert/strict");
const test = require("node:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const { startBrowserPlanner } = require("./helpers/browser-planner");

// React writes a task record; Python reads it to decide whether a Telegram
// reminder is due. Each side pins its own half — the React tests assert the
// shape it writes, the Python tests assert the shape it reads — but nothing
// pinned that the two halves describe the same record. Measured: renaming the
// serialized field leaves the whole Python suite green, because it never sees
// React's output, so a rename carried through the React side and its own
// expectations would break every reminder with both suites passing. This test
// creates a task through the real form and asks the real Python collector what
// it finds in the same database.

const execFileAsync = promisify(execFile);
const TEST_DATE = "2026-11-14";
const TASK_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;

function createTaskThroughTheForm(title, time, reminderMinutes) {
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
    setInput("#taskTitle", ${JSON.stringify(title)});
    setInput("#taskTime", ${JSON.stringify(time)});
    setSelect("#taskReminder", ${JSON.stringify(String(reminderMinutes))});
    setSelect("#taskActivity", "transcendence");
    document.getElementById("taskForm").requestSubmit();
  })()`;
}

// Runs the real collector against the real database, at a chosen moment.
const COLLECTOR_SCRIPT = `
import json, sys
from datetime import datetime
sys.path.insert(0, "backend")
from db import read_all_values
from reminder_service import collect_due_reminders

now = datetime.fromisoformat(sys.argv[1])
_, reminders = collect_due_reminders(read_all_values(), now)
print(json.dumps([{"storage_key": r.storage_key, "text": r.text} for r in reminders]))
`;

async function dueRemindersAt(databaseEnv, isoLocalTime) {
  const { stdout } = await execFileAsync(
    process.env.PYTHON_BIN || "python3",
    ["-c", COLLECTOR_SCRIPT, isoLocalTime],
    { cwd: require("node:path").resolve(__dirname, ".."), env: databaseEnv }
  );
  return JSON.parse(stdout);
}

test("a task created in the React form is readable by the Python reminder collector", async function (t) {
  const planner = await startBrowserPlanner(t);
  if (!planner) return;

  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(
    `Boolean(document.documentElement.dataset.plannerReady === "true" && document.getElementById("taskForm"))`
  );

  await planner.browser.evaluate(createTaskThroughTheForm("Ring the studio", "14:00", 15));
  const task = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    return JSON.parse(data[TASK_KEY] || "[]").find(({ label }) => label === "Ring the studio");
  });

  // The fields the Python side reads, as the React form actually wrote them.
  assert.deepEqual({
    label: task.label,
    reminderMinutes: task.reminderMinutes,
    reminderSentFor: task.reminderSentFor,
    scheduledTime: task.scheduledTime,
    sourceEventId: task.sourceEventId
  }, {
    label: "Ring the studio",
    reminderMinutes: 15,
    reminderSentFor: "",
    scheduledTime: "14:00",
    sourceEventId: ""
  });

  const databaseEnv = { ...process.env, YUAN_PLANNER_DB_PATH: planner.server.databasePath };

  // Before the reminder window opens, nothing is due.
  assert.deepEqual(await dueRemindersAt(databaseEnv, `${TEST_DATE}T13:30:00`), []);

  // Inside the window, the collector finds exactly this task and renders it.
  const due = await dueRemindersAt(databaseEnv, `${TEST_DATE}T13:50:00`);
  assert.equal(due.length, 1, `expected one due reminder, got ${JSON.stringify(due)}`);
  assert.equal(due[0].storage_key, TASK_KEY);
  assert.match(due[0].text, /Ring the studio/);
  assert.match(due[0].text, /When: 2026-11-14 14:00/);
  assert.match(due[0].text, /Reminder: 15 minutes before/);

  // Long after the task started, it has gone stale rather than firing late.
  assert.deepEqual(await dueRemindersAt(databaseEnv, `${TEST_DATE}T21:00:00`), []);

  assert.deepEqual(await planner.browser.errors(), []);
});
