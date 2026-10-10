const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedCalendarPageGeometry,
  expectedCalendarPageState
} = require("./helpers/calendar-page-contract");

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

async function seedCalendar(serverUrl) {
  await putValue(serverUrl, "hivePlanner.routine.week.2026-W38", {
    days: [
      { type: "recovery" }, { type: "high" }, { type: "normal" }, { type: "high" },
      { type: "normal" }, { type: "normal" }, { type: "recovery" }
    ],
    isConfigured: true,
    week: "2026-W38"
  });
  await putValue(serverUrl, EVENTS_KEY, [
    {
      category: "Transcendence",
      createdAt: "2026-09-14T08:00:00.000Z",
      date: TEST_DATE,
      endTime: "10:30",
      effort: "standard",
      id: "deep-work",
      note: "Finish the route",
      startTime: "09:00",
      title: "Deep work"
    },
    {
      category: "Chores/groceries",
      createdAt: "2026-09-15T08:00:00.000Z",
      date: "2026-09-15",
      id: "lunch",
      reminderOnly: true,
      startTime: "12:00",
      title: "Lunch reminder"
    }
  ]);
}

async function openReady(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#calendarGrid .day-cell").length === 42');
  await browser.waitForExpression('document.querySelectorAll("#weeklyPlannerMount .week-day-panel").length === 7');
}

function pageState() {
  return `(() => ({
    activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
    activeView: document.querySelector(".view.active")?.id,
    dayCells: document.querySelectorAll("#calendarGrid .day-cell").length,
    eventPills: [...document.querySelectorAll("#calendarGrid .event-pill")].map((pill) => pill.textContent.trim()),
    iframeCount: document.querySelectorAll("iframe").length,
    month: document.getElementById("currentMonthLabel")?.textContent.trim(),
    selected: document.querySelector("#calendarGrid .day-cell.selected")?.getAttribute("aria-label"),
    weekDays: [...document.querySelectorAll("#weeklyPlannerMount .week-day-header > div > span:first-of-type")]
      .map((label) => label.textContent.trim())
  }))()`;
}

function pageGeometry() {
  return `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      calendar: rect(".calendar-shell"),
      month: rect(".monthly-calendar-card"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      week: rect(".weekly-planner-card")
    };
  })()`;
}

async function setInput(browser, id, value) {
  await browser.evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
}

test("Calendar is a direct React page with responsive layout and persistence", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context, { frontendMode: "react" });
  if (!planner) return;
  await seedCalendar(planner.server.url);

  const pageUrl = `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`;
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openReady(planner.browser, pageUrl);
    assert.deepEqual(await planner.browser.evaluate(pageState()), expectedCalendarPageState());
    assert.deepEqual(
      await planner.browser.evaluate(pageGeometry()),
      expectedCalendarPageGeometry(width < 500)
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openReady(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(pageState()), expectedCalendarPageState());

  await planner.browser.evaluate('document.querySelector(".day-cell.selected .event-pill").click()');
  await planner.browser.waitForExpression('document.getElementById("eventSaveButton").textContent === "Update activity"');
  await planner.browser.waitForExpression('document.activeElement?.id === "eventTitle"');
  assert.deepEqual(await planner.browser.evaluate(`({
    date: document.getElementById("eventDate").value,
    focused: document.activeElement?.id,
    title: document.getElementById("eventTitle").value
  })`), { date: TEST_DATE, focused: "eventTitle", title: "Deep work" });
  await setInput(planner.browser, "eventTitle", "Direct Calendar work");
  await planner.browser.evaluate('document.getElementById("eventForm").requestSubmit()');
  await planner.browser.waitForExpression('document.querySelector(".day-cell.selected .event-pill-name").textContent === "Direct Calendar work"');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const events = JSON.parse(stored[EVENTS_KEY] || "[]");
    const tasks = JSON.parse(stored[`hivePlanner.dailyTasks.${TEST_DATE}`] || "[]");
    return events.find((event) => event.id === "deep-work")?.title === "Direct Calendar work"
      && tasks.some((task) => task.sourceEventId === "deep-work");
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelector(".day-cell.selected .event-pill-name")?.textContent === "Direct Calendar work"');
  await planner.browser.evaluate('document.getElementById("nextWeek").click()');
  await planner.browser.waitForExpression('document.querySelector("#weeklyPlannerMount .week-day-header > div > span").textContent === "Mon Sep 21"');
  await planner.browser.evaluate('document.getElementById("prevWeek").click()');
  await planner.browser.waitForExpression('document.querySelector("#weeklyPlannerMount .week-day-header > div > span").textContent === "Mon Sep 14"');

  await planner.browser.evaluate('document.querySelector("[data-view-target=todayView]").click()');
  await planner.browser.waitForExpression('location.search.includes("view=todayView")');
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  assert.equal(await planner.browser.evaluate('document.querySelectorAll("iframe").length'), 0);
  assert.deepEqual(planner.browser.errors(), []);
});
