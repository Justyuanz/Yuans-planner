const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-14";
const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

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

function visualBox(overrides) {
  return {
    alignItems: "normal",
    background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "0px none rgb(23, 24, 32)",
    borderRadius: "0px",
    boxShadow: "none",
    color: "rgb(23, 24, 32)",
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    height: 0,
    lineHeight: "23.2px",
    margin: "0px",
    minHeight: "0px",
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedInsightVisual(mobile) {
  const contentWidth = mobile ? 338 : 411;
  return {
    card: visualBox({
      background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
      height: mobile ? 315 : 665.28125,
      minHeight: "auto",
      width: mobile ? 370 : 459
    }),
    panelInner: visualBox({
      height: 315,
      minHeight: "315px",
      padding: mobile ? "16px" : "24px",
      width: mobile ? 370 : 459
    }),
    heading: visualBox({
      fontSize: mobile ? "20px" : "26.4px",
      fontWeight: "570",
      height: mobile ? 23.1875 : 30.625,
      lineHeight: mobile ? "23.2px" : "30.624px",
      minHeight: "auto",
      width: mobile ? 140.5 : 185.46875
    }),
    mode: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontWeight: "450",
      height: 23.1875,
      minHeight: "auto",
      width: 104.5625
    }),
    title: visualBox({
      fontSize: "15.36px",
      fontWeight: "580",
      height: mobile ? 43.59375 : 21.796875,
      lineHeight: "21.8112px",
      margin: "0px 0px 10px",
      width: contentWidth
    }),
    why: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontSize: "13.76px",
      height: 41.28125,
      lineHeight: "20.64px",
      margin: "0px 0px 14px",
      width: contentWidth
    }),
    actions: visualBox({
      display: "flex",
      gap: "8px",
      height: 32.09375,
      width: contentWidth
    }),
    action: visualBox({
      background: "rgba(255, 255, 255, 0.78) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.72)",
      borderRadius: "999px",
      color: "rgb(87, 87, 96)",
      fontSize: "12.48px",
      fontWeight: "550",
      height: 32.09375,
      lineHeight: "18.096px",
      minHeight: "32px",
      padding: "6px 10px",
      width: 132.296875
    }),
    history: visualBox({
      background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
      border: "0px none rgb(112, 110, 146)",
      color: "rgb(112, 110, 146)",
      display: "inline-block",
      fontSize: "12.8px",
      fontWeight: "560",
      height: 18.546875,
      lineHeight: "18.56px",
      margin: "10px 0px 0px",
      width: 118.5625
    })
  };
}

test("Pattern noticed preserves quiet and task-overpacking behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
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
  await openDashboard(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
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

test("Pattern noticed preserves its desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedTaskOverpacking(planner.server.url);

  const pageUrl = `${planner.server.url}/?view=todayView&date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, pageUrl);
  await waitForTaskOverpacking(planner.browser);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  assert.deepEqual(await planner.browser.evaluate(insightState()), {
    hidden: false,
    heading: "Pattern noticed",
    mode: "reality · 4 days",
    title: "Today may be holding more tasks than you usually finish.",
    why: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
    actions: ["Focus today's tasks", "Review planned hours"],
    history: { hidden: false, text: "View pattern history" }
  });
  assert.deepEqual(
    await planner.browser.evaluate(insightVisualContract()),
    expectedInsightVisual(false)
  );

  await planner.browser.setViewport(390, 844, true);
  await openDashboard(planner.browser, pageUrl);
  await waitForTaskOverpacking(planner.browser);
  assert.deepEqual(
    await planner.browser.evaluate(insightVisualContract()),
    expectedInsightVisual(true)
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("React Pattern noticed routes actions and follows direct task changes", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedTaskOverpacking(planner.server.url);

  await planner.browser.setViewport(1280, 720);
  await openDashboard(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  await waitForTaskOverpacking(planner.browser);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);

  await planner.browser.evaluate(`(() => {
    document.querySelector("#dashboardInsightActions .insight-action").click();
  })()`);
  assert.equal(await planner.browser.evaluate(
    'document.activeElement === document.getElementById("taskTitle")'
  ), true);

  await planner.browser.evaluate(`(() => {
    const planned = document.getElementById("plannedMount");
    Element.prototype.scrollIntoView = function (options) {
      if (this === planned) {
        planned.dataset.testScroll = JSON.stringify(options);
      }
    };
    document.querySelectorAll("#dashboardInsightActions .insight-action")[1].click();
  })()`);
  assert.equal(
    await planner.browser.evaluate('document.getElementById("plannedMount").dataset.testScroll'),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );

  await planner.browser.evaluate('document.getElementById("openPatternHistory").click()');
  await planner.browser.waitForExpression('document.getElementById("patternHistoryDialog").open');
  assert.equal(
    await planner.browser.evaluate('document.getElementById("patternHistoryRange").textContent.trim()'),
    "Last 14 days through 2026-09-14"
  );
  await planner.browser.evaluate('document.getElementById("patternHistoryDialog").close()');

  for (let remaining = 3; remaining >= 0; remaining -= 1) {
    await planner.browser.evaluate('document.querySelector(".task-delete").click()');
    await planner.browser.waitForExpression(`document.querySelectorAll(".task-delete").length === ${remaining}`);
  }
  await planner.browser.waitForExpression(`document.getElementById("dashboardInsightTitle").textContent.trim()
    === "A few open tasks still look too vague to start cleanly."`);
  assert.deepEqual(await planner.browser.evaluate(insightState()), {
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
