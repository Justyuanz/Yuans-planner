const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-13";
const JOURNAL_KEY = "hivePlanner.journal.entries";
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

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
    const items = [...panel.querySelectorAll(".state-trail-item")];
    const firstItem = items[0];
    return {
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      item: pick(firstItem),
      itemHead: pick(firstItem.querySelector(".state-trail-head")),
      itemGeometry: items.map((item) => {
        const itemRect = item.getBoundingClientRect();
        const headRect = item.querySelector(".state-trail-head").getBoundingClientRect();
        return {
          height: itemRect.height,
          width: itemRect.width,
          headHeight: headRect.height,
          headWidth: headRect.width
        };
      }),
      list: pick(documentRoot.getElementById("energyTrailList")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      pattern: { text: documentRoot.getElementById("energyPatternNote").textContent.trim(), visual: pick(documentRoot.getElementById("energyPatternNote")) }
    };
  })()`;
}

function assertPopulatedState(state, firstContext = "Early night.") {
  assert.equal(state.ariaLive, "polite");
  assert.equal(state.empty, "");
  assert.deepEqual(state.items, [
    { title: "Sat Sep 12", chips: "Energy Good · Focus Clear", context: firstContext, type: "button" },
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

function visualBox(overrides) {
  return {
    alignItems: "normal",
    background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "0px none rgb(23, 24, 32)",
    borderRadius: "0px",
    color: "rgb(23, 24, 32)",
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    height: 0,
    justifyContent: "normal",
    lineHeight: "23.2px",
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedEnergyTrailVisual(mobile) {
  const contentWidth = mobile ? 338 : 411;
  const headWidth = mobile ? 310 : 383;
  const itemGeometry = [70.1875, 70.1875, 46.09375, 46.09375, 46.09375, 46.09375, 70.1875]
    .map((height) => ({ height, width: contentWidth, headHeight: 20.09375, headWidth }));
  return {
    heading: {
      text: "Energy trail",
      visual: visualBox({
        fontSize: mobile ? "20px" : "26.4px",
        fontWeight: "570",
        height: mobile ? 23.1875 : 30.625,
        lineHeight: mobile ? "23.2px" : "30.624px",
        width: contentWidth
      })
    },
    item: visualBox({
      background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.72)",
      borderRadius: "16px",
      color: "rgb(60, 60, 68)",
      display: "grid",
      gap: "6px",
      height: 70.1875,
      padding: "12px 13px",
      width: contentWidth
    }),
    itemHead: visualBox({
      alignItems: "baseline",
      border: "0px none rgb(60, 60, 68)",
      color: "rgb(60, 60, 68)",
      display: "flex",
      gap: "8px",
      height: 20.09375,
      justifyContent: "space-between",
      width: headWidth
    }),
    itemGeometry,
    list: visualBox({
      display: "grid",
      gap: "10px",
      height: 454.9375,
      width: contentWidth
    }),
    note: {
      text: "Recent check-ins so shutdown days stop disappearing into blur.",
      visual: visualBox({
        border: "0px none rgb(118, 118, 129)",
        color: "rgb(118, 118, 129)",
        fontWeight: "450",
        height: 46.375,
        width: contentWidth
      })
    },
    panel: visualBox({
      background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      height: mobile ? 608.5625 : 632,
      width: mobile ? 370 : 459
    }),
    pattern: {
      text: "Low-energy check-ins have recently followed evenings averaging 3h, compared with 1h before steadier days.",
      visual: visualBox({
        border: "0px none rgb(95, 91, 102)",
        color: "rgb(95, 91, 102)",
        fontSize: "13.12px",
        height: 38.0625,
        lineHeight: "19.024px",
        width: contentWidth
      })
    }
  };
}

test("Energy trail preserves history, pattern, navigation, and its visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const pageUrl = `${planner.server.url}/?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression('Boolean(document.querySelector("#energyTrailList .pattern-history-empty"))');
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
  assert.deepEqual(
    await planner.browser.evaluate(energyTrailVisualContract("document")),
    expectedEnergyTrailVisual(false)
  );

  await planner.browser.evaluate('document.querySelector("#energyTrailList .state-trail-item").click()');
  await planner.browser.waitForExpression('document.getElementById("journalView").classList.contains("active")');
  assert.deepEqual(await planner.browser.evaluate(`({
    date: document.getElementById("journalDate").value,
    title: document.getElementById("journalTitle").value,
    view: document.querySelector(".view.active").id
  })`), { date: "2026-09-12", title: "", view: "journalView" });

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
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(
    'document.querySelector("#energyTrailList .state-trail-context").textContent === "Updated from Journal."'
  );

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#energyTrailList .state-trail-item").length === 7');
  const mobileState = await planner.browser.evaluate(energyTrailState("document"));
  assertPopulatedState(mobileState, "Updated from Journal.");
  assert.deepEqual(
    await planner.browser.evaluate(energyTrailVisualContract("document")),
    expectedEnergyTrailVisual(true)
  );
  assert.deepEqual(planner.browser.errors(), []);
});
