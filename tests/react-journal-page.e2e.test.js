const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  editorClip,
  expectedJournalPageGeometry,
  expectedJournalPageScreenshot,
  expectedJournalPageState,
  journalPageGeometry,
  journalPageState
} = require("./helpers/journal-page-contract");
const { compareScreenshotSignature } = require("./helpers/png-compare");

const TEST_DATE = "2026-09-14";
const JOURNAL_KEY = "hivePlanner.journal.entries";

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedJournal(serverUrl) {
  await putValue(serverUrl, JOURNAL_KEY, [
    {
      content: "I felt calm.\nThen I took a walk.",
      createdAt: "2026-09-14T08:00:00.000Z",
      date: TEST_DATE,
      durationMinutes: 15,
      id: "current",
      title: "Soft start",
      tracker: { context: "Outside walk.", energy: "good", focus: "clear" },
      updatedAt: "2026-09-14T10:00:00.000Z"
    },
    {
      content: "Cafe notes after class.",
      createdAt: "2026-09-13T08:00:00.000Z",
      date: "2026-09-13",
      id: "past",
      title: ""
    }
  ]);
  await putValue(serverUrl, "hivePlanner.meditation", {
    active: null,
    sessions: [{
      dateKey: TEST_DATE,
      durationHours: 0.5,
      finishedAt: "2026-09-14T09:30:00.000Z",
      id: "meditation-1",
      startedAt: "2026-09-14T09:00:00.000Z"
    }]
  });
}

async function openReady(browser, url) {
  await browser.open(url);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
}

// The animated mascot is hidden before capture so it cannot add noise, while
// its layout space is preserved.
async function prepareScreenshot(browser) {
  await browser.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const mascot = document.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`);
}

function assertMatchesSignature(actual, expected, label) {
  const comparison = compareScreenshotSignature(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function setField(browser, selector, value, eventName = "input") {
  await browser.evaluate(`(() => {
    const field = document.querySelector(${JSON.stringify(selector)});
    const prototype = field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true }));
  })()`);
}

test("Journal is a direct React page with legacy parity, persistence, and date navigation", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  await seedJournal(planner.server.url);

  const pageUrl = `${planner.server.url}/?view=journalView&date=${TEST_DATE}`;
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openReady(planner.browser, pageUrl);
    assert.deepEqual(await planner.browser.evaluate(journalPageState()), expectedJournalPageState());
    const geometry = await planner.browser.evaluate(journalPageGeometry());
    assert.deepEqual(geometry, expectedJournalPageGeometry(width < 500));
    assert.equal(geometry.overflow, false);
    await prepareScreenshot(planner.browser);
    assertMatchesSignature(
      await planner.browser.captureScreenshot(editorClip()),
      expectedJournalPageScreenshot(width < 500),
      `${width}px Journal editor`
    );
  }

  await planner.browser.setViewport(1280, 720);
  await openReady(planner.browser, pageUrl);

  await setField(planner.browser, "#journalTitle", "Updated feeling");
  await setField(planner.browser, "#journalContent", "A new reflection.");
  await setField(planner.browser, "#journalStateContext", "After class.");
  await planner.browser.evaluate('document.querySelector("[data-energy-state=strong]").click()');
  await planner.browser.evaluate('document.querySelector("[data-focus-state=steady]").click()');
  await setField(planner.browser, "#journalMinutes", "25");
  await planner.browser.evaluate('document.getElementById("journalMinutes").dispatchEvent(new Event("change", { bubbles: true }))');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const entries = JSON.parse(stored[JOURNAL_KEY] || "[]");
    const entry = entries.find((candidate) => candidate.id === "current");
    return entry?.title === "Updated feeling"
      && entry.content === "A new reflection."
      && entry.durationMinutes === 25
      && entry.tracker?.context === "After class."
      && entry.tracker?.energy === "strong"
      && entry.tracker?.focus === "steady";
  }, 20_000);
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-entry-card strong").textContent === "Updated feeling"');

  await planner.browser.reload();
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  assert.deepEqual(await planner.browser.evaluate(`(() => ({
    content: document.getElementById("journalContent").value,
    context: document.getElementById("journalStateContext").value,
    energy: document.querySelector("#journalEnergyOptions .is-active")?.dataset.energyState,
    focus: document.querySelector("#journalFocusOptions .is-active")?.dataset.focusState,
    minutes: document.getElementById("journalMinutes").value,
    title: document.getElementById("journalTitle").value
  }))()`), {
    content: "A new reflection.",
    context: "After class.",
    energy: "strong",
    focus: "steady",
    minutes: "25",
    title: "Updated feeling"
  });

  await planner.browser.evaluate('document.querySelectorAll("#journalArchiveList .journal-entry-card")[1].click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-13"');
  assert.deepEqual(await planner.browser.evaluate(`({
    content: document.getElementById("journalContent").value,
    date: document.getElementById("journalDate").value,
    title: document.getElementById("journalTitle").value
  })`), { content: "Cafe notes after class.", date: "2026-09-13", title: "" });
  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');
  await planner.browser.waitForExpression(`document.getElementById("journalDate").value === "${TEST_DATE}"`);

  const stored = await planner.server.readPlannerData();
  const log = JSON.parse(stored["hivePlanner.activityLog"] || "[]");
  assert.equal(log.some((entry) => entry.action === "journal_entry_updated"
    && entry.entityId === "current" && entry.meta?.source === "journal-editor"), true);

  await planner.browser.evaluate('document.querySelector("[data-view-target=todayView]").click()');
  await planner.browser.waitForExpression('location.search.includes("view=todayView")');
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  assert.equal(await planner.browser.evaluate('document.querySelectorAll("iframe").length'), 0);
  assert.deepEqual(planner.browser.errors(), []);
});
