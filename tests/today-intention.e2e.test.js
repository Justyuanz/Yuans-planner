const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-17";
const ROUTINE_KEY = "hivePlanner.routine.week.2026-W38";

function routineWithThursday(type) {
  return {
    week: "2026-W38",
    isConfigured: true,
    days: ["normal", "recovery", "normal", type, "high", "normal", "recovery"]
      .map((dayType) => ({ type: dayType }))
  };
}

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
      && documentRoot.getElementById("todayThemeBadge")?.classList.contains("day-type-pill"));
  })()`);
}

function intentionState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const badge = documentRoot.getElementById("todayThemeBadge");
    return {
      label: documentRoot.querySelector(".intention-block-head > strong").textContent.trim(),
      badge: badge.textContent.trim(),
      badgeClass: badge.className
    };
  })()`;
}

function intentionVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const block = documentRoot.querySelector(".intention-block");
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
      block: pick(block),
      head: pick(block.querySelector(".intention-block-head")),
      label: pick(block.querySelector(".intention-block-head > strong")),
      badge: pick(documentRoot.getElementById("todayThemeBadge"))
    };
  })()`;
}

function blockClip(documentExpression = "document", frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".intention-block").getBoundingClientRect();
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

async function scrollToIntention(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    documentRoot.querySelector(".intention-block").scrollIntoView({ block: "center" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".intention-block").getBoundingClientRect();
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

test("today intention preserves defaults, stored day types, aliases, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "Normal Day",
    badgeClass: "progress-pill day-type-pill normal-day"
  });

  await putStoredValue(planner.server.url, ROUTINE_KEY, routineWithThursday("skate"));
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "High-Intensity Day",
    badgeClass: "progress-pill day-type-pill high-day"
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.getElementById("todayThemeBadge")?.textContent === "High-Intensity Day"'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("today intention records the legacy desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, ROUTINE_KEY, routineWithThursday("high"));
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
  const legacyDesktopState = await planner.browser.evaluate(intentionState());
  const legacyDesktop = await planner.browser.evaluate(intentionVisualContract());
  await scrollToIntention(planner.browser);
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(blockClip());
  assert.deepEqual({
    blockWidth: legacyDesktop.block.width,
    blockHeight: legacyDesktop.block.height,
    badgeWidth: legacyDesktop.badge.width,
    badgeHeight: legacyDesktop.badge.height
  }, {
    blockWidth: 892,
    blockHeight: 63.1875,
    badgeWidth: 159.265625,
    badgeHeight: 37.1875
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  const previewDesktopState = await planner.browser.evaluate(intentionState(previewDocument));
  const previewDesktop = await planner.browser.evaluate(intentionVisualContract(previewDocument));
  await scrollToIntention(planner.browser, previewDocument);
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(blockClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewDesktopState, legacyDesktopState);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop intention screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyMobileState = await planner.browser.evaluate(intentionState());
  const legacyMobile = await planner.browser.evaluate(intentionVisualContract());
  await scrollToIntention(planner.browser);
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(blockClip());
  assert.deepEqual({
    blockWidth: legacyMobile.block.width,
    blockHeight: legacyMobile.block.height,
    badgeWidth: legacyMobile.badge.width,
    badgeHeight: legacyMobile.badge.height
  }, {
    blockWidth: 338,
    blockHeight: 63.1875,
    badgeWidth: 159.265625,
    badgeHeight: 37.1875
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  const previewMobileState = await planner.browser.evaluate(intentionState(previewDocument));
  const previewMobile = await planner.browser.evaluate(intentionVisualContract(previewDocument));
  await scrollToIntention(planner.browser, previewDocument);
  const previewMobileScreenshot = await planner.browser.captureScreenshot(blockClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewMobileState, legacyMobileState);
  assert.deepEqual(previewMobile, legacyMobile);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile intention screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
