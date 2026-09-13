const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-13";
const WEEKLY_GOALS = {
  study: "Finish the React boundary",
  body: "Take a recovery walk",
  mind: "Practice one song"
};

const LEGACY_GOALS_READY = `document.querySelectorAll("#weeklyGoals .weekly-goal-input").length === 3`;
const REACT_GOALS_READY = `(() => {
  const frame = document.querySelector("iframe");
  const goals = frame && frame.contentDocument && frame.contentDocument.getElementById("weeklyGoals");
  return goals && goals.dataset.reactOwned === "true" && goals.querySelectorAll(".weekly-goal-input").length === 3;
})()`;

const LEGACY_PANEL_CLIP = `(() => {
  const rect = document.querySelector(".goals-card").getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
})()`;

const REACT_PANEL_CLIP = `(() => {
  const frame = document.querySelector("iframe");
  const rect = frame.contentDocument.querySelector(".goals-card").getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: rect.height };
})()`;

function visualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const panel = documentRoot.querySelector(".goals-card");
    const list = documentRoot.getElementById("weeklyGoals");
    const firstCard = list.querySelector(".weekly-goal-card");
    const firstInput = list.querySelector(".weekly-goal-input");
    const heading = panel.querySelector("h2");
    const note = panel.querySelector(".small-note");
    const pick = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
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
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      cards: [...list.querySelectorAll(".weekly-goal-card")].map((card) => ({
        label: card.querySelector(".weekly-goal-track").textContent.trim(),
        value: card.querySelector(".weekly-goal-input").value
      })),
      heading: { text: heading.textContent.trim(), visual: pick(heading) },
      input: pick(firstInput),
      list: pick(list),
      note: { text: note.textContent.trim(), visual: pick(note) },
      panel: pick(panel),
      card: pick(firstCard)
    };
  })()`;
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

test("React weekly goals preserve the legacy desktop and mobile design", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await putWeeklyGoals(planner.server.url);

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(LEGACY_GOALS_READY);
  const legacyDesktop = await planner.browser.evaluate(visualContract("document"));
  const legacyScreenshot = await planner.browser.captureScreenshot(LEGACY_PANEL_CLIP);

  await planner.browser.open(`${preview.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  const reactDesktop = await planner.browser.evaluate(
    visualContract('document.querySelector("iframe").contentDocument')
  );
  const reactScreenshot = await planner.browser.captureScreenshot(REACT_PANEL_CLIP);

  assert.deepEqual(reactDesktop, legacyDesktop);
  assert.equal(reactScreenshot, legacyScreenshot);

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(LEGACY_GOALS_READY);
  const legacyMobile = await planner.browser.evaluate(`(() => ({
    display: getComputedStyle(document.querySelector(".goals-card")).display,
    overflow: document.documentElement.scrollWidth > innerWidth
  }))()`);

  await planner.browser.open(`${preview.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression(REACT_GOALS_READY);
  const reactMobile = await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const frameDocument = frame.contentDocument;
    return {
      display: getComputedStyle(frameDocument.querySelector(".goals-card")).display,
      overflow: frameDocument.documentElement.scrollWidth > frame.contentWindow.innerWidth
    };
  })()`);

  assert.deepEqual(reactMobile, legacyMobile);
  assert.deepEqual(reactMobile, { display: "none", overflow: false });
  assert.deepEqual(planner.browser.errors(), []);
});
