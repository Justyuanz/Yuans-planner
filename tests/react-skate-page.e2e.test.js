const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const SETTINGS_KEY = "hivePlanner.skate.settings";
const SESSIONS_KEY = "hivePlanner.skate.sessions";

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedSkate(serverUrl) {
  await putValue(serverUrl, SETTINGS_KEY, {
    currentProgramDay: 15,
    extraRestDayOfWeek: null,
    intensityByDate: { [TEST_DATE]: "yellow" },
    restDayOfWeek: 0
  });
  await putValue(serverUrl, SESSIONS_KEY, [{
    dateKey: TEST_DATE,
    durationHours: 0.5,
    finishedAt: "2026-09-14T12:00:00.000Z",
    intensity: "green",
    mainFocus: "Baseline"
  }]);
  await putValue(serverUrl, "hivePlanner.physical.logs", [{
    createdAt: "2026-09-14T13:00:00.000Z",
    date: TEST_DATE,
    id: "body-1",
    kind: "gym",
    minutes: 30,
    name: "Gym",
    note: "Legs",
    status: "done"
  }]);
}

async function openReady(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression(`document.getElementById("skateCurrentDay")?.value === "15"`);
  await browser.waitForExpression('document.querySelectorAll("#skateCoachFlow .skate-plan-row").length === 7');
}

function pageState() {
  return `(() => {
    const text = (id) => document.getElementById(id)?.textContent.trim();
    return {
      activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
      activeView: document.querySelector(".view.active")?.id,
      bodyMetrics: [...document.querySelectorAll("#skateWeeklyMetrics .body-support-chip")]
        .map((chip) => chip.textContent.trim()),
      cards: document.querySelectorAll(".skate-page > .panel").length,
      currentDay: document.getElementById("skateCurrentDay")?.value,
      hero: {
        boardHours: text("skateBoardHours"),
        dayCount: text("skateDayCount"),
        intensity: document.querySelector("#skateIntensityToggle .active")?.dataset.intensity,
        phase: text("skatePhaseBadge"),
        sessionDays: text("skateSessionDaysCount"),
        subtitle: text("skateHeroSubtitle")
      },
      iframeCount: document.querySelectorAll("iframe").length,
      roadmapDays: document.querySelectorAll("#skateTrendCharts .skate-roadmap-day").length,
      roadmapLogged: document.querySelectorAll("#skateTrendCharts .skate-roadmap-day:not(.intensity-empty)").length,
      trainingDay: document.querySelector(".skate-plan-today .skate-plan-kicker")?.textContent.trim(),
      trainingRows: document.querySelectorAll("#skateCoachFlow .skate-plan-row").length
    };
  })()`;
}

function pageGeometry() {
  return `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      body: rect(".body-log-card"),
      hero: rect(".skate-hero-card"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      page: rect(".skate-page"),
      roadmap: rect(".skate-trends-card"),
      training: rect(".skate-session-card")
    };
  })()`;
}

async function prepareScreenshot(browser) {
  await browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const mascot = document.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    document.querySelector(".skate-hero-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

function heroClip() {
  return `(() => {
    const rect = document.querySelector(".skate-hero-card").getBoundingClientRect();
    return {
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: Math.min(rect.height, innerHeight)
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function setField(browser, id, value, eventName = "change") {
  await browser.evaluate(`(() => {
    const field = document.getElementById(${JSON.stringify(id)});
    const prototype = field instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true }));
  })()`);
}

test("Skate is a direct React page with complete legacy parity and persistence", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run direct Skate tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await seedSkate(planner.server.url);

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=skateView&date=${TEST_DATE}`;
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openReady(planner.browser, legacyUrl);
    const legacyState = await planner.browser.evaluate(pageState());
    const legacyGeometry = await planner.browser.evaluate(pageGeometry());
    await prepareScreenshot(planner.browser);
    const legacyScreenshot = await planner.browser.captureScreenshot(heroClip());

    await openReady(planner.browser, previewUrl);
    const reactState = await planner.browser.evaluate(pageState());
    const reactGeometry = await planner.browser.evaluate(pageGeometry());
    await prepareScreenshot(planner.browser);
    const reactScreenshot = await planner.browser.captureScreenshot(heroClip());

    assert.deepEqual(reactState, legacyState);
    assert.equal(reactState.iframeCount, 0);
    assert.equal(reactState.cards, 4);
    assert.deepEqual(reactGeometry, legacyGeometry);
    assert.equal(reactGeometry.overflow, false);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px direct Skate hero`);
  }

  await planner.browser.setViewport(1280, 900);
  await openReady(planner.browser, previewUrl);
  await setField(planner.browser, "skateRestDay", "2");
  await setField(planner.browser, "skateExtraRestDay", "4");
  await planner.browser.evaluate('document.querySelector("#skateIntensityToggle [data-intensity=green]").click()');
  await planner.browser.evaluate('document.getElementById("skateCurrentDay").focus()');
  await setField(planner.browser, "skateCurrentDay", "30", "input");
  await planner.browser.evaluate('document.getElementById("skateCurrentDay").blur()');
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const settings = JSON.parse(data[SETTINGS_KEY] || "{}");
    return settings.currentProgramDay === 30
      && settings.extraRestDayOfWeek === 4
      && settings.intensityByDate?.[TEST_DATE] === "green"
      && settings.restDayOfWeek === 2;
  });
  await planner.browser.waitForExpression(`document.getElementById("skateCurrentDay").value === "30"`);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector(".skate-plan-today .skate-plan-kicker").textContent.trim()'
  ), "Day 30");

  await planner.browser.evaluate('document.getElementById("startSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("finishSkateSession").disabled === false');
  await planner.browser.evaluate('document.getElementById("finishSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');

  await planner.browser.evaluate('document.getElementById("logSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  await setField(planner.browser, "skateDurationMinutes", "30", "input");
  await setField(planner.browser, "skateImprovedNote", "Direct route save", "input");
  await planner.browser.evaluate('document.getElementById("skateFeedbackForm").requestSubmit()');
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    return JSON.parse(data[SESSIONS_KEY] || "[]").length === 2;
  });
  await planner.browser.waitForExpression('document.getElementById("skateBoardHours").textContent.trim() === "1h"');
  assert.equal(await planner.browser.evaluate(
    'document.querySelectorAll("#skateTrendCharts .skate-roadmap-day:not(.intensity-empty)").length'
  ), 1);

  await setField(planner.browser, "bodyWorkoutType", "yoga");
  await setField(planner.browser, "bodyWorkoutMinutes", "20", "input");
  await setField(planner.browser, "bodyWorkoutName", "Mobility", "input");
  await planner.browser.evaluate('document.getElementById("bodyLogForm").requestSubmit()');
  await planner.browser.waitForExpression(
    '[...document.querySelectorAll("#skateWeeklyMetrics .body-support-chip strong")].some((item) => item.textContent === "Yoga")'
  );

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.getElementById("skateCurrentDay")?.value === "30"');
  assert.deepEqual(await planner.browser.evaluate(`({
    currentDay: document.getElementById("skateCurrentDay").value,
    finishDisabled: document.getElementById("finishSkateSession").disabled,
    iframeCount: document.querySelectorAll("iframe").length,
    intensity: document.querySelector("#skateIntensityToggle .active").dataset.intensity,
    startDisabled: document.getElementById("startSkateSession").disabled
  })`), {
    currentDay: "30",
    finishDisabled: true,
    iframeCount: 0,
    intensity: "green",
    startDisabled: false
  });

  await planner.browser.evaluate('document.querySelector("[data-view-target=todayView]").click()');
  await planner.browser.waitForExpression('location.search.includes("view=todayView")');
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  assert.equal(await planner.browser.evaluate('document.querySelectorAll("iframe").length'), 0);
  assert.deepEqual(planner.browser.errors(), []);
});
