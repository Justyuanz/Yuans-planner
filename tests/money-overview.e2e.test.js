const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedDefaultState,
  expectedMoneyOverviewVisual,
  expectedNegativeState,
  moneyOverviewState,
  moneyOverviewVisualContract
} = require("./helpers/money-overview-contract");

const TEST_DATE = "2026-09-14";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const TRANSACTIONS = [
  {
    amountCents: 30_000,
    categoryId: "groceries",
    createdAt: "2026-09-14T08:00:00.000Z",
    date: TEST_DATE,
    id: "negative-flex",
    vendor: "Market"
  },
  {
    amountCents: 500,
    categoryId: "groceries",
    createdAt: "2026-08-31T08:00:00.000Z",
    date: "2026-08-31",
    id: "previous-month"
  },
  null,
  { amountCents: 0, categoryId: "fun", date: TEST_DATE, id: "ignored" }
];

async function putTransactions(serverUrl, transactions) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: TRANSACTIONS_KEY, value: JSON.stringify(transactions) })
  });
  assert.equal(response.ok, true);
}

async function openMoney(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#moneyOverviewGrid .money-mini-stat").length === 2');
}

async function scrollToMoneyOverview(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-overview-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('document.querySelector(".money-overview-card").getBoundingClientRect().bottom > 0');
}

test("Money overview preserves totals, dates, synchronization, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/money?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(moneyOverviewState()), expectedDefaultState());

  // A €300 grocery transaction overspends both the week and the flexible pool.
  await putTransactions(planner.server.url, TRANSACTIONS);
  await openMoney(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(moneyOverviewState()), expectedNegativeState());

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openMoney(planner.browser, pageUrl);
    await scrollToMoneyOverview(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(moneyOverviewVisualContract()),
      expectedMoneyOverviewVisual(width < 500)
    );
  }

  // Clearing the stored transactions must refresh the card in the same window.
  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  await putTransactions(planner.server.url, []);
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyOverviewGrid .money-mini-stat strong").textContent === "€107.45"');
  assert.deepEqual(await planner.browser.evaluate(moneyOverviewState()), expectedDefaultState());

  // Reload proves the cleared transactions persisted rather than only updating the DOM.
  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(moneyOverviewState()), expectedDefaultState());

  assert.deepEqual(planner.browser.errors(), []);
});
