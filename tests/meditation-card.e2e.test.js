const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  expectedMeditationVisual,
  expectedReadyState,
  meditationState,
  meditationVisualContract
} = require("./helpers/meditation-contract");

const TEST_DATE = "2026-09-14";
const MEDITATION_KEY = "hivePlanner.meditation";

// Thirty saved minutes on the test date: two 15-minute sessions. The 30-minute
// session on the previous day and the task-linked one are excluded from it.
const SAVED_SESSIONS = [
  { id: "current-session", dateKey: TEST_DATE, durationHours: 0.25, finishedAt: "2026-09-14T08:15:00.000Z" },
  { id: "extra-session", dateKey: TEST_DATE, durationHours: 0.25, finishedAt: "2026-09-14T09:15:00.000Z" },
  { id: "past-session", dateKey: "2026-09-13", durationHours: 0.5, finishedAt: "2026-09-13T08:30:00.000Z" },
  { id: "task-linked", dateKey: TEST_DATE, durationHours: 2, finishedAt: "2026-09-14T10:00:00.000Z", trackedInTask: true }
];

function localDateKey(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

async function putMeditationState(serverUrl, state) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: MEDITATION_KEY, value: JSON.stringify(state) })
  });
  assert.equal(response.ok, true);
}

async function openJournal(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.getElementById("journalView").classList.contains("active")');
}

async function scrollToMeditation(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".meditation-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression('document.querySelector(".meditation-card").getBoundingClientRect().top >= 0');
}

// React controls the minute field, so its value must be set the way the browser
// would before the input event is dispatched.
async function submitMinutes(browser, minutes) {
  await browser.evaluate(`(() => {
    const input = document.getElementById("meditationMinutes");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(minutes)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("meditationForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
}

async function setJournalDate(browser, date) {
  await browser.evaluate(`(() => {
    const input = document.getElementById("journalDate");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(date)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
}

function readStoredState(planner) {
  return planner.server.readPlannerData().then((stored) => JSON.parse(stored[MEDITATION_KEY] || "{}"));
}

test("Meditation preserves timer, persistence, standalone totals, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/?view=journalView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(meditationState()), expectedReadyState(0, "Mon Sep 14"));

  // Below the one-minute minimum the form writes nothing at all.
  await submitMinutes(planner.browser, "0");
  assert.equal((await planner.server.readPlannerData())[MEDITATION_KEY], undefined);

  const startDateKey = localDateKey(new Date());
  await submitMinutes(planner.browser, "1");
  await planner.browser.waitForExpression('document.getElementById("cancelMeditation").hidden === false');
  const runningState = await planner.browser.evaluate(meditationState());
  assert.equal(runningState.input.disabled, true);
  assert.equal(runningState.start.disabled, true);
  assert.equal(runningState.cancel.hidden, false);
  assert.match(runningState.countdown.text, /^(?:1:00|0:5[89])$/);
  await planner.server.waitFor(async function () {
    const state = await readStoredState(planner);
    return state.active?.minutes === 1 && state.active?.dateKey === startDateKey;
  });

  // A reload restores the running timer from storage.
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.getElementById("cancelMeditation").hidden === false');
  await planner.browser.evaluate('document.getElementById("cancelMeditation").click()');
  await planner.browser.waitForExpression('document.getElementById("meditationCountdown").textContent === "Ready"');
  await planner.server.waitFor(async function () {
    const state = await readStoredState(planner);
    return state.active === null && Array.isArray(state.sessions) && state.sessions.length === 0;
  });

  // An already-expired timer completes exactly once on load. The compact legacy
  // completion shape drops unknown root data while unknown session fields stay.
  const expiredAt = Date.now();
  await putMeditationState(planner.server.url, {
    active: {
      id: "expired-session",
      dateKey: TEST_DATE,
      endsAt: expiredAt - 1_000,
      minutes: 15,
      startedAt: expiredAt - 901_000
    },
    futureRoot: { removedByCompletion: true },
    sessions: [
      { ...SAVED_SESSIONS[0], unknownSessionField: "keep" },
      SAVED_SESSIONS[2],
      SAVED_SESSIONS[3]
    ]
  });
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent.includes("30 min saved")');
  await planner.server.waitFor(async function () {
    const state = await readStoredState(planner);
    return state.active === null
      && state.futureRoot === undefined
      && state.sessions?.filter((entry) => entry.id === "expired-session").length === 1;
  });
  const completed = await readStoredState(planner);
  assert.deepEqual(
    Object.keys(completed.sessions.find((entry) => entry.id === "expired-session")).sort(),
    ["dateKey", "durationHours", "finishedAt", "id", "startedAt"]
  );
  assert.equal(
    completed.sessions.find((entry) => entry.id === "current-session").unknownSessionField,
    "keep"
  );
  assert.deepEqual(await planner.browser.evaluate(meditationState()), expectedReadyState(30, "Mon Sep 14"));

  // The status follows the shared selected date and the Today button.
  await setJournalDate(planner.browser, "2026-09-13");
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Sun Sep 13."');
  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Mon Sep 14."');

  // Meditation stays a standalone feature: it never feeds Life Pie.
  await planner.browser.evaluate('document.querySelector(\'[data-view-target="todayView"]\').click()');
  await planner.browser.waitForExpression('document.querySelectorAll("#lifeBreakdown .breakdown-row").length === 6');
  assert.deepEqual(await planner.browser.evaluate(`(() => ({
    hasRetiredRows: [...document.querySelectorAll("#lifeBreakdown .breakdown-row")]
      .some((row) => /Meditation|Journal/.test(row.textContent)),
    total: document.getElementById("lifeDonutLabel").textContent.trim()
  }))()`), { hasRetiredRows: false, total: "0h" });

  // Pin the rendered card from the stored state the contract was captured from.
  await putMeditationState(planner.server.url, { active: null, sessions: SAVED_SESSIONS });
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openJournal(planner.browser, pageUrl);
    await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Mon Sep 14."');
    await scrollToMeditation(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(meditationVisualContract()),
      expectedMeditationVisual(width < 500, 30, "Mon Sep 14")
    );
  }

  // An expiry that arrives from another tab completes once and updates the total.
  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, pageUrl);
  const externalExpiry = Date.now();
  const externalState = {
    ...(await readStoredState(planner)),
    active: {
      id: "external-expired",
      dateKey: TEST_DATE,
      endsAt: externalExpiry - 1_000,
      minutes: 15,
      startedAt: externalExpiry - 901_000
    }
  };
  const externalValue = JSON.stringify(externalState);
  await planner.browser.evaluate(`(() => {
    localStorage.setItem(${JSON.stringify(MEDITATION_KEY)}, ${JSON.stringify(externalValue)});
    window.dispatchEvent(new StorageEvent("storage", {
      key: ${JSON.stringify(MEDITATION_KEY)},
      newValue: ${JSON.stringify(externalValue)}
    }));
  })()`);
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "Meditation complete. Saved to Mind."');
  await planner.server.waitFor(async function () {
    const state = await readStoredState(planner);
    return state.active === null
      && state.sessions?.filter((entry) => entry.id === "external-expired").length === 1;
  });
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "45 min saved for Mon Sep 14."');

  // Reload proves the completion persisted exactly once.
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "45 min saved for Mon Sep 14."');
  const persisted = await readStoredState(planner);
  assert.equal(persisted.sessions.filter((entry) => entry.id === "external-expired").length, 1);

  assert.deepEqual(planner.browser.errors(), []);
});
