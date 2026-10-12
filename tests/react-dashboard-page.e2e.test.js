const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  dashboardClip,
  dashboardPageGeometry,
  dashboardPageState,
  expectedDashboardPageGeometry,
  expectedDashboardPageScreenshot,
  expectedDashboardPageState
} = require("./helpers/dashboard-page-contract");
const { compareScreenshotSignature, compareScreenshots } = require("./helpers/png-compare");

const TEST_DATE = "2026-09-14";

function task(id, label, done) {
  return { activity: "cpp", done, hours: 1, id, label };
}

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedDashboard(serverUrl) {
  await Promise.all(["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"].map(
    (date, index) => putValue(serverUrl, `hivePlanner.dailyTasks.${date}`, [
      task(`history-${index}`, "13:00 Complete migration slice", true)
    ])
  ));
  await putValue(serverUrl, `hivePlanner.dailyTasks.${TEST_DATE}`, [
    task("today-1", "09:00 Characterize current behavior", false),
    task("today-2", "11:00 Add focused regression tests", false),
    task("today-3", "14:00 Implement typed boundary", false),
    task("today-4", "16:00 Verify browser parity", false)
  ]);
  await putValue(serverUrl, "hivePlanner.events", []);
}

async function openReady(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
}

// The animated mascot is hidden before capture so it cannot add noise, while
// its layout space is preserved.
async function prepareScreenshot(browser) {
  await browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const mascot = document.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`);
}

test("Dashboard is a direct React page with legacy layout and Pattern behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await seedDashboard(planner.server.url);
  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  const rootUrl = `${planner.server.url}/?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openReady(planner.browser, pageUrl);
    assert.deepEqual(await planner.browser.evaluate(dashboardPageState()), expectedDashboardPageState());
    const geometry = await planner.browser.evaluate(dashboardPageGeometry());
    assert.deepEqual(geometry, expectedDashboardPageGeometry(width < 500));
    assert.equal(geometry.overflow, false);
    await prepareScreenshot(planner.browser);
    const comparison = compareScreenshotSignature(
      await planner.browser.captureScreenshot(dashboardClip()),
      expectedDashboardPageScreenshot(width < 500)
    );
    assert.equal(comparison.matches, true, `${width}px Dashboard screenshot: ${JSON.stringify(comparison)}`);
  }

  // The no-view entry path must render exactly the same Dashboard.
  await planner.browser.setViewport(1280, 720);
  await openReady(planner.browser, pageUrl);
  const explicitState = await planner.browser.evaluate(dashboardPageState());
  const explicitGeometry = await planner.browser.evaluate(dashboardPageGeometry());
  await prepareScreenshot(planner.browser);
  const explicitScreenshot = await planner.browser.captureScreenshot(dashboardClip());

  await openReady(planner.browser, rootUrl);
  const rootState = await planner.browser.evaluate(dashboardPageState());
  const rootGeometry = await planner.browser.evaluate(dashboardPageGeometry());
  await prepareScreenshot(planner.browser);
  const rootScreenshot = await planner.browser.captureScreenshot(dashboardClip());
  assert.deepEqual(rootState, explicitState);
  assert.deepEqual(rootGeometry, explicitGeometry);
  assert.equal(rootState.iframeCount, 0);
  assert.equal(rootState.date, "Mon Sep 14");
  assert.equal(compareScreenshots(rootScreenshot, explicitScreenshot).matches, true);

  await openReady(planner.browser, `${planner.server.url}/`);
  assert.deepEqual(
    await planner.browser.evaluate(`(() => ({
      activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
      iframeCount: document.querySelectorAll("iframe").length
    }))()`),
    { activeTab: "Dashboard", iframeCount: 0 }
  );

  await openReady(planner.browser, rootUrl);
  await planner.browser.evaluate('document.querySelector("[data-view-target=moneyView]").click()');
  await planner.browser.waitForExpression('location.search.includes("view=moneyView")');
  await planner.browser.waitForExpression(
    'document.documentElement.dataset.plannerReady === "true"'
  );
  assert.equal(await planner.browser.evaluate('location.search.includes("date=2026-09-14")'), true);
  assert.equal(await planner.browser.evaluate('document.querySelectorAll("iframe").length'), 0);

  await openReady(planner.browser, `${planner.server.url}/?view=journalView&date=${TEST_DATE}`);
  assert.deepEqual(
    await planner.browser.evaluate(`(() => ({
      active: document.getElementById("journalView").classList.contains("active"),
      iframeCount: document.querySelectorAll("iframe").length
    }))()`),
    { active: true, iframeCount: 0 }
  );

  await openReady(planner.browser, `${planner.server.url}/?view=calendarView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelectorAll("#calendarGrid .day-cell").length === 42');
  assert.deepEqual(
    await planner.browser.evaluate(`(() => ({
      active: document.getElementById("calendarView").classList.contains("active"),
      iframeCount: document.querySelectorAll("iframe").length
    }))()`),
    { active: true, iframeCount: 0 }
  );

  await openReady(planner.browser, `${planner.server.url}/?view=skateView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.getElementById("skateCurrentDay") !== null');
  assert.deepEqual(
    await planner.browser.evaluate(`({
      active: document.getElementById("skateView").classList.contains("active"),
      iframeCount: document.querySelectorAll("iframe").length
    })`),
    { active: true, iframeCount: 0 }
  );

  await planner.browser.open(`${planner.server.url}/?view=guitarView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.getElementById("guitarSessionSummary") !== null');
  assert.deepEqual(
    await planner.browser.evaluate(`({
      active: document.getElementById("guitarView").classList.contains("active"),
      iframeCount: document.querySelectorAll("iframe").length
    })`),
    { active: true, iframeCount: 0 }
  );

  await openReady(planner.browser, pageUrl);
  await planner.browser.evaluate('document.querySelector("#dashboardInsightActions .insight-action").click()');
  assert.equal(await planner.browser.evaluate('document.activeElement === document.getElementById("taskTitle")'), true);

  await planner.browser.evaluate(`(() => {
    const planned = document.getElementById("plannedMount");
    planned.scrollIntoView = (options) => { planned.dataset.testScroll = JSON.stringify(options); };
    document.querySelectorAll("#dashboardInsightActions .insight-action")[1].click();
  })()`);
  assert.equal(
    await planner.browser.evaluate('document.getElementById("plannedMount").dataset.testScroll'),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );

  await planner.browser.evaluate('document.getElementById("openPatternHistory").click()');
  await planner.browser.waitForExpression('document.getElementById("patternHistoryDialog").open');
  assert.equal(
    await planner.browser.evaluate('document.getElementById("patternHistoryRange").textContent.trim()'),
    "Last 14 days through 2026-09-14"
  );
  await planner.browser.evaluate('document.querySelector(".pattern-history-evidence summary").click()');
  await planner.browser.evaluate('document.getElementById("closePatternHistory").click()');
  await planner.browser.waitForExpression('!document.getElementById("patternHistoryDialog").open');
  await planner.browser.evaluate('document.getElementById("openPatternHistory").click()');
  assert.equal(
    await planner.browser.evaluate('document.querySelector(".pattern-history-evidence").open'),
    false
  );
  assert.deepEqual(planner.browser.errors(), []);
});
