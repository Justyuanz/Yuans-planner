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

async function openSkate(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.getElementById("skateView").classList.contains("active") && document.querySelector("#skateCoachFlow .skate-plan-card") !== null');
}

function trainingPlanState() {
  return `(() => {
    const documentRoot = document;
    const cards = documentRoot.querySelectorAll("#skateCoachFlow .skate-plan-card");
    const text = (root, selector) => root?.querySelector(selector)?.textContent.trim() || "";
    const today = cards.item(0);
    const week = cards.item(1);
    return {
      heading: documentRoot.querySelector(".skate-session-card > .panel-inner > .section-head h2").textContent.trim(),
      subtitle: documentRoot.querySelector(".skate-session-card > .panel-inner > .section-head p").textContent.trim(),
      today: today ? {
        blocks: [...today.querySelectorAll(".skate-plan-block")].map((block) => ({
          label: text(block, "span"),
          value: text(block, "strong")
        })),
        description: text(today, ".skate-plan-head p"),
        kicker: text(today, ".skate-plan-kicker"),
        note: text(today, ".skate-plan-note"),
        title: text(today, ".skate-plan-head h3")
      } : null,
      week: week ? {
        description: text(week, ".skate-plan-head p"),
        kicker: text(week, ".skate-plan-kicker"),
        rows: [...week.querySelectorAll(".skate-plan-row")].map((row) => ({
          benchmark: text(row, ".skate-plan-pill"),
          className: row.className,
          detail: text(row, ".skate-plan-row-detail"),
          intensity: text(row, ".skate-plan-row-top em"),
          label: text(row, ".skate-plan-row-top span"),
          subtitle: text(row, ".skate-plan-row-copy"),
          title: text(row, ".skate-plan-row-top strong")
        })),
        title: text(week, ".skate-plan-head h3")
      } : null
    };
  })()`;
}

function trainingPlanVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
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
        gridTemplateColumns: style.gridTemplateColumns,
        height: dimension(rect.height),
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".skate-session-card");
    return {
      card: pick(card),
      firstBlock: pick(card.querySelector(".skate-plan-block")),
      firstRow: pick(card.querySelector(".skate-plan-row")),
      firstRowTop: pick(card.querySelector(".skate-plan-row-top")),
      flow: pick(card.querySelector(".skate-coach-flow")),
      grid: pick(card.querySelector(".skate-plan-grid")),
      panel: pick(card.querySelector(".panel-inner")),
      stack: pick(card.querySelector(".skate-plan-stack")),
      today: pick(card.querySelector(".skate-plan-today")),
      week: pick(card.querySelectorAll(".skate-plan-card").item(1))
    };
  })()`;
}

async function prepareScreenshot(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-session-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

function cardClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".skate-session-card").getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, documentRoot.defaultView.innerHeight)
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate training plan preserves current-week content, live settings, and visual parity", { timeout: 90_000 }, async function (context) {
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
    intensityByDate: {},
    restDayOfWeek: 0
  });

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=skateView&date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, legacyUrl);
    const legacyState = await planner.browser.evaluate(trainingPlanState());
    const legacyVisual = await planner.browser.evaluate(trainingPlanVisualContract());
    await prepareScreenshot(planner.browser);
    const legacyScreenshot = await planner.browser.captureScreenshot(cardClip());

    await openSkate(planner.browser, previewUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const reactState = await planner.browser.evaluate(trainingPlanState());
    const reactVisual = await planner.browser.evaluate(trainingPlanVisualContract());
    await prepareScreenshot(planner.browser);
    const reactScreenshot = await planner.browser.captureScreenshot(cardClip());

    assert.deepEqual(reactState, legacyState);
    assert.equal(reactState.today.kicker, "Day 15");
    assert.equal(reactState.today.note, "Day 15 benchmark");
    assert.equal(reactState.week.kicker, "Week 3 / 21");
    assert.equal(reactState.week.rows.length, 7);
    assert.match(reactState.week.rows[0].className, /is-current/);
    assert.deepEqual(reactVisual, legacyVisual);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Skate training plan`);
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, previewUrl);
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

  await openSkate(planner.browser, previewUrl);
  const reloaded = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(reloaded, updated);

  const preSeasonLegacyUrl = `${planner.server.url}/?view=skateView&date=2026-08-28`;
  const preSeasonPreviewUrl = `${preview.url}/?view=skateView&date=2026-08-28`;
  await openSkate(planner.browser, preSeasonLegacyUrl);
  const legacyPreSeason = await planner.browser.evaluate(trainingPlanState());
  await openSkate(planner.browser, preSeasonPreviewUrl);
  const reactPreSeason = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(reactPreSeason, legacyPreSeason);
  assert.equal(reactPreSeason.today.kicker, "Day 1");
  assert.equal(reactPreSeason.week.description, "Previewing the program before Saturday, August 29, 2026.");
  assert.deepEqual(reactPreSeason.week.rows, []);

  await putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
    currentProgramDay: 60,
    extraRestDayOfWeek: 6,
    intensityByDate: {},
    restDayOfWeek: 0
  });
  const postStreakLegacyUrl = `${planner.server.url}/?view=skateView&date=2026-11-16`;
  const postStreakPreviewUrl = `${preview.url}/?view=skateView&date=2026-11-16`;
  await openSkate(planner.browser, postStreakLegacyUrl);
  const legacyPostStreak = await planner.browser.evaluate(trainingPlanState());
  await openSkate(planner.browser, postStreakPreviewUrl);
  const reactPostStreak = await planner.browser.evaluate(trainingPlanState());
  assert.deepEqual(reactPostStreak, legacyPostStreak);
  assert.equal(reactPostStreak.today.kicker, "Day 60");
  assert.equal(reactPostStreak.week.kicker, "Week 9 / 21");
  assert.equal(reactPostStreak.week.rows.length, 4);
  assert.match(reactPostStreak.week.description, /Rest days: Sunday and Saturday\./);
  assert.equal(reactPostStreak.week.rows.at(-1).label, "Day 60");
  assert.match(reactPostStreak.week.rows.at(-1).className, /is-current/);
  assert.deepEqual(planner.browser.errors(), []);
});
