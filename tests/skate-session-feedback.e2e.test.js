const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  dialogClip,
  expectedSkateFeedbackScreenshot,
  expectedSkateFeedbackState,
  expectedSkateFeedbackVisual,
  feedbackState,
  feedbackVisualContract,
  settleDialog
} = require("./helpers/skate-feedback-contract");

const TEST_DATE = "2026-09-14";
const TASK_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const SKATE_CURRENT_SESSION_KEY = "hivePlanner.skate.currentSession";
const SKATE_SESSIONS_KEY = "hivePlanner.skate.sessions";
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
  await browser.waitForExpression('document.getElementById("skateView").classList.contains("active") && document.getElementById("logSkateSession") !== null');
}

async function openFeedback(browser) {
  await browser.evaluate('document.getElementById("logSkateSession").click()');
  await browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
}

async function captureDialogSignature(browser) {
  await browser.evaluate(settleDialog());
  return browser.captureScreenshot(dialogClip());
}

function setFormValue(id, value) {
  return `(() => {
    const documentRoot = document;
    const field = documentRoot.getElementById(${JSON.stringify(id)});
    const view = documentRoot.defaultView;
    const prototype = field instanceof view.HTMLTextAreaElement
      ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new view.Event("input", { bubbles: true }));
    field.dispatchEvent(new view.Event("change", { bubbles: true }));
  })()`;
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate feedback preserves dialog visuals, session persistence, task sync, and retro logs", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  await Promise.all([
    putPlannerValue(planner.server.url, TASK_KEY, [{
      activity: "skate",
      done: false,
      hours: 0.25,
      id: "skate-task",
      label: "Evening skate",
      legacyTaskField: "keep",
      timerSeconds: 900,
      timerStartedAt: null
    }]),
    putPlannerValue(planner.server.url, SKATE_SESSIONS_KEY, [{
      dateKey: "2026-09-01",
      durationHours: 0.5,
      finishedAt: "2026-09-01T12:00:00.000Z",
      id: "existing",
      intensity: "blue",
      legacySessionField: "keep"
    }]),
    putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
      currentProgramDay: 15,
      extraRestDayOfWeek: null,
      intensityByDate: { [TEST_DATE]: "green" },
      restDayOfWeek: 0,
      unknownSetting: "keep"
    }),
    putPlannerValue(planner.server.url, SKATE_CURRENT_SESSION_KEY, {
      focusCards: {
        flat: { goals: [true, false, false], note: "Flat note", status: "learning" },
        transition: { goals: [false, true, false], note: "Transition note", status: "almost-there" }
      },
      selectedFlat: "Kickflip",
      selectedTransition: "Axle stall"
    })
  ]);

  const pageUrl = `${planner.server.url}/skate?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, pageUrl);
    await openFeedback(planner.browser);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const state = await planner.browser.evaluate(feedbackState());
    assert.deepEqual(state, expectedSkateFeedbackState());
    assert.equal(state.date, TEST_DATE);
    assert.equal(state.duration.value, "45");
    assert.equal(state.intensities.find(({ active }) => active).intensity, "green");
    assert.equal(state.confidence.find(({ checked }) => checked).value, "3");
    assert.equal(state.progress.find(({ checked }) => checked).value, "3");
    assert.deepEqual(
      await planner.browser.evaluate(feedbackVisualContract()),
      expectedSkateFeedbackVisual(width < 500)
    );
    assertMatchesSignature(
      await captureDialogSignature(planner.browser),
      expectedSkateFeedbackScreenshot(width < 500),
      `${width}px Skate feedback`
    );
    await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');
  }

  await planner.browser.setViewport(1280, 900);
  await openSkate(planner.browser, pageUrl);
  await planner.browser.evaluate('document.getElementById("startSkateSession").click()');
  await planner.browser.evaluate('document.getElementById("finishSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  await planner.browser.evaluate(setFormValue("skateDurationMinutes", "50"));
  await planner.browser.evaluate(setFormValue("skateImprovedNote", "  Cleaner shoulders  "));
  await planner.browser.evaluate(setFormValue("skateNextFocusNote", "Commit earlier"));
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.querySelector('#skateFeedbackIntensity [data-intensity="blue"]').click();
    documentRoot.querySelector('input[name="confidence"][value="5"]').click();
    documentRoot.querySelector('input[name="progressToday"][value="2"]').click();
    documentRoot.getElementById("skateFeedbackForm").requestSubmit();
  })()`);

  const currentSave = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const sessions = JSON.parse(data[SKATE_SESSIONS_KEY] || "[]");
    return sessions.length === 2 ? { data, saved: sessions[1] } : null;
  });
  const savedTask = JSON.parse(currentSave.data[TASK_KEY])[0];
  assert.equal(savedTask.done, true);
  assert.equal(savedTask.hours, 1.08);
  assert.equal(savedTask.timerSeconds, 3900);
  assert.equal(savedTask.legacyTaskField, "keep");
  assert.deepEqual({
    confidence: currentSave.saved.confidence,
    dateKey: currentSave.saved.dateKey,
    durationHours: currentSave.saved.durationHours,
    feedbackNote: currentSave.saved.feedbackNote,
    improvedNote: currentSave.saved.improvedNote,
    intensity: currentSave.saved.intensity,
    nextFocusNote: currentSave.saved.nextFocusNote,
    progressToday: currentSave.saved.progressToday,
    skateQuality: currentSave.saved.skateQuality,
    trackedInTask: currentSave.saved.trackedInTask
  }, {
    confidence: 5,
    dateKey: TEST_DATE,
    durationHours: 50 / 60,
    feedbackNote: "Cleaner shoulders | Commit earlier",
    improvedNote: "Cleaner shoulders",
    intensity: "blue",
    nextFocusNote: "Commit earlier",
    progressToday: 2,
    skateQuality: 2,
    trackedInTask: true
  });
  assert.equal(currentSave.saved.focus, "Kickflip · Axle stall");
  assert.equal(currentSave.saved.note, "Flat note | Transition note");
  assert.equal(JSON.parse(currentSave.data[SKATE_SETTINGS_KEY]).unknownSetting, "keep");
  assert.equal(JSON.parse(currentSave.data[SKATE_SETTINGS_KEY]).intensityByDate[TEST_DATE], "blue");
  assert.equal(JSON.parse(currentSave.data[SKATE_CURRENT_SESSION_KEY]).selectedFlat, "Shove-it");
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateFeedbackDialog").open'
  ), false);
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateSessionHint").textContent.trim()'
  ), 'Session saved and added to "Evening skate".');
  await planner.browser.waitForExpression(`(() => {
    const day = document.querySelector('[aria-label="Mon Sep 14 · 1 skate session"]');
    return day?.classList.contains("intensity-blue");
  })()`);

  await openSkate(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    return {
      finishDisabled: documentRoot.getElementById("finishSkateSession").disabled,
      roadmapBlue: documentRoot.querySelector('[aria-label="Mon Sep 14 · 1 skate session"]')
        .classList.contains("intensity-blue"),
      startDisabled: documentRoot.getElementById("startSkateSession").disabled
    };
  })()`), { finishDisabled: true, roadmapBlue: true, startDisabled: false });

  await planner.browser.evaluate(
    'document.querySelector(\'[aria-label="Wed Sep 2 · no logged session"]\').click()'
  );
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  await planner.browser.evaluate(setFormValue("skateDurationMinutes", "35"));
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.querySelector('#skateFeedbackIntensity [data-intensity="green"]').click();
    documentRoot.getElementById("skateFeedbackForm").requestSubmit();
  })()`);
  const retroSave = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const sessions = JSON.parse(data[SKATE_SESSIONS_KEY] || "[]");
    return sessions.length === 3 ? { data, saved: sessions[2] } : null;
  });
  assert.equal(retroSave.saved.dateKey, "2026-09-02");
  assert.equal(retroSave.saved.durationHours, 35 / 60);
  assert.equal(retroSave.saved.finishedAt, "2026-09-02T12:00:00.000Z");
  assert.equal(retroSave.saved.intensity, "green");
  assert.equal(retroSave.saved.startedAt, "2026-09-02T11:25:00.000Z");
  assert.equal(retroSave.saved.trackedInTask, false);
  assert.equal(retroSave.data["hivePlanner.dailyTasks.2026-09-02"], undefined);

  await openFeedback(planner.browser);
  await planner.browser.evaluate(setFormValue("skateImprovedNote", "Discard me"));
  await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateFeedbackDialog").open'
  ), false);
  const afterCancel = await planner.server.readPlannerData();
  assert.equal(JSON.parse(afterCancel[SKATE_SESSIONS_KEY]).length, 3);
  await openFeedback(planner.browser);
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateImprovedNote").value'
  ), "");
  await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');
  assert.deepEqual(planner.browser.errors(), []);
});
