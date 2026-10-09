const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const JOURNAL_KEY = "hivePlanner.journal.entries";
const LONG_CONTENT = "x".repeat(150);

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

function archiveState() {
  return `(() => {
    const documentRoot = document;
    const search = documentRoot.getElementById("journalSearch");
    return {
      cards: [...documentRoot.querySelectorAll("#journalArchiveList .journal-entry-card")].map((card) => ({
        active: card.classList.contains("active"),
        date: card.querySelector(".journal-entry-card-head span").textContent.trim(),
        meta: card.querySelector(".journal-entry-meta")?.textContent.trim() || "",
        preview: card.querySelector(".journal-entry-preview").textContent.trim(),
        title: card.querySelector(".journal-entry-card-head strong").textContent.trim(),
        type: card.type
      })),
      empty: documentRoot.querySelector("#journalArchiveList .journal-empty-state")?.textContent.trim() || "",
      listAriaLive: documentRoot.getElementById("journalArchiveList").getAttribute("aria-live"),
      search: {
        autocomplete: search.autocomplete,
        maxLength: search.maxLength,
        placeholder: search.placeholder,
        value: search.value
      }
    };
  })()`;
}

function archiveVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".journal-archive-card");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        alignItems: style.alignItems,
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      cards: [...panel.querySelectorAll(".journal-entry-card")].map((card) => ({
        head: pick(card.querySelector(".journal-entry-card-head")),
        meta: card.querySelector(".journal-entry-meta") ? pick(card.querySelector(".journal-entry-meta")) : null,
        preview: pick(card.querySelector(".journal-entry-preview")),
        text: card.textContent.trim(),
        visual: pick(card)
      })),
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      list: pick(documentRoot.getElementById("journalArchiveList")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      search: pick(documentRoot.getElementById("journalSearch")),
      state: ${archiveState()}
    };
  })()`;
}

const ARCHIVE_CLIP = `(() => {
  const rect = document.querySelector(".journal-archive-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

async function scrollToArchive(browser) {
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
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

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

function assertPopulatedState(state) {
  assert.equal(state.empty, "");
  assert.equal(state.listAriaLive, "polite");
  assert.deepEqual(state.search, {
    autocomplete: "off",
    maxLength: 80,
    placeholder: "Search by feeling, date, or phrase",
    value: ""
  });
  assert.deepEqual(state.cards, [
    {
      active: true,
      date: "Mon Sep 14",
      meta: "Energy Good · Focus Clear · Outside walk.",
      preview: "I felt calm. Then I took a walk.",
      title: "Soft start",
      type: "button"
    },
    {
      active: false,
      date: "Sun Sep 13",
      meta: "",
      preview: "Cafe notes after class.",
      title: "Sun Sep 13",
      type: "button"
    },
    {
      active: false,
      date: "Sat Sep 12",
      meta: "Energy Low · Focus Foggy · Late night.",
      preview: "Energy: low · Focus: foggy · Late night.",
      title: "Sat Sep 12",
      type: "button"
    },
    {
      active: false,
      date: "Fri Sep 11",
      meta: "",
      preview: "A tiny note lives here.",
      title: "Fri Sep 11",
      type: "button"
    },
    {
      active: false,
      date: "Thu Sep 10",
      meta: "",
      preview: `${"x".repeat(131)}…`,
      title: "Thu Sep 10",
      type: "button"
    }
  ]);
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

test("Journal archive preserves filtering, navigation, and visual behavior", { timeout: 60_000 }, async function (context) {
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
  const legacyUrl = `${planner.server.url}/?view=journalView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=journalView&date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, legacyUrl);
  assert.deepEqual(await planner.browser.evaluate(archiveState()), {
    cards: [],
    empty: "Your old journals will stack here as soon as you write one.",
    listAriaLive: "polite",
    search: {
      autocomplete: "off",
      maxLength: 80,
      placeholder: "Search by feeling, date, or phrase",
      value: ""
    }
  });

  await searchArchive(planner.browser, "missing");
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-empty-state").textContent.includes("No journal entry")');
  assert.equal((await planner.browser.evaluate(archiveState())).empty, "No journal entry matches that search yet.");

  await putJournalEntries(planner.server.url, JOURNAL_ENTRIES);
  await openJournal(planner.browser, legacyUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  assertPopulatedState(await planner.browser.evaluate(archiveState()));

  await searchArchive(planner.browser, "late night");
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 1');
  assert.equal((await planner.browser.evaluate(archiveState())).cards[0].title, "Sat Sep 12");
  await searchArchive(planner.browser, "not here");
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-empty-state")');
  assert.equal((await planner.browser.evaluate(archiveState())).empty, "No journal entry matches that search yet.");

  await openJournal(planner.browser, legacyUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  await planner.browser.evaluate('document.querySelectorAll("#journalArchiveList .journal-entry-card")[1].click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-13"');
  assert.deepEqual(await planner.browser.evaluate(`({
    activeIndex: [...document.querySelectorAll("#journalArchiveList .journal-entry-card")].findIndex((card) => card.classList.contains("active")),
    content: document.getElementById("journalContent").value,
    date: document.getElementById("journalDate").value,
    title: document.getElementById("journalTitle").value
  })`), { activeIndex: 1, content: "Cafe notes after class.", date: "2026-09-13", title: "" });
  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');

  await scrollToArchive(planner.browser);
  const legacyDesktop = await planner.browser.evaluate(archiveVisualContract());
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(ARCHIVE_CLIP);

  await openJournal(planner.browser, previewUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  await scrollToArchive(planner.browser);
  const previewDesktop = await planner.browser.evaluate(archiveVisualContract());
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(ARCHIVE_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Journal archive screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openJournal(planner.browser, legacyUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  await scrollToArchive(planner.browser);
  const legacyMobile = await planner.browser.evaluate(archiveVisualContract());

  await openJournal(planner.browser, previewUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  await scrollToArchive(planner.browser);
  const previewMobile = await planner.browser.evaluate(archiveVisualContract());
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.panel.width, 1020.609375);

  await searchArchive(planner.browser, "late night");
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 1');
  assert.equal((await planner.browser.evaluate(archiveState())).cards[0].title, "Sat Sep 12");
  await searchArchive(planner.browser, "");
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');

  await planner.browser.evaluate('document.querySelectorAll("#journalArchiveList .journal-entry-card")[1].click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-13"');
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card")[1].classList.contains("active")');
  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');
  await planner.browser.waitForExpression('document.getElementById("journalDate").value === "2026-09-14"');

  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("journalTitle");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    valueSetter.call(input, "Updated from the React editor");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#journalArchiveList .journal-entry-card strong").textContent === "Updated from the React editor"');

  await openJournal(planner.browser, previewUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#journalArchiveList .journal-entry-card").length === 5');
  const reloadedState = await planner.browser.evaluate(archiveState());
  assert.equal(reloadedState.search.value, "");
  assert.equal(reloadedState.cards[0].title, "Updated from the React editor");
  assert.deepEqual(planner.browser.errors(), []);
});
