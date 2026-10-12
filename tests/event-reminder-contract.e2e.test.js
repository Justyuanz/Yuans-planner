const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const { startBrowserPlanner } = require("./helpers/browser-planner");

// The Python reminder service reads two record shapes, not one: daily tasks and
// calendar events. `reminder-contract.e2e.test.js` pins the task half. This is
// the event half, which was missed when that test was written.
//
// React's Calendar event editor writes `hivePlanner.events`; Python reads
// `date`, `startTime`, `reminderMinutes`, `id` and `title` back out of it to
// decide whether a Telegram reminder is due. Nothing checked the two agreed, so
// renaming a field on the React side would stop every event reminder with both
// suites still green.

const execFileAsync = promisify(execFile);
const TEST_DATE = "2026-11-18";

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

async function dueRemindersAt(databasePath, isoLocalTime) {
  const { stdout } = await execFileAsync(
    process.env.PYTHON_BIN || "python3",
    ["-c", COLLECTOR_SCRIPT, isoLocalTime],
    {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, YUAN_PLANNER_DB_PATH: databasePath }
    }
  );
  return JSON.parse(stdout);
}

async function setInput(browser, id, value, prototypeName = "HTMLInputElement") {
  await browser.evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)});
    Object.getOwnPropertyDescriptor(window[${JSON.stringify(prototypeName)}].prototype, "value")
      .set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}

test("an event created in the React editor is readable by the Python reminder collector",
  { timeout: 90_000 }, async function (t) {
    const planner = await startBrowserPlanner(t);
    if (!planner) return;

    const pageUrl = `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`;
    await planner.browser.setViewport(1280, 720);
    await planner.browser.open(pageUrl);
    await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
    await planner.browser.waitForExpression(
      'document.querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7'
    );
    await planner.browser.evaluate('document.querySelector("#weeklyPlannerMount .week-day-panel").click()');
    await planner.browser.waitForExpression('document.getElementById("eventEditorCard")?.hidden === false');

    // A real event, created through the real form.
    await setInput(planner.browser, "eventDate", TEST_DATE);
    await setInput(planner.browser, "eventTitle", "Physio appointment");
    await setInput(planner.browser, "eventStartTime", "16:00");
    await setInput(planner.browser, "eventEndTime", "17:00");
    await setInput(planner.browser, "eventReminder", "30", "HTMLSelectElement");
    await planner.browser.evaluate('document.getElementById("eventForm").requestSubmit()');

    const event = await planner.server.waitFor(async function () {
      const data = await planner.server.readPlannerData();
      return JSON.parse(data["hivePlanner.events"] || "[]")
        .find(({ title }) => title === "Physio appointment");
    });

    // The fields Python reads, as the React editor actually wrote them.
    assert.deepEqual({
      date: event.date,
      reminderMinutes: event.reminderMinutes,
      startTime: event.startTime,
      title: event.title
    }, {
      date: TEST_DATE,
      reminderMinutes: 30,
      startTime: "16:00",
      title: "Physio appointment"
    });
    assert.ok(event.id, "the event was stored without an id, which the reminder key needs");

    const databasePath = planner.server.databasePath;

    // Before the reminder window opens, nothing is due.
    assert.deepEqual(await dueRemindersAt(databasePath, `${TEST_DATE}T15:00:00`), []);

    // Inside it, the collector finds this event and renders it.
    const due = await dueRemindersAt(databasePath, `${TEST_DATE}T15:40:00`);
    assert.equal(due.length, 1, `expected one due reminder, got ${JSON.stringify(due)}`);
    assert.equal(due[0].storage_key, "hivePlanner.events");
    assert.match(due[0].text, /Physio appointment/);
    assert.match(due[0].text, /When: 2026-11-18 16:00/);
    assert.match(due[0].text, /Reminder: 30 minutes before/);
    assert.match(due[0].text, /Event/);

    // Long after it started, it has gone stale rather than firing late.
    assert.deepEqual(await dueRemindersAt(databasePath, `${TEST_DATE}T23:30:00`), []);

    assert.deepEqual(await planner.browser.errors(), []);
  });
