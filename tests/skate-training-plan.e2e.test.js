const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  cardClip,
  expectedPostStreakTrainingPlanState,
  expectedPreSeasonTrainingPlanState,
  expectedSkateTrainingPlanScreenshot,
  expectedSkateTrainingPlanState,
  expectedSkateTrainingPlanVisual,
  prepareTrainingPlanScreenshot,
  trainingPlanState,
  trainingPlanVisualContract
} = require("./helpers/skate-training-plan-contract");

const TEST_DATE = "2026-09-14";
const SKATE_SETTINGS_KEY = "hivePlanner.skate.settings";

async function putPlannerValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function openSkate(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.getElementById("skateView").classList.contains("active") && document.querySelector("#skateCoachFlow .skate-plan-card") !== null');
}

async function capturePlanSignature(browser) {
  await browser.evaluate(prepareTrainingPlanScreenshot());
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  return browser.captureScreenshot(cardClip());
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate training plan preserves current-week content, live settings, and visual parity", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  await putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
    currentProgramDay: 15,
    extraRestDayOfWeek: null,
    intensityByDate: {},
    restDayOfWeek: 0
  });

  const pageUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const state = await planner.browser.evaluate(trainingPlanState());
    assert.deepEqual(state, expectedSkateTrainingPlanState());
    assert.equal(state.today.kicker, "Day 15");
    assert.equal(state.today.note, "Day 15 benchmark");
    assert.equal(state.week.kicker, "Week 3 / 21");
    assert.equal(state.week.rows.length, 7);
    assert.match(state.week.rows[0].className, /is-current/);
    assert.deepEqual(
      await planner.browser.evaluate(trainingPlanVisualContract()),
      expectedSkateTrainingPlanVisual(width < 500)
    );
    assertMatchesSignature(
      await capturePlanSignature(planner.browser),
      expectedSkateTrainingPlanScreenshot(width < 500),
      `${width}px Skate training plan`
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, pageUrl);
  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("skateCurrentDay");
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "30");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.blur();
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    return JSON.parse(data[SKATE_SETTINGS_KEY] || "{}").currentProgramDay === 30;
  });
  await planner.browser.waitForExpression(`(() => {
    return document.querySelector(".skate-plan-today .skate-plan-kicker").textContent.trim() === "Day 30"
      && document.querySelectorAll(".skate-plan-row.is-current").length === 1;
  })()`);
  const updated = await planner.browser.evaluate(trainingPlanState());
  assert.equal(updated.today.title, "Benchmark first, then shove-it.");
  assert.equal(updated.today.note, "Day 30 benchmark");
  assert.equal(updated.week.kicker, "Week 5 / 21");
  assert.equal(updated.week.rows.find((row) => row.className.includes("is-current")).label, "Day 30");

  await openSkate(planner.browser, pageUrl);
  const reloaded = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(reloaded, updated);

  // Before the season starts the card previews Day 1 with no week rows.
  await openSkate(planner.browser, `${planner.server.url}/?view=skateView&date=2026-08-28`);
  const preSeason = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(preSeason, expectedPreSeasonTrainingPlanState());
  assert.equal(preSeason.today.kicker, "Day 1");
  assert.equal(preSeason.week.description, "Previewing the program before Saturday, August 29, 2026.");
  assert.deepEqual(preSeason.week.rows, []);

  await putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
    currentProgramDay: 60,
    extraRestDayOfWeek: 6,
    intensityByDate: {},
    restDayOfWeek: 0
  });
  // The shipped manual progression keeps selecting Day 60 on a later date.
  await openSkate(planner.browser, `${planner.server.url}/?view=skateView&date=2026-11-16`);
  const postStreak = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(postStreak, expectedPostStreakTrainingPlanState());
  assert.equal(postStreak.today.kicker, "Day 60");
  assert.equal(postStreak.week.kicker, "Week 9 / 21");
  assert.equal(postStreak.week.rows.length, 4);
  assert.match(postStreak.week.description, /Rest days: Sunday and Saturday\./);
  assert.equal(postStreak.week.rows.at(-1).label, "Day 60");
  assert.match(postStreak.week.rows.at(-1).className, /is-current/);
  assert.deepEqual(planner.browser.errors(), []);
});
