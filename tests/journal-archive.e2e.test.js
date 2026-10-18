const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const {
  LONG_CONTENT_LENGTH,
  NO_MATCH_TEXT,
  archiveState,
  archiveVisualContract,
  expectedArchiveVisual,
  expectedEmptyState,
  expectedPopulatedState
} = require("./helpers/journal-archive-contract");

const TEST_DATE = "2026-09-14";
const JOURNAL_KEY = "hivePlanner.journal.entries";
const LONG_CONTENT = "x".repeat(LONG_CONTENT_LENGTH);

// Covers malformed, dateless, and blank records alongside entries that carry
// only a tracker, only a duration, or content long enough to be clipped.
const JOURNAL_ENTRIES = [
  null,
  { id: "missing-date", content: "Ignored" },
  { id: "blank", date: "2026-09-15", title: " ", content: "  " },
  {
    id: "current",
    date: TEST_DATE,
    title: " Soft start ",
    content: "I felt   calm.\nThen I took a walk.",
    durationMinutes: 15,
    tracker: { energy: "GOOD", focus: " clear ", context: "Outside walk. " },
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z"
  },
  {
    id: "past",
    date: "2026-09-13",
    content: "Cafe notes after class.",
    createdAt: "2026-09-13T08:00:00.000Z"
  },
  {
    id: "tracker-only",
    date: "2026-09-12",
    tracker: { energy: "low", focus: "foggy", context: " Late night. " },
    updatedAt: "2026-09-12T09:00:00.000Z"
  },
  { id: "duration-only", date: "2026-09-11", durationMinutes: 10 },
  { id: "long", date: "2026-09-10", content: LONG_CONTENT }
];

async function putJournalEntries(serverUrl, entries) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: JOURNAL_KEY, value: JSON.stringify(entries) })
  });
  assert.equal(response.ok, true);
}

async function openJournal(browser, pageUrl) {
  await browser.open(pageUrl);
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.getElementById("journalView").classList.contains("active")');
}

async function scrollToArchive(browser) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".journal-archive-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".journal-archive-card").getBoundingClientRect();
    return rect.top < documentRoot.defaultView.innerHeight && rect.bottom > 0;
  })()`);
}

async function searchArchive(browser, query) {
  await browser.evaluate(`(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const input = documentRoot.getElementById("journalSearch");
    const valueSetter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, "value").set;
    valueSetter.call(input, ${JSON.stringify(query)});
    input.dispatchEvent(new view.Event("input", { bubbles: true }));
  })()`);
}

function editorState(browser) {
  return browser.evaluate(`({
    activeIndex: [...document.querySelectorAll("#journalArchiveList .journal-entry-card")].findIndex((card) => card.classList.contains("active")),
    content: document.getElementById("journalContent").value,
    date: document.getElementById("journalDate").value,
    title: document.getElementById("journalTitle").value
  })`);
}

test("Journal archive preserves filtering, navigation, and visual behavior", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  const pageUrl = `${planner.server.url}/journal?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(archiveState()), expectedEmptyState());

  // Searching an empty archive swaps in the no-match copy.
  await searchArchive(planner.browser, "missing");
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-empty-state").textContent.includes("No journal entry")');
  assert.deepEqual(
    await planner.browser.evaluate(archiveState()),
    { ...expectedEmptyState(NO_MATCH_TEXT), search: { ...expectedEmptyState().search, value: "missing" } }
  );

  await putJournalEntries(planner.server.url, JOURNAL_ENTRIES);
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  assert.deepEqual(await planner.browser.evaluate(archiveState()), expectedPopulatedState());

  // Search matches tracker context as well as titles and content.
  await searchArchive(planner.browser, "late night");
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 1');
  assert.equal((await planner.browser.evaluate(archiveState())).cards[0].title, "Sat Sep 12");
  await searchArchive(planner.browser, "not here");
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-empty-state") !== null');
  assert.equal((await planner.browser.evaluate(archiveState())).empty, NO_MATCH_TEXT);
  await searchArchive(planner.browser, "");
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');

  // Opening a card loads that date into the editor and moves the active marker.
  await planner.browser.evaluate('document.querySelectorAll("#journalArchiveList .journal-entry-card")[1].click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-13"');
  assert.deepEqual(await editorState(planner.browser), {
    activeIndex: 1,
    content: "Cafe notes after class.",
    date: "2026-09-13",
    title: ""
  });
  assert.deepEqual(
    await planner.browser.evaluate(archiveState()),
    expectedPopulatedState({ activeIndex: 1 })
  );

  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-14"');

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openJournal(planner.browser, pageUrl);
    await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
    await scrollToArchive(planner.browser);
    assert.deepEqual(
      await planner.browser.evaluate(archiveVisualContract()),
      expectedArchiveVisual(width < 500)
    );
  }

  // Editing the title updates the matching archive card immediately.
  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("journalTitle");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    valueSetter.call(input, "Updated from the React editor");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-entry-card strong").textContent === "Updated from the React editor"');

  // Reload keeps the stored title and clears the transient search text.
  await openJournal(planner.browser, pageUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  const reloadedState = await planner.browser.evaluate(archiveState());
  assert.equal(reloadedState.search.value, "");
  assert.equal(reloadedState.cards[0].title, "Updated from the React editor");

  assert.deepEqual(planner.browser.errors(), []);
});
