const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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

function feedbackState() {
  return `(() => {
    const documentRoot = document;
    const dialog = documentRoot.getElementById("skateFeedbackDialog");
    const form = documentRoot.getElementById("skateFeedbackForm");
    return {
      cancel: documentRoot.getElementById("cancelSkateFeedback").textContent.trim(),
      confidence: [...documentRoot.querySelectorAll('input[name="confidence"]')].map((input) => ({
        checked: input.checked,
        text: input.nextElementSibling.textContent.trim(),
        type: input.type,
        value: input.value
      })),
      date: documentRoot.getElementById("skateSessionDate").value,
      dialogClass: dialog.className,
      duration: {
        inputMode: documentRoot.getElementById("skateDurationMinutes").inputMode,
        max: documentRoot.getElementById("skateDurationMinutes").max,
        min: documentRoot.getElementById("skateDurationMinutes").min,
        placeholder: documentRoot.getElementById("skateDurationMinutes").placeholder,
        step: documentRoot.getElementById("skateDurationMinutes").step,
        value: documentRoot.getElementById("skateDurationMinutes").value
      },
      formClass: form.className,
      heading: form.querySelector("h2").textContent.trim(),
      improvedMaxLength: documentRoot.getElementById("skateImprovedNote").maxLength,
      intensities: [...documentRoot.querySelectorAll("#skateFeedbackIntensity button")].map((button) => ({
        active: button.classList.contains("active"),
        intensity: button.dataset.intensity,
        pressed: button.getAttribute("aria-pressed"),
        text: button.textContent.trim(),
        type: button.type
      })),
      nextMaxLength: documentRoot.getElementById("skateNextFocusNote").maxLength,
      progress: [...documentRoot.querySelectorAll('input[name="progressToday"]')].map((input) => ({
        checked: input.checked,
        text: input.nextElementSibling.textContent.trim(),
        type: input.type,
        value: input.value
      })),
      save: form.querySelector('button[type="submit"]').textContent.trim(),
      subtitle: form.querySelector(".section-head p").textContent.trim()
    };
  })()`;
}

function feedbackVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
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
        height: dimension(rect.height),
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const dialog = documentRoot.getElementById("skateFeedbackDialog");
    const form = documentRoot.getElementById("skateFeedbackForm");
    return {
      dialog: pick(dialog),
      duration: pick(documentRoot.getElementById("skateDurationMinutes")),
      form: pick(form),
      intensity: pick(documentRoot.querySelector("#skateFeedbackIntensity button")),
      note: pick(documentRoot.getElementById("skateImprovedNote")),
      save: pick(form.querySelector('.primary-button')),
      scale: pick(documentRoot.querySelector(".scale-option span")),
      scales: pick(documentRoot.querySelector(".scale-options"))
    };
  })()`;
}

async function settleDialog(browser) {
  await browser.evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

function dialogClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.getElementById("skateFeedbackDialog").getBoundingClientRect();
    const viewportWidth = documentRoot.defaultView.innerWidth;
    const viewportHeight = documentRoot.defaultView.innerHeight;
    const x = Math.max(0, rect.x);
    const y = Math.max(0, rect.y);
    return {
      x,
      y,
      width: Math.min(rect.width, viewportWidth - x),
      height: Math.min(rect.height, viewportHeight - y)
    };
  })()`;
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

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate feedback preserves dialog visuals, session persistence, task sync, and retro logs", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

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

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=skateView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, legacyUrl);
    await openFeedback(planner.browser);
    const legacyState = await planner.browser.evaluate(feedbackState());
    const legacyVisual = await planner.browser.evaluate(feedbackVisualContract());
    await settleDialog(planner.browser);
    const legacyScreenshot = await planner.browser.captureScreenshot(dialogClip());
    await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');

    await openSkate(planner.browser, previewUrl);
    await openFeedback(planner.browser);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const reactState = await planner.browser.evaluate(feedbackState());
    const reactVisual = await planner.browser.evaluate(feedbackVisualContract());
    await settleDialog(planner.browser);
    const reactScreenshot = await planner.browser.captureScreenshot(dialogClip());

    assert.deepEqual(reactState, legacyState);
    assert.equal(reactState.date, TEST_DATE);
    assert.equal(reactState.duration.value, "45");
    assert.equal(reactState.intensities.find(({ active }) => active).intensity, "green");
    assert.equal(reactState.confidence.find(({ checked }) => checked).value, "3");
    assert.equal(reactState.progress.find(({ checked }) => checked).value, "3");
    assert.deepEqual(reactVisual, legacyVisual);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Skate feedback`);
    await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');
  }

  await planner.browser.setViewport(1280, 900);
  await openSkate(planner.browser, previewUrl);
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

  await openSkate(planner.browser, previewUrl);
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
