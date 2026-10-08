const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
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
      legacyTransferField: "discarded-by-legacy-normalizer"
    }
  ],
  notes: { averages: [], legacyNoteField: "keep-note" },
  legacyRootField: "discarded-by-legacy-normalizer"
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

async function openMoney(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-budget-card") !== null`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const moneyView = documentRoot.getElementById("moneyView");
    if (!moneyView.classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="moneyView"]').click();
    }
    return moneyView.classList.contains("active")
      && documentRoot.querySelectorAll("#moneyCategoryBudgetList .money-budget-section").length === 2;
  })()`);
}

function budgetState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const card = documentRoot.querySelector(".money-budget-card");
    const settings = card.querySelector(".money-settings-panel");
    const transferPanel = card.querySelector(".money-transfer-panel");
    return {
      heading: card.querySelector("h3").textContent.trim(),
      note: card.querySelector(".small-note").textContent.trim(),
      settings: {
        open: settings.open,
        summary: [...settings.querySelector("summary").children].map((child) => child.textContent.trim())
      },
      target: {
        readOnly: documentRoot.getElementById("moneyMonthlyTarget").readOnly,
        value: documentRoot.getElementById("moneyMonthlyTarget").value
      },
      sections: [...card.querySelectorAll(".money-budget-section")].map((section) => ({
        open: section.open,
        summary: [...section.querySelector("summary").children].map((child) => child.textContent.trim()),
        rows: [...section.querySelectorAll(".money-budget-row")].map((row) => ({
          className: row.className,
          heading: [...row.querySelectorAll(".money-budget-head strong, .money-budget-head span")]
            .map((child) => child.textContent.trim()),
          inputs: [...row.querySelectorAll("input")].map((input) => ({
            ariaLabel: input.getAttribute("aria-label"),
            inputMode: input.inputMode,
            placeholder: input.placeholder,
            value: input.value
          })),
          guide: row.querySelector(".money-budget-pace").textContent.trim()
        }))
      })),
      transfer: {
        open: transferPanel.open,
        summary: [...transferPanel.querySelector("summary").children].map((child) => child.textContent.trim()),
        from: [...documentRoot.getElementById("moneyTransferFrom").options]
          .map((option) => [option.value, option.textContent.trim()]),
        to: [...documentRoot.getElementById("moneyTransferTo").options]
          .map((option) => [option.value, option.textContent.trim()]),
        amount: {
          inputMode: documentRoot.getElementById("moneyTransferAmount").inputMode,
          placeholder: documentRoot.getElementById("moneyTransferAmount").placeholder,
          value: documentRoot.getElementById("moneyTransferAmount").value
        },
        rows: [...documentRoot.querySelectorAll("#moneyTransferList .money-transfer-row")].map((row) => ({
          button: row.querySelector("button").textContent.trim(),
          text: row.textContent.trim()
        }))
      }
    };
  })()`;
}

function budgetVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const card = documentRoot.querySelector(".money-budget-card");
    const view = documentRoot.defaultView;
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
        gridTemplateColumns: style.gridTemplateColumns,
        height: rect.height,
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      heading: pick(card.querySelector("h3")),
      note: pick(card.querySelector(".small-note")),
      panelInner: pick(card.querySelector(".panel-inner")),
      settings: pick(card.querySelector(".money-settings-panel")),
      settingsSummary: pick(card.querySelector(".money-settings-panel > summary")),
      target: pick(documentRoot.getElementById("moneyMonthlyTarget")),
      section: pick(card.querySelector(".money-budget-section")),
      sectionSummary: pick(card.querySelector(".money-budget-section > summary")),
      row: pick(card.querySelector(".money-budget-row")),
      rowHead: pick(card.querySelector(".money-budget-head")),
      rowInputs: pick(card.querySelector(".money-budget-inputs")),
      inputs: [...card.querySelectorAll(".money-budget-row input")].slice(0, 2).map(pick)
    };
  })()`;
}

async function expandBudgetCard(browser, documentExpression = "document") {
  await browser.evaluate(`(${documentExpression}).querySelector(".money-settings-panel > summary").click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-settings-panel").open`);
  await browser.evaluate(`(${documentExpression}).querySelectorAll(".money-budget-section > summary")[0].click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll(".money-budget-section")[0].open`);
  await browser.evaluate(`(${documentExpression}).querySelectorAll(".money-budget-section > summary")[1].click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll(".money-budget-section")[1].open`);
  await browser.evaluate(`(${documentExpression}).querySelector(".money-transfer-panel > summary").click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-transfer-panel").open`);
}

async function expandBudgetVisual(browser, documentExpression = "document") {
  await browser.evaluate(`(${documentExpression}).querySelector(".money-settings-panel > summary").click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-settings-panel").open`);
  await browser.evaluate(`(${documentExpression}).querySelectorAll(".money-budget-section > summary")[0].click()`);
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll(".money-budget-section")[0].open`);
}

async function scrollToBudgets(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.defaultView.scrollTo(0, documentRoot.documentElement.scrollHeight);
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return documentRoot.querySelector(".money-budget-card").getBoundingClientRect().top
      < documentRoot.defaultView.innerHeight;
  })()`);
}

function assertSeededState(state) {
  assert.equal(state.heading, "Budgets and categories");
  assert.equal(state.note, "Protect the fixed money, then give every flexible euro a job.");
  assert.deepEqual(state.settings.summary, [
    "Budget settings",
    "Open when you want to adjust monthly setup."
  ]);
  assert.deepEqual(state.target, { readOnly: true, value: "1350" });
  assert.deepEqual(state.sections.map((section) => ({
    open: section.open,
    summary: section.summary
  })), [
    { open: true, summary: ["Fixed", "Protected baseline. · 6"] },
    { open: true, summary: ["Flexible", "Weekly pace. · 8"] }
  ]);
  assert.deepEqual(state.sections[0].rows.map((row) => ({
    className: row.className,
    guide: row.guide,
    heading: row.heading,
    values: row.inputs.map((input) => input.value)
  })), [
    { className: "money-budget-row money-budget-row-fixed", guide: "Guide €14.78 / week", heading: ["HSL", "Fixed", "Spent €0.00", "€73.90 left"], values: ["73.90", "14.78"] },
    { className: "money-budget-row money-budget-row-fixed", guide: "Guide €8.80 / week", heading: ["Lenses", "Fixed", "Spent €0.00", "€44.00 left"], values: ["44", "8.80"] },
    { className: "money-budget-row money-budget-row-fixed", guide: "Guide €0.00 / week", heading: ["Pets", "Fixed", "Spent €0.00", "€0.00 left"], values: ["0", "0"] },
    { className: "money-budget-row money-budget-row-fixed is-negative", guide: "Guide €155.60 / week", heading: ["Rent", "Fixed", "Spent €800.00", "-€22.00 left"], values: ["778", "155.60"] },
    { className: "money-budget-row money-budget-row-fixed", guide: "Guide €0.59 / week", heading: ["Subscriptions", "Fixed", "Spent €0.00", "€2.99 left"], values: ["2.99", "0.59"] },
    { className: "money-budget-row money-budget-row-fixed", guide: "Guide €28.00 / week", heading: ["Therapy", "Fixed", "Spent €0.00", "€140.00 left"], values: ["140", "28"] }
  ]);
  assert.deepEqual(state.sections[1].rows.map((row) => ({
    className: row.className,
    guide: row.guide,
    heading: row.heading,
    values: row.inputs.map((input) => input.value)
  })), [
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €8.75 / week", heading: ["Eating out", "Flex", "Spent €0.00", "€35.00 left"], values: ["35", "8.75"] },
    { className: "money-budget-row money-budget-row-flex is-negative", guide: "Guide €30.00 / week", heading: ["Food", "Flex", "Spent €200.00", "-€70.00 left"], values: ["120", "30"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €6.25 / week", heading: ["Fun", "Flex", "Spent €0.00", "€15.00 left"], values: ["25", "6.25"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €10.00 / week", heading: ["Future fund", "Flex", "Spent €50.00", "€0.00 left"], values: ["50", "10"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €6.25 / week", heading: ["Health", "Flex", "Spent €0.00", "€25.00 left"], values: ["25", "6.25"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €4.03 / week", heading: ["Other", "Flex", "Spent €0.00", "€16.11 left"], values: ["16.11", "4.03"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €5.00 / week", heading: ["ResQ", "Flex", "Spent €0.00", "€20.00 left"], values: ["20", "5"] },
    { className: "money-budget-row money-budget-row-flex", guide: "Guide €5.00 / week", heading: ["Skate", "Flex", "Spent €0.00", "€20.00 left"], values: ["20", "5"] }
  ]);
  assert.deepEqual(state.sections[1].rows[1].inputs, [
    { ariaLabel: "Food month", inputMode: "decimal", placeholder: "Month", value: "120" },
    { ariaLabel: "Food week", inputMode: "decimal", placeholder: "Week", value: "30" }
  ]);
  assert.deepEqual(state.transfer.summary, [
    "Move budget between categories",
    "Only when one category needs cover."
  ]);
  const flexOptions = [
    ["groceries", "Food"], ["eating-out", "Eating out"], ["resq", "ResQ"],
    ["health", "Health"], ["fun", "Fun"], ["skate-school", "Skate"],
    ["other", "Other"], ["future", "Future fund"]
  ];
  assert.deepEqual(state.transfer.from, flexOptions);
  assert.deepEqual(state.transfer.to, flexOptions);
  assert.deepEqual(state.transfer.amount, { inputMode: "decimal", placeholder: "10", value: "" });
  assert.deepEqual(state.transfer.rows, [
    { button: "Delete", text: "Food€10.00 moved from FunDelete" }
  ]);
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function changeInput(browser, selector, value) {
  await browser.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}

test("Money budgets preserves editing, transfers, disclosure state, and persistence", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await seedBudgets(planner.server.url);
  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  let state = await planner.browser.evaluate(budgetState());
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.sections.map((section) => section.open), [false, false]);
  assert.equal(state.transfer.open, false);

  await expandBudgetCard(planner.browser);
  state = await planner.browser.evaluate(budgetState());
  assertSeededState(state);

  await changeInput(
    planner.browser,
    '.money-budget-row-flex input[aria-label="Food month"]',
    "not money"
  );
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food month"]\').value === "120"');
  state = await planner.browser.evaluate(budgetState());
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.sections.map((section) => section.open), [true, true]);
  assert.equal(state.transfer.open, true);

  await changeInput(
    planner.browser,
    '.money-budget-row-flex input[aria-label="Food month"]',
    "130"
  );
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "26"');
  await changeInput(
    planner.browser,
    '.money-budget-row-flex input[aria-label="Food week"]',
    "9,25"
  );
  await planner.browser.waitForExpression('document.querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "9.25"');

  const beforeInvalidTransfer = await planner.server.readPlannerData();
  await planner.browser.evaluate(`(() => {
    document.getElementById("moneyTransferFrom").value = "fun";
    document.getElementById("moneyTransferTo").value = "fun";
    document.getElementById("moneyTransferAmount").value = "10";
    document.getElementById("moneyTransferForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  assert.equal((await planner.server.readPlannerData())[SETTINGS_KEY], beforeInvalidTransfer[SETTINGS_KEY]);
  assert.equal((await planner.browser.evaluate(budgetState())).transfer.amount.value, "10");

  await planner.browser.evaluate(`(() => {
    document.getElementById("moneyTransferFrom").value = "fun";
    document.getElementById("moneyTransferTo").value = "future";
    document.getElementById("moneyTransferAmount").value = "10";
    document.getElementById("moneyTransferForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression('document.querySelectorAll("#moneyTransferList .money-transfer-row").length === 2');
  state = await planner.browser.evaluate(budgetState());
  assert.deepEqual(state.sections.map((section) => section.open), [true, true]);
  assert.equal(state.settings.open, false);
  assert.equal(state.transfer.open, true);
  assert.equal(state.transfer.amount.value, "");
  assert.deepEqual(state.transfer.rows, [
    { button: "Delete", text: "Future fund€10.00 moved from FunDelete" },
    { button: "Delete", text: "Food€10.00 moved from FunDelete" }
  ]);

  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored[SETTINGS_KEY] || "{}");
    return settings.categories?.find((category) => category.id === "groceries")?.budgetCents === 13_000
      && settings.categories?.find((category) => category.id === "groceries")?.weeklyBudgetCents === 925
      && settings.transfers?.length === 2;
  });
  const persisted = JSON.parse((await planner.server.readPlannerData())[SETTINGS_KEY]);
  assert.equal(persisted.monthlyTargetCents, 999_999);
  assert.equal(persisted.legacyRootField, undefined);
  assert.equal(persisted.categories.find((category) => category.id === "groceries").legacyCategoryField, "keep-category");
  assert.equal(persisted.transfers.find((transfer) => transfer.id === "existing-cover").legacyTransferField, undefined);
  assert.equal(persisted.notes.legacyNoteField, "keep-note");

  await planner.browser.evaluate('document.querySelector("#moneyTransferList .money-transfer-row button").click()');
  await planner.browser.waitForExpression('document.querySelectorAll("#moneyTransferList .money-transfer-row").length === 1');
  assert.deepEqual((await planner.browser.evaluate(budgetState())).transfer.rows, [
    { button: "Delete", text: "Food€10.00 moved from FunDelete" }
  ]);

  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  state = await planner.browser.evaluate(budgetState());
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.sections.map((section) => section.open), [false, false]);
  assert.equal(state.transfer.open, false);
  assert.equal(state.target.value, "1360");
  assert.deepEqual(planner.browser.errors(), []);
});

test("Money budgets records the legacy desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await seedBudgets(planner.server.url);
  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandBudgetVisual(planner.browser);
  await scrollToBudgets(planner.browser);
  const legacyDesktopState = await planner.browser.evaluate(budgetState());
  const desktop = await planner.browser.evaluate(budgetVisualContract());
  const desktopScreenshot = await planner.browser.captureScreenshot(`(() => {
    const rect = document.querySelector(".money-budget-card").getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: Math.min(rect.height, 680) };
  })()`);
  assert.deepEqual({
    cardWidth: desktop.card.width,
    rowColumns: desktop.row.gridTemplateColumns,
    rowInputColumns: desktop.rowInputs.gridTemplateColumns
  }, {
    cardWidth: 940,
    rowColumns: "438px 354px",
    rowInputColumns: "173px 173px"
  });
  assert.ok(desktopScreenshot.length > 1_000);

  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  const previewDocument = 'document.querySelector("iframe").contentDocument';
  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('[data-react-budget-settings="true"]') !== null`);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector("iframe").contentDocument.querySelector(".money-budget-card").dataset.reactOwned'
  ), "true");
  await expandBudgetVisual(planner.browser, previewDocument);
  await scrollToBudgets(planner.browser, previewDocument);
  const previewDesktopState = await planner.browser.evaluate(budgetState(previewDocument));
  const previewDesktop = await planner.browser.evaluate(budgetVisualContract(previewDocument));
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(`(() => {
    const frame = document.querySelector("iframe");
    const rect = frame.contentDocument.querySelector(".money-budget-card").getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: Math.min(rect.height, 680) };
  })()`);
  assert.deepEqual(previewDesktopState, legacyDesktopState);
  assert.deepEqual(previewDesktop, desktop);
  assertSameScreenshot(previewDesktopScreenshot, desktopScreenshot, "desktop Money budgets screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandBudgetVisual(planner.browser);
  await scrollToBudgets(planner.browser);
  const legacyMobileState = await planner.browser.evaluate(budgetState());
  const mobile = await planner.browser.evaluate(budgetVisualContract());
  const mobileScreenshot = await planner.browser.captureScreenshot(`(() => {
    const rect = document.querySelector(".money-budget-card").getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: Math.min(rect.height, 780) };
  })()`);
  assert.deepEqual({
    cardWidth: mobile.card.width,
    rowColumns: mobile.row.gridTemplateColumns,
    rowInputColumns: mobile.rowInputs.gridTemplateColumns
  }, {
    cardWidth: 370,
    rowColumns: "252px",
    rowInputColumns: "252px"
  });
  assert.ok(mobileScreenshot.length > 1_000);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('[data-react-budget-settings="true"]') !== null`);
  await expandBudgetVisual(planner.browser, previewDocument);
  await scrollToBudgets(planner.browser, previewDocument);
  const previewMobileState = await planner.browser.evaluate(budgetState(previewDocument));
  const previewMobile = await planner.browser.evaluate(budgetVisualContract(previewDocument));
  const previewMobileScreenshot = await planner.browser.captureScreenshot(`(() => {
    const frame = document.querySelector("iframe");
    const rect = frame.contentDocument.querySelector(".money-budget-card").getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: Math.min(rect.height, 780) };
  })()`);
  assert.deepEqual(previewMobileState, legacyMobileState);
  assert.deepEqual(previewMobile, mobile);
  assertSameScreenshot(previewMobileScreenshot, mobileScreenshot, "mobile Money budgets screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});

test("React Money budgets preserves compatibility and updates sibling Money cards", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedBudgets(planner.server.url);
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React interaction tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  const previewDocument = 'document.querySelector("iframe").contentDocument';
  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector('[data-react-budget-settings="true"]') !== null`);
  await planner.browser.waitForExpression(`[...(${previewDocument}).querySelectorAll(".money-budget-row input")].every((input) => typeof input.onchange === "function")`);
  await expandBudgetCard(planner.browser, previewDocument);

  async function changeReactInput(selector, value) {
    await planner.browser.evaluate(`(() => {
      const frame = document.querySelector("iframe");
      const input = frame.contentDocument.querySelector(${JSON.stringify(selector)});
      const setValue = Object.getOwnPropertyDescriptor(
        frame.contentWindow.HTMLInputElement.prototype,
        "value"
      ).set;
      setValue.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    })()`);
  }

  await changeReactInput('.money-budget-row-flex input[aria-label="Food month"]', "bad");
  let state = await planner.browser.evaluate(budgetState(previewDocument));
  assert.deepEqual({ open: state.settings.open, value: state.sections[1].rows[1].inputs[0].value }, {
    open: false,
    value: "120"
  });
  assert.equal(state.sections[1].rows[1].inputs[0].value, "120");
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.sections.map((section) => section.open), [true, true]);
  assert.equal(state.transfer.open, true);

  await planner.browser.evaluate(`(${previewDocument}).querySelector(".money-settings-panel > summary").click()`);
  await changeReactInput('.money-budget-row-flex input[aria-label="Food month"]', "130");
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "26"`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector("#moneyProgressList .money-progress-copy span").textContent === "€1,050.00 spent of €1,360.00"`);

  await planner.browser.evaluate(`(${previewDocument}).querySelector(".money-settings-panel > summary").click()`);
  await changeReactInput('.money-budget-row-flex input[aria-label="Food week"]', "9,25");
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector(\'.money-budget-row-flex input[aria-label="Food week"]\').value === "9.25"`);

  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const documentRoot = frame.contentDocument;
    documentRoot.querySelector(".money-settings-panel > summary").click();
    const from = documentRoot.getElementById("moneyTransferFrom");
    const to = documentRoot.getElementById("moneyTransferTo");
    const amount = documentRoot.getElementById("moneyTransferAmount");
    const setSelect = Object.getOwnPropertyDescriptor(
      frame.contentWindow.HTMLSelectElement.prototype,
      "value"
    ).set;
    const setInput = Object.getOwnPropertyDescriptor(
      frame.contentWindow.HTMLInputElement.prototype,
      "value"
    ).set;
    setSelect.call(from, "fun");
    from.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    setSelect.call(to, "future");
    to.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    setInput.call(amount, "10");
    amount.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
    documentRoot.getElementById("moneyTransferForm").dispatchEvent(
      new frame.contentWindow.Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#moneyTransferList .money-transfer-row").length === 2`);
  state = await planner.browser.evaluate(budgetState(previewDocument));
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.transfer.rows, [
    { button: "Delete", text: "Future fund€10.00 moved from FunDelete" },
    { button: "Delete", text: "Food€10.00 moved from FunDelete" }
  ]);

  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored[SETTINGS_KEY] || "{}");
    return settings.categories?.find((category) => category.id === "groceries")?.budgetCents === 13_000
      && settings.categories?.find((category) => category.id === "groceries")?.weeklyBudgetCents === 925
      && settings.transfers?.length === 2;
  });
  const persisted = JSON.parse((await planner.server.readPlannerData())[SETTINGS_KEY]);
  assert.equal(persisted.legacyRootField, "discarded-by-legacy-normalizer");
  assert.equal(persisted.categories.find((category) => category.id === "groceries").legacyCategoryField, "keep-category");
  assert.equal(persisted.transfers.find((transfer) => transfer.id === "existing-cover").legacyTransferField, "discarded-by-legacy-normalizer");
  assert.equal(persisted.notes.legacyNoteField, "keep-note");

  await planner.browser.evaluate(`(${previewDocument}).querySelector("#moneyTransferList .money-transfer-row button").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll("#moneyTransferList .money-transfer-row").length === 1`);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  state = await planner.browser.evaluate(budgetState(previewDocument));
  assert.equal(state.settings.open, false);
  assert.deepEqual(state.sections.map((section) => section.open), [false, false]);
  assert.equal(state.transfer.open, false);
  assert.equal(state.target.value, "1360");
  assert.deepEqual(planner.browser.errors(), []);
});
