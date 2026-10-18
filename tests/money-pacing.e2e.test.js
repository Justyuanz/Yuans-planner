const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedDefaultState,
  expectedMoneyPacingVisual,
  expectedPopulatedState,
  pacingState,
  pacingVisualContract
} = require("./helpers/money-pacing-contract");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const SETTINGS = {
  categories: [
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ],
  transfers: [
    { id: "cover", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 1_000 }
  ]
};
// Spans three months so the history chart, projection, and month-prefix totals
// are all exercised, plus malformed and zero records.
const TRANSACTIONS = [
  { id: "rent", date: TEST_DATE, amountCents: 80_000, categoryId: "rent" },
  { id: "groceries", date: "2026-09-13", amountCents: 20_000, categoryId: "groceries" },
  { id: "future", date: "2026-09-12", amountCents: 5_000, categoryId: "future" },
  { id: "august-a", date: "2026-08-31", amountCents: 1_000, categoryId: "fun" },
  { id: "august-b", date: "2026-08-01", amountCents: 500, categoryId: "fun" },
  { id: "july", date: "2026-07-15", amountCents: 500, categoryId: "fun" },
  null,
  { id: "zero", date: TEST_DATE, amountCents: 0, categoryId: "fun" }
];

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedPacing(serverUrl) {
  await putValue(serverUrl, SETTINGS_KEY, SETTINGS);
  await putValue(serverUrl, TRANSACTIONS_KEY, TRANSACTIONS);
}

async function openMoney(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#moneyProgressList .money-progress-card").length === 2');
}

async function expandHistory(browser) {
  await browser.evaluate(`(() => {
    const details = document.querySelector(".money-pacing-card .money-chart-dropdown");
    if (!details.open) {
      details.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression('document.querySelector(".money-pacing-card .money-chart-dropdown").open');
}

async function scrollToPacing(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-pacing-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('Math.abs(document.querySelector(".money-pacing-card").getBoundingClientRect().top) < 1');
}

test("Money pacing preserves projections, charts, history, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/money?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(pacingState()), expectedDefaultState());

  await seedPacing(planner.server.url);
  await openMoney(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  // The history disclosure starts closed on every load, exactly like legacy.
  assert.equal((await planner.browser.evaluate(pacingState())).history.open, false);
  await expandHistory(planner.browser);
  assert.deepEqual(await planner.browser.evaluate(pacingState()), expectedPopulatedState());

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openMoney(planner.browser, pageUrl);
    await expandHistory(planner.browser);
    await scrollToPacing(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(pacingVisualContract()),
      expectedMoneyPacingVisual(width < 500)
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  await expandHistory(planner.browser);

  // Live store updates recalculate every bar while leaving the disclosure open.
  await putValue(planner.server.url, TRANSACTIONS_KEY, []);
  await putValue(planner.server.url, SETTINGS_KEY, {});
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(SETTINGS_KEY)},
    newValue: "{}"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyProgressList .money-progress-copy span").textContent === "€0.00 spent of €1,300.00"');
  assert.deepEqual(await planner.browser.evaluate(pacingState()), expectedDefaultState(true));

  // Reload persists the cleared money data and closes the disclosure again.
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(pacingState()), expectedDefaultState());

  assert.deepEqual(planner.browser.errors(), []);
});
