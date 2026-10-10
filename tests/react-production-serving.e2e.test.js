const assert = require("node:assert/strict");
const { access } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const REACT_INDEX_PATH = path.resolve(__dirname, "../frontend-react/dist/index.html");
const TEST_DATE = "2026-09-14";

async function hasReactBuild() {
  try {
    await access(REACT_INDEX_PATH);
    return true;
  } catch {
    return false;
  }
}

async function openDirectPage(browser, url) {
  await browser.open(url);
  await browser.waitForExpression(
    'document.documentElement.dataset.plannerReady === "true"'
  );
}

function directPageState() {
  return `(() => ({
    activeView: document.querySelector(".view.active")?.id,
    assetScripts: [...document.scripts]
      .map((script) => new URL(script.src).pathname)
      .filter((pathname) => pathname.startsWith("/assets/")),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((stylesheet) => new URL(stylesheet.href).pathname),
    iframeCount: document.querySelectorAll("iframe").length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }))()`;
}

test("Python serves a self-contained production React build", { timeout: 90_000 }, async function (context) {
  if (!await hasReactBuild()) {
    context.skip("Run the React production build before the production-serving browser test.");
    return;
  }

  const planner = await startBrowserPlanner(context, { frontendMode: "react" });
  if (!planner) return;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openDirectPage(
      planner.browser,
      `${planner.server.url}/?view=todayView&date=${TEST_DATE}`
    );
    const state = await planner.browser.evaluate(directPageState());
    assert.equal(state.activeView, "todayView");
    assert.equal(state.iframeCount, 0);
    assert.equal(state.overflow, false);
    assert.equal(state.assetScripts.length, 1);
    assert.ok(state.stylesheets.length >= 1);
    assert.equal(state.stylesheets.every((pathname) => pathname.startsWith("/assets/")), true);
  }

  await openDirectPage(
    planner.browser,
    `${planner.server.url}/?view=moneyView&date=${TEST_DATE}`
  );
  assert.deepEqual(
    await planner.browser.evaluate(`(() => ({
      activeView: document.querySelector(".view.active")?.id,
      iframeCount: document.querySelectorAll("iframe").length
    }))()`),
    { activeView: "moneyView", iframeCount: 0 }
  );

  const apiResponse = await planner.browser.evaluate(`fetch("/api/kv")
    .then((response) => response.json())
    .then((payload) => ({ hasData: typeof payload.data === "object" }))`);
  assert.deepEqual(apiResponse, { hasData: true });

  await openDirectPage(
    planner.browser,
    `${planner.server.url}/?view=legacyShell&date=${TEST_DATE}`
  );
  assert.deepEqual(
    await planner.browser.evaluate(`(() => ({
      activeView: document.querySelector(".view.active")?.id,
      iframeCount: document.querySelectorAll("iframe").length,
      requestedView: new URL(location.href).searchParams.get("view")
    }))()`),
    {
      activeView: "todayView",
      iframeCount: 0,
      requestedView: "legacyShell"
    }
  );
  assert.deepEqual(planner.browser.errors(), []);
});
