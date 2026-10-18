const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshotSignature } = require("./helpers/png-compare");
const {
  bodySupportState,
  bodySupportVisualContract,
  cardClip,
  expectedSkateBodySupportScreenshot,
  expectedSkateBodySupportState,
  expectedSkateBodySupportVisual,
  prepareBodySupportScreenshot
} = require("./helpers/skate-body-support-contract");

const TEST_DATE = "2026-09-14";
const BODY_SUPPORT_KEY = "hivePlanner.physical.logs";

const SEEDED_LOGS = [
  {
    date: "2026-09-14",
    kind: "gym",
    minutes: 30,
    name: "Gym",
    note: "Leg day",
    status: "done",
    unknown: { keep: true }
  },
  {
    date: "2026-09-15",
    kind: "gym",
    minutes: 15,
    name: "Gym",
    note: "Second note",
    status: "modified"
  },
  {
    date: "2026-09-16",
    kind: "yoga",
    minutes: 20,
    name: "Yoga",
    status: "skipped"
  },
  {
    date: "2026-09-17",
    kind: "recovery",
    minutes: 0,
    name: "Recovery",
    status: "done"
  },
  {
    date: "2026-09-18",
    kind: "mystery",
    minutes: 5,
    name: "Mystery",
    status: "done"
  },
  {
    date: "2026-09-13",
    kind: "stretch",
    minutes: 10,
    name: "Stretch",
    status: "done"
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
  const resultSelector = populated
    ? 'document.querySelector("#skateWeeklyMetrics .body-support-chip") !== null'
    : 'document.querySelector("#skateWeeklyMetrics .body-support-empty") !== null';
  await browser.waitForExpression(`(() => {
    return document.getElementById("skateView").classList.contains("active")
      && ${resultSelector};
  })()`);
}

async function captureBodySupportSignature(browser) {
  await browser.evaluate(prepareBodySupportScreenshot());
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  return browser.captureScreenshot(cardClip());
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

function gymLifePieSummary() {
  return `(() => {
    const documentRoot = document;
    const row = [...documentRoot.querySelectorAll("#lifeBreakdown .breakdown-row")]
      .find((candidate) => candidate.querySelector("strong").textContent.trim() === "Gym");
    return row?.querySelector("span").textContent.trim() || "";
  })()`;
}

test("Skate Body support preserves weekly metrics, persistence, totals, and visual parity", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;

  await putPlannerValue(planner.server.url, BODY_SUPPORT_KEY, SEEDED_LOGS);

  const pageUrl = `${planner.server.url}/skate?date=${TEST_DATE}`;

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, pageUrl);
    assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
    const state = await planner.browser.evaluate(bodySupportState());
    assert.deepEqual(state, expectedSkateBodySupportState());
    assert.equal(state.week, "2026-W38");
    // Unknown kinds fall back to Other, skipped logs drop out, and a
    // zero-minute log shows as Logged.
    assert.deepEqual(state.chips, [
      { text: "Gym2x45 min", title: "Leg day" },
      { text: "Other1x5 min", title: "" },
      { text: "Recovery1xLogged", title: "" }
    ]);
    assert.deepEqual(
      await planner.browser.evaluate(bodySupportVisualContract()),
      expectedSkateBodySupportVisual(width < 500)
    );
    assertMatchesSignature(
      await captureBodySupportSignature(planner.browser),
      expectedSkateBodySupportScreenshot(width < 500),
      `${width}px Skate Body support`
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, pageUrl);
  const beforeSaveData = await planner.server.readPlannerData();
  await planner.browser.evaluate(`(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const change = (id, value, eventType, prototype) => {
      const field = documentRoot.getElementById(id);
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, value);
      field.dispatchEvent(new view.Event(eventType, { bubbles: true }));
    };
    change("bodyWorkoutType", "yoga", "change", view.HTMLSelectElement.prototype);
    change("bodyWorkoutMinutes", "35", "input", view.HTMLInputElement.prototype);
    change("bodyWorkoutName", "  Yin yoga  ", "input", view.HTMLInputElement.prototype);
    documentRoot.getElementById("bodyLogForm").dispatchEvent(new view.Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);

  const savedData = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const logs = JSON.parse(data[BODY_SUPPORT_KEY] || "[]");
    return logs.length === SEEDED_LOGS.length + 1 ? { data, logs, saved: logs.at(-1) } : null;
  });
  assert.deepEqual(savedData.logs[0].unknown, { keep: true });
  assert.deepEqual({
    date: savedData.saved.date,
    kind: savedData.saved.kind,
    minutes: savedData.saved.minutes,
    name: savedData.saved.name,
    note: savedData.saved.note,
    score: savedData.saved.score,
    status: savedData.saved.status
  }, {
    date: TEST_DATE,
    kind: "yoga",
    minutes: 35,
    name: "Yoga",
    note: "Yin yoga",
    score: 0,
    status: "done"
  });
  assert.match(savedData.saved.id, /^body-/);
  assert.equal(Number.isFinite(Date.parse(savedData.saved.createdAt)), true);
  const unrelatedData = Object.fromEntries(
    Object.entries(savedData.data).filter(([key]) => key !== BODY_SUPPORT_KEY)
  );
  const unrelatedBeforeSave = Object.fromEntries(
    Object.entries(beforeSaveData).filter(([key]) => key !== BODY_SUPPORT_KEY)
  );
  assert.deepEqual(unrelatedData, unrelatedBeforeSave);

  await planner.browser.waitForExpression(`(() => {
    const documentRoot = document;
    const yoga = [...documentRoot.querySelectorAll("#skateWeeklyMetrics .body-support-chip")]
      .find((chip) => chip.querySelector("strong").textContent === "Yoga");
    return yoga?.textContent.replace(/\\s/g, "") === "Yoga1x35min"
      && yoga.title === "Yin yoga"
      && documentRoot.getElementById("bodyWorkoutType").value === "gym"
      && documentRoot.getElementById("bodyWorkoutMinutes").value === ""
      && documentRoot.getElementById("bodyWorkoutName").value === "";
  })()`);

  await planner.browser.open(`${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelectorAll("#lifeBreakdown .breakdown-row").length === 6');
  assert.equal(await planner.browser.evaluate(gymLifePieSummary()), "100% · 1.42h");

  await openSkate(planner.browser, pageUrl);
  const reloaded = await planner.browser.evaluate(bodySupportState());
  assert.deepEqual(reloaded.chips, [
    { text: "Gym2x45 min", title: "Leg day" },
    { text: "Other1x5 min", title: "" },
    { text: "Recovery1xLogged", title: "" },
    { text: "Yoga1x35 min", title: "Yin yoga" }
  ]);

  // A week with no logs shows only the empty-state note.
  await openSkate(planner.browser, `${planner.server.url}/skate?date=2026-09-21`, false);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector("#skateWeeklyMetrics .body-support-empty").textContent.trim()'
  ), "Saved body support from this week will appear here.");
  assert.deepEqual(planner.browser.errors(), []);
});
