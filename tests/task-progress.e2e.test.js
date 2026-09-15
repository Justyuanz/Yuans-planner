const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-17";
const TASKS_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;

async function putStoredValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function openPlanner(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return Boolean(documentRoot?.documentElement?.dataset.plannerReady === "true"
      && documentRoot.getElementById("progressText")?.textContent.includes("tasks done today"));
  })()`);
}

function progressState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      message: documentRoot.getElementById("dayMessage").textContent.trim(),
      progress: documentRoot.getElementById("progressText").textContent.trim()
    };
  })()`;
}

function progressVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const banner = documentRoot.querySelector(".day-banner");
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
        flexWrap: style.flexWrap,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: rect.height,
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        margin: style.margin,
        minHeight: style.minHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      banner: pick(banner),
      message: pick(documentRoot.getElementById("dayMessage")),
      progress: pick(documentRoot.getElementById("progressText"))
    };
  })()`;
}

function bannerClip(documentExpression = "document", frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".day-banner").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frameRect.x + rect.x + (frame ? 0 : documentRoot.defaultView.scrollX),
      y: frameRect.y + rect.y + (frame ? 0 : documentRoot.defaultView.scrollY),
      width: rect.width,
      height: rect.height
    };
  })()`;
}

async function scrollToProgress(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    documentRoot.querySelector(".day-banner").scrollIntoView({ block: "center" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".day-banner").getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= documentRoot.defaultView.innerHeight;
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

const STORED_TASKS = [
  { id: "first", label: "09:00 First task", activity: "lc", done: true },
  { id: "second", label: "10:00 Second task", activity: "cpp", done: false },
  { id: "third", label: "11:00 Third task", activity: "python", done: "yes" },
  { id: "blank", label: "   ", done: true },
  null
];

test("task progress preserves filtering, completion updates, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "0 / 0 tasks done today"
  });

  await putStoredValue(planner.server.url, TASKS_KEY, STORED_TASKS);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "2 / 3 tasks done today"
  });

  await planner.browser.evaluate(`(() => {
    const task = [...document.querySelectorAll(".task")]
      .find((item) => item.textContent.includes("Second task"));
    task.querySelector(".task-check").click();
  })()`);
  await planner.browser.waitForExpression(
    'document.getElementById("progressText").textContent === "3 / 3 tasks done today"'
  );

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.getElementById("progressText")?.textContent === "3 / 3 tasks done today"'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("task progress records the legacy desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, TASKS_KEY, STORED_TASKS.slice(0, 3));
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  const previewDocument = 'document.querySelector("iframe").contentDocument';
  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyDesktopState = await planner.browser.evaluate(progressState());
  const legacyDesktop = await planner.browser.evaluate(progressVisualContract());
  await scrollToProgress(planner.browser);
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(bannerClip());
  assert.deepEqual({
    bannerWidth: legacyDesktop.banner.width,
    bannerHeight: legacyDesktop.banner.height,
    progressWidth: legacyDesktop.progress.width,
    progressHeight: legacyDesktop.progress.height
  }, {
    bannerWidth: 892,
    bannerHeight: 57.1875,
    progressWidth: 185.546875,
    progressHeight: 35.1875
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  const previewDesktopState = await planner.browser.evaluate(progressState(previewDocument));
  const previewDesktop = await planner.browser.evaluate(progressVisualContract(previewDocument));
  await scrollToProgress(planner.browser, previewDocument);
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(bannerClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewDesktopState, legacyDesktopState);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop task-progress screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyMobileState = await planner.browser.evaluate(progressState());
  const legacyMobile = await planner.browser.evaluate(progressVisualContract());
  await scrollToProgress(planner.browser);
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(bannerClip());
  assert.deepEqual({
    bannerWidth: legacyMobile.banner.width,
    bannerHeight: legacyMobile.banner.height,
    progressWidth: legacyMobile.progress.width,
    progressHeight: legacyMobile.progress.height
  }, {
    bannerWidth: 338,
    bannerHeight: 90.375,
    progressWidth: 185.546875,
    progressHeight: 35.1875
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  const previewMobileState = await planner.browser.evaluate(progressState(previewDocument));
  const previewMobile = await planner.browser.evaluate(progressVisualContract(previewDocument));
  await scrollToProgress(planner.browser, previewDocument);
  const previewMobileScreenshot = await planner.browser.captureScreenshot(bannerClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewMobileState, legacyMobileState);
  assert.deepEqual(previewMobile, legacyMobile);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile task-progress screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
