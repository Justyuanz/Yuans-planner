const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedEditorState,
  expectedEditorVisual
} = require("./helpers/calendar-event-editor-contract");

const TEST_DATE = "2026-09-14";
const EVENTS_KEY = "hivePlanner.events";

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedEditor(serverUrl) {
  await putValue(serverUrl, "hivePlanner.routine.week.2026-W38", {
    days: [
      { type: "normal" }, { type: "recovery" }, { type: "normal" }, { type: "high" },
      { type: "normal" }, { type: "high" }, { type: "recovery" }
    ],
    isConfigured: true,
    week: "2026-W38"
  });
  await putValue(serverUrl, EVENTS_KEY, [
    {
      category: "Coding",
      createdAt: "2026-09-14T08:00:00.000Z",
      date: TEST_DATE,
      endTime: "10:30",
      effort: "standard",
      id: "deep-work",
      note: "Finish the bridge",
      startTime: "09:00",
      title: "Deep work"
    },
    {
      category: "Chore",
      createdAt: "2026-09-14T08:01:00.000Z",
      date: TEST_DATE,
      id: "lunch",
      reminderOnly: true,
      startTime: "12:00",
      title: "Lunch reminder"
    }
  ]);
}

async function openExpandedEditor(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7');
  await browser.evaluate('document.querySelector("#weeklyPlannerMount .week-day-panel").click()');
  await browser.waitForExpression('document.getElementById("eventEditorCard")?.hidden === false');
}

function editorState() {
  return `(() => {
    const documentRoot = document;
    const value = (id) => documentRoot.getElementById(id).value;
    return {
      category: value("eventCategory"),
      date: value("eventDate"),
      effort: value("eventEffort"),
      end: value("eventEndTime"),
      events: [...documentRoot.querySelectorAll("#selectedDateEvents .selected-event")].map((event) => ({
        actions: [...event.querySelectorAll("button")].map((button) => button.textContent.trim()),
        className: event.className,
        note: event.querySelector(".selected-event-note")?.textContent.trim() || "",
        tag: event.querySelector(".tag")?.textContent.trim() || "",
        title: event.querySelector(".selected-event-title")?.textContent.trim() || event.textContent.trim()
      })),
      formHint: documentRoot.getElementById("formHint").textContent.trim(),
      heading: documentRoot.getElementById("selectedDateHeading").textContent.trim(),
      loadPreview: documentRoot.getElementById("plannerLoadPreview").textContent.trim(),
      note: value("eventNote"),
      pickerHidden: documentRoot.getElementById("plannerActivityPicker").hidden,
      reminderOnly: documentRoot.getElementById("eventReminderOnly").checked,
      saveLabel: documentRoot.getElementById("eventSaveButton").textContent.trim(),
      start: value("eventStartTime"),
      status: documentRoot.getElementById("plannerDayStatusHint").textContent.trim(),
      title: value("eventTitle")
    };
  })()`;
}

function editorVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const dimension = (value) => Math.round(value * 1000) / 1000;
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: dimension(rect.height),
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.getElementById("eventEditorCard");
    return {
      card: pick(card),
      event: pick(card.querySelector(".selected-event")),
      form: pick(documentRoot.getElementById("eventForm")),
      input: pick(documentRoot.getElementById("eventTitle")),
      panel: pick(card.querySelector(".panel-inner")),
      preview: pick(documentRoot.getElementById("plannerLoadPreview")),
      status: pick(documentRoot.getElementById("plannerDayStatusHint"))
    };
  })()`;
}

async function setInput(browser, id, value, prototypeName = "HTMLInputElement") {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    const input = documentRoot.getElementById(${JSON.stringify(id)});
    Object.getOwnPropertyDescriptor(documentRoot.defaultView[${JSON.stringify(prototypeName)}].prototype, "value").set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new documentRoot.defaultView.Event("input", { bubbles: true }));
    input.dispatchEvent(new documentRoot.defaultView.Event("change", { bubbles: true }));
  })()`);
}

test("Calendar event editor preserves visuals, validation, CRUD, task sync, and reload", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await seedEditor(planner.server.url);

  const pageUrl = `${planner.server.url}/calendar?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openExpandedEditor(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    assert.deepEqual(await planner.browser.evaluate(editorState()), expectedEditorState());
    assert.deepEqual(
      await planner.browser.evaluate(editorVisualContract()),
      expectedEditorVisual(width < 500)
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openExpandedEditor(planner.browser, pageUrl);
  await planner.browser.evaluate('document.getElementById("plannerAddActivityButton").click()');
  await planner.browser.waitForExpression('document.querySelectorAll("#plannerActivityOptions .planner-activity-option").length === 12');
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    [...documentRoot.querySelectorAll("#plannerActivityOptions .planner-activity-option")]
      .find((button) => button.textContent.trim() === "Gym").click();
  })()`);
  await planner.browser.waitForExpression('document.getElementById("eventCategory").value === "Gym"');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      effort: documentRoot.getElementById("eventEffort").value,
      end: documentRoot.getElementById("eventEndTime").value,
      focused: documentRoot.activeElement?.id,
      hint: documentRoot.getElementById("formHint").textContent.trim(),
      start: documentRoot.getElementById("eventStartTime").value
    };
  })()`), {
    effort: "demanding",
    end: "11:00",
    focused: "eventTitle",
    hint: "Add a time block for Gym.",
    start: "10:00"
  });
  await setInput(planner.browser, "eventCategory", "Study/school", "HTMLSelectElement");
  await setInput(planner.browser, "eventStartTime", "13:00");
  await setInput(planner.browser, "eventEndTime", "14:00");
  await setInput(planner.browser, "eventTitle", "Calendar validation");
  await setInput(planner.browser, "eventDate", "");
  await setInput(planner.browser, "eventNote", "Created in React", "HTMLTextAreaElement");
  await planner.browser.evaluate('document.getElementById("eventForm").requestSubmit()');
  await planner.browser.waitForExpression('document.querySelectorAll("#selectedDateEvents .selected-event").length === 3');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const events = JSON.parse(stored[EVENTS_KEY] || "[]");
    const tasks = JSON.parse(stored[`hivePlanner.dailyTasks.${TEST_DATE}`] || "[]");
    const event = events.find((candidate) => candidate.title === "Calendar validation");
    return event?.date === TEST_DATE
      && event.note === "Created in React"
      && tasks.some((task) => task.sourceEventId === event.id && task.scheduledTime === "13:00");
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7');
  await planner.browser.evaluate('document.querySelector("#weeklyPlannerMount .week-day-panel").click()');
  await planner.browser.waitForExpression('document.querySelectorAll("#selectedDateEvents .selected-event").length === 3');

  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    window.confirm = () => true;
    const item = [...documentRoot.querySelectorAll("#selectedDateEvents .selected-event")]
      .find((event) => event.textContent.includes("Calendar validation"));
    item.querySelector(".quiet-danger").click();
  })()`);
  await planner.browser.waitForExpression('document.querySelectorAll("#selectedDateEvents .selected-event").length === 2');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    return !JSON.parse(stored[EVENTS_KEY] || "[]").some((event) => event.title === "Calendar validation");
  });
  assert.deepEqual(planner.browser.errors(), []);
});
