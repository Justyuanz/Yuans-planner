const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-13";

const TASKS_BY_DATE = {
  "2026-08-20": [
    { id: "older-study", label: "Older study", activity: "lc", hours: 3, done: true }
  ],
  "2026-09-12": [
    { id: "week-python", label: "Python block", activity: "python", hours: 1, done: true },
    { id: "week-body", label: "Gym block", activity: "p90x3", hours: 2, done: true }
  ],
  "2026-09-13": [
    { id: "day-lc", label: "Leetcode block", activity: "lc", hours: 1, done: true },
    { id: "day-coding", label: "Coding block", activity: "cpp", hours: 2, done: false },
    { id: "day-skate", label: "Skate block", activity: "skate", hours: 1, done: true },
    { id: "day-guitar", label: "Guitar block", activity: "guitar", hours: 0.5, done: true },
    { id: "day-other", label: "Excluded block", activity: "other", hours: 10, done: true }
  ]
};

const EXPECTED_PERIODS = {
  Day: {
    ariaLabel: "Work 3h, Body 1h, Guitar 0.5h",
    breakdown: ["Transcendence44% · 2h", "Mobile Development0% · 0h", "Portfolio / Job Prep22% · 1h", "Skate22% · 1h", "Gym0% · 0h", "Guitar11% · 0.5h"],
    summary: ["Work67% · 3h", "Body22% · 1h", "Guitar11% · 0.5h"],
    total: "4.5h"
  },
  Week: {
    ariaLabel: "Work 4h, Body 3h, Guitar 0.5h",
    breakdown: ["Transcendence27% · 2h", "Mobile Development13% · 1h", "Portfolio / Job Prep13% · 1h", "Skate13% · 1h", "Gym27% · 2h", "Guitar7% · 0.5h"],
    summary: ["Work53% · 4h", "Body40% · 3h", "Guitar7% · 0.5h"],
    total: "7.5h"
  },
  Month: {
    ariaLabel: "Work 4h, Body 3h, Guitar 0.5h",
    breakdown: ["Transcendence27% · 2h", "Mobile Development13% · 1h", "Portfolio / Job Prep13% · 1h", "Skate13% · 1h", "Gym27% · 2h", "Guitar7% · 0.5h"],
    summary: ["Work53% · 4h", "Body40% · 3h", "Guitar7% · 0.5h"],
    total: "7.5h"
  },
  All: {
    ariaLabel: "Work 7h, Body 3h, Guitar 0.5h",
    breakdown: ["Transcendence19% · 2h", "Mobile Development10% · 1h", "Portfolio / Job Prep38% · 4h", "Skate10% · 1h", "Gym19% · 2h", "Guitar5% · 0.5h"],
    summary: ["Work67% · 7h", "Body29% · 3h", "Guitar5% · 0.5h"],
    total: "10.5h"
  }
};

async function putPlannerValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedTasks(serverUrl) {
  await Promise.all(Object.entries(TASKS_BY_DATE).map(function ([date, tasks]) {
    return putPlannerValue(serverUrl, `hivePlanner.dailyTasks.${date}`, tasks);
  }));
}

function readLifePie(browser) {
  return browser.evaluate(`(() => {
    const donut = document.getElementById("lifeDonut");
    const textRows = (selector) => [...document.querySelectorAll(selector)].map((row) => row.textContent.trim());
    return {
      activePeriod: document.querySelector("#statsPeriodTabs .active")?.textContent.trim(),
      ariaLabel: donut.getAttribute("aria-label"),
      backgroundColor: getComputedStyle(donut).backgroundColor,
      backgroundImage: getComputedStyle(donut).backgroundImage,
      breakdown: textRows("#lifeBreakdown .breakdown-row"),
      periodLabels: textRows("#statsPeriodTabs .period-button"),
      summary: textRows("#lifeSummary .pie-summary-row"),
      total: document.getElementById("lifeDonutLabel").textContent.trim()
    };
  })()`);
}

async function selectPeriod(browser, label) {
  await browser.evaluate(`(() => {
    const button = [...document.querySelectorAll("#statsPeriodTabs .period-button")]
      .find((candidate) => candidate.textContent.trim() === ${JSON.stringify(label)});
    button.click();
  })()`);
}

test("legacy Life Pie preserves empty, period, grouping, and reload behavior", { timeout: 30_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.querySelectorAll("#lifeBreakdown .breakdown-row").length === 6');

  const empty = await readLifePie(planner.browser);
  assert.deepEqual(empty.periodLabels, ["Day", "Week", "Month", "All"]);
  assert.equal(empty.activePeriod, "Week");
  assert.equal(empty.total, "0h");
  assert.equal(empty.ariaLabel, "Work 0h, Body 0h, Guitar 0h");
  assert.deepEqual(empty.summary, ["Work0% · 0h", "Body0% · 0h", "Guitar0% · 0h"]);
  assert.equal(empty.backgroundColor, "rgb(239, 237, 242)");
  assert.equal(empty.backgroundImage, "none");

  await seedTasks(planner.server.url);
  await planner.browser.reload();
  await planner.browser.waitForExpression('document.getElementById("lifeDonutLabel").textContent === "7.5h"');

  for (const label of ["Week", "Day", "Month", "All"]) {
    await selectPeriod(planner.browser, label);
    const state = await readLifePie(planner.browser);
    assert.equal(state.activePeriod, label);
    assert.equal(state.total, EXPECTED_PERIODS[label].total);
    assert.equal(state.ariaLabel, EXPECTED_PERIODS[label].ariaLabel);
    assert.deepEqual(state.summary, EXPECTED_PERIODS[label].summary);
    assert.deepEqual(state.breakdown, EXPECTED_PERIODS[label].breakdown);
    assert.match(state.backgroundImage, /^conic-gradient\(/);
  }

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.querySelector("#statsPeriodTabs .active")?.textContent === "Week"');
  assert.equal((await readLifePie(planner.browser)).total, "7.5h");
  assert.deepEqual(planner.browser.errors(), []);
});
