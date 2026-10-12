const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-14";
const DAY_STATE_KEY = "hivePlanner.dayState";
const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

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
      firstMascotPrompt: documentRoot.querySelector(".mascot-quick-asks .mascot-quick-ask")?.textContent.trim() || ""
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

const DEFAULT_OPTIONS = [
  { id: "good", label: "Good", active: false },
  { id: "okay", label: "Steady", active: true },
  { id: "tired", label: "Tired", active: false },
  { id: "overwhelmed", label: "Heavy", active: false },
  { id: "low-focus", label: "Scattered", active: false }
];

function expectedDayStateVisual(stripWidth, stripHeight, optionsWidth, optionsHeight) {
  const sharedText = {
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    lineHeight: "23.2px"
  };
  const chip = {
    alignItems: "normal",
    background: "rgba(236, 235, 255, 0.9) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(113, 107, 255, 0.22)",
    borderRadius: "999px",
    color: "rgb(113, 107, 255)",
    display: "block",
    flexWrap: "nowrap",
    fontFamily: FONT_FAMILY,
    fontSize: "12.16px",
    fontWeight: "580",
    gap: "normal",
    height: 30,
    lineHeight: "17.632px",
    margin: "0px",
    minHeight: "30px",
    padding: "5px 10px",
    width: 53.953125
  };
  return {
    strip: {
      alignItems: "normal",
      background: "rgba(255, 255, 255, 0.46) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.68)",
      borderRadius: "16px",
      color: "rgb(23, 24, 32)",
      display: "grid",
      flexWrap: "nowrap",
      ...sharedText,
      gap: "8px",
      height: stripHeight,
      margin: "12px 0px 14px",
      minHeight: "0px",
      padding: "12px 14px",
      width: stripWidth
    },
    label: {
      alignItems: "normal",
      background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(95, 91, 102)",
      borderRadius: "0px",
      color: "rgb(95, 91, 102)",
      display: "block",
      flexWrap: "nowrap",
      fontFamily: FONT_FAMILY,
      fontSize: "12.8px",
      fontWeight: "700",
      gap: "normal",
      height: 18.546875,
      lineHeight: "18.56px",
      margin: "0px",
      minHeight: "auto",
      padding: "0px",
      width: optionsWidth
    },
    options: {
      alignItems: "normal",
      background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(23, 24, 32)",
      borderRadius: "0px",
      color: "rgb(23, 24, 32)",
      display: "flex",
      flexWrap: "wrap",
      ...sharedText,
      gap: "8px",
      height: optionsHeight,
      margin: "0px",
      minHeight: "auto",
      padding: "0px",
      width: optionsWidth
    },
    chip,
    activeChip: chip
  };
}

test("day state preserves defaults, storage, audit logging, side effects, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
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
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
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
    await planner.browser.evaluate('document.querySelector(".mascot-quick-asks .mascot-quick-ask").textContent.trim()'),
    "What should I use my good energy on today?"
  );

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.querySelector("#dayStateOptions [data-day-state=good]").classList.contains("is-active")'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("day state preserves its desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, DAY_STATE_KEY, { [TEST_DATE]: "good" });

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(dayState()), {
    label: "How does today feel?",
    options: [
      { id: "good", label: "Good", active: true },
      { id: "okay", label: "Steady", active: false },
      { id: "tired", label: "Tired", active: false },
      { id: "overwhelmed", label: "Heavy", active: false },
      { id: "low-focus", label: "Scattered", active: false }
    ],
    firstMascotPrompt: "What should I use my good energy on today?"
  });
  assert.deepEqual(
    await planner.browser.evaluate(dayStateVisualContract()),
    expectedDayStateVisual(892, 82.546875, 862, 30)
  );

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(
    await planner.browser.evaluate(dayStateVisualContract()),
    expectedDayStateVisual(338, 120.546875, 308, 68)
  );

  await planner.browser.evaluate(`(() => {
    window.YuanPlannerDayStateBridge = Object.freeze({
      select() {
        throw new Error("React day state must not use the legacy write bridge");
      }
    });
  })()`);
  await planner.browser.evaluate(
    `document.querySelector("#dayStateOptions [data-day-state=tired]").click()`
  );
  const stored = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const states = JSON.parse(data[DAY_STATE_KEY] || "{}");
    const entries = JSON.parse(data[ACTIVITY_LOG_KEY] || "[]");
    const hasAuditEntry = entries.some((entry) => entry.action === "day_state_updated");
    return states[TEST_DATE] === "tired" && hasAuditEntry ? { entries, states } : null;
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
    return document.querySelector("#dayStateOptions [data-day-state=tired]").classList.contains("is-active")
      && document.querySelector(".mascot-quick-asks .mascot-quick-ask").textContent.trim()
        === "I'm tired. Can you cut today down?";
  })()`);

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    return document.querySelector("#dayStateOptions [data-day-state=tired]")?.classList.contains("is-active");
  })()`);
  assert.deepEqual(planner.browser.errors(), []);
});
