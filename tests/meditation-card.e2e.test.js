const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const MEDITATION_KEY = "hivePlanner.meditation";

async function putMeditationState(serverUrl, state) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: MEDITATION_KEY, value: JSON.stringify(state) })
  });
  assert.equal(response.ok, true);
}

async function openJournal(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(${documentExpression}).querySelector('[data-view-target="journalView"]')`);
  await browser.evaluate(`(${documentExpression}).querySelector('[data-view-target="journalView"]').click()`);
  await browser.waitForExpression(`(${documentExpression}).getElementById("journalView").classList.contains("active")`);
}

function meditationState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const input = documentRoot.getElementById("meditationMinutes");
    const start = documentRoot.getElementById("startMeditation");
    const cancel = documentRoot.getElementById("cancelMeditation");
    return {
      cancel: { hidden: cancel.hidden, text: cancel.textContent.trim(), type: cancel.type },
      countdown: {
        ariaLabel: documentRoot.getElementById("meditationCountdown").getAttribute("aria-label"),
        text: documentRoot.getElementById("meditationCountdown").textContent.trim()
      },
      input: {
        disabled: input.disabled,
        max: input.max,
        min: input.min,
        required: input.required,
        step: input.step,
        type: input.type,
        value: input.value
      },
      start: { disabled: start.disabled, text: start.textContent.trim(), type: start.type },
      status: {
        role: documentRoot.getElementById("meditationStatus").getAttribute("role"),
        text: documentRoot.getElementById("meditationStatus").textContent.trim()
      }
    };
  })()`;
}

function meditationVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const card = documentRoot.querySelector(".meditation-card");
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
        flexWrap: style.flexWrap,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: rect.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      controls: pick(documentRoot.getElementById("meditationForm")),
      countdown: pick(documentRoot.getElementById("meditationCountdown")),
      heading: { text: card.querySelector("h3").textContent.trim(), visual: pick(card.querySelector("h3")) },
      input: pick(documentRoot.getElementById("meditationMinutes")),
      note: { text: card.querySelector(".small-note").textContent.trim(), visual: pick(card.querySelector(".small-note")) },
      start: pick(documentRoot.getElementById("startMeditation")),
      state: ${meditationState(documentExpression)},
      status: pick(documentRoot.getElementById("meditationStatus"))
    };
  })()`;
}

const LEGACY_CLIP = `(() => {
  const rect = document.querySelector(".meditation-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

const PREVIEW_CLIP = `(() => {
  const frame = document.querySelector("iframe");
  const rect = frame.contentDocument.querySelector(".meditation-card").getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return { x: frameRect.x + rect.x, y: frameRect.y + rect.y, width: rect.width, height: rect.height };
})()`;

async function scrollToMeditation(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.querySelector(".meditation-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`(${documentExpression}).querySelector(".meditation-card").getBoundingClientRect().top >= 0`);
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

function assertReadyState(state, savedMinutes, dateLabel) {
  assert.deepEqual(state, {
    cancel: { hidden: true, text: "Cancel", type: "button" },
    countdown: { ariaLabel: "Meditation time remaining", text: "Ready" },
    input: {
      disabled: false,
      max: "180",
      min: "1",
      required: true,
      step: "1",
      type: "number",
      value: "10"
    },
    start: { disabled: false, text: "Start", type: "submit" },
    status: { role: "status", text: `${savedMinutes} min saved for ${dateLabel}.` }
  });
}

async function exerciseLegacyTimer(planner) {
  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("meditationMinutes");
    input.value = "0";
    document.getElementById("meditationForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  assert.equal((await planner.server.readPlannerData())[MEDITATION_KEY], undefined);

  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("meditationMinutes");
    input.value = "1";
    document.getElementById("meditationForm").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  })()`);
  await planner.browser.waitForExpression('document.getElementById("cancelMeditation").hidden === false');
  const activeUi = await planner.browser.evaluate(meditationState("document"));
  assert.equal(activeUi.input.disabled, true);
  assert.equal(activeUi.start.disabled, true);
  assert.equal(activeUi.cancel.hidden, false);
  assert.match(activeUi.countdown.text, /^(?:1:00|0:5[89])$/);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const state = JSON.parse(stored[MEDITATION_KEY] || "{}");
    return state.active?.minutes === 1 && state.active?.dateKey === TEST_DATE;
  });

  await planner.browser.reload();
  await planner.browser.evaluate('document.querySelector(\'[data-view-target="journalView"]\').click()');
  await planner.browser.waitForExpression('document.getElementById("cancelMeditation").hidden === false');
  await planner.browser.evaluate('document.getElementById("cancelMeditation").click()');
  await planner.browser.waitForExpression('document.getElementById("meditationCountdown").textContent === "Ready"');
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const state = JSON.parse(stored[MEDITATION_KEY] || "{}");
    return state.active === null && Array.isArray(state.sessions) && state.sessions.length === 0;
  });
}

async function seedExpiredMeditation(planner) {
  const now = Date.now();
  await putMeditationState(planner.server.url, {
    active: {
      id: "expired-session",
      dateKey: TEST_DATE,
      endsAt: now - 1_000,
      minutes: 15,
      startedAt: now - 901_000
    },
    futureRoot: { removedByLegacyCompletion: true },
    sessions: [
      {
        id: "current-session",
        dateKey: TEST_DATE,
        durationHours: 0.25,
        finishedAt: "2026-09-14T08:15:00.000Z"
      },
      {
        id: "past-session",
        dateKey: "2026-09-13",
        durationHours: 0.5,
        finishedAt: "2026-09-13T08:30:00.000Z"
      },
      {
        id: "task-linked",
        dateKey: TEST_DATE,
        durationHours: 2,
        finishedAt: "2026-09-14T10:00:00.000Z",
        trackedInTask: true
      }
    ]
  });
}

async function assertExpiredMeditationFinishesOnce(planner, pageUrl, documentExpression) {
  await openJournal(planner.browser, pageUrl, documentExpression);
  await planner.browser.waitForExpression(`(${documentExpression}).getElementById("meditationStatus").textContent.includes("30 min saved")`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const state = JSON.parse(stored[MEDITATION_KEY] || "{}");
    return state.active === null
      && state.futureRoot === undefined
      && state.sessions?.filter((entry) => entry.id === "expired-session").length === 1;
  });
}

test("Meditation preserves timer, persistence, Mind totals, and visual behavior", { timeout: 60_000 }, async function (context) {
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

  await planner.browser.setViewport(1280, 720);
  await openJournal(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assertReadyState(await planner.browser.evaluate(meditationState("document")), 0, "Mon Sep 14");
  await exerciseLegacyTimer(planner);

  await seedExpiredMeditation(planner);
  await assertExpiredMeditationFinishesOnce(planner, `${planner.server.url}/?date=${TEST_DATE}`, "document");
  assertReadyState(await planner.browser.evaluate(meditationState("document")), 30, "Mon Sep 14");

  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("journalDate");
    input.value = "2026-09-13";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Sun Sep 13."');
  await planner.browser.evaluate('document.getElementById("journalTodayButton").click()');
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Mon Sep 14."');

  await planner.browser.evaluate('document.querySelector(\'[data-view-target="todayView"]\').click()');
  await planner.browser.waitForExpression('[...document.querySelectorAll("#lifeBreakdown .breakdown-row")].some((row) => row.textContent.includes("Meditation100% · 0.5h"))');

  await planner.browser.evaluate('document.querySelector(\'[data-view-target="journalView"]\').click()');
  await scrollToMeditation(planner.browser, "document");
  const legacyDesktop = await planner.browser.evaluate(meditationVisualContract("document"));
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

  await openJournal(planner.browser, `${preview.url}/?date=${TEST_DATE}`, 'document.querySelector("iframe").contentDocument');
  await planner.browser.waitForExpression('document.querySelector("iframe")?.contentDocument?.getElementById("meditationStatus")?.textContent === "30 min saved for Mon Sep 14."');
  await scrollToMeditation(planner.browser, 'document.querySelector("iframe").contentDocument');
  const previewDesktop = await planner.browser.evaluate(
    meditationVisualContract('document.querySelector("iframe").contentDocument')
  );
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(PREVIEW_CLIP);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Meditation screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openJournal(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.getElementById("meditationStatus").textContent === "30 min saved for Mon Sep 14."');
  await scrollToMeditation(planner.browser, "document");
  const legacyMobile = await planner.browser.evaluate(meditationVisualContract("document"));
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(LEGACY_CLIP);

  await openJournal(planner.browser, `${preview.url}/?date=${TEST_DATE}`, 'document.querySelector("iframe").contentDocument');
  await planner.browser.waitForExpression('document.querySelector("iframe")?.contentDocument?.getElementById("meditationStatus")?.textContent === "30 min saved for Mon Sep 14."');
  await scrollToMeditation(planner.browser, 'document.querySelector("iframe").contentDocument');
  const previewMobile = await planner.browser.evaluate(
    meditationVisualContract('document.querySelector("iframe").contentDocument')
  );
  const previewMobileScreenshot = await planner.browser.captureScreenshot(PREVIEW_CLIP);
  assert.deepEqual(previewMobile, legacyMobile);
  assert.equal(previewMobile.card.width, 338);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Meditation screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});
