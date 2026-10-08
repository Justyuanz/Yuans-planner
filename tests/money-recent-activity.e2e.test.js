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
    { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000, weeklyBudgetCents: 3_000 },
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ]
};
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

async function openMoney(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(${documentExpression}).querySelector('[data-view-target="moneyView"]')`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const moneyView = documentRoot.getElementById("moneyView");
    if (!moneyView.classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="moneyView"]').click();
    }
    return moneyView.classList.contains("active");
  })()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-activity-card details") !== null`);
}

async function expandActivity(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const details = (${documentExpression}).querySelector(".money-activity-card details");
    if (!details.open) {
      details.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-activity-card details").open`);
}

function activityState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const panel = documentRoot.querySelector(".money-activity-card");
    const details = panel.querySelector("details");
    return {
      open: details.open,
      summary: [...details.querySelector("summary").children].map((child) => child.textContent.trim()),
      rows: [...documentRoot.querySelectorAll("#moneyRecentActivity .money-vendor-row")].map((row) => ({
        head: [...row.querySelectorAll(".money-vendor-head > *")].map((child) => child.textContent.trim()),
        metrics: [...row.querySelectorAll(".money-vendor-metrics > *")].map((child) => child.textContent.trim()),
        text: row.textContent.trim()
      }))
    };
  })()`;
}

function activityVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-activity-card");
    const details = panel.querySelector("details");
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
      body: pick(details.querySelector(".money-settings-body")),
      details: pick(details),
      list: pick(documentRoot.getElementById("moneyRecentActivity")),
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      rows: [...details.querySelectorAll(".money-vendor-row")].map((row) => ({
        children: [...row.children].map(pick),
        text: row.textContent.trim(),
        visual: pick(row)
      })),
      state: ${activityState(documentExpression)},
      summary: pick(details.querySelector("summary"))
    };
  })()`;
}

const LEGACY_CLIP = `(() => {
  const rect = document.querySelector(".money-activity-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

const PREVIEW_CLIP = `(() => {
  const frame = document.querySelector("iframe");
  const rect = frame.contentDocument.querySelector(".money-activity-card").getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: rect.height };
})()`;

const LEGACY_MOBILE_CLIP = `(() => {
  const rect = document.querySelector(".money-activity-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: Math.min(rect.height, 640) };
})()`;

const PREVIEW_MOBILE_CLIP = `(() => {
  const frame = document.querySelector("iframe");
  const rect = frame.contentDocument.querySelector(".money-activity-card").getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: Math.min(rect.height, 640) };
})()`;

async function scrollToActivity(browser, documentExpression) {
  await browser.waitForExpression(
    `(${documentExpression}).documentElement.dataset.plannerReady === "true"`
  );
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-activity-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`Math.abs((${documentExpression}).querySelector(".money-activity-card").getBoundingClientRect().top) < 1`);
}

function assertPopulatedState(state) {
  assert.deepEqual(state, {
    open: true,
    summary: ["Recent activity", "Open for the latest transactions."],
    rows: [
      { head: ["Future fund", "Lab · 2026-09-14"], metrics: ["€9.99", "Future fund"], text: "Future fundLab · 2026-09-14€9.99Future fund" },
      { head: ["Food", "Market · 2026-09-14"], metrics: ["€12.50", "Food"], text: "FoodMarket · 2026-09-14€12.50Food" },
      { head: ["Other", "No vendor · 2026-09-14"], metrics: ["€3.00", "Other"], text: "OtherNo vendor · 2026-09-14€3.00Other" },
      { head: ["Fun", "Cinema · 2026-09-13"], metrics: ["€4.50", "Fun"], text: "FunCinema · 2026-09-13€4.50Fun" },
      { head: ["Eating out", "Cafe · 2026-09-12"], metrics: ["€6.00", "Eating out"], text: "Eating outCafe · 2026-09-12€6.00Eating out" },
      { head: ["ResQ", "ResQ · 2026-09-11"], metrics: ["€7.00", "ResQ"], text: "ResQResQ · 2026-09-11€7.00ResQ" },
      { head: ["Health", "Pharmacy · 2026-09-10"], metrics: ["€8.00", "Health"], text: "HealthPharmacy · 2026-09-10€8.00Health" },
      { head: ["HSL", "HSL · 2026-08-31"], metrics: ["€9.00", "HSL"], text: "HSLHSL · 2026-08-31€9.00HSL" }
    ]
  });
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Money recent activity preserves ordering, disclosure state, and visual behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(activityState("document")), {
    open: false,
    summary: ["Recent activity", "Open for the latest transactions."],
    rows: [{ head: [], metrics: [], text: "No activity yetYour latest spending will show up here." }]
  });

  await seedActivity(planner.server.url);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandActivity(planner.browser, "document");
  assertPopulatedState(await planner.browser.evaluate(activityState("document")));
  await scrollToActivity(planner.browser, "document");
  const legacyDesktop = await planner.browser.evaluate(activityVisualContract("document"));
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

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
  assert.equal(await planner.browser.evaluate(
    'document.querySelector("iframe").contentDocument.querySelector(".money-activity-card").dataset.reactOwned'
  ), "true");
  assert.equal((await planner.browser.evaluate(activityState(previewDocument))).open, false);
  await expandActivity(planner.browser, previewDocument);
  assertPopulatedState(await planner.browser.evaluate(activityState(previewDocument)));
  await scrollToActivity(planner.browser, previewDocument);
  const previewDesktop = await planner.browser.evaluate(activityVisualContract(previewDocument));
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(PREVIEW_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money activity screenshot");

  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector("#moneyRecentActivity .money-vendor-row strong").textContent === "No activity yet"`);
  assert.equal((await planner.browser.evaluate(activityState(previewDocument))).open, true);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  assert.equal((await planner.browser.evaluate(activityState(previewDocument))).open, false);

  await planner.browser.setViewport(390, 844, true);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandActivity(planner.browser, "document");
  await scrollToActivity(planner.browser, "document");
  const legacyMobile = await planner.browser.evaluate(activityVisualContract("document"));
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_MOBILE_CLIP);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  await expandActivity(planner.browser, previewDocument);
  await scrollToActivity(planner.browser, previewDocument);
  const previewMobile = await planner.browser.evaluate(activityVisualContract(previewDocument));
  const previewMobileScreenshot = await planner.browser.captureScreenshot(PREVIEW_MOBILE_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assert.equal(previewMobile.rows[0].visual.gridTemplateColumns, "282px");
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money activity screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
