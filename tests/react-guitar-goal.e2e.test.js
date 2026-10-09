const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const FOCUS_KEY = "hivePlanner.guitar.focus";
const NEXT_STEP_KEY = "hivePlanner.guitar.nextStep";
const TARGET_KEY = "hivePlanner.guitar.weeklyTarget";
const SESSIONS_KEY = "hivePlanner.guitar.sessions";
const TASKS_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;

const INITIAL_SESSIONS = [
  {
    durationHours: 0.5,
    finishedAt: "2026-09-14T11:00:00.000Z",
    focus: "Clean chord changes",
    id: "guitar-current-1",
    note: "Chord switch",
    trackedInTask: false
  },
  {
    durationHours: "0.75",
    finishedAt: "2026-09-15T18:00:00.000Z",
    focus: "Fingerstyle",
    id: "guitar-current-2",
    note: "",
    trackedInTask: false
  },
  {
    durationHours: 1,
    finishedAt: "2026-09-10T16:00:00.000Z",
    id: "guitar-older",
    nextStep: "Old practice",
    trackedInTask: false
  }
];

async function putRaw(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value })
  });
  assert.equal(response.ok, true);
}

async function seedGuitar(serverUrl) {
  const values = [
    [FOCUS_KEY, "Clean chord changes"],
    [NEXT_STEP_KEY, "Play the bridge slowly"],
    [TARGET_KEY, "4"],
    [SESSIONS_KEY, JSON.stringify(INITIAL_SESSIONS)],
    [TASKS_KEY, JSON.stringify([{
      activity: "guitar",
      done: false,
      futureField: { preserve: true },
      hours: 0,
      id: "guitar-task",
      label: "Guitar practice",
      timerSeconds: 0,
      timerStartedAt: null
    }])]
  ];
  for (const [key, value] of values) {
    await putRaw(serverUrl, key, value);
  }
}

function guitarContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const goalCard = documentRoot.querySelector(".guitar-goal-card");
    const sessionCard = documentRoot.querySelector(".guitar-session-card");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
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
      activeView: documentRoot.querySelector(".view.active")?.id,
      focus: documentRoot.getElementById("guitarFocusInput")?.value,
      focusInput: pick(documentRoot.getElementById("guitarFocusInput")),
      goalCard: pick(goalCard),
      goalPanel: pick(goalCard.querySelector(".panel-inner")),
      heading: documentRoot.getElementById("guitarHeading")?.textContent.trim(),
      history: [...documentRoot.querySelectorAll("#guitarRecentSessions > *")].map((row) => ({
        text: row.textContent.trim(),
        title: row.getAttribute("title")
      })),
      nextStep: documentRoot.getElementById("guitarNextStepInput")?.value,
      plan: documentRoot.getElementById("guitarSessionPlan")?.textContent.trim(),
      sessionCard: pick(sessionCard),
      sessionHint: documentRoot.getElementById("guitarSessionHint")?.textContent.trim(),
      sessionStatus: documentRoot.getElementById("guitarSessionStatus")?.textContent.trim(),
      summary: [...documentRoot.querySelectorAll("#guitarSessionSummary .guitar-summary-card")]
        .map((card) => card.textContent.trim()),
      timerButtons: [...documentRoot.querySelectorAll("#startGuitarSession, #finishGuitarSession")]
        .map((button) => ({ disabled: button.disabled, text: button.textContent.trim() }))
    };
  })()`;
}

async function prepareGoalScreenshot(browser, documentExpression) {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".guitar-goal-card").scrollIntoView({ block: "start" });
  })()`);
  await browser.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

function goalClip(documentExpression, frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.querySelector(".guitar-goal-card").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frameRect.x + rect.x + (frame ? 0 : documentRoot.defaultView.scrollX),
      y: frameRect.y + rect.y + (frame ? 0 : documentRoot.defaultView.scrollY),
      width: rect.width,
      height: rect.height
    };
  })()`;
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

async function waitForLegacyGuitar(browser) {
  await browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await browser.waitForExpression('document.getElementById("guitarView").classList.contains("active")');
  await browser.waitForExpression('document.querySelectorAll("#guitarSessionSummary .guitar-summary-card").length === 4');
}

async function waitForReactGuitar(browser, expectedFocus = "Clean chord changes") {
  await browser.waitForExpression(`(() => {
    const frame = document.querySelector("iframe");
    const frameDocument = frame?.contentDocument;
    return frameDocument?.documentElement.dataset.plannerReady === "true"
      && frameDocument.querySelector(".guitar-goal-card")?.dataset.reactOwned === "true"
      && frameDocument.getElementById("guitarFocusInput")?.value === ${JSON.stringify(expectedFocus)}
      && frameDocument.querySelectorAll("#guitarSessionSummary .guitar-summary-card").length === 4;
  })()`);
}

async function setFrameField(browser, id, value) {
  await browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const field = frame.contentDocument.getElementById(${JSON.stringify(id)});
    const setter = Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value").set;
    setter.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
  })()`);
}

test("React owns Guitar goals while preserving the complete shipped Guitar flow", { timeout: 90_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) return;
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run Guitar migration tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });
  await seedGuitar(planner.server.url);

  const legacyUrl = `${planner.server.url}/?view=guitarView&date=${TEST_DATE}`;
  const previewUrl = `${preview.url}/?view=guitarView&date=${TEST_DATE}`;
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await planner.browser.setViewport(width, height, width < 500);
    await planner.browser.open(legacyUrl);
    await waitForLegacyGuitar(planner.browser);
    const legacyState = await planner.browser.evaluate(guitarContract("document"));
    await prepareGoalScreenshot(planner.browser, "document");
    const legacyScreenshot = await planner.browser.captureScreenshot(goalClip("document"));

    await planner.browser.open(previewUrl);
    await waitForReactGuitar(planner.browser);
    const frameDocument = 'document.querySelector("iframe").contentDocument';
    const reactState = await planner.browser.evaluate(guitarContract(frameDocument));
    await prepareGoalScreenshot(planner.browser, frameDocument);
    const reactScreenshot = await planner.browser.captureScreenshot(goalClip(
      frameDocument,
      'document.querySelector("iframe")'
    ));

    assert.deepEqual(reactState, legacyState);
    assert.deepEqual(reactState.summary, [
      "This week2 / 4",
      "Weekly target4",
      "Minutes played75 min",
      "Average session38 min"
    ]);
    assert.equal(reactState.plan, "This week: 75 / 120 min. 2 more sessions and about 45 min to hit the target. Practice next: Play the bridge slowly. Current focus: Clean chord changes.");
    assertSameScreenshot(reactScreenshot, legacyScreenshot, `${width}px Guitar goal card`);
  }

  await planner.browser.setViewport(1280, 900);
  await planner.browser.open(previewUrl);
  await waitForReactGuitar(planner.browser);
  await setFrameField(planner.browser, "guitarFocusInput", "Arpeggios");
  await setFrameField(planner.browser, "guitarNextStepInput", "Play bar 8 slowly");
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    return data[FOCUS_KEY] === "Arpeggios" && data[NEXT_STEP_KEY] === "Play bar 8 slowly";
  });

  await planner.browser.evaluate('document.querySelector("iframe").contentDocument.getElementById("startGuitarSession").click()');
  await planner.browser.waitForExpression('document.querySelector("iframe").contentDocument.getElementById("finishGuitarSession").disabled === false');
  await planner.browser.reload();
  await waitForReactGuitar(planner.browser, "Arpeggios");
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document.querySelector("iframe").contentDocument;
    return {
      finishDisabled: documentRoot.getElementById("finishGuitarSession").disabled,
      focus: documentRoot.getElementById("guitarFocusInput").value,
      nextStep: documentRoot.getElementById("guitarNextStepInput").value,
      startDisabled: documentRoot.getElementById("startGuitarSession").disabled,
      status: documentRoot.getElementById("guitarSessionStatus").textContent.trim()
    };
  })()`), {
    finishDisabled: true,
    focus: "Arpeggios",
    nextStep: "Play bar 8 slowly",
    startDisabled: false,
    status: "No active Guitar session."
  });

  await planner.browser.evaluate(`(() => {
    const documentRoot = document.querySelector("iframe").contentDocument;
    documentRoot.getElementById("startGuitarSession").click();
    documentRoot.getElementById("finishGuitarSession").click();
  })()`);
  await planner.browser.waitForExpression('document.querySelector("iframe").contentDocument.getElementById("guitarSessionDialog").open');
  await planner.browser.evaluate(`(() => {
    const frame = document.querySelector("iframe");
    const documentRoot = frame.contentDocument;
    const duration = documentRoot.getElementById("guitarDurationMinutes");
    const note = documentRoot.getElementById("guitarSessionNote");
    Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value").set.call(duration, "30");
    Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLTextAreaElement.prototype, "value").set.call(note, "Cleaner transition");
    documentRoot.getElementById("guitarSessionForm").requestSubmit();
  })()`);
  const saved = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const sessions = JSON.parse(data[SESSIONS_KEY] || "[]");
    const tasks = JSON.parse(data[TASKS_KEY] || "[]");
    return sessions.length === 4 && tasks[0]?.done ? { sessions, tasks } : null;
  });
  const latestSession = saved.sessions.at(-1);
  assert.equal(latestSession.focus, "Arpeggios");
  assert.equal(latestSession.nextStep, "Play bar 8 slowly");
  assert.equal(latestSession.note, "Cleaner transition");
  assert.equal(latestSession.durationHours, 0.5);
  assert.equal(latestSession.trackedInTask, true);
  assert.equal(saved.tasks[0].hours, 0.5);
  assert.equal(saved.tasks[0].done, true);
  assert.equal(saved.tasks[0].label, "Guitar practice");
  await planner.browser.waitForExpression(`document.querySelector("iframe").contentDocument.getElementById("guitarSessionHint").textContent.includes("Guitar practice")`);

  await putRaw(planner.server.url, TARGET_KEY, "not-a-number");
  await putRaw(planner.server.url, SESSIONS_KEY, "not-json");
  await planner.browser.evaluate(`localStorage.removeItem(${JSON.stringify(TARGET_KEY)}); localStorage.removeItem(${JSON.stringify(SESSIONS_KEY)});`);
  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    const documentRoot = document.querySelector("iframe")?.contentDocument;
    return documentRoot?.documentElement.dataset.plannerReady === "true"
      && documentRoot.querySelector("#guitarSessionSummary .guitar-summary-card strong")?.textContent === "0 / 4";
  })()`);
  assert.deepEqual(await planner.browser.evaluate(`(() => {
    const documentRoot = document.querySelector("iframe").contentDocument;
    return {
      emptyHistory: documentRoot.getElementById("guitarRecentSessions").textContent.trim(),
      plan: documentRoot.getElementById("guitarSessionPlan").textContent.trim(),
      summary: [...documentRoot.querySelectorAll("#guitarSessionSummary .guitar-summary-card strong")]
        .map((item) => item.textContent.trim())
    };
  })()`), {
    emptyHistory: "Finish one session and this space will start showing what you practised and how long you stayed with it.",
    plan: "This week: 0 / 120 min. 4 more sessions and about 120 min to hit the target. Practice next: Play bar 8 slowly. Current focus: Arpeggios.",
    summary: ["0 / 4", "4", "0 min", "Not yet"]
  });
  assert.deepEqual(planner.browser.errors(), []);
});
