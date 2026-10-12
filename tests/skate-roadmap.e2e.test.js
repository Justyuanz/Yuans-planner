const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  cardClip,
  expectedPreSeasonRoadmapState,
  expectedSkateRoadmapScreenshot,
  expectedSkateRoadmapState,
  expectedSkateRoadmapVisual,
  prepareRoadmapScreenshot,
  roadmapState,
  roadmapVisualContract
} = require("./helpers/skate-roadmap-contract");

const TEST_DATE = "2026-09-14";
const SKATE_SESSIONS_KEY = "hivePlanner.skate.sessions";
const SKATE_SETTINGS_KEY = "hivePlanner.skate.settings";

const SEEDED_SESSIONS = [
  {
    dateKey: "2026-08-29",
    durationHours: 0.5,
    finishedAt: "2026-08-29T12:00:00.000Z",
    intensity: "blue",
    mainFocus: "Baseline ride"
  },
  {
    dateKey: "2026-09-01",
    durationHours: 0.25,
    finishedAt: "2026-09-01T10:00:00.000Z",
    intensity: "yellow",
    focus: "First session"
  },
  {
    dateKey: "2026-09-01",
    durationHours: 0.75,
    finishedAt: "2026-09-01T12:00:00.000Z",
    intensity: "green",
    mainFocus: "Latest session"
  },
  {
    dateKey: "2026-09-10",
    durationHours: 1,
    finishedAt: "2026-09-10T12:00:00.000Z",
    intensity: "not-a-color",
    mainFocus: "Compatibility session"
  }
];

async function putPlannerValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function openSkate(browser, url, populated = true) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  const readySelector = populated
    ? 'document.querySelector("#skateTrendCharts .skate-roadmap-day") !== null'
    : 'document.querySelector("#skateTrendCharts .body-support-empty") !== null';
  await browser.waitForExpression(`(() => {
    return document.getElementById("skateView").classList.contains("active") && ${readySelector};
  })()`);
}

async function captureRoadmapSignature(browser) {
  await browser.evaluate(prepareRoadmapScreenshot());
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  return browser.captureScreenshot(cardClip());
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate roadmap preserves season history, missed-session logging, and visual parity", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  await Promise.all([
    putPlannerValue(planner.server.url, SKATE_SESSIONS_KEY, SEEDED_SESSIONS),
    putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
      currentProgramDay: 15,
      extraRestDayOfWeek: null,
      intensityByDate: {},
      restDayOfWeek: 0
    })
  ]);

  const pageUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const state = await planner.browser.evaluate(roadmapState());
    assert.deepEqual(state, expectedSkateRoadmapState());
    assert.equal(state.days.length, 17);
    assert.equal(state.spacers, 6);
    assert.deepEqual(state.months, [
      { column: "1", label: "Aug" },
      { column: "2", label: "Sep" }
    ]);
    assert.deepEqual(
      await planner.browser.evaluate(roadmapVisualContract()),
      expectedSkateRoadmapVisual(width < 500)
    );
    assertMatchesSignature(
      await captureRoadmapSignature(planner.browser),
      expectedSkateRoadmapScreenshot(width < 500),
      `${width}px Skate roadmap`
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, pageUrl);
  await planner.browser.evaluate(
    'document.querySelector(\'[title="Tue Sep 1 · GREEN · Latest session"]\').click()'
  );
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      date: documentRoot.getElementById("skateSessionDate").value,
      duration: documentRoot.getElementById("skateDurationMinutes").value,
      hint: documentRoot.getElementById("skateSessionHint").textContent.trim(),
      intensity: documentRoot.querySelector("#skateFeedbackIntensity .active").dataset.intensity
    };
  })()`), {
    date: "2026-09-01",
    duration: "45",
    hint: "Logging for Tue Sep 1.",
    intensity: "green"
  });
  await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');

  await planner.browser.evaluate(
    'document.querySelector(\'[aria-label="Wed Sep 2 · no logged session"]\').click()'
  );
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      date: documentRoot.getElementById("skateSessionDate").value,
      duration: documentRoot.getElementById("skateDurationMinutes").value,
      hint: documentRoot.getElementById("skateSessionHint").textContent.trim(),
      intensity: documentRoot.querySelector("#skateFeedbackIntensity .active").dataset.intensity
    };
  })()`), {
    date: "2026-09-02",
    duration: "45",
    hint: "Logging for Wed Sep 2.",
    intensity: "yellow"
  });
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.getElementById("skateDurationMinutes").value = "35";
    documentRoot.querySelector("#skateFeedbackIntensity [data-intensity=blue]").click();
    documentRoot.getElementById("skateFeedbackForm").dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);

  const savedData = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const sessions = JSON.parse(data[SKATE_SESSIONS_KEY] || "[]");
    const saved = sessions.find((session) => session.dateKey === "2026-09-02");
    return saved ? { data, saved, sessions } : null;
  });
  assert.equal(savedData.saved.durationHours, 35 / 60);
  assert.equal(savedData.saved.intensity, "blue");
  assert.equal(savedData.saved.trackedInTask, false);
  assert.equal(savedData.data["hivePlanner.dailyTasks.2026-09-02"], undefined);
  assert.equal(
    JSON.parse(savedData.data[SKATE_SETTINGS_KEY]).intensityByDate["2026-09-02"],
    "blue"
  );
  await planner.browser.waitForExpression(`(() => {
    const day = document.querySelector('[aria-label="Wed Sep 2 · 1 skate session"]');
    return day?.classList.contains("intensity-blue") && day.title.includes(" · BLUE · ");
  })()`);

  await openSkate(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector(\'[aria-label="Wed Sep 2 · 1 skate session"]\').classList.contains("intensity-blue")'
  ), true);

  // Before the season starts the roadmap shows only its empty-state note.
  await openSkate(planner.browser, `${planner.server.url}/?view=skateView&date=2026-08-28`, false);
  assert.deepEqual(await planner.browser.evaluate(roadmapState()), expectedPreSeasonRoadmapState());
  assert.deepEqual(planner.browser.errors(), []);
});
