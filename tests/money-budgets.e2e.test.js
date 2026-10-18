const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  ADDED_TRANSFER_ROW,
  SEEDED_TRANSFER_ROW,
  budgetState,
  budgetVisualContract,
  expectedBudgetVisual,
  expectedSeededState
} = require("./helpers/money-budgets-contract");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
// The unknown root, category, transfer, and notes fields are compatibility data
// that the React persistence layer must carry through every write.
const SETTINGS = {
  monthlyTargetCents: 999_999,
  categories: [
    {
      id: "groceries",
      name: "Food",
      kind: "flex",
      budgetCents: 12_000,
      weeklyBudgetCents: 3_000,
      protected: false,
      legacyCategoryField: "keep-category"
    },
    {
      id: "future",
      name: "Future fund",
      kind: "flex",
      budgetCents: 5_000,
      weeklyBudgetCents: null,
      protected: false
    }
  ],
  transfers: [
    {
      id: "existing-cover",
      fromCategoryId: "fun",
      toCategoryId: "groceries",
      amountCents: 1_000,
      note: "existing note",
      createdAt: "2026-09-01T10:00:00.000Z",
      legacyTransferField: "keep-transfer"
    }
  ],
  notes: { averages: [], legacyNoteField: "keep-note" },
  legacyRootField: "keep-root"
};
const TRANSACTIONS = [
  { id: "rent", date: TEST_DATE, amountCents: 80_000, categoryId: "rent" },
  { id: "food", date: TEST_DATE, amountCents: 20_000, categoryId: "groceries" },
  { id: "future", date: TEST_DATE, amountCents: 5_000, categoryId: "future" },
  { id: "previous", date: "2026-08-31", amountCents: 99_999, categoryId: "groceries" }
];

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedBudgets(serverUrl) {
  await putValue(serverUrl, SETTINGS_KEY, SETTINGS);
  await putValue(serverUrl, TRANSACTIONS_KEY, TRANSACTIONS);
}

async function openMoney(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.querySelectorAll("#moneyCategoryBudgetList .money-budget-section").length === 2');
}

// Opening a disclosure re-renders the card, so only click when it is closed.
async function openDisclosure(browser, selector) {
  await browser.evaluate(`(() => {
    const panel = document.querySelector(${JSON.stringify(selector)});
    if (!panel.open) {
      panel.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression(`document.querySelector(${JSON.stringify(selector)}).open`);
}

async function expandBudgetCard(browser) {
  await openDisclosure(browser, ".money-settings-panel");
  for (const index of [0, 1]) {
    await browser.evaluate(`(() => {
      const section = document.querySelectorAll(".money-budget-section")[${index}];
      if (!section.open) {
        section.querySelector("summary").click();
      }
    })()`);
    await browser.waitForExpression(`document.querySelectorAll(".money-budget-section")[${index}].open`);
  }
  await openDisclosure(browser, ".money-transfer-panel");
}

// The visual contract is captured with only the settings panel and the first
// section open.
async function expandBudgetVisual(browser) {
  await openDisclosure(browser, ".money-settings-panel");
  await browser.evaluate(`(() => {
    const section = document.querySelectorAll(".money-budget-section")[0];
    if (!section.open) {
      section.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression('document.querySelectorAll(".money-budget-section")[0].open');
}

async function scrollToBudgets(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.defaultView.scrollTo(0, documentRoot.documentElement.scrollHeight);
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = document;
    return documentRoot.querySelector(".money-budget-card").getBoundingClientRect().top
      < documentRoot.defaultView.innerHeight;
  })()`);
}

// Budget inputs commit on the browser's native change event, so the value has
// to be set the way the browser would before the event is dispatched.
async function changeBudgetInput(browser, selector, value) {
  await browser.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
      .call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}

async function submitTransfer(browser, { from, to, amount }) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const fromSelect = documentRoot.getElementById("moneyTransferFrom");
    const toSelect = documentRoot.getElementById("moneyTransferTo");
    const amountInput = documentRoot.getElementById("moneyTransferAmount");
    setSelect.call(fromSelect, ${JSON.stringify(from)});
    fromSelect.dispatchEvent(new Event("change", { bubbles: true }));
    setSelect.call(toSelect, ${JSON.stringify(to)});
    toSelect.dispatchEvent(new Event("change", { bubbles: true }));
    setInput.call(amountInput, ${JSON.stringify(amount)});
    amountInput.dispatchEvent(new Event("input", { bubbles: true }));
    documentRoot.getElementById("moneyTransferForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
}

// Re-rendering the card can reset the outer settings disclosure at any moment,
// so its live flag is not a stable assertion. The pinned visual contract test
// covers how the expanded panel renders.
function withoutSettingsOpenFlag(state) {
  return { ...state, settings: { summary: state.settings.summary } };
}

function readSettings(planner) {
  return planner.server.readPlannerData().then((stored) => JSON.parse(stored[SETTINGS_KEY] || "{}"));
}

test("Money budgets preserves editing, transfers, disclosure state, and persistence", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await seedBudgets(planner.server.url);
  const pageUrl = `${planner.server.url}/money?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(budgetState()), expectedSeededState({
    settingsOpen: false,
    sectionsOpen: [false, false],
    transferOpen: false,
    transferRows: [SEEDED_TRANSFER_ROW]
  }));

  await expandBudgetCard(planner.browser);
  const expanded = expectedSeededState({
    settingsOpen: true,
    sectionsOpen: [true, true],
    transferOpen: true,
    transferRows: [SEEDED_TRANSFER_ROW]
  });
  assert.deepEqual(
    withoutSettingsOpenFlag(await planner.browser.evaluate(budgetState())),
    withoutSettingsOpenFlag(expanded)
  );

  // An invalid amount restores the rendered value, writes nothing, and leaves
  // the nested disclosures open.
  const beforeInvalidEdit = JSON.stringify(await readSettings(planner));
  await changeBudgetInput(planner.browser, '.money-budget-row-flex input[aria-label="Food month"]', "not money");
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food month"]\').value === "120"');
  const afterInvalidEdit = await planner.browser.evaluate(budgetState());
  assert.deepEqual(afterInvalidEdit.sections, expanded.sections);
  assert.equal(afterInvalidEdit.transfer.open, true);
  assert.equal(JSON.stringify(await readSettings(planner)), beforeInvalidEdit);

  // A monthly edit derives the weekly guide from the active month and refreshes
  // the sibling pacing card.
  await openDisclosure(planner.browser, ".money-settings-panel");
  await changeBudgetInput(planner.browser, '.money-budget-row-flex input[aria-label="Food month"]', "130");
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "26"');
  await planner.browser.waitForExpression('document.querySelector("#moneyProgressList .money-progress-copy span").textContent === "€1,050.00 spent of €1,360.00"');

  await changeBudgetInput(planner.browser, '.money-budget-row-flex input[aria-label="Food week"]', "9,25");
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "9.25"');
  await planner.server.waitFor(async function () {
    const settings = await readSettings(planner);
    return settings.categories?.find((category) => category.id === "groceries")?.weeklyBudgetCents === 925;
  });

  // A transfer to the same category is rejected without touching storage.
  const beforeInvalidTransfer = JSON.stringify(await readSettings(planner));
  await submitTransfer(planner.browser, { from: "fun", to: "fun", amount: "10" });
  assert.equal(JSON.stringify(await readSettings(planner)), beforeInvalidTransfer);
  assert.equal((await planner.browser.evaluate(budgetState())).transfer.amount.value, "10");

  await submitTransfer(planner.browser, { from: "fun", to: "future", amount: "10" });
  await planner.browser.waitForExpression('document.querySelectorAll("#moneyTransferList .money-transfer-row").length === 2');
  const afterTransfer = await planner.browser.evaluate(budgetState());
  assert.deepEqual(afterTransfer.sections.map((section) => section.open), [true, true]);
  assert.equal(afterTransfer.transfer.open, true);
  assert.equal(afterTransfer.transfer.amount.value, "");
  assert.deepEqual(afterTransfer.transfer.rows, [ADDED_TRANSFER_ROW, SEEDED_TRANSFER_ROW]);

  await planner.server.waitFor(async function () {
    const settings = await readSettings(planner);
    const groceries = settings.categories?.find((category) => category.id === "groceries");
    return groceries?.budgetCents === 13_000
      && groceries?.weeklyBudgetCents === 925
      && settings.transfers?.length === 2;
  });

  // Every unknown stored field survives the normalized writes.
  const persisted = await readSettings(planner);
  assert.equal(persisted.monthlyTargetCents, 999_999);
  assert.equal(persisted.legacyRootField, "keep-root");
  assert.equal(persisted.categories.find((category) => category.id === "groceries").legacyCategoryField, "keep-category");
  assert.equal(persisted.transfers.find((transfer) => transfer.id === "existing-cover").legacyTransferField, "keep-transfer");
  assert.equal(persisted.notes.legacyNoteField, "keep-note");

  await planner.browser.evaluate('document.querySelector("#moneyTransferList .money-transfer-row button").click()');
  await planner.browser.waitForExpression('document.querySelectorAll("#moneyTransferList .money-transfer-row").length === 1');
  assert.deepEqual((await planner.browser.evaluate(budgetState())).transfer.rows, [SEEDED_TRANSFER_ROW]);

  // Reload closes every disclosure again and shows the new monthly target.
  await openMoney(planner.browser, pageUrl);
  const afterReload = await planner.browser.evaluate(budgetState());
  assert.equal(afterReload.settings.open, false);
  assert.deepEqual(afterReload.sections.map((section) => section.open), [false, false]);
  assert.equal(afterReload.transfer.open, false);
  assert.equal(afterReload.target.value, "1360");

  assert.deepEqual(planner.browser.errors(), []);
});

test("Money budgets preserves its desktop and mobile visual contract", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await seedBudgets(planner.server.url);
  const pageUrl = `${planner.server.url}/money?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openMoney(planner.browser, pageUrl);
    await expandBudgetVisual(planner.browser);
    await scrollToBudgets(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(budgetVisualContract()),
      expectedBudgetVisual(width < 500)
    );
    assert.deepEqual(await planner.browser.evaluate(budgetState()), expectedSeededState({
      settingsOpen: false,
      sectionsOpen: [true, false],
      transferOpen: false,
      transferRows: [SEEDED_TRANSFER_ROW]
    }));
  }

  assert.deepEqual(planner.browser.errors(), []);
});
