const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  GOALS_PANEL_CLIP,
  LIFE_PANEL_CLIP,
  expectedLifePieScreenshot,
  expectedLifePieVisual,
  expectedMobileShell,
  expectedWeeklyGoalsScreenshot,
  expectedWeeklyGoalsVisual,
  lifePieVisualContract,
  weeklyGoalsVisualContract
} = require("./helpers/weekly-goals-contract");

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
const EXPECTED_LIFE_PIE_PERIODS = {
  Day: {
    ariaLabel: "Work 2h, Body 1h, Guitar 0.5h",
    breakdown: ["Transcendence57% · 2h", "Mobile Development0% · 0h", "Portfolio / Job Prep0% · 0h", "Skate29% · 1h", "Gym0% · 0h", "Guitar14% · 0.5h"],
    summary: ["Work57% · 2h", "Body29% · 1h", "Guitar14% · 0.5h"],
    total: "3.5h"
  },
  Week: {
    ariaLabel: "Work 2h, Body 1h, Guitar 0.5h",
    breakdown: ["Transcendence57% · 2h", "Mobile Development0% · 0h", "Portfolio / Job Prep0% · 0h", "Skate29% · 1h", "Gym0% · 0h", "Guitar14% · 0.5h"],
    summary: ["Work57% · 2h", "Body29% · 1h", "Guitar14% · 0.5h"],
    total: "3.5h"
  },
  Month: {
    ariaLabel: "Work 2h, Body 1h, Guitar 0.5h",
    breakdown: ["Transcendence57% · 2h", "Mobile Development0% · 0h", "Portfolio / Job Prep0% · 0h", "Skate29% · 1h", "Gym0% · 0h", "Guitar14% · 0.5h"],
    summary: ["Work57% · 2h", "Body29% · 1h", "Guitar14% · 0.5h"],
    total: "3.5h"
  },
  All: {
    ariaLabel: "Work 5h, Body 1h, Guitar 0.5h",
    breakdown: ["Transcendence31% · 2h", "Mobile Development0% · 0h", "Portfolio / Job Prep46% · 3h", "Skate15% · 1h", "Gym0% · 0h", "Guitar8% · 0.5h"],
    summary: ["Work77% · 5h", "Body15% · 1h", "Guitar8% · 0.5h"],
    total: "6.5h"
  }
};

const REACT_GOALS_READY = `document.documentElement.dataset.plannerReady === "true"
  && document.querySelectorAll("#weeklyGoals .weekly-goal-input").length === 3`;

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
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

async function selectLifePiePeriod(browser, label) {
  await browser.evaluate(`(() => {
    [...document.querySelectorAll("#statsPeriodTabs .period-button")]
      .find((button) => button.textContent.trim() === ${JSON.stringify(label)}).click();
  })()`);
}

function lifePiePeriodState() {
  return `(() => {
    const textRows = (selector) => [...document.querySelectorAll(selector)]
      .map((row) => row.textContent.trim());
    return {
      active: document.querySelector("#statsPeriodTabs .active").textContent.trim(),
      ariaLabel: document.getElementById("lifeDonut").getAttribute("aria-label"),
      breakdown: textRows("#lifeBreakdown .breakdown-row"),
      summary: textRows("#lifeSummary .pie-summary-row"),
      total: document.getElementById("lifeDonutLabel").textContent.trim()
    };
  })()`;
}

test("Direct React Dashboard preserves weekly goals and Life Pie behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putWeeklyGoals(planner.server.url);
  await putLifePieTasks(planner.server.url);
  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  assert.deepEqual(await planner.browser.evaluate(weeklyGoalsVisualContract()), expectedWeeklyGoalsVisual());
  assertMatchesSignature(
    await planner.browser.captureScreenshot(GOALS_PANEL_CLIP),
    expectedWeeklyGoalsScreenshot(),
    "desktop weekly goals screenshot"
  );
  assert.deepEqual(await planner.browser.evaluate(lifePieVisualContract()), expectedLifePieVisual(false));
  assertMatchesSignature(
    await planner.browser.captureScreenshot(LIFE_PANEL_CLIP),
    expectedLifePieScreenshot(false),
    "desktop Life Pie screenshot"
  );

  for (const label of ["Week", "Day", "Month", "All"]) {
    await selectLifePiePeriod(planner.browser, label);
    await planner.browser.waitForExpression(`document.querySelector("#statsPeriodTabs .active").textContent.trim() === ${JSON.stringify(label)}`);
    assert.deepEqual(await planner.browser.evaluate(lifePiePeriodState()), {
      active: label,
      ...EXPECTED_LIFE_PIE_PERIODS[label]
    });
  }

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
  assert.deepEqual(await planner.browser.evaluate(`(() => ({
    active: document.querySelector("#statsPeriodTabs .active").textContent.trim(),
    total: document.getElementById("lifeDonutLabel").textContent.trim()
  }))()`), { active: "Week", total: "5.5h" });

  // The edits above changed the stored hours, so restore the seeded totals the
  // pinned mobile contract was captured from.
  await putLifePieTasks(planner.server.url);
  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  await planner.browser.waitForExpression('document.getElementById("lifeDonutLabel").textContent === "3.5h"');
  assert.deepEqual(await planner.browser.evaluate(`(() => ({
    display: getComputedStyle(document.querySelector(".goals-card")).display,
    overflow: document.documentElement.scrollWidth > innerWidth
  }))()`), expectedMobileShell());
  await planner.browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(".life-card").scrollIntoView({ block: "start" });
  })()`);
  await planner.browser.waitForExpression('Math.abs(document.querySelector(".life-card").getBoundingClientRect().top) < 1');
  assert.deepEqual(await planner.browser.evaluate(lifePieVisualContract()), expectedLifePieVisual(true));
  assertMatchesSignature(
    await planner.browser.captureScreenshot(LIFE_PANEL_CLIP),
    expectedLifePieScreenshot(true),
    "mobile Life Pie screenshot"
  );
  assert.deepEqual(planner.browser.errors(), []);
});
