const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";

async function openReady(browser, url, documentExpression = "document") {
  await browser.open(url);
  await browser.waitForExpression(
    `(${documentExpression}).documentElement.dataset.plannerReady === "true"`
  );
}

function pageState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      activeTab: documentRoot.querySelector(".tab-button.active")?.textContent.trim(),
      cardHeadings: [...documentRoot.querySelectorAll("#moneyView article h2, #moneyView article h3")]
        .map((heading) => heading.textContent.trim()),
      date: documentRoot.getElementById("dashboardDate")?.textContent.trim(),
      heading: documentRoot.querySelector(".hero h1")?.textContent.trim(),
      iframeCount: documentRoot.querySelectorAll("iframe").length,
      moneyActive: documentRoot.getElementById("moneyView")?.classList.contains("active"),
      subtitle: documentRoot.getElementById("todaySubtitle")?.textContent.trim()
    };
  })()`;
}

function pageGeometry(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = (selector) => {
      const value = documentRoot.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      app: rect(".app"),
      moneyPage: rect(".money-page"),
      overview: rect(".money-overview-card"),
      sidebarDisplay: documentRoot.defaultView.getComputedStyle(
        documentRoot.querySelector(".sidebar")
      ).display,
      workspace: rect(".workspace"),
      overflow: documentRoot.documentElement.scrollWidth > documentRoot.documentElement.clientWidth
    };
  })()`;
}

async function prepareScreenshot(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.defaultView.scrollTo(0, 0);
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function overviewClip(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".money-overview-card").getBoundingClientRect();
    return {
      height: rect.height,
      width: rect.width,
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Money is a direct React page with legacy parity, navigation, and persistence", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React page tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  const legacyUrl = `${planner.server.url}/?view=moneyView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=moneyView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openReady(planner.browser, legacyUrl);
  const legacyDesktopState = await planner.browser.evaluate(pageState());
  const legacyDesktopGeometry = await planner.browser.evaluate(pageGeometry());
  await prepareScreenshot(planner.browser);
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(overviewClip());

  await openReady(planner.browser, previewUrl);
  const previewDesktopState = await planner.browser.evaluate(pageState());
  const previewDesktopGeometry = await planner.browser.evaluate(pageGeometry());
  await prepareScreenshot(planner.browser);
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(overviewClip());

  assert.deepEqual(previewDesktopState, {
    ...legacyDesktopState,
    iframeCount: 0
  });
  assert.deepEqual(previewDesktopGeometry, legacyDesktopGeometry);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Money page");

  await planner.browser.evaluate(`(() => {
    document.querySelector(".money-budget-card .money-settings-panel").open = true;
    document.querySelector(".money-budget-section:last-child").open = true;
    const input = document.querySelector('input[aria-label="Groceries week"]');
    input.value = "33.25";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression(
    'document.querySelector(\'input[aria-label="Groceries week"]\')?.value === "33.25"'
  );
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const settings = JSON.parse(data["hivePlanner.money.settings"] || "{}");
    return settings.categories?.find((category) => category.id === "groceries")
      ?.weeklyBudgetCents === 3325;
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.documentElement.dataset.plannerReady === "true"'
  );
  await planner.browser.evaluate('document.querySelector(".money-budget-card .money-settings-panel").open = true');
  await planner.browser.evaluate('document.querySelector(".money-budget-section:last-child").open = true');
  await planner.browser.waitForExpression(
    'document.querySelector(\'input[aria-label="Groceries week"]\')?.value === "33.25"'
  );

  await planner.browser.setViewport(390, 844, true);
  await openReady(planner.browser, legacyUrl);
  const legacyMobileGeometry = await planner.browser.evaluate(pageGeometry());
  await prepareScreenshot(planner.browser);
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(overviewClip());

  await openReady(planner.browser, previewUrl);
  const previewMobileGeometry = await planner.browser.evaluate(pageGeometry());
  await prepareScreenshot(planner.browser);
  const previewMobileScreenshot = await planner.browser.captureScreenshot(overviewClip());
  assert.deepEqual(previewMobileGeometry, legacyMobileGeometry);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Money page");
  assert.equal(previewMobileGeometry.overflow, false);

  await planner.browser.evaluate('document.querySelector("[data-view-target=todayView]").click()');
  await planner.browser.waitForExpression('location.search.includes("view=todayView")');
  await planner.browser.waitForExpression('document.querySelector("iframe")?.contentDocument?.documentElement.dataset.plannerReady === "true"');
  assert.deepEqual(planner.browser.errors(), []);
});
