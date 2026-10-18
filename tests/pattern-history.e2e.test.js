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

async function openPlanner(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return Boolean(documentRoot
      && documentRoot.documentElement.dataset.plannerReady === "true"
      && documentRoot.getElementById("openPatternHistory"));
  })()`);
}

async function openHistory(browser, documentExpression = "document") {
  await browser.evaluate(`(${documentExpression}).getElementById("openPatternHistory").click()`);
  await browser.waitForExpression(`(${documentExpression}).getElementById("patternHistoryDialog").open`);
}

function historyState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const dialog = documentRoot.getElementById("patternHistoryDialog");
    return {
      open: dialog.open,
      heading: dialog.querySelector("h2").textContent.trim(),
      range: documentRoot.getElementById("patternHistoryRange").textContent.trim(),
      empty: dialog.querySelector(".pattern-history-empty")?.textContent.trim() || "",
      groups: [...documentRoot.querySelectorAll(".pattern-history-group")].map((group) => ({
        title: group.querySelector(".pattern-history-group-title").textContent.trim(),
        items: [...group.querySelectorAll(".pattern-history-item")].map((item) => ({
          title: item.querySelector(".pattern-history-item-head strong").textContent.trim(),
          sample: item.querySelector(".pattern-history-meta").textContent.trim(),
          summary: item.querySelector(".pattern-history-summary").textContent.trim(),
          actions: [...item.querySelectorAll(".insight-action")].map((button) => button.textContent.trim()),
          evidence: {
            label: item.querySelector(".pattern-history-evidence summary").textContent.trim(),
            open: item.querySelector(".pattern-history-evidence").open,
            rows: [...item.querySelectorAll(".pattern-history-evidence li")].map((row) => row.textContent.trim())
          }
        }))
      }))
    };
  })()`;
}

function historyVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const dialog = documentRoot.getElementById("patternHistoryDialog");
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
        maxHeight: style.maxHeight,
        overflow: style.overflow,
        padding: style.padding,
        width: rect.width
      };
    };
    const firstItem = dialog.querySelector(".pattern-history-item");
    return {
      dialog: pick(dialog),
      panel: pick(dialog.querySelector(".pattern-history-panel")),
      header: pick(dialog.querySelector(".section-head")),
      heading: pick(dialog.querySelector("h2")),
      range: pick(documentRoot.getElementById("patternHistoryRange")),
      close: pick(documentRoot.getElementById("closePatternHistory")),
      body: pick(documentRoot.getElementById("patternHistoryBody")),
      group: pick(dialog.querySelector(".pattern-history-group")),
      groupTitle: pick(dialog.querySelector(".pattern-history-group-title")),
      item: pick(firstItem),
      itemHead: pick(firstItem.querySelector(".pattern-history-item-head")),
      itemTitle: pick(firstItem.querySelector("strong")),
      meta: pick(firstItem.querySelector(".pattern-history-meta")),
      summary: pick(firstItem.querySelector(".pattern-history-summary")),
      actions: pick(firstItem.querySelector(".insight-actions")),
      action: pick(firstItem.querySelector(".insight-action")),
      evidence: pick(firstItem.querySelector(".pattern-history-evidence")),
      evidenceSummary: pick(firstItem.querySelector(".pattern-history-evidence summary")),
      evidenceList: pick(firstItem.querySelector(".pattern-history-evidence ul"))
    };
  })()`;
}

const POPULATED_HISTORY = {
  open: true,
  heading: "Pattern history",
  range: "Last 14 days through 2026-09-14",
  empty: "",
  groups: [
    {
      title: "Reality checks",
      items: [
        {
          title: "Today may be holding more tasks than you usually finish.",
          sample: "4 days",
          summary: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
          actions: ["Focus today's tasks", "Review planned hours"],
          evidence: {
            label: "Show evidence",
            open: false,
            rows: [
              "Today's plan holds 4 tasks.",
              "Recent completion average is 1 tasks/day.",
              "Recent planned average is 1 tasks/day."
            ]
          }
        },
        {
          title: "Today's planned hours are above your recent working baseline.",
          sample: "4 days",
          summary: "You planned 4h today. Recent completed days have averaged about 1h.",
          actions: ["Review planned hours", "Focus today's tasks"],
          evidence: {
            label: "Show evidence",
            open: false,
            rows: [
              "Today's plan adds up to 4h.",
              "Recent completed average is 1h/day.",
              "Recent planned average is 1h/day."
            ]
          }
        }
      ]
    },
    {
      title: "Focus friction",
      items: [{
        title: "A few open tasks still look too vague to start cleanly.",
        sample: "5 days",
        summary: "0 open tasks use broad labels, and vague tasks have been completed less often than timed or specific ones lately.",
        actions: ["Make one task concrete", "Focus today's tasks"],
        evidence: {
          label: "Show evidence",
          open: false,
          rows: [
            "0 open tasks still look broad.",
            "Vague task completion rate: 0%.",
            "Specific task completion rate: 50%."
          ]
        }
      }]
    }
  ]
};

function visualBox(overrides) {
  return {
    alignItems: "normal",
    background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "0px none rgb(0, 0, 0)",
    borderRadius: "0px",
    boxShadow: "none",
    color: "rgb(0, 0, 0)",
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    height: 0,
    lineHeight: "23.2px",
    margin: "0px",
    maxHeight: "none",
    overflow: "visible",
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedHistoryVisual(mobile) {
  const dialogWidth = mobile ? 352 : 760;
  const panelWidth = mobile ? 350 : 758;
  const contentWidth = mobile ? 314 : 710;
  const itemWidth = mobile ? 284 : 680;
  return {
    dialog: visualBox({
      background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
      border: "1px solid rgba(126, 116, 255, 0.28)",
      borderRadius: "18px",
      boxShadow: "rgba(114, 99, 135, 0.22) 0px 28px 80px 0px",
      height: mobile ? 728.359375 : 640.21875,
      margin: mobile ? "57.8125px 19px 57.8281px" : "39.8906px 260px",
      maxHeight: "calc(100% - 38px)",
      overflow: "auto",
      width: dialogWidth
    }),
    panel: visualBox({
      background: "radial-gradient(circle at 0px 0px, rgba(245, 202, 221, 0.2), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(255, 255, 255, 0.94) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      display: "grid",
      gap: "16px",
      height: mobile ? 726.359375 : 638.21875,
      padding: mobile ? "18px" : "24px",
      width: panelWidth
    }),
    header: visualBox({
      alignItems: mobile ? "start" : "baseline",
      display: "flex",
      gap: "12px",
      height: mobile ? 69.5625 : 56.21875,
      margin: "0px 0px 14px",
      width: contentWidth
    }),
    heading: visualBox({
      border: "0px none rgb(23, 24, 32)",
      color: "rgb(23, 24, 32)",
      fontSize: mobile ? "20px" : "26.4px",
      fontWeight: "570",
      height: mobile ? 23.1875 : 30.625,
      lineHeight: mobile ? "23.2px" : "30.624px",
      width: mobile ? 230.515625 : 243.296875
    }),
    range: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontWeight: "450",
      height: mobile ? 46.375 : 23.1875,
      width: mobile ? 230.515625 : 243.296875
    }),
    close: visualBox({
      background: "rgb(236, 235, 255) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(113, 107, 255)",
      borderRadius: "12px",
      color: "rgb(113, 107, 255)",
      fontWeight: "510",
      height: 42,
      padding: "9px 15px",
      width: 71.484375
    }),
    body: visualBox({
      display: "grid",
      gap: "14px",
      height: mobile ? 590.796875 : 504,
      maxHeight: mobile ? "590.8px" : "504px",
      overflow: "auto",
      width: contentWidth
    }),
    group: visualBox({
      display: "grid",
      gap: "10px",
      height: mobile ? 575.484375 : 413.640625,
      width: contentWidth
    }),
    groupTitle: visualBox({
      border: "0px none rgb(23, 24, 32)",
      color: "rgb(23, 24, 32)",
      fontSize: "14.72px",
      fontWeight: "600",
      height: 21.328125,
      lineHeight: "21.344px",
      width: contentWidth
    }),
    item: visualBox({
      background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.68)",
      borderRadius: "18px",
      display: "grid",
      gap: "10px",
      height: mobile ? 294.21875 : 213.296875,
      padding: "14px",
      width: contentWidth
    }),
    itemHead: visualBox({
      alignItems: "baseline",
      display: "flex",
      gap: "10px",
      height: mobile ? 40.8125 : 20.40625,
      width: itemWidth
    }),
    itemTitle: visualBox({
      border: "0px none rgb(23, 24, 32)",
      color: "rgb(23, 24, 32)",
      fontSize: "14.08px",
      fontWeight: "590",
      height: mobile ? 40.8125 : 20.40625,
      lineHeight: "20.416px",
      width: mobile ? 248.3125 : 368.953125
    }),
    meta: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontSize: "12px",
      fontWeight: "560",
      height: mobile ? 34.78125 : 17.390625,
      lineHeight: "17.4px",
      width: mobile ? 25.6875 : 36.015625
    }),
    summary: visualBox({
      border: "0px none rgb(95, 91, 102)",
      color: "rgb(95, 91, 102)",
      fontSize: "13.44px",
      height: mobile ? 40.84375 : 20.421875,
      lineHeight: "20.4288px",
      width: itemWidth
    }),
    actions: visualBox({
      display: "flex",
      gap: "8px",
      height: mobile ? 72.1875 : 32.09375,
      width: itemWidth
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
      padding: "6px 10px",
      width: 132.296875
    }),
    evidence: visualBox({
      display: "grid",
      gap: "8px",
      height: 80.375,
      width: itemWidth
    }),
    evidenceSummary: visualBox({
      border: "0px none rgb(112, 110, 146)",
      color: "rgb(112, 110, 146)",
      display: "list-item",
      fontSize: "12.48px",
      fontWeight: "560",
      height: 18.09375,
      lineHeight: "18.096px",
      width: itemWidth
    }),
    evidenceList: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontSize: "12.48px",
      height: 54.28125,
      lineHeight: "18.096px",
      padding: "0px 0px 0px 18px",
      width: itemWidth
    })
  };
}

test("Pattern history preserves empty, grouped, action, disclosure, and refresh behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await openHistory(planner.browser);
  assert.deepEqual(await planner.browser.evaluate(historyState()), {
    open: true,
    heading: "Pattern history",
    range: "Last 14 days through 2026-09-14",
    empty: "There is not enough stable pattern evidence yet. Keep logging normally and this will fill in.",
    groups: []
  });

  await seedTaskOverpacking(planner.server.url);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  await openHistory(planner.browser);
  assert.deepEqual(await planner.browser.evaluate(historyState()), POPULATED_HISTORY);

  await planner.browser.evaluate(`(() => {
    const planned = document.getElementById("plannedMount");
    planned.scrollIntoView = (options) => { planned.dataset.testScroll = JSON.stringify(options); };
    document.querySelectorAll(".pattern-history-item")[1].querySelector(".insight-action").click();
  })()`);
  assert.equal(
    await planner.browser.evaluate("document.getElementById('plannedMount').dataset.testScroll"),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );
  assert.equal(await planner.browser.evaluate("document.getElementById('patternHistoryDialog').open"), true);

  await planner.browser.evaluate("document.querySelector('.pattern-history-evidence summary').click()");
  await planner.browser.waitForExpression("document.querySelector('.pattern-history-evidence').open");
  assert.equal((await planner.browser.evaluate(historyState())).groups[0].items[0].evidence.open, true);

  await planner.browser.evaluate("document.getElementById('closePatternHistory').click()");
  await planner.browser.waitForExpression("!document.getElementById('patternHistoryDialog').open");
  await openHistory(planner.browser);
  assert.equal((await planner.browser.evaluate(historyState())).groups[0].items[0].evidence.open, false);
  assert.deepEqual(planner.browser.errors(), []);
});

test("Pattern history preserves its desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await seedTaskOverpacking(planner.server.url);

  const pageUrl = `${planner.server.url}/?date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, pageUrl);
  assert.equal(await planner.browser.evaluate('document.querySelector("iframe")'), null);
  await openHistory(planner.browser);
  await planner.browser.evaluate("document.querySelector('.pattern-history-evidence summary').click()");
  const desktopState = await planner.browser.evaluate(historyState());
  assert.deepEqual(desktopState, {
    ...POPULATED_HISTORY,
    groups: POPULATED_HISTORY.groups.map((group, groupIndex) => ({
      ...group,
      items: group.items.map((item, itemIndex) => ({
        ...item,
        evidence: {
          ...item.evidence,
          open: groupIndex === 0 && itemIndex === 0
        }
      }))
    }))
  });
  assert.deepEqual(
    await planner.browser.evaluate(historyVisualContract()),
    expectedHistoryVisual(false)
  );

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, pageUrl);
  await openHistory(planner.browser);
  await planner.browser.evaluate("document.querySelector('.pattern-history-evidence summary').click()");
  assert.deepEqual(
    await planner.browser.evaluate(historyVisualContract()),
    expectedHistoryVisual(true)
  );

  await planner.browser.evaluate(`(() => {
    const planned = document.getElementById("plannedMount");
    Element.prototype.scrollIntoView = function (options) {
      if (this === planned) {
        planned.dataset.testScroll = JSON.stringify(options);
      }
    };
    document.querySelectorAll(".pattern-history-item")[1].querySelector(".insight-action").click();
  })()`);
  assert.equal(
    await planner.browser.evaluate('document.getElementById("plannedMount").dataset.testScroll'),
    JSON.stringify({ behavior: "smooth", block: "center" })
  );
  assert.equal(
    await planner.browser.evaluate('document.getElementById("patternHistoryDialog").open'),
    true
  );

  await planner.browser.evaluate('document.getElementById("closePatternHistory").click()');
  await planner.browser.waitForExpression('!document.getElementById("patternHistoryDialog").open');
  await openHistory(planner.browser);
  assert.equal(
    (await planner.browser.evaluate(historyState())).groups[0].items[0].evidence.open,
    false
  );
  await planner.browser.evaluate('document.getElementById("closePatternHistory").click()');

  for (let remaining = 3; remaining >= 0; remaining -= 1) {
    await planner.browser.evaluate('document.querySelector(".task-delete").click()');
    await planner.browser.waitForExpression(
      `document.querySelectorAll(".task-delete").length === ${remaining}`
    );
  }
  await openHistory(planner.browser);
  await planner.browser.waitForExpression(
    'document.querySelectorAll(".pattern-history-group").length === 1'
  );
  const refreshedHistory = await planner.browser.evaluate(historyState());
  assert.equal(refreshedHistory.groups[0].title, "Focus friction");
  assert.equal(
    refreshedHistory.groups[0].items[0].summary,
    "0 open tasks use broad labels, and vague tasks have been completed less often than timed or specific ones lately."
  );
  assert.deepEqual(planner.browser.errors(), []);
});
