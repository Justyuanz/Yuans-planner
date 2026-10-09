const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const VENDOR_RULES_KEY = "hivePlanner.money.vendorRules";
const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";

function moneyQuickState() {
  return `(() => {
    const documentRoot = document;
    const amount = documentRoot.getElementById("moneyQuickAmount");
    const category = documentRoot.getElementById("moneyQuickCategory");
    const vendor = documentRoot.getElementById("moneyQuickVendor");
    return {
      amount: {
        autocomplete: amount.autocomplete,
        inputMode: amount.inputMode,
        placeholder: amount.placeholder,
        value: amount.value
      },
      badge: documentRoot.getElementById("moneyPaceBadge").textContent.trim(),
      category: {
        ariaLabel: category.getAttribute("aria-label"),
        options: [...category.options].map((option) => [option.value, option.textContent.trim()]),
        value: category.value
      },
      impact: documentRoot.getElementById("moneyQuickImpact").textContent.trim(),
      shortcuts: [...documentRoot.querySelectorAll("#moneyQuickShortcuts .money-shortcut")].map((button) => ({
        text: button.textContent.trim(),
        type: button.type
      })),
      summary: [...documentRoot.querySelectorAll("#moneyQuickSummary .money-mini-stat")].map((item) => ({
        className: item.className,
        text: item.textContent.trim()
      })),
      vendor: {
        autocomplete: vendor.autocomplete,
        maxLength: vendor.maxLength,
        placeholder: vendor.placeholder,
        value: vendor.value
      }
    };
  })()`;
}

function moneyQuickVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-quick-card");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        alignItems: style.alignItems,
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        gridTemplateAreas: style.gridTemplateAreas,
        gridTemplateColumns: style.gridTemplateColumns,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      badge: pick(documentRoot.getElementById("moneyPaceBadge")),
      form: pick(documentRoot.getElementById("moneyQuickForm")),
      heading: { text: panel.querySelector("h2").textContent.trim(), visual: pick(panel.querySelector("h2")) },
      impact: pick(documentRoot.getElementById("moneyQuickImpact")),
      inputs: ["moneyQuickAmount", "moneyQuickCategory", "moneyQuickVendor"].map((id) => pick(documentRoot.getElementById(id))),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      shortcuts: [...panel.querySelectorAll(".money-shortcut")].map((item) => ({ text: item.textContent.trim(), visual: pick(item) })),
      state: ${moneyQuickState()},
      summary: [...panel.querySelectorAll(".money-mini-stat")].map((item) => ({ text: item.textContent.trim(), visual: pick(item) }))
    };
  })()`;
}

const MONEY_QUICK_CLIP = `(() => {
  const rect = document.querySelector(".money-quick-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

async function scrollToMoneyQuick(browser) {
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
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
  await browser.evaluate(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`);
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

function assertInitialState(state) {
  assert.deepEqual(state.summary, [
    { className: "money-mini-stat", text: "Remaining this week€107.45" },
    { className: "money-mini-stat", text: "Remaining this month€261.11" }
  ]);
  assert.equal(state.badge, "On pace");
  assert.deepEqual(state.category.options, [
    ["groceries", "Groceries"],
    ["therapy", "Therapy"],
    ["fun", "Fun"],
    ["eating-out", "Eating out"],
    ["resq", "ResQ"],
    ["health", "Health"],
    ["hsl", "HSL"],
    ["contact-lenses", "Lenses"],
    ["other", "Other"],
    ["pets", "Pets"],
    ["rent", "Rent"],
    ["skate-school", "Skate"],
    ["subscriptions", "Subscriptions"]
  ]);
  assert.equal(state.category.value, "groceries");
  assert.equal(state.category.ariaLabel, "Money category");
  assert.deepEqual(state.shortcuts, [
    { text: "Groceries€30.00 / week", type: "button" },
    { text: "Therapy€28.00 / week", type: "button" },
    { text: "Eating out€8.75 / week", type: "button" },
    { text: "Other€4.03 / week", type: "button" }
  ]);
  assert.deepEqual(state.amount, {
    autocomplete: "off",
    inputMode: "decimal",
    placeholder: "12.50",
    value: ""
  });
  assert.deepEqual(state.vendor, {
    autocomplete: "off",
    maxLength: 80,
    placeholder: "Lidl, K-Market, HSL...",
    value: ""
  });
  assert.equal(
    state.impact,
    "Saving a transaction will update the rest of the week and month immediately."
  );
}

async function exerciseLegacyForm(planner) {
  await planner.browser.evaluate(`(() => {
    const amount = document.getElementById("moneyQuickAmount");
    amount.value = "nope";
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  assert.deepEqual(await planner.browser.evaluate(`({
    activeId: document.activeElement.id,
    impact: document.getElementById("moneyQuickImpact").textContent.trim()
  })`), { activeId: "moneyQuickAmount", impact: "Add a valid amount before saving." });

  await planner.browser.evaluate(`(() => {
    const vendor = document.getElementById("moneyQuickVendor");
    document.getElementById("moneyQuickCategory").value = "fun";
    vendor.focus();
    vendor.value = "Wolt Market";
    vendor.blur();
  })()`);
  assert.equal(await planner.browser.evaluate('document.getElementById("moneyQuickCategory").value'), "groceries");

  await planner.browser.evaluate(`(() => {
    const shortcut = [...document.querySelectorAll(".money-shortcut")]
      .find((button) => button.textContent.includes("Therapy"));
    shortcut.click();
  })()`);
  assert.deepEqual(await planner.browser.evaluate(`({
    activeId: document.activeElement.id,
    category: document.getElementById("moneyQuickCategory").value
  })`), { activeId: "moneyQuickAmount", category: "therapy" });

  await planner.browser.evaluate(`(() => {
    document.getElementById("moneyQuickAmount").value = "12,50";
    document.getElementById("moneyQuickCategory").value = "groceries";
    document.getElementById("moneyQuickVendor").value = " Wolt Market ";
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€102.34"');
  const state = await planner.browser.evaluate(moneyQuickState());
  assert.equal(state.amount.value, "");
  assert.equal(state.vendor.value, "");
  assert.equal(state.badge, "On pace");
  assert.deepEqual(state.summary.map((item) => item.text), [
    "Remaining this week€102.34",
    "Remaining this month€248.61"
  ]);
  assert.equal(
    state.impact,
    "Saved €12.50 to Groceries. This week's remaining changed by €5.11. Groceries now has €107.50 left this month and about €30.00 for the week. This week now has €102.34 left and this month has €1,287.50 left."
  );
}

async function assertLegacyWrites(planner) {
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
}

async function exerciseReactForm(planner) {
  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("moneyQuickAmount");
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setValue.call(input, "bad");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression('document.getElementById("moneyQuickImpact").textContent === "Add a valid amount before saving."');
  assert.equal(await planner.browser.evaluate('document.activeElement.id'), "moneyQuickAmount");

  await planner.browser.evaluate(`(() => {
    const select = document.getElementById("moneyQuickCategory");
    const vendor = document.getElementById("moneyQuickVendor");
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setSelect.call(select, "fun");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setInput.call(vendor, "Apple Services");
    vendor.dispatchEvent(new Event("input", { bubbles: true }));
    vendor.focus();
    vendor.blur();
  })()`);
  await planner.browser.waitForExpression('document.getElementById("moneyQuickCategory").value === "subscriptions"');

  await planner.browser.evaluate(`(() => {
    [...document.querySelectorAll(".money-shortcut")]
      .find((button) => button.textContent.includes("Therapy")).click();
  })()`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    return {
      activeId: document.activeElement.id,
      category: document.getElementById("moneyQuickCategory").value
    };
  })()`), { activeId: "moneyQuickAmount", category: "therapy" });

  await planner.browser.evaluate(`(() => {
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    const amount = document.getElementById("moneyQuickAmount");
    const category = document.getElementById("moneyQuickCategory");
    const vendor = document.getElementById("moneyQuickVendor");
    setInput.call(amount, "7.25");
    amount.dispatchEvent(new Event("input", { bubbles: true }));
    setSelect.call(category, "eating-out");
    category.dispatchEvent(new Event("change", { bubbles: true }));
    setInput.call(vendor, "Cafe Test");
    vendor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("moneyQuickForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€99.33"');
  const state = await planner.browser.evaluate(moneyQuickState());
  assert.deepEqual(state.summary.map((item) => item.text), [
    "Remaining this week€99.33",
    "Remaining this month€241.36"
  ]);
  assert.equal(
    state.impact,
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
}

async function updateDirectGroceriesBudget(planner) {
  await planner.browser.evaluate('document.querySelector(\'[data-view-target="moneyView"]\').click()');
  await planner.browser.waitForExpression('document.querySelector("#moneyRecentActivity .money-vendor-row")?.textContent.includes("Cafe Test")');
  await planner.browser.evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Groceries month"]');
    input.value = "130";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored["hivePlanner.money.settings"] || "{}");
    return settings.categories?.some((category) => category.id === "groceries"
      && category.budgetCents === 13_000
      && category.weeklyBudgetCents === 2_600);
  });
  await planner.browser.evaluate('document.querySelector(\'[data-view-target="todayView"]\').click()');
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€103.46"');
}

test("Money quick log preserves entry, persistence, and visual behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelectorAll("#moneyQuickSummary .money-mini-stat").length === 2');
  assertInitialState(await planner.browser.evaluate(moneyQuickState()));
  await exerciseLegacyForm(planner);
  await assertLegacyWrites(planner);

  await planner.browser.evaluate(`document.querySelector('[data-view-target="moneyView"]').click()`);
  await planner.browser.waitForExpression('document.querySelector("#moneyRecentActivity .money-vendor-row")?.textContent.includes("Wolt Market")');
  assert.match(
    await planner.browser.evaluate('document.querySelector("#moneyRecentActivity .money-vendor-row").textContent.trim()'),
    /GroceriesWolt Market · 2026-09-14€12\.50Groceries/
  );

  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€102.34"');
  assert.equal(
    (await planner.browser.evaluate(moneyQuickState())).impact,
    "Saving a transaction will update the rest of the week and month immediately."
  );
  await scrollToMoneyQuick(planner.browser);
  const legacyDesktop = await planner.browser.evaluate(moneyQuickVisualContract());
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_QUICK_CLIP);

  await planner.browser.open(`${preview.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong")?.textContent === "€102.34"');
  await scrollToMoneyQuick(planner.browser);
  const previewDesktop = await planner.browser.evaluate(moneyQuickVisualContract());
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_QUICK_CLIP);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money quick screenshot");
  await exerciseReactForm(planner);
  await updateDirectGroceriesBudget(planner);

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong").textContent === "€103.46"');
  await scrollToMoneyQuick(planner.browser);
  const legacyMobile = await planner.browser.evaluate(moneyQuickVisualContract());
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(MONEY_QUICK_CLIP);

  await planner.browser.open(`${preview.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelector("#moneyQuickSummary .money-mini-stat strong")?.textContent === "€103.46"');
  await scrollToMoneyQuick(planner.browser);
  const previewMobile = await planner.browser.evaluate(moneyQuickVisualContract());
  const previewMobileScreenshot = await planner.browser.captureScreenshot(MONEY_QUICK_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assert.equal(previewMobile.form.gridTemplateColumns, "84px 112.75px 121.25px");
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money quick screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
