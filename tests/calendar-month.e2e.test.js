const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const EVENTS_KEY = "hivePlanner.events";
const EVENTS = [
  {
    category: "Coding",
    createdAt: "2026-09-14T08:00:00.000Z",
    date: TEST_DATE,
    id: "deep-work",
    note: "Finish the bridge",
    startTime: "09:00",
    endTime: "10:30",
    title: "09:00-10:30 Deep work"
  },
  {
    category: "Chore",
    createdAt: "2026-09-14T08:01:00.000Z",
    date: TEST_DATE,
    id: "lunch",
    reminderOnly: true,
    startTime: "12:00",
    title: "Lunch reminder"
  },
  {
    category: "Python",
    createdAt: "2026-09-14T08:02:00.000Z",
    date: TEST_DATE,
    id: "class",
    startTime: "18:30",
    endTime: "19:00",
    title: "Evening class"
  },
  {
    category: "Social",
    createdAt: "2026-09-14T08:03:00.000Z",
    date: TEST_DATE,
    id: "call",
    startTime: "20:00",
    title: "Call family"
  },
  {
    category: "LeetCode",
    createdAt: "2026-09-14T08:04:00.000Z",
    date: TEST_DATE,
    id: "extra",
    title: "A fifth event"
  },
  {
    category: "Gym",
    createdAt: "2026-09-15T08:00:00.000Z",
    date: "2026-09-15",
    id: "routine-hidden",
    routineManaged: true,
    title: "Hidden routine event"
  }
];

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedCalendar(serverUrl) {
  await putValue(serverUrl, EVENTS_KEY, EVENTS);
  await putValue(serverUrl, "hivePlanner.routine.week.2026-W38", {
    days: [
      { type: "recovery" },
      { type: "recovery" },
      { type: "high" },
      { type: "normal" },
      { type: "normal" },
      { type: "high" },
      { type: "recovery" }
    ]
  });
}

async function openCalendar(browser, url, documentExpression) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll("#calendarGrid .day-cell").length === 42`);
}

function calendarState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      activeView: documentRoot.querySelector(".view.active")?.id,
      cells: [...documentRoot.querySelectorAll("#calendarGrid .day-cell")].map((cell) => ({
        ariaLabel: cell.getAttribute("aria-label"),
        className: cell.className,
        day: cell.querySelector(".day-number")?.textContent.trim(),
        pills: [...cell.querySelectorAll(".event-pill")].map((pill) => ({
          className: pill.className,
          text: pill.textContent.trim(),
          title: pill.title
        }))
      })),
      label: documentRoot.getElementById("currentMonthLabel")?.textContent.trim(),
      weekdays: [...documentRoot.querySelectorAll("#calendarGrid .weekday")].map((weekday) => weekday.textContent.trim())
    };
  })()`;
}

function calendarVisualContract(documentExpression) {
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
        textAlign: style.textAlign,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".monthly-calendar-card");
    const cells = [...card.querySelectorAll(".day-cell")];
    return {
      card: pick(card),
      firstCell: pick(cells[0]),
      grid: pick(documentRoot.getElementById("calendarGrid")),
      panel: pick(card.querySelector(".panel-inner")),
      selectedCell: pick(card.querySelector(".day-cell.selected")),
      selectedPills: [...card.querySelectorAll(".day-cell.selected .event-pill")].map(pick),
      toolbar: pick(card.querySelector(".calendar-toolbar")),
      weekday: pick(card.querySelector(".weekday"))
    };
  })()`;
}

async function prepareCalendarScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const style = documentRoot.createElement("style");
    style.textContent = ".day-cell,.event-pill{transition:none!important}";
    documentRoot.head.appendChild(style);
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".monthly-calendar-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

function calendarClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".monthly-calendar-card").getBoundingClientRect();
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

test("Calendar month grid preserves legacy visuals, navigation, editing, and reload", { timeout: 90_000 }, async function (context) {
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
  await seedCalendar(planner.server.url);

  const legacyUrl = `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=calendarView&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openCalendar(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(calendarState("document"));
    const legacyVisual = await planner.browser.evaluate(calendarVisualContract("document"));
    await prepareCalendarScreenshot(planner.browser, "document");
    const legacyScreenshot = width >= 500
      ? await planner.browser.captureScreenshot(calendarClip("document"))
      : null;

    await openCalendar(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.querySelector(".monthly-calendar-card").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(calendarState(previewDocument));
    const reactVisual = await planner.browser.evaluate(calendarVisualContract(previewDocument));
    await prepareCalendarScreenshot(planner.browser, previewDocument);

    assert.deepEqual(reactState, legacyState);
    assert.deepEqual(reactVisual, legacyVisual);
    if (legacyScreenshot !== null) {
      const reactScreenshot = await planner.browser.captureScreenshot(calendarClip(
        previewDocument,
        'document.querySelector("iframe")'
      ));
      assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Calendar month grid`);
    }
  }

  await planner.browser.setViewport(1280, 720);
  await openCalendar(planner.browser, previewUrl, previewDocument);
  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    documentRoot.querySelector('.day-cell[aria-label="Select Tue Sep 15"]')
      .dispatchEvent(new documentRoot.defaultView.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  })()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('.day-cell[aria-label="Select Tue Sep 15"]').classList.contains("selected")`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      date: documentRoot.getElementById("eventDate").value,
      focused: documentRoot.activeElement?.id,
      heading: documentRoot.getElementById("selectedDateHeading").textContent.trim()
    };
  })()`), { date: "2026-09-15", focused: "eventStartTime", heading: "Tue Sep 15" });

  await planner.browser.evaluate(`(${previewDocument}).querySelector('.day-cell[aria-label="Select Mon Sep 14"] .event-pill').click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("eventSaveButton").textContent === "Update activity"`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      date: documentRoot.getElementById("eventDate").value,
      focused: documentRoot.activeElement?.id,
      start: documentRoot.getElementById("eventStartTime").value,
      title: documentRoot.getElementById("eventTitle").value
    };
  })()`), { date: TEST_DATE, focused: "eventTitle", start: "09:00", title: "Deep work" });

  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    documentRoot.getElementById("eventTitle").value = "Focused rewrite";
    documentRoot.getElementById("eventForm").requestSubmit();
  })()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('.day-cell[aria-label="Select Mon Sep 14"] .event-pill-name').textContent === "Focused rewrite"`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const events = JSON.parse(stored[EVENTS_KEY] || "[]");
    return events.find((event) => event.id === "deep-work")?.title === "Focused rewrite";
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(${previewDocument}).documentElement.dataset.plannerReady === "true"`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('.day-cell[aria-label="Select Mon Sep 14"] .event-pill-name')?.textContent === "Focused rewrite"`);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("nextMonth").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("currentMonthLabel").textContent === "October 2026"`);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("prevMonth").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("currentMonthLabel").textContent === "September 2026"`);

  assert.deepEqual(planner.browser.errors(), []);
});
