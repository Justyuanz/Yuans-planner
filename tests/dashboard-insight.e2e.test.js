const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");
const { compareScreenshots } = require("./helpers/png-compare");
const { startReactPreviewServer } = require("./helpers/react-preview-server");

const TEST_DATE = "2026-09-14";
const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";

function task(id, label, hours, done) {
  return { id, label, activity: "cpp", hours, done };
}

async function putValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedTaskOverpacking(serverUrl) {
  const historicalDates = ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"];
  await Promise.all(historicalDates.map((date, index) => putValue(
    serverUrl,
    `${DAILY_TASKS_PREFIX}${date}`,
    [task(`history-${index}`, "13:00 Complete migration slice", 1, true)]
  )));
  await putValue(serverUrl, `${DAILY_TASKS_PREFIX}${TEST_DATE}`, [
    task("today-1", "09:00 Characterize current behavior", 1, false),
    task("today-2", "11:00 Add focused regression tests", 1, false),
    task("today-3", "14:00 Implement typed boundary", 1, false),
    task("today-4", "16:00 Verify browser parity", 1, false)
  ]);
}

async function openDashboard(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    if (!documentRoot) {
      return false;
    }
    const card = documentRoot.getElementById("dashboardInsightCard");
    return documentRoot.documentElement.dataset.plannerReady === "true"
      && card
      && !card.hidden
      && documentRoot.getElementById("dashboardInsightTitle")?.textContent.trim();
  })()`);
}

async function waitForTaskOverpacking(browser, documentExpression = "document") {
  await browser.waitForExpression(`(${documentExpression}).getElementById("dashboardInsightTitle").textContent.trim()
    === "Today may be holding more tasks than you usually finish."`);
}

function insightState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const card = documentRoot.getElementById("dashboardInsightCard");
    return {
      hidden: card.hidden,
      heading: card.querySelector("h3").textContent.trim(),
      mode: documentRoot.getElementById("dashboardInsightMode").textContent.trim(),
      title: documentRoot.getElementById("dashboardInsightTitle").textContent.trim(),
      why: documentRoot.getElementById("dashboardInsightWhy").textContent.trim(),
      actions: [...documentRoot.querySelectorAll("#dashboardInsightActions .insight-action")]
        .map((button) => button.textContent.trim()),
      history: {
        hidden: documentRoot.getElementById("openPatternHistory").hidden,
        text: documentRoot.getElementById("openPatternHistory").textContent.trim()
      }
    };
  })()`;
}

function insightVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const card = documentRoot.getElementById("dashboardInsightCard");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
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
        height: rect.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        minHeight: style.minHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      panelInner: pick(card.querySelector(".panel-inner")),
      heading: pick(card.querySelector("h3")),
      mode: pick(documentRoot.getElementById("dashboardInsightMode")),
      title: pick(documentRoot.getElementById("dashboardInsightTitle")),
      why: pick(documentRoot.getElementById("dashboardInsightWhy")),
      actions: pick(documentRoot.getElementById("dashboardInsightActions")),
      action: pick(documentRoot.querySelector("#dashboardInsightActions .insight-action")),
      history: pick(documentRoot.getElementById("openPatternHistory"))
    };
  })()`;
}

function cardClip(documentExpression = "document", frameExpression = "null") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.getElementById("dashboardInsightCard").getBoundingClientRect();
    const frame = ${frameExpression};
    const frameRect = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
    return {
      x: frameRect.x + rect.x + (frame ? 0 : documentRoot.defaultView.scrollX),
      y: frameRect.y + rect.y + (frame ? 0 : documentRoot.defaultView.scrollY),
      width: rect.width,
      height: Math.min(rect.height, 640)
    };
  })()`;
}

async function scrollToInsight(browser, documentExpression = "document") {
  await browser.evaluate(`(() => {
    const documentRoot = ${documentExpression};
    const mascot = documentRoot.querySelector(".mascot-card");
    documentRoot.documentElement.style.scrollBehavior = "auto";
    if (mascot) {
      mascot.style.visibility = "hidden";
    }
    documentRoot.getElementById("dashboardInsightCard").scrollIntoView({ block: "start" });
  })()`);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    const rect = documentRoot.getElementById("dashboardInsightCard").getBoundingClientRect();
    return rect.top < documentRoot.defaultView.innerHeight && rect.bottom > 0;
  })()`);
  await browser.evaluate(`new Promise((resolve) => {
    const view = (${documentExpression}).defaultView;
    view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
  })`);
}

function assertSameScreenshot(actual, expected, label) {
  const comparison = compareScreenshots(actual, expected);
  assert.equal(comparison.matches, true, `${label}: ${JSON.stringify(comparison)}`);
}

test("Pattern noticed preserves quiet and task-overpacking behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(insightState()), {
    hidden: false,
    heading: "Pattern noticed",
    mode: "quiet mode",
    title: "No strong pattern needs attention yet.",
    why: "This space will surface patterns when your recent planner data shows something clear, but right now nothing looks urgent or obviously off-track.",
    actions: [],
    history: { hidden: false, text: "View pattern history" }
  });

  await seedTaskOverpacking(planner.server.url);
  await openDashboard(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(insightState()), {
    hidden: false,
    heading: "Pattern noticed",
    mode: "reality · 4 days",
    title: "Today may be holding more tasks than you usually finish.",
    why: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
    actions: ["Focus today's tasks", "Review planned hours"],
    history: { hidden: false, text: "View pattern history" }
  });

  await planner.browser.evaluate(`(() => {
    document.querySelector("#dashboardInsightActions .insight-action").click();
  })()`);
  assert.equal(await planner.browser.evaluate("document.activeElement === document.getElementById('taskTitle')"), true);

  await planner.browser.evaluate(`(() => {
    const planned = document.getElementById("plannedMount");
    planned.scrollIntoView = (options) => { planned.dataset.testScroll = JSON.stringify(options); };
    document.querySelectorAll("#dashboardInsightActions .insight-action")[1].click();
  })()`);
  assert.equal(
    await planner.browser.evaluate("document.getElementById('plannedMount').dataset.testScroll"),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );

  await planner.browser.evaluate("document.getElementById('openPatternHistory').click()");
  await planner.browser.waitForExpression("document.getElementById('patternHistoryDialog').open");
  const history = await planner.browser.evaluate(`(() => ({
    range: document.getElementById("patternHistoryRange").textContent.trim(),
    groups: [...document.querySelectorAll(".pattern-history-group")].map((group) => ({
      title: group.querySelector(".pattern-history-group-title").textContent.trim(),
      items: [...group.querySelectorAll(".pattern-history-item")].map((item) => ({
        title: item.querySelector("strong").textContent.trim(),
        sample: item.querySelector(".pattern-history-meta").textContent.trim(),
        evidenceLabel: item.querySelector(".pattern-history-evidence summary").textContent.trim()
      }))
    }))
  }))()`);
  assert.deepEqual(history, {
    range: "Last 14 days through 2026-09-14",
    groups: [
      {
        title: "Reality checks",
        items: [
          {
            title: "Today may be holding more tasks than you usually finish.",
            sample: "4 days",
            evidenceLabel: "Show evidence"
          },
          {
            title: "Today's planned hours are above your recent working baseline.",
            sample: "4 days",
            evidenceLabel: "Show evidence"
          }
        ]
      },
      {
        title: "Focus friction",
        items: [{
          title: "A few open tasks still look too vague to start cleanly.",
          sample: "5 days",
          evidenceLabel: "Show evidence"
        }]
      }
    ]
  });
  assert.deepEqual(planner.browser.errors(), []);
});

test("Pattern noticed records the legacy desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedTaskOverpacking(planner.server.url);
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React visual regression tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyDesktopState = await planner.browser.evaluate(insightState());
  const legacyDesktop = await planner.browser.evaluate(insightVisualContract());
  await scrollToInsight(planner.browser);
  const legacyDesktopScreenshot = await planner.browser.captureScreenshot(cardClip());
  assert.deepEqual({
    cardWidth: legacyDesktop.card.width,
    cardHeight: legacyDesktop.card.height,
    panelMinHeight: legacyDesktop.panelInner.minHeight
  }, {
    cardWidth: 459,
    cardHeight: 665.28125,
    panelMinHeight: "315px"
  });
  assert.ok(legacyDesktopScreenshot.length > 1_000);

  const previewDocument = 'document.querySelector("iframe").contentDocument';
  await openDashboard(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  await waitForTaskOverpacking(planner.browser, previewDocument);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector("iframe").contentDocument.getElementById("dashboardInsightCard").dataset.reactOwned'
  ), "true");
  const previewDesktopState = await planner.browser.evaluate(insightState(previewDocument));
  const previewDesktop = await planner.browser.evaluate(insightVisualContract(previewDocument));
  await scrollToInsight(planner.browser, previewDocument);
  const previewDesktopScreenshot = await planner.browser.captureScreenshot(cardClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewDesktopState, legacyDesktopState);
  assert.deepEqual(previewDesktop, legacyDesktop);
  assertSameScreenshot(previewDesktopScreenshot, legacyDesktopScreenshot, "desktop Pattern noticed screenshot");

  await planner.browser.setViewport(390, 844, true);
  await openDashboard(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  const legacyMobileState = await planner.browser.evaluate(insightState());
  const legacyMobile = await planner.browser.evaluate(insightVisualContract());
  await scrollToInsight(planner.browser);
  const legacyMobileScreenshot = await planner.browser.captureScreenshot(cardClip());
  assert.deepEqual({
    cardWidth: legacyMobile.card.width,
    cardHeight: legacyMobile.card.height,
    panelMinHeight: legacyMobile.panelInner.minHeight
  }, {
    cardWidth: 370,
    cardHeight: 315,
    panelMinHeight: "315px"
  });
  assert.ok(legacyMobileScreenshot.length > 1_000);

  await openDashboard(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  await waitForTaskOverpacking(planner.browser, previewDocument);
  const previewMobileState = await planner.browser.evaluate(insightState(previewDocument));
  const previewMobile = await planner.browser.evaluate(insightVisualContract(previewDocument));
  await scrollToInsight(planner.browser, previewDocument);
  const previewMobileScreenshot = await planner.browser.captureScreenshot(cardClip(
    previewDocument,
    'document.querySelector("iframe")'
  ));
  assert.deepEqual(previewMobileState, legacyMobileState);
  assert.deepEqual(previewMobile, legacyMobile);
  assertSameScreenshot(previewMobileScreenshot, legacyMobileScreenshot, "mobile Pattern noticed screenshot");
  assert.deepEqual(planner.browser.errors(), []);
});

test("React Pattern noticed delegates actions and follows legacy task changes", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedTaskOverpacking(planner.server.url);
  const preview = await startReactPreviewServer(planner.server.url);
  if (!preview) {
    context.skip("Install frontend-react dependencies to run React interaction tests.");
    return;
  }
  context.after(async function () {
    await preview.close();
  });

  const previewDocument = 'document.querySelector("iframe").contentDocument';
  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, `${preview.url}/?date=${TEST_DATE}`, previewDocument);
  await waitForTaskOverpacking(planner.browser, previewDocument);
  assert.equal(await planner.browser.evaluate(
    'document.querySelector("iframe").contentDocument.getElementById("dashboardInsightCard").dataset.reactOwned'
  ), "true");

  await planner.browser.evaluate(`(() => {
    const frameWindow = document.querySelector("iframe").contentWindow;
    const bridge = frameWindow.YuanPlannerDashboardInsightBridge;
    frameWindow.YuanPlannerDashboardInsightBridge = {
      ...bridge,
      applyAction() {
        throw new Error("React Pattern actions must not use the legacy bridge");
      },
      currentInsight() {
        throw new Error("React Pattern rules must not use the legacy bridge");
      },
      openHistory() {
        throw new Error("React Pattern history must not use the legacy bridge");
      }
    };
  })()`);

  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    documentRoot.querySelector("#dashboardInsightActions .insight-action").click();
  })()`);
  assert.equal(await planner.browser.evaluate(
    `(${previewDocument}).activeElement === (${previewDocument}).getElementById("taskTitle")`
  ), true);

  await planner.browser.evaluate(`(() => {
    const documentRoot = ${previewDocument};
    const planned = documentRoot.getElementById("plannedMount");
    documentRoot.defaultView.Element.prototype.scrollIntoView = function (options) {
      if (this === planned) {
        planned.dataset.testScroll = JSON.stringify(options);
      }
    };
    documentRoot.querySelectorAll("#dashboardInsightActions .insight-action")[1].click();
  })()`);
  assert.equal(
    await planner.browser.evaluate(`(${previewDocument}).getElementById("plannedMount").dataset.testScroll`),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );

  await planner.browser.evaluate(`(${previewDocument}).getElementById("openPatternHistory").click()`);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("patternHistoryDialog").open`);
  assert.equal(
    await planner.browser.evaluate(`(${previewDocument}).getElementById("patternHistoryRange").textContent.trim()`),
    "Last 14 days through 2026-09-14"
  );
  await planner.browser.evaluate(`(${previewDocument}).getElementById("patternHistoryDialog").close()`);

  for (let remaining = 3; remaining >= 0; remaining -= 1) {
    await planner.browser.evaluate(`(${previewDocument}).querySelector(".task-delete").click()`);
    await planner.browser.waitForExpression(`(${previewDocument}).querySelectorAll(".task-delete").length === ${remaining}`);
  }
  const updatedMetricCount = await planner.browser.evaluate(`document.querySelector("iframe").contentWindow
    .YuanPlannerDashboardInsightBridge.currentMetrics()?.todaySummary?.plannedCount`);
  assert.equal(updatedMetricCount, 0);
  await planner.browser.waitForExpression(`(${previewDocument}).getElementById("dashboardInsightTitle").textContent.trim()
    === "A few open tasks still look too vague to start cleanly."`);
  assert.deepEqual(await planner.browser.evaluate(insightState(previewDocument)), {
    hidden: false,
    heading: "Pattern noticed",
    mode: "focus · 5 days",
    title: "A few open tasks still look too vague to start cleanly.",
    why: "0 open tasks use broad labels, and vague tasks have been completed less often than timed or specific ones lately.",
    actions: ["Make one task concrete", "Focus today's tasks"],
    history: { hidden: false, text: "View pattern history" }
  });
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    return JSON.parse(stored[`${DAILY_TASKS_PREFIX}${TEST_DATE}`] || "[]").length === 0;
  });
  assert.deepEqual(planner.browser.errors(), []);
});
