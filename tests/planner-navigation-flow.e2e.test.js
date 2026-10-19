const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const VIEWS = [
  ["journalView", "/journal"],
  ["moneyView", "/money"],
  ["calendarView", "/calendar"],
  ["skateView", "/skate"],
  ["guitarView", "/guitar"],
  ["todayView", "/"]
];

async function seedProductionSizedStore(serverUrl) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    body: JSON.stringify({
      key: "hivePlanner.integration.largePayload",
      value: "x".repeat(2_200_000)
    }),
    headers: { "Content-Type": "application/json" },
    method: "PUT"
  });
  assert.equal(response.ok, true);
}

function plannerRequestCount() {
  return `performance.getEntriesByType("resource")
    .filter(({ name }) => name.endsWith("/api/kv")).length`;
}

test("the Planner behaves like one fast app across every view", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await seedProductionSizedStore(planner.server.url);

  const openedAt = Date.now();
  await planner.browser.open(`${planner.server.url}/?live=1&date=2000-01-01`);
  await planner.browser.waitForExpression(
    'document.documentElement.dataset.plannerReady === "true"'
  );
  const initialLoadMs = Date.now() - openedAt;
  const routeTimings = {};
  assert.ok(initialLoadMs < 3_000, "Initial load took longer than 3 seconds");

  await planner.browser.evaluate(`(() => {
    const originalFetch = window.fetch.bind(window);
    window.__plannerNavigationTest = { loadingSeen: false, startedAt: 0, storeGets: 0 };
    window.fetch = (input, init) => {
      const method = init?.method ?? "GET";
      if (String(input).endsWith("/api/kv") && method === "GET") {
        window.__plannerNavigationTest.storeGets += 1;
      }
      return originalFetch(input, init);
    };
    new MutationObserver(() => {
      if (document.querySelector(".planner-loading")) {
        window.__plannerNavigationTest.loadingSeen = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  })()`);

  assert.equal(await planner.browser.evaluate(plannerRequestCount()), 1);

  for (const [viewId, pathname] of VIEWS) {
    await planner.browser.evaluate(`(() => {
      window.__plannerNavigationTest.startedAt = performance.now();
      document.querySelector('[data-view-target="${viewId}"]').click();
    })()`);
    await planner.browser.waitForExpression(
      `location.pathname === "${pathname}"
        && document.getElementById("${viewId}")?.classList.contains("active")`
    );
    const duration = await planner.browser.evaluate(
      "performance.now() - window.__plannerNavigationTest.startedAt"
    );
    routeTimings[viewId] = Math.round(duration);
    assert.ok(duration < 1_500, `${viewId} took ${Math.round(duration)}ms to open`);
    assert.equal(await planner.browser.evaluate('document.querySelector(".planner-loading") === null'), true);
  }

  assert.equal(await planner.browser.evaluate("window.__plannerNavigationTest.storeGets"), 0);
  assert.equal(await planner.browser.evaluate("window.__plannerNavigationTest.loadingSeen"), false);
  assert.equal(await planner.browser.evaluate("location.search"), "");
  assert.equal(
    await planner.browser.evaluate(`(() => {
      const date = new Date();
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const expected = weekdays[date.getDay()] + " " + months[date.getMonth()] + " " + date.getDate();
      return document.getElementById("dashboardDate").textContent === expected;
    })()`),
    true
  );
  assert.deepEqual(planner.browser.errors(), []);
  context.diagnostic(`Initial load: ${initialLoadMs}ms; routes: ${JSON.stringify(routeTimings)}`);
});
