const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

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

async function openSkate(browser, url, documentExpression, populated = true) {
  await browser.open(url);
  await browser.waitForExpression(`(${documentExpression}).documentElement.dataset.plannerReady === "true"`);
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    if (!documentRoot.getElementById("skateView").classList.contains("active")) {
      documentRoot.querySelector('[data-view-target="skateView"]').click();
    }
  })()`);
  const resultSelector = populated
    ? 'documentRoot.querySelector("#skateWeeklyMetrics .body-support-chip") !== null'
    : 'documentRoot.querySelector("#skateWeeklyMetrics .body-support-empty") !== null';
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return documentRoot.getElementById("skateView").classList.contains("active")
      && ${resultSelector};
  })()`);
}

function bodySupportState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const type = documentRoot.getElementById("bodyWorkoutType");
    const minutes = documentRoot.getElementById("bodyWorkoutMinutes");
    const note = documentRoot.getElementById("bodyWorkoutName");
    return {
      button: documentRoot.querySelector("#bodyLogForm button").textContent.trim(),
      chips: [...documentRoot.querySelectorAll("#skateWeeklyMetrics .body-support-chip")].map((chip) => ({
        text: chip.textContent.trim(),
        title: chip.title
      })),
      form: {
        minutes: {
          inputMode: minutes.inputMode,
          max: minutes.max,
          min: minutes.min,
          placeholder: minutes.placeholder,
          step: minutes.step,
          type: minutes.type,
          value: minutes.value
        },
        note: {
          autocomplete: note.autocomplete,
          maxLength: note.maxLength,
          placeholder: note.placeholder,
          value: note.value
        },
        options: [...type.options].map((option) => ({ label: option.textContent, value: option.value })),
        type: type.value
      },
      heading: documentRoot.querySelector(".body-log-card h2").textContent.trim(),
      week: documentRoot.getElementById("skateWeekLabel").textContent.trim()
    };
  })()`;
}

function bodySupportVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
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
        gridColumn: style.gridColumn,
        gridTemplateColumns: style.gridTemplateColumns,
        height: dimension(rect.height),
        marginTop: style.marginTop,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".body-log-card");
    const form = card.querySelector(".body-log-form");
    return {
      button: pick(form.querySelector("button")),
      card: pick(card),
      chip: pick(card.querySelector(".body-support-chip")),
      form: pick(form),
      metrics: pick(card.querySelector(".body-support-metrics")),
      minutes: pick(card.querySelector("#bodyWorkoutMinutes")),
      note: pick(card.querySelector("#bodyWorkoutName")),
      noteRow: pick(card.querySelector(".body-log-note")),
      panel: pick(card.querySelector(".panel-inner")),
      sectionHead: pick(card.querySelector(".section-head")),
      select: pick(card.querySelector("#bodyWorkoutType"))
    };
  })()`;
}

async function prepareScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".body-log-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function cardClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".body-log-card").getBoundingClientRect();
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

function gymLifePieSummary(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const row = [...documentRoot.querySelectorAll("#lifeBreakdown .breakdown-row")]
      .find((candidate) => candidate.querySelector("strong").textContent.trim() === "Gym");
    return row?.querySelector("span").textContent.trim() || "";
  })()`;
}

test("Skate Body support preserves weekly metrics, persistence, totals, and visual parity", { timeout: 90_000 }, async function (context) {
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

  await putPlannerValue(planner.server.url, BODY_SUPPORT_KEY, SEEDED_LOGS);

  const legacyUrl = `${planner.server.url}/?view=skateView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=legacyShell&date=${TEST_DATE}`;
  const previewDocument = 'document.querySelector("iframe").contentDocument';

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await openSkate(planner.browser, legacyUrl, "document");
    const legacyState = await planner.browser.evaluate(bodySupportState("document"));
    const legacyVisual = await planner.browser.evaluate(bodySupportVisualContract("document"));
    await prepareScreenshot(planner.browser, "document");
    const legacyScreenshot = await planner.browser.captureScreenshot(cardClip("document"));

    await openSkate(planner.browser, previewUrl, previewDocument);
    assert.equal(await planner.browser.evaluate(
      'document.querySelector("iframe").contentDocument.querySelector(".body-log-card").dataset.reactOwned'
    ), "true");
    const reactState = await planner.browser.evaluate(bodySupportState(previewDocument));
    const reactVisual = await planner.browser.evaluate(bodySupportVisualContract(previewDocument));
    await prepareScreenshot(planner.browser, previewDocument);
    const reactScreenshot = await planner.browser.captureScreenshot(cardClip(
      previewDocument,
      'document.querySelector("iframe")'
    ));

    assert.deepEqual(reactState, legacyState);
    assert.equal(reactState.week, "2026-W38");
    assert.deepEqual(reactState.chips, [
      { text: "Gym2x45 min", title: "Leg day" },
      { text: "Other1x5 min", title: "" },
      { text: "Recovery1xLogged", title: "" }
    ]);
    assert.deepEqual(reactVisual, legacyVisual);
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Skate Body support`);
  }

  await planner.browser.setViewport(1280, 720);
  await openSkate(planner.browser, previewUrl, previewDocument);
  const beforeSaveData = await planner.server.readPlannerData();
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const documentRoot = frame.contentDocument;
    const change = (id, value, eventType, prototype) => {
      const field = documentRoot.getElementById(id);
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, value);
      field.dispatchEvent(new frame.contentWindow.Event(eventType, { bubbles: true }));
    };
    change("bodyWorkoutType", "yoga", "change", frame.contentWindow.HTMLSelectElement.prototype);
    change("bodyWorkoutMinutes", "35", "input", frame.contentWindow.HTMLInputElement.prototype);
    change("bodyWorkoutName", "  Yin yoga  ", "input", frame.contentWindow.HTMLInputElement.prototype);
    documentRoot.getElementById("bodyLogForm").dispatchEvent(new frame.contentWindow.Event("submit", {
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
    const documentRoot = ${previewDocument};
    const yoga = [...documentRoot.querySelectorAll("#skateWeeklyMetrics .body-support-chip")]
      .find((chip) => chip.querySelector("strong").textContent === "Yoga");
    return yoga?.textContent.replace(/\\s/g, "") === "Yoga1x35min"
      && yoga.title === "Yin yoga"
      && documentRoot.getElementById("bodyWorkoutType").value === "gym"
      && documentRoot.getElementById("bodyWorkoutMinutes").value === ""
      && documentRoot.getElementById("bodyWorkoutName").value === "";
  })()`);

  await planner.browser.open(`${preview.url}/?view=todayView&date=${TEST_DATE}`);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.waitForExpression('document.querySelectorAll("#lifeBreakdown .breakdown-row").length === 6');
  assert.equal(await planner.browser.evaluate(gymLifePieSummary("document")), "100% · 1.42h");

  await openSkate(planner.browser, previewUrl, previewDocument);
  const reloaded = await planner.browser.evaluate(bodySupportState(previewDocument));
  assert.deepEqual(reloaded.chips, [
    { text: "Gym2x45 min", title: "Leg day" },
    { text: "Other1x5 min", title: "" },
    { text: "Recovery1xLogged", title: "" },
    { text: "Yoga1x35 min", title: "Yin yoga" }
  ]);

  const emptyLegacyUrl = `${planner.server.url}/?view=skateView&date=2026-09-21`;
  const emptyPreviewUrl = `${preview.url}/?view=legacyShell&date=2026-09-21`;
  await openSkate(planner.browser, emptyLegacyUrl, "document", false);
  const legacyEmpty = await planner.browser.evaluate(
    'document.querySelector("#skateWeeklyMetrics .body-support-empty").textContent.trim()'
  );
  await openSkate(planner.browser, emptyPreviewUrl, previewDocument, false);
  const reactEmpty = await planner.browser.evaluate(
    'document.querySelector("iframe").contentDocument.querySelector("#skateWeeklyMetrics .body-support-empty").textContent.trim()'
  );
  assert.equal(reactEmpty, legacyEmpty);
  assert.equal(reactEmpty, "Saved body support from this week will appear here.");
  assert.deepEqual(planner.browser.errors(), []);
});
