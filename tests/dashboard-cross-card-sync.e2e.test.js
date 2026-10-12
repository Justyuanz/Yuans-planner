const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

// The Dashboard composes cards that belong to different pages and read each
// other's stored data: the Money quick log writes transactions, and the insight
// card derives its headline from them. Each half is unit tested on its own, and
// the existing browser sync tests fire a synthetic StorageEvent, which is the
// external path. Nothing covered the internal one — a real action in one card
// refreshing another card beside it through React state, with no reload and no
// synthetic event. A stale memo or a missing dependency would pass every other
// test in the suite.

const TEST_DATE = "2026-11-20";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";

// A small monthly budget, so one logged spend is enough to push the weekly
// flexible buffer below zero and trigger the overspending insight.
const SETTINGS = {
  monthlyBudget: 200,
  fixedCosts: 0,
  savingsTarget: 0,
  categories: [{ id: "groceries", label: "Groceries", limit: 200 }]
};

async function putStoredValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

function logSpend(amount) {
  return `(() => {
    const setInput = (selector, value) => {
      const input = document.querySelector(selector);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setInput("#moneyQuickAmount", ${JSON.stringify(String(amount))});
    document.getElementById("moneyQuickForm").requestSubmit();
  })()`;
}

const INSIGHT_TITLE = `document.getElementById("dashboardInsightTitle").textContent.trim()`;
const REMAINING_MONTH = `(() => {
  const stats = document.querySelectorAll("#moneyQuickSummary .money-mini-stat strong");
  return Array.from(stats).map((node) => node.textContent.trim());
})()`;

test("a spend logged on the Dashboard refreshes the cards beside it without a reload", async function (t) {
  const planner = await startBrowserPlanner(t);
  if (!planner) return;

  await putStoredValue(planner.server.url, SETTINGS_KEY, SETTINGS);
  await putStoredValue(planner.server.url, TRANSACTIONS_KEY, []);

  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(`Boolean(
    document.documentElement.dataset.plannerReady === "true"
    && document.getElementById("moneyQuickForm")
    && document.getElementById("dashboardInsightTitle")
  )`);

  const titleBefore = await planner.browser.evaluate(INSIGHT_TITLE);
  const remainingBefore = await planner.browser.evaluate(REMAINING_MONTH);
  assert.notEqual(
    titleBefore,
    "Spending is pressing on this week's room a bit.",
    "the overspending insight was already showing before anything was spent"
  );

  // One spend, through the real form, large enough to exhaust the budget.
  await planner.browser.evaluate(logSpend(260));

  // The card that took the action updates.
  await planner.browser.waitForExpression(
    `${JSON.stringify(JSON.stringify(remainingBefore))} !== JSON.stringify(${REMAINING_MONTH})`
  );

  // And so does the insight card next to it, which belongs to another page's
  // feature and reads the money store rather than the form.
  await planner.browser.waitForExpression(
    `${INSIGHT_TITLE} === "Spending is pressing on this week's room a bit."`
  );
  const why = await planner.browser.evaluate(
    `document.getElementById("dashboardInsightWhy").textContent.trim()`
  );
  assert.match(why, /weekly flexible buffer is below zero/);

  // The spend reached SQLite, so this was a real write and not only a render.
  const stored = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const transactions = JSON.parse(data[TRANSACTIONS_KEY] || "[]");
    return transactions.length === 1 ? transactions : null;
  });
  assert.equal(stored[0].amountCents, 26000);

  // After a reload both cards still agree, which rules out the live update
  // having drifted from what was actually saved.
  await planner.browser.reload();
  await planner.browser.waitForExpression(`Boolean(
    document.documentElement.dataset.plannerReady === "true"
    && document.getElementById("dashboardInsightTitle")
  )`);
  assert.equal(
    await planner.browser.evaluate(INSIGHT_TITLE),
    "Spending is pressing on this week's room a bit."
  );

  assert.deepEqual(await planner.browser.errors(), []);
});
