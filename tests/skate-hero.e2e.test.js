const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  expectedSkateHeroScreenshot,
  expectedSkateHeroState,
  expectedSkateHeroVisual,
  heroClip,
  prepareHeroScreenshot,
  skateHeroState,
  skateHeroVisualContract
} = require("./helpers/skate-hero-contract");

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
  await browser.waitForExpression('document.getElementById("skateView").classList.contains("active") && document.getElementById("skatePhaseBadge").textContent.trim() !== ""');
}

async function commitProgramDay(browser, server, value, expectedDay) {
  await browser.evaluate(`(() => {
    const input = document.getElementById("skateCurrentDay");
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
    `document.getElementById("skateCurrentDay").value === "${expectedDay}"`
  );
}

async function captureHeroSignature(browser) {
  await browser.evaluate(prepareHeroScreenshot());
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  return browser.captureScreenshot(heroClip());
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate hero preserves visuals, settings, timer actions, and reload behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  await putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
    currentProgramDay: 15,
    extraRestDayOfWeek: null,
    intensityByDate: { [TEST_DATE]: "yellow" },
    restDayOfWeek: 0
  });

  const pageUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    assert.deepEqual(await planner.browser.evaluate(skateHeroState()), expectedSkateHeroState());
    assert.deepEqual(
      await planner.browser.evaluate(skateHeroVisualContract()),
      expectedSkateHeroVisual(width < 500)
    );
    assertMatchesSignature(
      await captureHeroSignature(planner.browser),
      expectedSkateHeroScreenshot(width < 500),
      `${width}px Skate hero`
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, pageUrl);
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    const change = (id, value) => {
      const field = documentRoot.getElementById(id);
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };
    change("skateRestDay", "2");
    change("skateExtraRestDay", "4");
    documentRoot.querySelector('[data-intensity="green"]').click();
  })()`);
  await commitProgramDay(planner.browser, planner.server, "", 1);
  await commitProgramDay(planner.browser, planner.server, "999", 60);
  await commitProgramDay(planner.browser, planner.server, "30", 30);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const settings = JSON.parse(stored[SKATE_SETTINGS_KEY] || "{}");
    return settings.currentProgramDay === 30
      && settings.extraRestDayOfWeek === 4
      && settings.intensityByDate?.[TEST_DATE] === "green"
      && settings.restDayOfWeek === 2;
  });
  await planner.browser.waitForExpression(`(() => {
    const documentRoot = document;
    return documentRoot.getElementById("skateCurrentDay").value === "30"
      && documentRoot.querySelector('[data-intensity="green"]').classList.contains("active");
  })()`);

  await planner.browser.evaluate('document.getElementById("startSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("finishSkateSession").disabled === false');
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
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

  await planner.browser.evaluate('document.getElementById("finishSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateSessionDate").value'
  ), TEST_DATE);
  await planner.browser.evaluate('document.getElementById("cancelSkateFeedback").click()');
  await planner.browser.evaluate('document.getElementById("logSkateSession").click()');
  await planner.browser.waitForExpression('document.getElementById("skateFeedbackDialog").open');
  assert.equal(await planner.browser.evaluate(
    'document.getElementById("skateSessionHint").textContent.trim()'
  ), "Logging a skate session without the timer is okay too.");

  await openSkate(planner.browser, pageUrl);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document;
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
