const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedEmptyState,
  expectedMoneyVendorsVisual,
  expectedPopulatedState,
  vendorsState,
  vendorsVisualContract
} = require("./helpers/money-vendors-contract");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const SETTINGS = {
  categories: [
    { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000 },
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ]
};
// Covers trimming, case-sensitive grouping, an unknown category, the eight-row
// limit, blank/zero/malformed records, and previous-month comparison.
const TRANSACTIONS = [
  { id: "market-food-1", date: TEST_DATE, amountCents: 1_001, categoryId: "groceries", vendor: " Market " },
  { id: "market-food-2", date: "2026-09-13", amountCents: 500, categoryId: "groceries", vendor: "Market" },
  { id: "market-fun", date: "2026-09-12", amountCents: 500, categoryId: "fun", vendor: "Market" },
  { id: "cafe", date: TEST_DATE, amountCents: 1_900, categoryId: "future", vendor: "Cafe" },
  { id: "alpha", date: TEST_DATE, amountCents: 1_800, categoryId: "missing", vendor: "Alpha" },
  { id: "bravo", date: TEST_DATE, amountCents: 1_700, categoryId: "fun", vendor: "Bravo" },
  { id: "charlie", date: TEST_DATE, amountCents: 1_600, categoryId: "fun", vendor: "Charlie" },
  { id: "delta", date: TEST_DATE, amountCents: 1_500, categoryId: "fun", vendor: "Delta" },
  { id: "echo", date: TEST_DATE, amountCents: 1_400, categoryId: "fun", vendor: "Echo" },
  { id: "foxtrot", date: TEST_DATE, amountCents: 1_300, categoryId: "fun", vendor: "Foxtrot" },
  { id: "hidden-ninth", date: TEST_DATE, amountCents: 1_200, categoryId: "fun", vendor: "Golf" },
  { id: "blank", date: TEST_DATE, amountCents: 9_999, categoryId: "fun", vendor: "  " },
  { id: "previous-market", date: "2026-08-31", amountCents: 700, categoryId: "groceries", vendor: "Market" },
  { id: "previous-lowercase", date: "2026-08-30", amountCents: 555, categoryId: "groceries", vendor: "market" },
  { id: "previous-only", date: "2026-08-29", amountCents: 5_000, categoryId: "fun", vendor: "Old shop" },
  null,
  { id: "zero", date: TEST_DATE, amountCents: 0, categoryId: "fun", vendor: "Ignored" }
];

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedVendors(serverUrl) {
  await putValue(serverUrl, SETTINGS_KEY, SETTINGS);
  await putValue(serverUrl, TRANSACTIONS_KEY, TRANSACTIONS);
}

async function openMoney(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelector(".money-vendors-card .money-vendor-list") !== null');
}

async function scrollToVendors(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-vendors-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('Math.abs(document.querySelector(".money-vendors-card").getBoundingClientRect().top) < 1');
}

test("Money vendors preserves aggregation, month comparison, limits, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/?view=moneyView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(vendorsState()), expectedEmptyState());

  await seedVendors(planner.server.url);
  await openMoney(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(vendorsState()), expectedPopulatedState());

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openMoney(planner.browser, pageUrl);
    await scrollToVendors(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(vendorsVisualContract()),
      expectedMoneyVendorsVisual(width < 500)
    );
  }

  // Clearing the stored transactions must restore the empty row in the same window.
  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  await putValue(planner.server.url, TRANSACTIONS_KEY, []);
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyVendorList .money-vendor-row strong").textContent === "No vendors yet"');
  assert.deepEqual(await planner.browser.evaluate(vendorsState()), expectedEmptyState());

  // Reload proves the cleared transactions persisted rather than only updating the DOM.
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(vendorsState()), expectedEmptyState());

  assert.deepEqual(planner.browser.errors(), []);
});
