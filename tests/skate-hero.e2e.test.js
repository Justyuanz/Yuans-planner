const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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

async function openSkate(browser, url, documentExpression) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    if (!documentRoot.getElementById("skateView").classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="skateView"]').click();
    }
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return documentRoot.getElementById("skateView").classList.contains("active")
      && documentRoot.getElementById("skatePhaseBadge").textContent.trim() !== "";
  })()`);
}

async function commitProgramDay(browser, server, documentExpression, value, expectedDay) {
  await browser.evaluate(`(() => {
    const input = (${documentExpression}).getElementById("skateCurrentDay");
    input.focus();
    input.value = ${JSON.stringify(value)};
    input.blur();
  })()`);
  await server.waitFor(async function () {
    const stored = await server.readPlannerData();
    const settings = JSON.parse(stored[SKATE_SETTINGS_KEY] || "{}");
    return settings.currentProgramDay === expectedDay;
  });
  await browser.waitForExpression(
    `(${documentExpression}).getElementById("skateCurrentDay").value === "${expectedDay}"`
  );
}

function skateHeroState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const text = (id) => documentRoot.getElementById(id).textContent.trim();
    return {
      activeView: documentRoot.querySelector(".view.active").id,
      attemptBudget: text("skateAttemptBudget"),
      benchmarkHidden: documentRoot.getElementById("skateBenchmarkChip").hidden,
      benchmarkLabel: text("skateBenchmarkLabel"),
      blockLabel: text("skateBlockLabel"),
      boardHours: text("skateBoardHours"),
      currentDay: documentRoot.getElementById("skateCurrentDay").value,
      dayCount: text("skateDayCount"),
      extraRestDay: documentRoot.getElementById("skateExtraRestDay").value,
      finishDisabled: documentRoot.getElementById("finishSkateSession").disabled,
      flowFocus: text("skateFlowFocus"),
      heroSubtitle: text("skateHeroSubtitle"),
      intensity: documentRoot.querySelector("#skateIntensityToggle .active").dataset.intensity,
      intensityDescription: text("skateIntensityDescription"),
      intensityEffort: text("skateIntensityEffort"),
      mainFocus: text("skateMainFocus"),
      phaseBadge: text("skatePhaseBadge"),
      restDay: documentRoot.getElementById("skateRestDay").value,
      sessionDaysCount: text("skateSessionDaysCount"),
      sessionHint: text("skateSessionHint"),
      skateiqBlock: text("skateSkateiqBlock"),
      startDisabled: documentRoot.getElementById("startSkateSession").disabled,
      weekCount: text("skateWeekCount")
    };
  })()`;
}

function skateHeroVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
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
    const card = documentRoot.querySelector(".skate-hero-card");
    return {
      actions: pick(card.querySelector(".skate-session-actions-card")),
      card: pick(card),
      intensity: pick(card.querySelector(".skate-intensity-card")),
      layout: pick(card.querySelector(".skate-hero-layout")),
      main: pick(card.querySelector(".skate-main-strip")),
      metrics: pick(card.querySelector(".skate-hero-metrics")),
      panel: pick(card.querySelector(".panel-inner")),
      settings: pick(card.querySelector(".skate-settings-strip")),
      support: pick(card.querySelector(".skate-support-strip"))
    };
  })()`;
}

async function prepareScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-hero-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function heroClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".skate-hero-card").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frame ? frameRect.x + rect.x : rect.x + documentRoot.defaultView.scrollX,
      y: frame ? frameRect.y + rect.y : rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, documentRoot.defaultView.innerHeight)
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate hero preserves visuals, settings, timer actions, and reload behavior", { timeout: 90_000 }, async function (context) {
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

  await putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
    currentProgramDay: 15,
    extraRestDayOfWeek: null,
    intensityByDate: { [TEST_DATE]: "yellow" },
    restDayOfWeek: 0
  });

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=legacyShell&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(skateHeroState("document"));
    const legacyVisual = await planner.browser.evaluate(skateHeroVisualContract("document"));
    await prepareScreenshot(planner.browser, "document");
    const legacyScreenshot = await planner.browser.captureScreenshot(heroClip("document"));

    await openSkate(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.querySelector(".skate-hero-card").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(skateHeroState(previewDocument));
    const reactVisual = await planner.browser.evaluate(skateHeroVisualContract(previewDocument));
    await prepareScreenshot(planner.browser, previewDocument);
    const reactScreenshot = await planner.browser.captureScreenshot(heroClip(
      previewDocument,
      'document.querySelector("iframe")'
    ));

    assert.deepEqual(reactState, legacyState);
    assert.deepEqual(reactVisual, legacyVisual);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Skate hero`);
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, previewUrl, previewDocument);
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const documentRoot = frame.contentDocument;
    const change = (id, value) => {
      const field = documentRoot.getElementById(id);
      field.value = value;
      field.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
    };
    change("skateRestDay", "2");
    change("skateExtraRestDay", "4");
    documentRoot.querySelector('[data-intensity="green"]').click();
  })()`);
  await commitProgramDay(planner.browser, planner.server, previewDocument, "", 1);
  await commitProgramDay(planner.browser, planner.server, previewDocument, "999", 60);
  await commitProgramDay(planner.browser, planner.server, previewDocument, "30", 30);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored[SKATE_SETTINGS_KEY] || "{}");
    return settings.currentProgramDay === 30
      && settings.extraRestDayOfWeek === 4
      && settings.intensityByDate?.[TEST_DATE] === "green"
      && settings.restDayOfWeek === 2;
  });
  await planner.browser.waitForExpression(`(() => {
    const documentRoot = ${previewDocument};
    return documentRoot.getElementById("skateCurrentDay").value === "30"
      && documentRoot.querySelector('[data-intensity="green"]').classList.contains("active");
  })()`);

  await planner.browser.evaluate(`(${previewDocument}).getElementById("startSkateSession").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("finishSkateSession").disabled === false`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      finishDisabled: documentRoot.getElementById("finishSkateSession").disabled,
      hint: documentRoot.getElementById("skateSessionHint").textContent.trim(),
      startDisabled: documentRoot.getElementById("startSkateSession").disabled
    };
  })()`), {
    finishDisabled: false,
    hint: "Skate session started. Go get the reps.",
    startDisabled: true
  });

  await planner.browser.evaluate(`(${previewDocument}).getElementById("finishSkateSession").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("skateFeedbackDialog").open`);
  assert.equal(await planner.browser.evaluate(
    `(${previewDocument}).getElementById("skateSessionDate").value`
  ), TEST_DATE);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("cancelSkateFeedback").click()`);
  await planner.browser.evaluate(`(${previewDocument}).getElementById("logSkateSession").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("skateFeedbackDialog").open`);
  assert.equal(await planner.browser.evaluate(
    `(${previewDocument}).getElementById("skateSessionHint").textContent.trim()`
  ), "Logging a skate session without the timer is okay too.");

  await openSkate(planner.browser, previewUrl, previewDocument);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      currentDay: documentRoot.getElementById("skateCurrentDay").value,
      extraRestDay: documentRoot.getElementById("skateExtraRestDay").value,
      finishDisabled: documentRoot.getElementById("finishSkateSession").disabled,
      intensity: documentRoot.querySelector("#skateIntensityToggle .active").dataset.intensity,
      restDay: documentRoot.getElementById("skateRestDay").value,
      startDisabled: documentRoot.getElementById("startSkateSession").disabled
    };
  })()`), {
    currentDay: "30",
    extraRestDay: "4",
    finishDisabled: true,
    intensity: "green",
    restDay: "2",
    startDisabled: false
  });
  assert.deepEqual(planner.browser.errors(), []);
});
