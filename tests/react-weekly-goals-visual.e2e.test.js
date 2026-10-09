const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-13";
const WEEKLY_GOALS = {
  study: "Finish the React boundary",
  body: "Take a recovery walk",
  mind: "Practice one song",
  futureTrack: { preserve: true }
};
const LIFE_PIE_TASKS = [
  { id: "visual-study", label: "Visual study", activity: "cpp", hours: 2, done: false },
  { id: "visual-body", label: "Visual body", activity: "skate", hours: 1, done: true },
  { id: "visual-mind", label: "Visual mind", activity: "guitar", hours: 0.5, done: true }
];
const OLDER_LIFE_PIE_TASKS = [
  { id: "visual-older", label: "Older study", activity: "lc", hours: 3, done: true }
];

const LEGACY_GOALS_READY = `document.querySelectorAll("#weeklyGoals .weekly-goal-input").length === 3`;
const REACT_GOALS_READY = `document.documentElement.dataset.plannerReady === "true"
  && document.querySelectorAll("#weeklyGoals .weekly-goal-input").length === 3`;

const LEGACY_PANEL_CLIP = `(() => {
  const rect = document.querySelector(".goals-card").getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
})()`;

const LEGACY_LIFE_PANEL_CLIP = `(() => {
  const rect = document.querySelector(".life-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

function visualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const panel = documentRoot.querySelector(".goals-card");
    const list = documentRoot.getElementById("weeklyGoals");
    const firstCard = list.querySelector(".weekly-goal-card");
    const firstInput = list.querySelector(".weekly-goal-input");
    const heading = panel.querySelector("h2");
    const note = panel.querySelector(".small-note");
    const pick = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      cards: [...list.querySelectorAll(".weekly-goal-card")].map((card) => ({
        label: card.querySelector(".weekly-goal-track").textContent.trim(),
        value: card.querySelector(".weekly-goal-input").value
      })),
      heading: { text: heading.textContent.trim(), visual: pick(heading) },
      input: pick(firstInput),
      list: pick(list),
      note: { text: note.textContent.trim(), visual: pick(note) },
      panel: pick(panel),
      card: pick(firstCard)
    };
  })()`;
}

function lifePieVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".life-card");
    const heading = panel.querySelector("h3");
    const donut = documentRoot.getElementById("lifeDonut");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        alignItems: style.alignItems,
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    const rows = (selector) => [...documentRoot.querySelectorAll(selector)].map((row) => ({
      text: row.textContent.trim(),
      visual: pick(row)
    }));
    return {
      breakdown: rows("#lifeBreakdown .breakdown-row"),
      donut: {
        ariaLabel: donut.getAttribute("aria-label"),
        text: donut.textContent.trim(),
        visual: pick(donut)
      },
      heading: { text: heading.textContent.trim(), visual: pick(heading) },
      lifePie: pick(panel.querySelector(".life-pie")),
      panel: pick(panel),
      periods: rows("#statsPeriodTabs .period-button"),
      summary: rows("#lifeSummary .pie-summary-row")
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function putWeeklyGoals(serverUrl) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: "hivePlanner.weeklyGoals",
      value: JSON.stringify(WEEKLY_GOALS)
    })
  });
  assert.equal(response.ok, true);
}

async function putLifePieTasks(serverUrl) {
  const values = [
    [`hivePlanner.dailyTasks.${TEST_DATE}`, LIFE_PIE_TASKS],
    ["hivePlanner.dailyTasks.2026-08-20", OLDER_LIFE_PIE_TASKS]
  ];
  await Promise.all(values.map(async function ([key, tasks]) {
    const response = await fetch(`${serverUrl}/api/kv`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify(tasks) })
    });
    assert.equal(response.ok, true);
  }));
}

test("Direct React Dashboard preserves weekly goals and Life Pie behavior", { timeout: 60_000 }, async function (context) {
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
  await putWeeklyGoals(planner.server.url);
  await putLifePieTasks(planner.server.url);

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(LEGACY_GOALS_READY);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  const legacyDesktop = await planner.browser.evaluate(visualContract("document"));
  const legacyScreenshot = await planner.browser.captureScreenshot(LEGACY_PANEL_CLIP);
  const legacyLifeDesktop = await planner.browser.evaluate(lifePieVisualContract("document"));
  const legacyLifeScreenshot = await planner.browser.captureScreenshot(LEGACY_LIFE_PANEL_CLIP);

  await planner.browser.open(`${preview.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  const reactDesktop = await planner.browser.evaluate(visualContract("document"));
  const reactScreenshot = await planner.browser.captureScreenshot(LEGACY_PANEL_CLIP);
  const reactLifeDesktop = await planner.browser.evaluate(lifePieVisualContract("document"));
  const reactLifeScreenshot = await planner.browser.captureScreenshot(LEGACY_LIFE_PANEL_CLIP);

  assert.deepEqual(reactDesktop, legacyDesktop);
  assertSameScreenshot(reactScreenshot, legacyScreenshot, "desktop weekly goals screenshot");
  assert.deepEqual(reactLifeDesktop, legacyLifeDesktop);
  assertSameScreenshot(reactLifeScreenshot, legacyLifeScreenshot, "desktop Life Pie screenshot");

  await planner.browser.evaluate(`(() => {
    [...document.querySelectorAll("#statsPeriodTabs .period-button")]
      .find((button) => button.textContent.trim() === "All").click();
  })()`);
  await planner.browser.waitForExpression(`document.querySelector("#statsPeriodTabs .active").textContent.trim() === "All"`);
  const periodState = await planner.browser.evaluate(`(() => {
    return {
      active: document.querySelector("#statsPeriodTabs .active").textContent.trim(),
      total: document.getElementById("lifeDonutLabel").textContent.trim()
    };
  })()`);
  assert.deepEqual(periodState, { active: "All", total: "6.5h" });

  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("task-hours-visual-study");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    valueSetter.call(input, "4");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression(`document.getElementById("lifeDonutLabel").textContent === "8.5h"`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const tasks = JSON.parse(stored[`hivePlanner.dailyTasks.${TEST_DATE}`] || "[]");
    return tasks.some((task) => task.id === "visual-study" && task.hours === 4);
  });

  const editState = await planner.browser.evaluate(`(() => {
    const input = document.querySelector(".weekly-goal-input");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    valueSetter.call(input, "  Ship the parity test  ");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    return { maxLength: input.maxLength, readOnly: input.readOnly };
  })()`);
  assert.deepEqual(editState, { maxLength: 120, readOnly: false });
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const goals = JSON.parse(stored["hivePlanner.weeklyGoals"] || "{}");
    return goals.study === "Ship the parity test" && goals.futureTrack.preserve === true;
  });
  await planner.browser.reload();
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  const reloadedValue = await planner.browser.evaluate(`document.querySelector(".weekly-goal-input").value`);
  assert.equal(reloadedValue, "Ship the parity test");

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(LEGACY_GOALS_READY);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  const legacyMobile = await planner.browser.evaluate(`(() => ({
    display: getComputedStyle(document.querySelector(".goals-card")).display,
    overflow: document.documentElement.scrollWidth > innerWidth
  }))()`);
  await planner.browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(".life-card").scrollIntoView({ block: "start" });
  })()`);
  await planner.browser.waitForExpression('Math.abs(document.querySelector(".life-card").getBoundingClientRect().top) < 1');
  const legacyLifeMobile = await planner.browser.evaluate(lifePieVisualContract("document"));
  const legacyLifeMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_LIFE_PANEL_CLIP);

  await planner.browser.open(`${preview.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  const reactMobile = await planner.browser.evaluate(`(() => {
    return {
      display: getComputedStyle(document.querySelector(".goals-card")).display,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  })()`);
  await planner.browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(".life-card").scrollIntoView({ block: "start" });
  })()`);
  await planner.browser.waitForExpression(`Math.abs(document.querySelector(".life-card").getBoundingClientRect().top) < 1`);
  const reactLifeMobile = await planner.browser.evaluate(lifePieVisualContract("document"));
  const reactLifeMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_LIFE_PANEL_CLIP);

  assert.deepEqual(reactMobile, legacyMobile);
  assert.deepEqual(reactMobile, { display: "none", overflow: false });
  assert.deepEqual(reactLifeMobile, legacyLifeMobile);
  assertSameScreenshot(reactLifeMobileScreenshot, legacyLifeMobileScreenshot, "mobile Life Pie screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
