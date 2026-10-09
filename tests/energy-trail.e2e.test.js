const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-13";
const JOURNAL_KEY = "hivePlanner.journal.entries";

const JOURNAL_ENTRIES = [
  { id: "ignored", date: "2026-09-13", content: "No valid tracker", tracker: { energy: "wired" } },
  { id: "good", date: "2026-09-12", tracker: { energy: "good", focus: "clear", context: "Early night." } },
  { id: "empty", date: "2026-09-11", tracker: { energy: "empty", focus: "foggy", context: "Late class." } },
  { id: "low", date: "2026-09-10", tracker: { energy: "low" } },
  { id: "okay", date: "2026-09-09", tracker: { energy: "okay", focus: "steady" } },
  { id: "strong", date: "2026-09-08", tracker: { energy: "strong" } },
  { id: "focus", date: "2026-09-07", tracker: { focus: "wavy" } },
  { id: "context", date: "2026-09-06", tracker: { context: "Travel day." } },
  { id: "trimmed", date: "2026-09-05", tracker: { energy: "good" } }
];

const TASKS_BY_DATE = {
  "2026-09-09": [
    { id: "evening-before-low", label: "19:00 Study", activity: "cpp", hours: 2, done: true }
  ],
  "2026-09-10": [
    { id: "evening-before-empty", label: "20:00 Study", activity: "cpp", hours: 4, done: true }
  ],
  "2026-09-11": [
    { id: "evening-before-good", label: "18:30 Guitar", activity: "guitar", hours: 1, done: true }
  ]
};

async function putPlannerValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedEnergyTrail(serverUrl) {
  await Promise.all([
    putPlannerValue(serverUrl, JOURNAL_KEY, JOURNAL_ENTRIES),
    ...Object.entries(TASKS_BY_DATE).map(([date, tasks]) =>
      putPlannerValue(serverUrl, `hivePlanner.dailyTasks.${date}`, tasks))
  ]);
}

function energyTrailState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      ariaLive: documentRoot.getElementById("energyTrailList").getAttribute("aria-live"),
      empty: documentRoot.querySelector("#energyTrailList .pattern-history-empty")?.textContent.trim() || "",
      items: [...documentRoot.querySelectorAll("#energyTrailList .state-trail-item")].map((item) => ({
        chips: item.querySelector(".state-trail-chips").textContent.trim(),
        context: item.querySelector(".state-trail-context")?.textContent.trim() || "",
        title: item.querySelector("strong").textContent.trim(),
        type: item.getAttribute("type")
      })),
      pattern: documentRoot.getElementById("energyPatternNote").textContent.trim()
    };
  })()`;
}

function energyTrailVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".state-history-card");
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
        height: rect.height,
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      items: [...panel.querySelectorAll(".state-trail-item")].map((item) => ({
        text: item.textContent.trim(),
        visual: pick(item),
        head: pick(item.querySelector(".state-trail-head"))
      })),
      list: pick(documentRoot.getElementById("energyTrailList")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      pattern: { text: documentRoot.getElementById("energyPatternNote").textContent.trim(), visual: pick(documentRoot.getElementById("energyPatternNote")) },
      state: ${energyTrailState(documentExpression)}
    };
  })()`;
}

const LEGACY_CLIP = `(() => {
  const rect = document.querySelector(".state-history-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

async function scrollToEnergyTrail(browser, documentExpression) {
  await browser.waitForExpression(
    `(${documentExpression}).documentElement.dataset.plannerReady === "true"`
  );
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const card = documentRoot.querySelector(".state-history-card");
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    card.scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".state-history-card").getBoundingClientRect();
    return rect.top < documentRoot.defaultView.innerHeight && rect.bottom > 0;
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

function assertPopulatedState(state) {
  assert.equal(state.ariaLive, "polite");
  assert.equal(state.empty, "");
  assert.deepEqual(state.items, [
    { title: "Sat Sep 12", chips: "Energy Good · Focus Clear", context: "Early night.", type: "button" },
    { title: "Fri Sep 11", chips: "Energy Empty · Focus Foggy", context: "Late class.", type: "button" },
    { title: "Thu Sep 10", chips: "Energy Low", context: "", type: "button" },
    { title: "Wed Sep 9", chips: "Energy Okay · Focus Steady", context: "", type: "button" },
    { title: "Tue Sep 8", chips: "Energy Strong", context: "", type: "button" },
    { title: "Mon Sep 7", chips: "Focus Wavy", context: "", type: "button" },
    { title: "Sun Sep 6", chips: "Check-in saved", context: "Travel day.", type: "button" }
  ]);
  assert.equal(
    state.pattern,
    "Low-energy check-ins have recently followed evenings averaging 3h, compared with 1h before steadier days."
  );
}

test("Energy trail preserves history, pattern, navigation, and visual parity", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  const legacyUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=todayView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(legacyUrl);
  await planner.browser.waitForExpression('document.querySelector("#energyTrailList .pattern-history-empty")');
  assert.deepEqual(await planner.browser.evaluate(energyTrailState("document")), {
    ariaLive: "polite",
    empty: "Start with one tiny check-in. Your recent energy trail will show up here.",
    items: [],
    pattern: "Once a few rough days are logged, this will compare what tended to come before them."
  });

  await seedEnergyTrail(planner.server.url);
  await planner.browser.reload();
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  assertPopulatedState(await planner.browser.evaluate(energyTrailState("document")));

  await planner.browser.evaluate('document.querySelector("#energyTrailList .state-trail-item").click()');
  await planner.browser.waitForExpression('document.getElementById("journalView").classList.contains("active")');
  assert.deepEqual(await planner.browser.evaluate(`({
    date: document.getElementById("journalDate").value,
    title: document.getElementById("journalTitle").value,
    view: document.querySelector(".view.active").id
  })`), { date: "2026-09-12", title: "", view: "journalView" });

  await planner.browser.open(legacyUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  await scrollToEnergyTrail(planner.browser, "document");
  const legacyDesktop = await planner.browser.evaluate(energyTrailVisualContract("document"));
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

  await planner.browser.open(previewUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  await scrollToEnergyTrail(planner.browser, "document");
  const previewDesktop = await planner.browser.evaluate(energyTrailVisualContract("document"));
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Energy trail screenshot");

  await planner.browser.evaluate('document.querySelector("#energyTrailList .state-trail-item").click()');
  await planner.browser.waitForExpression('document.getElementById("journalView")?.classList.contains("active")');
  assert.equal(await planner.browser.evaluate('document.getElementById("journalDate").value'), "2026-09-12");

  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("journalStateContext");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Updated from Journal.");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const entries = JSON.parse(stored[JOURNAL_KEY] || "[]");
    return entries.some((entry) => entry.id === "good" && entry.tracker?.context === "Updated from Journal.");
  });
  await planner.browser.open(previewUrl);
  await planner.browser.waitForExpression(
    'document.querySelector("#energyTrailList .state-trail-context").textContent === "Updated from Journal."'
  );

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(legacyUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  await scrollToEnergyTrail(planner.browser, "document");
  const legacyMobile = await planner.browser.evaluate(energyTrailVisualContract("document"));
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

  await planner.browser.open(previewUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  await scrollToEnergyTrail(planner.browser, "document");
  const previewMobile = await planner.browser.evaluate(energyTrailVisualContract("document"));
  const previewMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 370);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Energy trail screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
