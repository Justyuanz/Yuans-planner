const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const DAY_STATE_KEY = "hivePlanner.dayState";
const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";

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
      && documentRoot.getElementById("dayStateOptions")?.querySelector(".is-active"));
  })()`);
}

function dayState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      label: documentRoot.querySelector(".day-state-strip > strong").textContent.trim(),
      options: [...documentRoot.querySelectorAll("#dayStateOptions [data-day-state]")].map((button) => ({
        id: button.dataset.dayState,
        label: button.textContent.trim(),
        active: button.classList.contains("is-active")
      })),
      firstMascotPrompt: documentRoot.querySelector("#mascotQuickAsks .mascot-quick-ask")?.textContent.trim() || ""
    };
  })()`;
}

function dayStateVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const strip = documentRoot.querySelector(".day-state-strip");
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
        lineHeight: style.lineHeight,
        margin: style.margin,
        minHeight: style.minHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      strip: pick(strip),
      label: pick(strip.querySelector(":scope > strong")),
      options: pick(documentRoot.getElementById("dayStateOptions")),
      chip: pick(documentRoot.querySelector("#dayStateOptions .day-state-chip")),
      activeChip: pick(documentRoot.querySelector("#dayStateOptions .is-active"))
    };
  })()`;
}

function stripClip(documentExpression = "document", frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".day-state-strip").getBoundingClientRect();
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

async function scrollToDayState(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    documentRoot.querySelector(".day-state-strip").scrollIntoView({ block: "center" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".day-state-strip").getBoundingClientRect();
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

const DEFAULT_OPTIONS = [
  { id: "good", label: "Good", active: false },
  { id: "okay", label: "Steady", active: true },
  { id: "tired", label: "Tired", active: false },
  { id: "overwhelmed", label: "Heavy", active: false },
  { id: "low-focus", label: "Scattered", active: false }
];

test("day state preserves defaults, storage, audit logging, side effects, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(dayState()), {
    label: "How does today feel?",
    options: DEFAULT_OPTIONS,
    firstMascotPrompt: "What keeps slipping in my plan?"
  });

  const existingLog = {
    id: "existing-entry",
    timestamp: "2026-09-13T09:00:00.000Z",
    action: "task_created",
    entityType: "task",
    entityId: "existing-task",
    dateKey: "2026-09-13",
    field: "",
    before: null,
    after: { label: "Existing" },
    meta: { source: "test" }
  };
  await putStoredValue(planner.server.url, DAY_STATE_KEY, {
    "2026-09-13": "overwhelmed",
    [TEST_DATE]: "tired",
    compatibilityField: { keep: true }
  });
  await putStoredValue(planner.server.url, ACTIVITY_LOG_KEY, [existingLog]);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const tiredState = await planner.browser.evaluate(dayState());
  assert.equal(tiredState.options.find((option) => option.id === "tired").active, true);
  assert.equal(tiredState.firstMascotPrompt, "I'm tired. Can you cut today down?");

  await planner.browser.evaluate('document.querySelector("#dayStateOptions [data-day-state=good]").click()');
  const stored = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const states = JSON.parse(data[DAY_STATE_KEY] || "{}");
    const entries = JSON.parse(data[ACTIVITY_LOG_KEY] || "[]");
    return states[TEST_DATE] === "good" && entries.length === 2 ? { entries, states } : null;
  });
  assert.deepEqual(stored.states, {
    "2026-09-13": "overwhelmed",
    [TEST_DATE]: "good",
    compatibilityField: { keep: true }
  });
  assert.deepEqual(stored.entries[0], existingLog);
  assert.match(stored.entries[1].id, /^activity-/);
  assert.equal(Number.isNaN(Date.parse(stored.entries[1].timestamp)), false);
  assert.deepEqual({
    action: stored.entries[1].action,
    entityType: stored.entries[1].entityType,
    entityId: stored.entries[1].entityId,
    dateKey: stored.entries[1].dateKey,
    field: stored.entries[1].field,
    before: stored.entries[1].before,
    after: stored.entries[1].after,
    meta: stored.entries[1].meta
  }, {
    action: "day_state_updated",
    entityType: "day_state",
    entityId: TEST_DATE,
    dateKey: TEST_DATE,
    field: "",
    before: "tired",
    after: "good",
    meta: {}
  });
  await planner.browser.waitForExpression(
    'document.querySelector("#dayStateOptions [data-day-state=good]").classList.contains("is-active")'
  );
  assert.equal(
    await planner.browser.evaluate('document.querySelector("#mascotQuickAsks .mascot-quick-ask").textContent.trim()'),
    "What should I use my good energy on today?"
  );

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.querySelector("#dayStateOptions [data-day-state=good]").classList.contains("is-active")'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("day state records the legacy desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, DAY_STATE_KEY, { [TEST_DATE]: "good" });
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
  const legacyDesktopState = await planner.browser.evaluate(dayState());
  const legacyDesktop = await planner.browser.evaluate(dayStateVisualContract());
  await scrollToDayState(planner.browser);
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(stripClip());
  assert.deepEqual({
    stripWidth: legacyDesktop.strip.width,
    stripHeight: legacyDesktop.strip.height,
    optionsWidth: legacyDesktop.options.width,
    optionsHeight: legacyDesktop.options.height
  }, {
    stripWidth: 892,
    stripHeight: 82.546875,
    optionsWidth: 862,
    optionsHeight: 30
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  assert.equal(
    await planner.browser.evaluate(`${previewDocument}.getElementById("dayStateOptions").dataset.reactOwned`),
    "true"
  );
  const previewDesktopState = await planner.browser.evaluate(dayState(previewDocument));
  const previewDesktop = await planner.browser.evaluate(dayStateVisualContract(previewDocument));
  await scrollToDayState(planner.browser, previewDocument);
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(stripClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewDesktopState, legacyDesktopState);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop day-state screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyMobileState = await planner.browser.evaluate(dayState());
  const legacyMobile = await planner.browser.evaluate(dayStateVisualContract());
  await scrollToDayState(planner.browser);
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(stripClip());
  assert.deepEqual({
    stripWidth: legacyMobile.strip.width,
    stripHeight: legacyMobile.strip.height,
    optionsWidth: legacyMobile.options.width,
    optionsHeight: legacyMobile.options.height
  }, {
    stripWidth: 338,
    stripHeight: 120.546875,
    optionsWidth: 308,
    optionsHeight: 68
  });

  await openPlanner(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  const previewMobileState = await planner.browser.evaluate(dayState(previewDocument));
  const previewMobile = await planner.browser.evaluate(dayStateVisualContract(previewDocument));
  await scrollToDayState(planner.browser, previewDocument);
  const previewMobileScreenshot = await planner.browser.captureScreenshot(stripClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewMobileState, legacyMobileState);
  assert.deepEqual(previewMobile, legacyMobile);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile day-state screenshot");

  await planner.browser.evaluate(
    `${previewDocument}.querySelector("#dayStateOptions [data-day-state=tired]").click()`
  );
  const stored = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const states = JSON.parse(data[DAY_STATE_KEY] || "{}");
    const entries = JSON.parse(data[ACTIVITY_LOG_KEY] || "[]");
    return states[TEST_DATE] === "tired" ? { entries, states } : null;
  });
  assert.deepEqual(stored.states, { [TEST_DATE]: "tired" });
  const dayStateEntries = stored.entries.filter((entry) => entry.action === "day_state_updated");
  assert.equal(dayStateEntries.length, 1, JSON.stringify(stored.entries));
  assert.deepEqual({
    action: dayStateEntries[0].action,
    entityType: dayStateEntries[0].entityType,
    entityId: dayStateEntries[0].entityId,
    dateKey: dayStateEntries[0].dateKey,
    before: dayStateEntries[0].before,
    after: dayStateEntries[0].after
  }, {
    action: "day_state_updated",
    entityType: "day_state",
    entityId: TEST_DATE,
    dateKey: TEST_DATE,
    before: "good",
    after: "tired"
  });
  await planner.browser.waitForExpression(`(() => {
    const documentRoot = ${previewDocument};
    return documentRoot.querySelector("#dayStateOptions [data-day-state=tired]").classList.contains("is-active")
      && documentRoot.querySelector("#mascotQuickAsks .mascot-quick-ask").textContent.trim()
        === "I'm tired. Can you cut today down?";
  })()`);

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    const documentRoot = ${previewDocument};
    return documentRoot.getElementById("dayStateOptions")?.dataset.reactOwned === "true"
      && documentRoot.querySelector("#dayStateOptions [data-day-state=tired]")?.classList.contains("is-active");
  })()`);
  assert.deepEqual(planner.browser.errors(), []);
});
