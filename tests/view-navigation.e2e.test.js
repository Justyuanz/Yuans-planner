const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-12";
const VIEW_EXPECTATIONS = [
  {
    id: "todayView",
    heading: "Weekly goals",
    ready: 'document.querySelector("#tasksMount .empty") !== null && document.getElementById("lifeBreakdown").children.length > 0'
  },
  {
    id: "journalView",
    heading: "Feeling corner",
    ready: `document.getElementById("journalDate").value === "${TEST_DATE}" && document.getElementById("journalArchiveList").children.length > 0`
  },
  {
    id: "moneyView",
    heading: "Money planner",
    ready: 'document.getElementById("moneyOverviewGrid").children.length > 0 && document.getElementById("moneyCategoryBudgetList").children.length > 0'
  },
  {
    id: "calendarView",
    heading: "Weekly planner",
    ready: 'document.getElementById("weeklyPlannerMount").children.length > 0 && document.getElementById("calendarGrid").children.length > 0'
  },
  {
    id: "skateView",
    heading: "Skate today",
    ready: 'document.getElementById("skateCoachFlow").children.length > 0 && document.getElementById("skateTrendCharts").children.length > 0'
  },
  {
    id: "guitarView",
    heading: "Progress planner",
    ready: 'document.getElementById("guitarSessionSummary").children.length > 0 && document.getElementById("guitarRecentSessions").children.length > 0'
  }
];

async function activateView(browser, expectation) {
  await browser.evaluate(`document.querySelector('[data-view-target="${expectation.id}"]').click()`);
  await browser.waitForExpression(`
    document.getElementById("${expectation.id}").classList.contains("active") &&
    document.querySelector('[data-view-target="${expectation.id}"]').classList.contains("active") &&
    (${expectation.ready})
  `);

  return browser.evaluate(`(() => {
    const activeView = document.querySelector("section.view.active");
    const headingId = activeView.getAttribute("aria-labelledby");
    return {
      activeViewCount: document.querySelectorAll("section.view.active").length,
      heading: document.getElementById(headingId).textContent.trim()
    };
  })()`);
}

test("all six primary views navigate and render their dynamic content", { timeout: 30_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#tasksMount .empty") !== null');

  for (const expectation of VIEW_EXPECTATIONS) {
    const state = await activateView(planner.browser, expectation);
    assert.equal(state.activeViewCount, 1, `${expectation.id} should be the only active view`);
    assert.equal(state.heading, expectation.heading);
  }

  assert.deepEqual(planner.browser.errors(), []);
});
