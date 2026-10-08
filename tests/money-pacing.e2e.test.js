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
    { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
  ],
  transfers: [
    { id: "cover", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 1_000 }
  ]
};
const TRANSACTIONS = [
  { id: "rent", date: TEST_DATE, amountCents: 80_000, categoryId: "rent" },
  { id: "groceries", date: "2026-09-13", amountCents: 20_000, categoryId: "groceries" },
  { id: "future", date: "2026-09-12", amountCents: 5_000, categoryId: "future" },
  { id: "august-a", date: "2026-08-31", amountCents: 1_000, categoryId: "fun" },
  { id: "august-b", date: "2026-08-01", amountCents: 500, categoryId: "fun" },
  { id: "july", date: "2026-07-15", amountCents: 500, categoryId: "fun" },
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

async function seedPacing(serverUrl) {
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
  await browser.waitForExpression(`(${documentExpression}).querySelectorAll("#moneyProgressList .money-progress-card").length === 2`);
}

async function expandHistory(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const details = (${documentExpression}).querySelector(".money-pacing-card .money-chart-dropdown");
    if (!details.open) {
      details.querySelector("summary").click();
    }
  })()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".money-pacing-card .money-chart-dropdown").open`);
}

function pacingState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const panel = documentRoot.querySelector(".money-pacing-card");
    const progress = [...panel.querySelectorAll(".money-progress-card")].map((card) => {
      const estimate = card.querySelector(".money-estimate-block");
      return {
        className: card.className,
        copy: [...card.querySelector(".money-progress-copy").children].map((child) => child.textContent.trim()),
        estimate: estimate ? {
          head: [...estimate.querySelector(".money-bar-head").children].map((child) => child.textContent.trim()),
          width: estimate.querySelector(".money-bar-track span").style.width
        } : null,
        title: card.querySelector(".chart-title").textContent.trim(),
        width: card.querySelector(".money-progress-track span").style.width
      };
    });
    const categoryChart = panel.querySelector("#moneyCharts > .money-chart-card:not(details)");
    const history = panel.querySelector(".money-chart-dropdown");
    const rows = (container) => [...container.querySelectorAll(".money-bar-row")].map((row) => ({
      head: [...row.querySelector(".money-bar-head").children].map((child) => child.textContent.trim()),
      width: row.querySelector(".money-bar-track span").style.width
    }));
    return {
      categories: {
        rows: rows(categoryChart),
        title: categoryChart.querySelector(".chart-title").textContent.trim()
      },
      heading: panel.querySelector("h3").textContent.trim(),
      history: {
        open: history.open,
        rows: rows(history),
        summary: [...history.querySelector("summary").children].map((child) => child.textContent.trim())
      },
      note: panel.querySelector(".small-note").textContent.trim(),
      progress
    };
  })()`;
}

function pacingVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-pacing-card");
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
        marginBottom: style.marginBottom,
        overflow: style.overflow,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      categoryChart: pick(panel.querySelector("#moneyCharts > .money-chart-card:not(details)")),
      chartStack: pick(documentRoot.getElementById("moneyCharts")),
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      history: pick(panel.querySelector(".money-chart-dropdown")),
      historyRows: [...panel.querySelectorAll(".money-chart-dropdown .money-bar-row")].map(pick),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      progressCards: [...panel.querySelectorAll(".money-progress-card")].map((card) => ({
        children: [...card.children].map(pick),
        text: card.textContent.trim(),
        visual: pick(card)
      })),
      progressList: pick(documentRoot.getElementById("moneyProgressList")),
      state: ${pacingState(documentExpression)}
    };
  })()`;
}

const LEGACY_CLIP = `(() => {
  const rect = document.querySelector(".money-pacing-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: Math.min(rect.height, 680) };
})()`;

const PREVIEW_CLIP = `(() => {
  const frame = document.querySelector("iframe");
  const rect = frame.contentDocument.querySelector(".money-pacing-card").getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: Math.min(rect.height, 680) };
})()`;

async function scrollToPacing(browser, documentExpression) {
  await browser.waitForExpression(
    `(${documentExpression}).documentElement.dataset.plannerReady === "true"`
  );
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".money-pacing-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`Math.abs((${documentExpression}).querySelector(".money-pacing-card").getBoundingClientRect().top) < 1`);
}

function expectedCategoryRows(overBudget) {
  return [
    { head: ["Eating out", "€35.00"], width: "0%" },
    { head: ["Fun", overBudget ? "€15.00" : "€25.00"], width: "0%" },
    ...(overBudget ? [{ head: ["Future fund", "€0.00"], width: "100%" }] : []),
    { head: ["Groceries", overBudget ? "€0.00" : "€120.00"], width: overBudget ? "100%" : "0%" },
    { head: ["Health", "€25.00"], width: "0%" },
    { head: ["Other", "€16.11"], width: "0%" },
    { head: ["ResQ", "€20.00"], width: "0%" },
    { head: ["Skate", "€20.00"], width: "0%" }
  ];
}

function assertDefaultState(state, historyOpen = false) {
  assert.deepEqual(state, {
    categories: { rows: expectedCategoryRows(false), title: "Remaining by category" },
    heading: "Pace and projection",
    history: {
      open: historyOpen,
      rows: [],
      summary: ["Monthly spending over time", "Show up to 12 months"]
    },
    note: "The goal is clarity, not guilt. Let the pace explain what changed.",
    progress: [
      {
        className: "mini-chart money-chart-card money-progress-card",
        copy: ["€0.00 spent of €1,300.00", "€1,300.00 remaining", "0% used"],
        estimate: { head: ["Estimated spending", "€1,038.89"], width: "80%" },
        title: "Monthly spending",
        width: "4%"
      },
      {
        className: "mini-chart money-chart-card money-progress-card",
        copy: ["€0.00 spent of €261.11", "€261.11 remaining", "0% used"],
        estimate: null,
        title: "Flexible spending",
        width: "4%"
      }
    ]
  });
}

function assertPopulatedState(state) {
  assert.deepEqual(state, {
    categories: { rows: expectedCategoryRows(true), title: "Remaining by category" },
    heading: "Pace and projection",
    history: {
      open: true,
      rows: [
        { head: ["26/09", "€1,050.00"], width: "100%" },
        { head: ["26/08", "€15.00"], width: "4%" },
        { head: ["26/07", "€5.00"], width: "4%" }
      ],
      summary: ["Monthly spending over time", "Show up to 12 months"]
    },
    note: "The goal is clarity, not guilt. Let the pace explain what changed.",
    progress: [
      {
        className: "mini-chart money-chart-card money-progress-card",
        copy: ["€1,050.00 spent of €1,350.00", "€300.00 remaining", "78% used"],
        estimate: { head: ["Estimated spending", "€1,574.60"], width: "100%" },
        title: "Monthly spending",
        width: "78%"
      },
      {
        className: "mini-chart money-chart-card money-progress-card",
        copy: ["€250.00 spent of €311.11", "€61.11 remaining", "80% used"],
        estimate: null,
        title: "Flexible spending",
        width: "80%"
      }
    ]
  });
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Money pacing preserves projections, charts, history, and visual behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assertDefaultState(await planner.browser.evaluate(pacingState("document")));

  await seedPacing(planner.server.url);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandHistory(planner.browser, "document");
  assertPopulatedState(await planner.browser.evaluate(pacingState("document")));
  await scrollToPacing(planner.browser, "document");
  const legacyDesktop = await planner.browser.evaluate(pacingVisualContract("document"));
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
    'document.querySelector("iframe").contentDocument.querySelector(".money-pacing-card").dataset.reactOwned'
  ), "true");
  assert.equal((await planner.browser.evaluate(pacingState(previewDocument))).history.open, false);
  await expandHistory(planner.browser, previewDocument);
  assertPopulatedState(await planner.browser.evaluate(pacingState(previewDocument)));
  await scrollToPacing(planner.browser, previewDocument);
  const previewDesktop = await planner.browser.evaluate(pacingVisualContract(previewDocument));
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(PREVIEW_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money pacing screenshot");

  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(TRANSACTIONS_KEY)},
    newValue: "[]"
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(SETTINGS_KEY)},
    newValue: "{}"
  }))`);
  await planner.browser.waitForExpression(`(${previewDocument}).querySelector("#moneyProgressList .money-progress-copy span").textContent === "€0.00 spent of €1,300.00"`);
  assertDefaultState(await planner.browser.evaluate(pacingState(previewDocument)), true);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  assert.equal((await planner.browser.evaluate(pacingState(previewDocument))).history.open, false);

  await planner.browser.setViewport(390, 844, true);
  await openMoney(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await expandHistory(planner.browser, "document");
  await scrollToPacing(planner.browser, "document");
  const legacyMobile = await planner.browser.evaluate(pacingVisualContract("document"));
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

  await openMoney(planner.browser, `${preview.url}/?view=legacyShell&date=${TEST_DATE}`, previewDocument);
  await expandHistory(planner.browser, previewDocument);
  await scrollToPacing(planner.browser, previewDocument);
  const previewMobile = await planner.browser.evaluate(pacingVisualContract(previewDocument));
  const previewMobileScreenshot = await planner.browser.captureScreenshot(PREVIEW_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assert.equal(previewMobile.progressCards[0].visual.width, 338);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money pacing screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
