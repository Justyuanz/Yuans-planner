const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const WEEK_KEY = "hivePlanner.routine.week.2026-W38";

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedWeek(serverUrl) {
  await putValue(serverUrl, WEEK_KEY, {
    days: [
      { type: "recovery" }, { type: "high" }, { type: "normal" }, { type: "high" },
      { type: "normal" }, { type: "normal" }, { type: "normal" }
    ],
    isConfigured: true,
    week: "2026-W38"
  });
  await putValue(serverUrl, "hivePlanner.events", [
    { id: "work", date: TEST_DATE, category: "Coding", title: "09:00-10:30 Deep work" },
    { id: "gym", date: "2026-09-15", category: "Gym", effort: "easy", startTime: "18:00", endTime: "18:30", title: "Gym" },
    { id: "reminder", date: "2026-09-15", category: "Chore", reminderOnly: true, startTime: "12:00", title: "Lunch" },
    { id: "routine", date: "2026-09-16", category: "Skate", routineManaged: true, title: "Hidden" }
  ]);
}

async function openCalendar(browser, url, documentExpression) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7`);
}

function weekState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      days: [...documentRoot.querySelectorAll("#weeklyPlannerMount .week-day-panel")].map((day) => ({
        badges: [...day.querySelectorAll(".week-day-summary .week-event-button")].map((badge) => ({
          className: badge.className,
          text: badge.textContent.trim()
        })),
        className: day.className,
        date: day.querySelector(".week-day-header span")?.textContent.trim(),
        label: day.querySelector(".week-day-header strong")?.textContent.trim(),
        status: day.querySelector(".week-day-status")?.textContent.trim(),
        type: day.querySelector(".day-type-pill")?.textContent.trim()
      })),
      editorHidden: documentRoot.getElementById("eventEditorCard").hidden,
      label: documentRoot.getElementById("weeklyPlannerLabel").textContent.trim()
    };
  })()`;
}

function weekVisualContract(documentExpression) {
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
        boxShadow: style.boxShadow,
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
    const card = documentRoot.querySelector(".weekly-planner-card");
    const firstDay = card.querySelector(".week-day-panel");
    return {
      card: pick(card),
      firstBadge: pick(firstDay.querySelector(".week-event-button")),
      firstDay: pick(firstDay),
      header: pick(card.querySelector(":scope > .panel-inner > .section-head")),
      mount: pick(documentRoot.getElementById("weeklyPlannerMount")),
      panel: pick(card.querySelector(".panel-inner")),
      status: pick(firstDay.querySelector(".week-day-status")),
      type: pick(firstDay.querySelector(".day-type-pill"))
    };
  })()`;
}

async function prepareWeekScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const style = documentRoot.createElement("style");
    style.textContent = ".week-day-panel{transition:none!important}";
    documentRoot.head.appendChild(style);
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".weekly-planner-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

function weekClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".weekly-planner-card").getBoundingClientRect();
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

async function clickSetupType(browser, documentExpression, rowIndex, label) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const row = documentRoot.querySelectorAll(".week-setup-row")[${rowIndex}];
    [...row.querySelectorAll("button")].find((button) => button.textContent.trim() === ${JSON.stringify(label)}).click();
  })()`);
}

test("Calendar weekly planner preserves legacy visuals, setup rules, navigation, and persistence", { timeout: 90_000 }, async function (context) {
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
  await seedWeek(planner.server.url);

  const legacyUrl = `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=calendarView&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openCalendar(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(weekState("document"));
    const legacyVisual = await planner.browser.evaluate(weekVisualContract("document"));
    await prepareWeekScreenshot(planner.browser, "document");
    const legacyScreenshot = width >= 500
      ? await planner.browser.captureScreenshot(weekClip("document"))
      : null;

    await openCalendar(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.querySelector(".weekly-planner-card").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(weekState(previewDocument));
    const reactVisual = await planner.browser.evaluate(weekVisualContract(previewDocument));
    await prepareWeekScreenshot(planner.browser, previewDocument);
    assert.deepEqual(reactState, legacyState);
    assert.deepEqual(reactVisual, legacyVisual);
    if (legacyScreenshot !== null) {
      const reactScreenshot = await planner.browser.captureScreenshot(weekClip(
        previewDocument,
        'document.querySelector("iframe")'
      ));
      assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Calendar weekly planner`);
    }
  }

  await planner.browser.setViewport(1280, 720);
  await openCalendar(planner.browser, previewUrl, previewDocument);
  await planner.browser.evaluate(`(${previewDocument}).querySelectorAll("#weeklyPlannerMount .week-day-panel")[1].click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("eventEditorCard").hidden === false`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      date: documentRoot.getElementById("eventDate").value,
      editorParent: documentRoot.getElementById("eventEditorCard").parentElement.className,
      heading: documentRoot.getElementById("selectedDateHeading").textContent.trim(),
      selectedDay: documentRoot.querySelector("#weeklyPlannerMount .selected-day .week-day-header span").textContent.trim()
    };
  })()`), {
    date: "2026-09-15",
    editorParent: "legacy-event-editor-mount",
    heading: "Tue Sep 15",
    selectedDay: "Tue Sep 15"
  });
  await planner.browser.evaluate(`(${previewDocument}).querySelector(".planner-collapse-button").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("eventEditorCard").hidden === true`);

  await planner.browser.evaluate(`(${previewDocument}).getElementById("nextWeek").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector("#weeklyPlannerMount .week-day-header span").textContent === "Mon Sep 21"`);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("prevWeek").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector("#weeklyPlannerMount .week-day-header span").textContent === "Mon Sep 14"`);

  await planner.browser.evaluate(`(${previewDocument}).getElementById("setWeekButton").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll(".week-setup-row").length === 7`);
  await clickSetupType(planner.browser, previewDocument, 0, "Normal");
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("weeklyPlannerLabel").textContent.includes("Keep one Recovery Day")`);
  await clickSetupType(planner.browser, previewDocument, 2, "Recovery");
  await clickSetupType(planner.browser, previewDocument, 0, "Normal");
  await clickSetupType(planner.browser, previewDocument, 4, "High-Intensity");
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("weeklyPlannerLabel").textContent.includes("Two High-Intensity Days")`);
  await planner.browser.evaluate(`(${previewDocument}).querySelector(".week-setup-footer .primary-button").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const week = JSON.parse(stored[WEEK_KEY] || "null");
    return week?.days?.map((day) => day.type).join(",") === "normal,high,recovery,high,normal,normal,normal";
  });
  assert.deepEqual(await planner.browser.evaluate(`(() => [...(${previewDocument}).querySelectorAll("#weeklyPlannerMount .day-type-pill")]
    .map((badge) => badge.textContent.trim()))()`), [
    "Normal", "High-Intensity", "Recovery", "High-Intensity", "Normal", "Normal", "Normal"
  ]);

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(${previewDocument}).documentElement.dataset.plannerReady === "true"`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7`);
  assert.equal(await planner.browser.evaluate(
    `(${previewDocument}).querySelectorAll("#weeklyPlannerMount .day-type-pill")[2].textContent.trim()`
  ), "Recovery");
  assert.deepEqual(planner.browser.errors(), []);
});
