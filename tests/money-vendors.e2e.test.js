const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.money.settings";
const TRANSACTIONS_KEY = "hivePlanner.money.transactions";
const SETTINGS = {
  categories: [
    { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000 },
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ]
};
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
  await browser.waitForExpression('document.querySelector(\'[data-view-target="moneyView"]\') !== null');
  await browser.waitForExpression(`(() => {
    const documentRoot = document;
    const moneyView = documentRoot.getElementById("moneyView");
    if (!moneyView.classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="moneyView"]').click();
    }
    return moneyView.classList.contains("active");
  })()`);
  await browser.waitForExpression('document.querySelector(".money-vendors-card .money-vendor-list") !== null');
}

function vendorsState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-vendors-card");
    return {
      heading: panel.querySelector("h3").textContent.trim(),
      note: panel.querySelector(".small-note").textContent.trim(),
      rows: [...documentRoot.querySelectorAll("#moneyVendorList .money-vendor-row")].map((row) => ({
        head: [...row.querySelectorAll(".money-vendor-head > *")].map((child) => child.textContent.trim()),
        metrics: [...row.querySelectorAll(".money-vendor-metrics > *")].map((child) => child.textContent.trim()),
        text: row.textContent.trim()
      }))
    };
  })()`;
}

function vendorsVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-vendors-card");
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
        justifyItems: style.justifyItems,
        lineHeight: style.lineHeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      list: pick(documentRoot.querySelector("#moneyVendorList .money-vendor-list")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      rows: [...panel.querySelectorAll(".money-vendor-row")].map((row) => ({
        children: [...row.children].map(pick),
        text: row.textContent.trim(),
        visual: pick(row)
      })),
      state: ${vendorsState()}
    };
  })()`;
}

const MONEY_VENDORS_CLIP = `(() => {
  const rect = document.querySelector(".money-vendors-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: Math.min(rect.height, 680) };
})()`;

async function scrollToVendors(browser) {
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-vendors-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('Math.abs(document.querySelector(".money-vendors-card").getBoundingClientRect().top) < 1');
}

function assertPopulatedState(state) {
  assert.deepEqual(state, {
    heading: "Vendors",
    note: "See who gets the money, how often, and what category they usually land in.",
    rows: [
      { head: ["Market", "Food · 3 visits · avg €6.67"], metrics: ["€20.01", "Prev month €7.00"], text: "MarketFood · 3 visits · avg €6.67€20.01Prev month €7.00" },
      { head: ["Cafe", "Future fund · 1 visits · avg €19.00"], metrics: ["€19.00", "Prev month €0.00"], text: "CafeFuture fund · 1 visits · avg €19.00€19.00Prev month €0.00" },
      { head: ["Alpha", "Other · 1 visits · avg €18.00"], metrics: ["€18.00", "Prev month €0.00"], text: "AlphaOther · 1 visits · avg €18.00€18.00Prev month €0.00" },
      { head: ["Bravo", "Fun · 1 visits · avg €17.00"], metrics: ["€17.00", "Prev month €0.00"], text: "BravoFun · 1 visits · avg €17.00€17.00Prev month €0.00" },
      { head: ["Charlie", "Fun · 1 visits · avg €16.00"], metrics: ["€16.00", "Prev month €0.00"], text: "CharlieFun · 1 visits · avg €16.00€16.00Prev month €0.00" },
      { head: ["Delta", "Fun · 1 visits · avg €15.00"], metrics: ["€15.00", "Prev month €0.00"], text: "DeltaFun · 1 visits · avg €15.00€15.00Prev month €0.00" },
      { head: ["Echo", "Fun · 1 visits · avg €14.00"], metrics: ["€14.00", "Prev month €0.00"], text: "EchoFun · 1 visits · avg €14.00€14.00Prev month €0.00" },
      { head: ["Foxtrot", "Fun · 1 visits · avg €13.00"], metrics: ["€13.00", "Prev month €0.00"], text: "FoxtrotFun · 1 visits · avg €13.00€13.00Prev month €0.00" }
    ]
  });
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Money vendors preserves aggregation, month comparison, limits, and visual behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(vendorsState()), {
    heading: "Vendors",
    note: "See who gets the money, how often, and what category they usually land in.",
    rows: [{ head: [], metrics: [], text: "No vendors yetTransactions with vendor names will build this automatically." }]
  });

  await seedVendors(planner.server.url);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assertPopulatedState(await planner.browser.evaluate(vendorsState()));
  await scrollToVendors(planner.browser);
  const legacyDesktop = await planner.browser.evaluate(vendorsVisualContract());
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_VENDORS_CLIP);

  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  await openMoney(planner.browser, `${preview.url}/?view=moneyView&date=${TEST_DATE}`);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assertPopulatedState(await planner.browser.evaluate(vendorsState()));
  await scrollToVendors(planner.browser);
  const previewDesktop = await planner.browser.evaluate(vendorsVisualContract());
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_VENDORS_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money vendors screenshot");

  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyVendorList .money-vendor-row strong").textContent === "No vendors yet"');

  await planner.browser.setViewport(390, 844, true);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await scrollToVendors(planner.browser);
  const legacyMobile = await planner.browser.evaluate(vendorsVisualContract());
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(MONEY_VENDORS_CLIP);

  await openMoney(planner.browser, `${preview.url}/?view=moneyView&date=${TEST_DATE}`);
  await scrollToVendors(planner.browser);
  const previewMobile = await planner.browser.evaluate(vendorsVisualContract());
  const previewMobileScreenshot = await planner.browser.captureScreenshot(MONEY_VENDORS_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assert.equal(previewMobile.rows[0].visual.gridTemplateColumns, "279px");
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money vendors screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
