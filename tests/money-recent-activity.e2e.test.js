const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  activityState,
  activityVisualContract,
  expectedEmptyState,
  expectedMoneyActivityVisual,
  expectedPopulatedState
} = require("./helpers/money-activity-contract");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const SETTINGS = {
  categories: [
    { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000, weeklyBudgetCents: 3_000 },
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ]
};
// Covers newest-first ordering, the unknown-category and missing-vendor
// fallbacks, the eight-row limit, and malformed/zero records.
const TRANSACTIONS = [
  { id: "future", date: "2026-09-14", createdAt: "2026-09-14T10:00:00.000Z", amountCents: 999, categoryId: "future", vendor: "Lab" },
  { id: "food", date: "2026-09-14", createdAt: "2026-09-14T09:00:00.000Z", amountCents: 1_250, categoryId: "groceries", vendor: "Market" },
  { id: "fallback", date: "2026-09-14", createdAt: "2026-09-14T08:00:00.000Z", amountCents: 300, categoryId: "missing" },
  { id: "fun", date: "2026-09-13", createdAt: "2026-09-13T08:00:00.000Z", amountCents: 450, categoryId: "fun", vendor: "Cinema" },
  { id: "eating", date: "2026-09-12", createdAt: "2026-09-12T08:00:00.000Z", amountCents: 600, categoryId: "eating-out", vendor: "Cafe" },
  { id: "resq", date: "2026-09-11", createdAt: "2026-09-11T08:00:00.000Z", amountCents: 700, categoryId: "resq", vendor: "ResQ" },
  { id: "health", date: "2026-09-10", createdAt: "2026-09-10T08:00:00.000Z", amountCents: 800, categoryId: "health", vendor: "Pharmacy" },
  { id: "previous-month", date: "2026-08-31", createdAt: "2026-08-31T08:00:00.000Z", amountCents: 900, categoryId: "hsl", vendor: "HSL" },
  { id: "ninth", date: "2026-08-30", createdAt: "2026-08-30T08:00:00.000Z", amountCents: 1_000, categoryId: "other", vendor: "Hidden" },
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

async function seedActivity(serverUrl) {
  await putValue(serverUrl, SETTINGS_KEY, SETTINGS);
  await putValue(serverUrl, TRANSACTIONS_KEY, TRANSACTIONS);
}

async function openMoney(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelector(".money-activity-card details") !== null');
}

async function expandActivity(browser) {
  await browser.evaluate(`(() => {
    const details = document.querySelector(".money-activity-card details");
    if (!details.open) {
      details.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression('document.querySelector(".money-activity-card details").open');
}

async function scrollToActivity(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-activity-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('Math.abs(document.querySelector(".money-activity-card").getBoundingClientRect().top) < 1');
}

test("Money recent activity preserves ordering, disclosure state, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/?view=moneyView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(activityState()), expectedEmptyState(false));

  await seedActivity(planner.server.url);
  await openMoney(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  // The disclosure starts closed on every load, exactly like legacy.
  assert.equal((await planner.browser.evaluate(activityState())).open, false);
  await expandActivity(planner.browser);
  assert.deepEqual(await planner.browser.evaluate(activityState()), expectedPopulatedState());

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openMoney(planner.browser, pageUrl);
    await expandActivity(planner.browser);
    await scrollToActivity(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(activityVisualContract()),
      expectedMoneyActivityVisual(width < 500)
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  await expandActivity(planner.browser);

  // A live list update must not collapse the open disclosure.
  await putValue(planner.server.url, TRANSACTIONS_KEY, []);
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyRecentActivity .money-vendor-row strong").textContent === "No activity yet"');
  assert.deepEqual(await planner.browser.evaluate(activityState()), expectedEmptyState(true));

  // Reload persists the cleared transactions and rebuilds a closed disclosure.
  await openMoney(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(activityState()), expectedEmptyState(false));

  assert.deepEqual(planner.browser.errors(), []);
});
