const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-17";
const TASKS_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

async function putStoredValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function openPlanner(browser, pageUrl, documentExpression = "document") {
  await browser.open(pageUrl);
  await browser.waitForExpression(`(() => {
    const documentRoot = ${documentExpression};
    return Boolean(documentRoot?.documentElement?.dataset.plannerReady === "true"
      && documentRoot.getElementById("progressText")?.textContent.includes("tasks done today"));
  })()`);
}

function progressState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    return {
      message: documentRoot.getElementById("dayMessage").textContent.trim(),
      progress: documentRoot.getElementById("progressText").textContent.trim()
    };
  })()`;
}

function progressVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const banner = documentRoot.querySelector(".day-banner");
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
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        margin: style.margin,
        minHeight: style.minHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      banner: pick(banner),
      message: pick(documentRoot.getElementById("dayMessage")),
      progress: pick(documentRoot.getElementById("progressText"))
    };
  })()`;
}

function expectedProgressVisual(bannerWidth, bannerHeight) {
  const shared = {
    color: "rgb(79, 136, 133)",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "560",
    lineHeight: "23.2px"
  };
  return {
    banner: {
      alignItems: "center",
      background: "rgba(0, 0, 0, 0) linear-gradient(90deg, rgb(231, 251, 255), rgb(245, 246, 214)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(79, 136, 133, 0.13)",
      borderRadius: "15px",
      ...shared,
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      height: bannerHeight,
      justifyContent: "space-between",
      margin: "0px 0px 14px",
      minHeight: "0px",
      padding: "10px 12px",
      width: bannerWidth
    },
    message: {
      alignItems: "normal",
      background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(79, 136, 133)",
      borderRadius: "0px",
      ...shared,
      display: "block",
      flexWrap: "nowrap",
      gap: "normal",
      height: 23.1875,
      justifyContent: "normal",
      margin: "0px",
      minHeight: "auto",
      padding: "0px",
      width: 279.640625
    },
    progress: {
      alignItems: "center",
      background: "rgba(255, 255, 255, 0.74) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(79, 136, 133)",
      borderRadius: "999px",
      ...shared,
      display: "flex",
      flexWrap: "nowrap",
      gap: "normal",
      height: 35.1875,
      justifyContent: "normal",
      margin: "0px",
      minHeight: "34px",
      padding: "6px 11px",
      width: 185.546875
    }
  };
}

const STORED_TASKS = [
  { id: "first", label: "09:00 First task", activity: "lc", done: true },
  { id: "second", label: "10:00 Second task", activity: "cpp", done: false },
  { id: "third", label: "11:00 Third task", activity: "python", done: "yes" },
  { id: "blank", label: "   ", done: true },
  null
];

test("task progress preserves filtering, completion updates, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "0 / 0 tasks done today"
  });

  await putStoredValue(planner.server.url, TASKS_KEY, STORED_TASKS);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "2 / 3 tasks done today"
  });

  await planner.browser.evaluate(`(() => {
    const task = [...document.querySelectorAll(".task")]
      .find((item) => item.textContent.includes("Second task"));
    task.querySelector(".task-check").click();
  })()`);
  await planner.browser.waitForExpression(
    'document.getElementById("progressText").textContent === "3 / 3 tasks done today"'
  );

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.getElementById("progressText")?.textContent === "3 / 3 tasks done today"'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("task progress preserves its desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, TASKS_KEY, STORED_TASKS.slice(0, 3));

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "2 / 3 tasks done today"
  });
  assert.deepEqual(
    await planner.browser.evaluate(progressVisualContract()),
    expectedProgressVisual(892, 57.1875)
  );

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(progressState()), {
    message: "Tasks from your calendar and planner.",
    progress: "2 / 3 tasks done today"
  });
  assert.deepEqual(
    await planner.browser.evaluate(progressVisualContract()),
    expectedProgressVisual(338, 90.375)
  );

  await planner.browser.evaluate(`(() => {
    const task = [...document.querySelectorAll(".task")]
      .find((item) => item.textContent.includes("Second task"));
    task.querySelector(".task-check").click();
  })()`);
  await planner.browser.waitForExpression(`(() => {
    return document.getElementById("progressText")?.textContent === "3 / 3 tasks done today";
  })()`);
  await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASKS_KEY] || "[]");
    return tasks.find((task) => task.id === "second")?.done === true;
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    return document.getElementById("progressText")?.textContent === "3 / 3 tasks done today";
  })()`);
  assert.deepEqual(planner.browser.errors(), []);
});
