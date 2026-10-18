const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedCalendarState,
  expectedCalendarVisual
} = require("./helpers/calendar-month-contract");

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

async function openCalendar(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#calendarGrid .day-cell").length === 42');
}

function calendarState() {
  return `(() => {
    const documentRoot = document;
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

function calendarVisualContract() {
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

test("Calendar month grid preserves visuals, navigation, editing, and reload", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await seedCalendar(planner.server.url);

  const pageUrl = `${planner.server.url}/calendar?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openCalendar(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    assert.deepEqual(await planner.browser.evaluate(calendarState()), expectedCalendarState());
    assert.deepEqual(
      await planner.browser.evaluate(calendarVisualContract()),
      expectedCalendarVisual(width < 500)
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openCalendar(planner.browser, pageUrl);
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.querySelector('.day-cell[aria-label="Select Tue Sep 15"]')
      .dispatchEvent(new documentRoot.defaultView.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  })()`);
  await planner.browser.waitForExpression('document.querySelector(\'.day-cell[aria-label="Select Tue Sep 15"]\').classList.contains("selected")');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      date: documentRoot.getElementById("eventDate").value,
      focused: documentRoot.activeElement?.id,
      heading: documentRoot.getElementById("selectedDateHeading").textContent.trim()
    };
  })()`), { date: "2026-09-15", focused: "eventStartTime", heading: "Tue Sep 15" });

  await planner.browser.evaluate('document.querySelector(\'.day-cell[aria-label="Select Mon Sep 14"] .event-pill\').click()');
  await planner.browser.waitForExpression('document.getElementById("eventSaveButton").textContent === "Update activity"');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      date: documentRoot.getElementById("eventDate").value,
      focused: documentRoot.activeElement?.id,
      start: documentRoot.getElementById("eventStartTime").value,
      title: documentRoot.getElementById("eventTitle").value
    };
  })()`), { date: TEST_DATE, focused: "eventTitle", start: "09:00", title: "Deep work" });

  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    const input = documentRoot.getElementById("eventTitle");
    Object.getOwnPropertyDescriptor(documentRoot.defaultView.HTMLInputElement.prototype, "value").set.call(input, "Focused rewrite");
    input.dispatchEvent(new documentRoot.defaultView.Event("input", { bubbles: true }));
    documentRoot.getElementById("eventForm").requestSubmit();
  })()`);
  await planner.browser.waitForExpression('document.querySelector(\'.day-cell[aria-label="Select Mon Sep 14"] .event-pill-name\').textContent === "Focused rewrite"');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const events = JSON.parse(stored[EVENTS_KEY] || "[]");
    return events.find((event) => event.id === "deep-work")?.title === "Focused rewrite";
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelector(\'.day-cell[aria-label="Select Mon Sep 14"] .event-pill-name\')?.textContent === "Focused rewrite"');
  await planner.browser.evaluate('document.getElementById("nextMonth").click()');
  await planner.browser.waitForExpression('document.getElementById("currentMonthLabel").textContent === "October 2026"');
  await planner.browser.evaluate('document.getElementById("prevMonth").click()');
  await planner.browser.waitForExpression('document.getElementById("currentMonthLabel").textContent === "September 2026"');

  assert.deepEqual(planner.browser.errors(), []);
});
