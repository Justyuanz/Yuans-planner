const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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
  await browser.waitForExpression('document.querySelector(\'[data-view-target="moneyView"]\') !== null');
  await browser.waitForExpression(`(() => {
    const documentRoot = document;
    const moneyView = documentRoot.getElementById("moneyView");
    if (!moneyView.classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="moneyView"]').click();
    }
    return moneyView.classList.contains("active");
  })()`);
  await browser.waitForExpression('document.querySelectorAll("#moneyOverviewGrid .money-mini-stat").length === 2');
}

function moneyOverviewState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-overview-card");
    return {
      heading: panel.querySelector("h2").textContent.trim(),
      month: documentRoot.getElementById("moneyMonthLabel").textContent.trim(),
      note: panel.querySelector(".small-note").textContent.trim(),
      stats: [...documentRoot.querySelectorAll("#moneyOverviewGrid .money-mini-stat")].map((item) => ({
        className: item.className,
        parts: [...item.children].map((child) => child.textContent.trim()),
        text: item.textContent.trim()
      }))
    };
  })()`;
}

function moneyOverviewVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-overview-card");
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
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      grid: pick(documentRoot.getElementById("moneyOverviewGrid")),
      heading: { text: panel.querySelector("h2").textContent.trim(), visual: pick(panel.querySelector("h2")) },
      month: { text: documentRoot.getElementById("moneyMonthLabel").textContent.trim(), visual: pick(documentRoot.getElementById("moneyMonthLabel")) },
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      state: ${moneyOverviewState()},
      stats: [...panel.querySelectorAll(".money-mini-stat")].map((item) => ({
        children: [...item.children].map(pick),
        text: item.textContent.trim(),
        visual: pick(item)
      }))
    };
  })()`;
}

const MONEY_OVERVIEW_CLIP = `(() => {
  const rect = document.querySelector(".money-overview-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

async function scrollToMoneyOverview(browser) {
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-overview-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('document.querySelector(".money-overview-card").getBoundingClientRect().bottom > 0');
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

function assertDefaultState(state) {
  assert.deepEqual(state, {
    heading: "Money planner",
    month: "September 2026",
    note: "Keep the money visible enough that your brain does not have to hold it all.",
    stats: [
      {
        className: "money-mini-stat",
        parts: ["Remaining this week", "€107.45", "2026-09-14 to 2026-09-20"],
        text: "Remaining this week€107.452026-09-14 to 2026-09-20"
      },
      {
        className: "money-mini-stat",
        parts: ["Flexible money left", "€261.11", "Adjustable spending."],
        text: "Flexible money left€261.11Adjustable spending."
      }
    ]
  });
}

function assertNegativeState(state) {
  assert.deepEqual(state.stats, [
    {
      className: "money-mini-stat is-negative",
      parts: ["Remaining this week", "-€38.89", "2026-09-14 to 2026-09-20"],
      text: "Remaining this week-€38.892026-09-14 to 2026-09-20"
    },
    {
      className: "money-mini-stat is-negative",
      parts: ["Flexible money left", "-€38.89", "Adjustable spending."],
      text: "Flexible money left-€38.89Adjustable spending."
    }
  ]);
}

test("Money overview preserves totals, dates, synchronization, and visual behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assertDefaultState(await planner.browser.evaluate(moneyOverviewState()));

  await putTransactions(planner.server.url, TRANSACTIONS);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assertNegativeState(await planner.browser.evaluate(moneyOverviewState()));
  await scrollToMoneyOverview(planner.browser);
  const legacyDesktop = await planner.browser.evaluate(moneyOverviewVisualContract());
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_OVERVIEW_CLIP);

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
  assertNegativeState(await planner.browser.evaluate(moneyOverviewState()));
  await scrollToMoneyOverview(planner.browser);
  const previewDesktop = await planner.browser.evaluate(moneyOverviewVisualContract());
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(MONEY_OVERVIEW_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money overview screenshot");

  await putTransactions(planner.server.url, []);
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }))`);
  await planner.browser.waitForExpression('document.querySelector("#moneyOverviewGrid .money-mini-stat strong").textContent === "€107.45"');
  assertDefaultState(await planner.browser.evaluate(moneyOverviewState()));

  await planner.browser.setViewport(390, 844, true);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await scrollToMoneyOverview(planner.browser);
  const legacyMobile = await planner.browser.evaluate(moneyOverviewVisualContract());
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(MONEY_OVERVIEW_CLIP);

  await openMoney(planner.browser, `${preview.url}/?view=moneyView&date=${TEST_DATE}`);
  await scrollToMoneyOverview(planner.browser);
  const previewMobile = await planner.browser.evaluate(moneyOverviewVisualContract());
  const previewMobileScreenshot = await planner.browser.captureScreenshot(MONEY_OVERVIEW_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assert.equal(previewMobile.grid.gridTemplateColumns, "162px 162px");
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money overview screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
