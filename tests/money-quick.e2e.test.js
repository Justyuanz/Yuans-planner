const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  DEFAULT_SUMMARY,
  IDLE_IMPACT,
  INVALID_IMPACT,
  SEEDED_SUMMARY,
  expectedIdleForm,
  expectedMoneyQuickVisual,
  moneyQuickState,
  moneyQuickVisualContract
} = require("./helpers/money-quick-contract");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const VENDOR_RULES_KEY = "hivePlanner.money.vendorRules";
const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";

// The pinned visual contract is captured from this exact stored state.
const VISUAL_TRANSACTION = {
  amountCents: 1_250,
  categoryId: "groceries",
  createdAt: "2026-09-14T08:00:00.000Z",
  date: TEST_DATE,
  id: "seeded",
  vendor: "Wolt Market"
};

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function openDashboard(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#moneyQuickSummary .money-mini-stat").length === 2');
}

async function scrollToMoneyQuick(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    const card = documentRoot.querySelector(".money-quick-card");
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    card.scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".money-quick-card").getBoundingClientRect();
    return rect.top < documentRoot.defaultView.innerHeight && rect.bottom > 0;
  })()`);
}

// React controls these fields, so a value change must be dispatched the way the
// browser would rather than assigned straight onto the element.
const SET_FIELD = `const setField = (element, value) => {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};`;

async function submitQuickEntry(browser, { amount, category, vendor }) {
  await browser.evaluate(`(() => {
    ${SET_FIELD}
    setField(document.getElementById("moneyQuickAmount"), ${JSON.stringify(amount)});
    setField(document.getElementById("moneyQuickCategory"), ${JSON.stringify(category)});
    setField(document.getElementById("moneyQuickVendor"), ${JSON.stringify(vendor)});
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
}

async function assertInvalidAmountIsRejected(browser) {
  await browser.evaluate(`(() => {
    ${SET_FIELD}
    setField(document.getElementById("moneyQuickAmount"), "nope");
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await browser.waitForExpression(`document.getElementById("moneyQuickImpact").textContent === ${JSON.stringify(INVALID_IMPACT)}`);
  assert.equal(await browser.evaluate("document.activeElement.id"), "moneyQuickAmount");
}

async function assertVendorRuleBehavior(browser) {
  // An unknown vendor must leave the category the user picked alone.
  await browser.evaluate(`(() => {
    ${SET_FIELD}
    setField(document.getElementById("moneyQuickCategory"), "fun");
    const vendor = document.getElementById("moneyQuickVendor");
    setField(vendor, "Totally New Shop");
    vendor.focus();
    vendor.blur();
  })()`);
  assert.equal(await browser.evaluate('document.getElementById("moneyQuickCategory").value'), "fun");

  // A remembered vendor rule selects its category on blur.
  await browser.evaluate(`(() => {
    ${SET_FIELD}
    const vendor = document.getElementById("moneyQuickVendor");
    setField(vendor, "Apple Services");
    vendor.focus();
    vendor.blur();
  })()`);
  await browser.waitForExpression('document.getElementById("moneyQuickCategory").value === "subscriptions"');
}

function readCategoryAndFocus(browser) {
  return browser.evaluate(`({
    activeId: document.activeElement.id,
    category: document.getElementById("moneyQuickCategory").value
  })`);
}

// A shortcut selects its category and returns focus to the amount field.
async function assertShortcutSelectsCategory(browser) {
  await browser.evaluate(`(() => {
    [...document.querySelectorAll(".money-shortcut")]
      .find((button) => button.textContent.includes("Therapy")).click();
  })()`);
  assert.deepEqual(await readCategoryAndFocus(browser), { activeId: "moneyQuickAmount", category: "therapy" });
}

test("Money quick log preserves entry, persistence, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(moneyQuickState()), expectedIdleForm(DEFAULT_SUMMARY));

  await assertInvalidAmountIsRejected(planner.browser);
  await assertVendorRuleBehavior(planner.browser);
  await assertShortcutSelectsCategory(planner.browser);

  // A comma decimal is accepted and the vendor is trimmed before storage.
  await submitQuickEntry(planner.browser, { amount: "12,50", category: "groceries", vendor: " Wolt Market " });
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€102.34"');
  const afterSave = await planner.browser.evaluate(moneyQuickState());
  assert.equal(afterSave.amount.value, "");
  assert.equal(afterSave.vendor.value, "");
  assert.equal(afterSave.badge, "On pace");
  assert.deepEqual(afterSave.summary.map((item) => item.text), SEEDED_SUMMARY);
  assert.equal(
    afterSave.impact,
    "Saved €12.50 to Groceries. This week's remaining changed by €5.11. Groceries now has €107.50 left this month and about €30.00 for the week. This week now has €102.34 left and this month has €1,287.50 left."
  );

  // The transaction, its vendor rule, and the audit record all reach SQLite.
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const transactions = JSON.parse(stored[TRANSACTIONS_KEY] || "[]");
    const vendorRules = JSON.parse(stored[VENDOR_RULES_KEY] || "[]");
    const activityLog = JSON.parse(stored[ACTIVITY_LOG_KEY] || "[]");
    const transaction = transactions[0];
    const latest = activityLog.at(-1);
    return transactions.length === 1
      && transaction.date === TEST_DATE
      && transaction.amountCents === 1250
      && transaction.categoryId === "groceries"
      && transaction.vendor === "Wolt Market"
      && vendorRules[0]?.match === "wolt market"
      && vendorRules[0]?.categoryId === "groceries"
      && latest?.action === "money_transaction_created"
      && latest?.entityId === transaction.id
      && latest?.after?.id === transaction.id
      && latest?.meta?.amountCents === 1250;
  });

  // Reload keeps the stored totals but resets the transient impact line.
  await openDashboard(planner.browser, pageUrl);
  const afterReload = await planner.browser.evaluate(moneyQuickState());
  assert.deepEqual(afterReload.summary.map((item) => item.text), SEEDED_SUMMARY);
  assert.equal(afterReload.impact, IDLE_IMPACT);

  await submitQuickEntry(planner.browser, { amount: "7.25", category: "eating-out", vendor: "Cafe Test" });
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€99.33"');
  assert.equal(
    (await planner.browser.evaluate(moneyQuickState())).impact,
    "Saved €7.25 to Eating out. This week's remaining changed by €3.01. Eating out now has €27.75 left this month and about €8.75 for the week. This week now has €99.33 left and this month has €1,280.25 left."
  );
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const transactions = JSON.parse(stored[TRANSACTIONS_KEY] || "[]");
    const vendorRules = JSON.parse(stored[VENDOR_RULES_KEY] || "[]");
    const activityLog = JSON.parse(stored[ACTIVITY_LOG_KEY] || "[]");
    return transactions.length === 2
      && transactions[0]?.amountCents === 725
      && transactions[0]?.categoryId === "eating-out"
      && transactions[0]?.vendor === "Cafe Test"
      && vendorRules[0]?.match === "cafe test"
      && activityLog.some((entry) => entry.action === "money_transaction_created"
        && entry.entityId === transactions[0]?.id
        && entry.meta?.amountCents === 725);
  });

  // The saved transaction reaches the Money page, and a budget edited there
  // feeds straight back into the Dashboard summary.
  await planner.browser.evaluate('document.querySelector(\'[data-view-target="moneyView"]\').click()');
  await planner.browser.waitForExpression('document.querySelector("#moneyRecentActivity .money-vendor-row")?.textContent.includes("Cafe Test")');
  await planner.browser.evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Groceries month"]');
    input.value = "130";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored[SETTINGS_KEY] || "{}");
    return settings.categories?.some((category) => category.id === "groceries"
      && category.budgetCents === 13_000
      && category.weeklyBudgetCents === 2_600);
  });
  // Reopen the dated preview used by this calculation test. In the real app,
  // clicking Dashboard intentionally returns to the actual current day.
  await openDashboard(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€103.46"');

  // Reset to the stored state the pinned visual contract was captured from.
  await putValue(planner.server.url, TRANSACTIONS_KEY, [VISUAL_TRANSACTION]);
  await putValue(planner.server.url, SETTINGS_KEY, {});
  await putValue(planner.server.url, VENDOR_RULES_KEY, []);

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openDashboard(planner.browser, pageUrl);
    await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€102.34"');
    await scrollToMoneyQuick(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(moneyQuickVisualContract()),
      expectedMoneyQuickVisual(width < 500, SEEDED_SUMMARY)
    );
  }

  assert.deepEqual(planner.browser.errors(), []);
});
