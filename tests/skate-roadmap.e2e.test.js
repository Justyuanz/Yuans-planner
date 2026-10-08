const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const SKATE_SESSIONS_KEY = "hivePlanner.skate.sessions";
const SKATE_SETTINGS_KEY = "hivePlanner.skate.settings";

const SEEDED_SESSIONS = [
  {
    dateKey: "2026-08-29",
    durationHours: 0.5,
    finishedAt: "2026-08-29T12:00:00.000Z",
    intensity: "blue",
    mainFocus: "Baseline ride"
  },
  {
    dateKey: "2026-09-01",
    durationHours: 0.25,
    finishedAt: "2026-09-01T10:00:00.000Z",
    intensity: "yellow",
    focus: "First session"
  },
  {
    dateKey: "2026-09-01",
    durationHours: 0.75,
    finishedAt: "2026-09-01T12:00:00.000Z",
    intensity: "green",
    mainFocus: "Latest session"
  },
  {
    dateKey: "2026-09-10",
    durationHours: 1,
    finishedAt: "2026-09-10T12:00:00.000Z",
    intensity: "not-a-color",
    mainFocus: "Compatibility session"
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

async function openSkate(browser, url, documentExpression, populated = true) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    if (!documentRoot.getElementById("skateView").classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="skateView"]').click();
    }
  })()`);
  const readySelector = populated
    ? 'documentRoot.querySelector("#skateTrendCharts .skate-roadmap-day") !== null'
    : 'documentRoot.querySelector("#skateTrendCharts .body-support-empty") !== null';
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return documentRoot.getElementById("skateView").classList.contains("active") && ${readySelector};
  })()`);
}

function roadmapState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const grid = documentRoot.querySelector("#skateTrendCharts .skate-roadmap-grid");
    return {
      days: [...documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-day")].map((day) => ({
        ariaLabel: day.getAttribute("aria-label"),
        className: day.className,
        title: day.title,
        type: day.type
      })),
      empty: documentRoot.querySelector("#skateTrendCharts .body-support-empty")?.textContent.trim() || "",
      gridColumns: grid?.style.getPropertyValue("--roadmap-columns") || "",
      months: [...documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-month")].map((month) => ({
        column: month.style.gridColumn,
        label: month.textContent.trim()
      })),
      spacers: documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-spacer").length
    };
  })()`;
}

function roadmapVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
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
        height: dimension(rect.height),
        overflowX: style.overflowX,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".skate-trends-card");
    const days = card.querySelectorAll(".skate-roadmap-day");
    return {
      card: pick(card),
      firstDay: pick(days[0]),
      grid: pick(card.querySelector(".skate-roadmap-grid")),
      loggedDay: pick(card.querySelector(".intensity-green")),
      months: pick(card.querySelector(".skate-roadmap-months")),
      panel: pick(card.querySelector(".panel-inner")),
      roadmap: pick(card.querySelector(".skate-roadmap"))
    };
  })()`;
}

async function prepareScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-trends-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function cardClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".skate-trends-card").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frame ? frameRect.x + rect.x : rect.x + documentRoot.defaultView.scrollX,
      y: frame ? frameRect.y + rect.y : rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: rect.height
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Skate roadmap preserves season history, missed-session logging, and visual parity", { timeout: 90_000 }, async function (context) {
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

  await Promise.all([
    putPlannerValue(planner.server.url, SKATE_SESSIONS_KEY, SEEDED_SESSIONS),
    putPlannerValue(planner.server.url, SKATE_SETTINGS_KEY, {
      currentProgramDay: 15,
      extraRestDayOfWeek: null,
      intensityByDate: {},
      restDayOfWeek: 0
    })
  ]);

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=legacyShell&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(roadmapState("document"));
    const legacyVisual = await planner.browser.evaluate(roadmapVisualContract("document"));
    await prepareScreenshot(planner.browser, "document");
    const legacyScreenshot = await planner.browser.captureScreenshot(cardClip("document"));

    await openSkate(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.querySelector(".skate-trends-card").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(roadmapState(previewDocument));
    const reactVisual = await planner.browser.evaluate(roadmapVisualContract(previewDocument));
    await prepareScreenshot(planner.browser, previewDocument);
    const reactScreenshot = await planner.browser.captureScreenshot(cardClip(
      previewDocument,
      'document.querySelector("iframe")'
    ));

    assert.deepEqual(reactState, legacyState);
    assert.equal(reactState.days.length, 17);
    assert.equal(reactState.spacers, 6);
    assert.deepEqual(reactState.months, [
      { column: "1", label: "Aug" },
      { column: "2", label: "Sep" }
    ]);
    assert.deepEqual(reactVisual, legacyVisual);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Skate roadmap`);
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, previewUrl, previewDocument);
  await planner.browser.evaluate(
    `(${previewDocument}).querySelector('[title="Tue Sep 1 · GREEN · Latest session"]').click()`
  );
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("skateFeedbackDialog").open`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      date: documentRoot.getElementById("skateSessionDate").value,
      duration: documentRoot.getElementById("skateDurationMinutes").value,
      hint: documentRoot.getElementById("skateSessionHint").textContent.trim(),
      intensity: documentRoot.querySelector("#skateFeedbackIntensity .active").dataset.intensity
    };
  })()`), {
    date: "2026-09-01",
    duration: "45",
    hint: "Logging for Tue Sep 1.",
    intensity: "green"
  });
  await planner.browser.evaluate(`(${previewDocument}).getElementById("cancelSkateFeedback").click()`);

  await planner.browser.evaluate(
    `(${previewDocument}).querySelector('[aria-label="Wed Sep 2 · no logged session"]').click()`
  );
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("skateFeedbackDialog").open`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    return {
      date: documentRoot.getElementById("skateSessionDate").value,
      duration: documentRoot.getElementById("skateDurationMinutes").value,
      hint: documentRoot.getElementById("skateSessionHint").textContent.trim(),
      intensity: documentRoot.querySelector("#skateFeedbackIntensity .active").dataset.intensity
    };
  })()`), {
    date: "2026-09-02",
    duration: "45",
    hint: "Logging for Wed Sep 2.",
    intensity: "yellow"
  });
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const documentRoot = frame.contentDocument;
    documentRoot.getElementById("skateDurationMinutes").value = "35";
    documentRoot.querySelector("#skateFeedbackIntensity [data-intensity=blue]").click();
    documentRoot.getElementById("skateFeedbackForm").dispatchEvent(new frame.contentWindow.Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);

  const savedData = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const sessions = JSON.parse(data[SKATE_SESSIONS_KEY] || "[]");
    const saved = sessions.find((session) => session.dateKey === "2026-09-02");
    return saved ? { data, saved, sessions } : null;
  });
  assert.equal(savedData.saved.durationHours, 35 / 60);
  assert.equal(savedData.saved.intensity, "blue");
  assert.equal(savedData.saved.trackedInTask, false);
  assert.equal(savedData.data["hivePlanner.dailyTasks.2026-09-02"], undefined);
  assert.equal(
    JSON.parse(savedData.data[SKATE_SETTINGS_KEY]).intensityByDate["2026-09-02"],
    "blue"
  );
  await planner.browser.waitForExpression(`(() => {
    const day = (${previewDocument}).querySelector('[aria-label="Wed Sep 2 · 1 skate session"]');
    return day?.classList.contains("intensity-blue") && day.title.includes(" · BLUE · ");
  })()`);

  await openSkate(planner.browser, previewUrl, previewDocument);
  assert.equal(await planner.browser.evaluate(
    `(${previewDocument}).querySelector('[aria-label="Wed Sep 2 · 1 skate session"]').classList.contains("intensity-blue")`
  ), true);

  const preSeasonLegacyUrl = `${planner.server.url}/?view=skateView&date=2026-08-28`;
  const preSeasonPreviewUrl = `${preview.url}/?view=legacyShell&date=2026-08-28`;
  await openSkate(planner.browser, preSeasonLegacyUrl, "document", false);
  const preSeasonLegacy = await planner.browser.evaluate(roadmapState("document"));
  await openSkate(planner.browser, preSeasonPreviewUrl, previewDocument, false);
  const preSeasonReact = await planner.browser.evaluate(roadmapState(previewDocument));
  assert.deepEqual(preSeasonReact, preSeasonLegacy);
  assert.equal(
    preSeasonReact.empty,
    "Roadmap starts on Saturday, August 29, 2026. Dots appear after the season begins and stay visible as the history grows."
  );
  assert.deepEqual(planner.browser.errors(), []);
});
