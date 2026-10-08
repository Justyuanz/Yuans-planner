const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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
      reminderMinutes: 15,
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

async function openExpandedEditor(browser, url, documentExpression) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    if (!documentRoot.getElementById("calendarView").classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="calendarView"]').click();
    }
  })()`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7`);
  await browser.evaluate(`(${documentExpression}).querySelector("#weeklyPlannerMount .week-day-panel").click()`);
  await browser.waitForExpression(`(${documentExpression}).getElementById("eventEditorCard").hidden === false`);
}

function editorState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
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
      reminder: value("eventReminder"),
      reminderOnly: documentRoot.getElementById("eventReminderOnly").checked,
      saveLabel: documentRoot.getElementById("eventSaveButton").textContent.trim(),
      start: value("eventStartTime"),
      status: documentRoot.getElementById("plannerDayStatusHint").textContent.trim(),
      title: value("eventTitle")
    };
  })()`;
}

function editorVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
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

async function prepareScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.getElementById("eventEditorCard").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

function editorClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.getElementById("eventEditorCard").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frame ? frameRect.x + rect.x : rect.x + documentRoot.defaultView.scrollX,
      y: frame ? frameRect.y + rect.y : rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, 620)
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function setInput(browser, documentExpression, id, value, prototypeName = "HTMLInputElement") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const input = documentRoot.getElementById(${JSON.stringify(id)});
    Object.getOwnPropertyDescriptor(documentRoot.defaultView[${JSON.stringify(prototypeName)}].prototype, "value").set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new documentRoot.defaultView.Event("input", { bubbles: true }));
    input.dispatchEvent(new documentRoot.defaultView.Event("change", { bubbles: true }));
  })()`);
}

test("Calendar event editor preserves legacy visuals, validation, CRUD, task sync, and reload", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await seedEditor(planner.server.url);

  const legacyUrl = `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=legacyShell&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openExpandedEditor(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(editorState("document"));
    const legacyVisual = await planner.browser.evaluate(editorVisualContract("document"));
    await prepareScreenshot(planner.browser, "document");
    const legacyScreenshot = width >= 500
      ? await planner.browser.captureScreenshot(editorClip("document"))
      : null;

    await openExpandedEditor(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.getElementById("eventEditorCard").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(editorState(previewDocument));
    const reactVisual = await planner.browser.evaluate(editorVisualContract(previewDocument));
    await prepareScreenshot(planner.browser, previewDocument);
    assert.deepEqual(reactState, legacyState);
    assert.deepEqual(reactVisual, legacyVisual);
    if (legacyScreenshot !== null) {
      const reactScreenshot = await planner.browser.captureScreenshot(editorClip(
        previewDocument,
        'document.querySelector("iframe")'
      ));
      assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Calendar event editor`);
    }
  }

  await planner.browser.setViewport(1280, 720);
  await openExpandedEditor(planner.browser, previewUrl, previewDocument);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("plannerAddActivityButton").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#plannerActivityOptions .planner-activity-option").length === 12`);
  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    [...documentRoot.querySelectorAll("#plannerActivityOptions .planner-activity-option")]
      .find((button) => button.textContent.trim() === "Gym").click();
  })()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("eventCategory").value === "Gym"`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
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
  await setInput(planner.browser, previewDocument, "eventCategory", "Study/school", "HTMLSelectElement");
  await setInput(planner.browser, previewDocument, "eventStartTime", "");
  await setInput(planner.browser, previewDocument, "eventEndTime", "");
  await setInput(planner.browser, previewDocument, "eventTitle", "Reminder validation");
  await setInput(planner.browser, previewDocument, "eventReminder", "10", "HTMLSelectElement");
  await planner.browser.evaluate(`(${previewDocument}).getElementById("eventForm").requestSubmit()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("formHint").textContent === "Pick a start time to send a Telegram reminder."`);
  assert.equal(JSON.parse((await planner.server.readPlannerData())[EVENTS_KEY]).length, 2);

  await setInput(planner.browser, previewDocument, "eventStartTime", "13:00");
  await setInput(planner.browser, previewDocument, "eventEndTime", "14:00");
  await setInput(planner.browser, previewDocument, "eventDate", "");
  await setInput(planner.browser, previewDocument, "eventNote", "Created in React", "HTMLTextAreaElement");
  await planner.browser.evaluate(`(${previewDocument}).getElementById("eventForm").requestSubmit()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#selectedDateEvents .selected-event").length === 3`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const events = JSON.parse(stored[EVENTS_KEY] || "[]");
    const tasks = JSON.parse(stored[`hivePlanner.dailyTasks.${TEST_DATE}`] || "[]");
    const event = events.find((candidate) => candidate.title === "Reminder validation");
    return event?.date === TEST_DATE
      && event.note === "Created in React"
      && event.reminderMinutes === 10
      && tasks.some((task) => task.sourceEventId === event.id && task.scheduledTime === "13:00");
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(${previewDocument}).documentElement.dataset.plannerReady === "true"`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7`);
  await planner.browser.evaluate(`(${previewDocument}).querySelector("#weeklyPlannerMount .week-day-panel").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#selectedDateEvents .selected-event").length === 3`);

  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    window.confirm = () => true;
    const item = [...documentRoot.querySelectorAll("#selectedDateEvents .selected-event")]
      .find((event) => event.textContent.includes("Reminder validation"));
    item.querySelector(".quiet-danger").click();
  })()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#selectedDateEvents .selected-event").length === 2`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    return !JSON.parse(stored[EVENTS_KEY] || "[]").some((event) => event.title === "Reminder validation");
  });
  assert.deepEqual(planner.browser.errors(), []);
});
