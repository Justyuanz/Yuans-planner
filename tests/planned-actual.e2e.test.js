const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-13";
const PLANNED_KEY = "hivePlanner.planned.2026-W37";
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

const TASKS_BY_DATE = {
  "2026-08-20": [
    { id: "older-study", label: "Older study", activity: "lc", hours: 12, done: true }
  ],
  "2026-09-12": [
    { id: "week-python", label: "Python block", activity: "python", hours: 1, done: true },
    { id: "week-gym", label: "Gym block", activity: "p90x3", hours: 2, done: true }
  ],
  "2026-09-13": [
    { id: "day-coding", label: "Coding block", activity: "cpp", hours: 2, done: false },
    { id: "day-skate", label: "Skate block", activity: "skate", hours: 1, done: true },
    { id: "day-guitar", label: "Guitar block", activity: "guitar", hours: 0.5, done: true },
    { id: "day-other", label: "Excluded block", activity: "other", hours: 10, done: true }
  ]
};

const PLANNED_HOURS = {
  lc: 1,
  cpp: 3.5,
  python: "2",
  skate: 2,
  p90x3: 1.25,
  guitar: 0.75,
  futureActivity: { preserve: true }
};

async function putPlannerValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

async function seedPlanner(serverUrl) {
  await Promise.all([
    putPlannerValue(serverUrl, PLANNED_KEY, PLANNED_HOURS),
    ...Object.entries(TASKS_BY_DATE).map(([date, tasks]) =>
      putPlannerValue(serverUrl, `hivePlanner.dailyTasks.${date}`, tasks))
  ]);
}

function plannedActualState(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const groups = [...documentRoot.querySelectorAll("#plannedMount .planned-group")];
    return {
      week: documentRoot.getElementById("plannedWeekLabel").textContent.trim(),
      groups: groups.map((group) => ({
        title: group.querySelector(".planned-title").textContent.trim(),
        progress: group.querySelector(".soft-progress-title").textContent.trim(),
        progressWidth: group.querySelector(".soft-progress-track span").style.width,
        rows: [...group.querySelectorAll(".planned-row")].map((row) => {
          const input = row.querySelector("input");
          return {
            actual: row.querySelector("span").textContent.trim(),
            className: row.className,
            id: input.id,
            inputMode: input.inputMode,
            label: row.querySelector("strong").textContent.trim(),
            max: input.max,
            min: input.min,
            step: input.step,
            value: input.value
          };
        })
      }))
    };
  })()`;
}

function plannedActualVisualContract(documentExpression) {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".planned-card");
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
        gridTemplateColumns: style.gridTemplateColumns,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    const inputs = [...panel.querySelectorAll(".planned-row input")];
    const progress = [...panel.querySelectorAll(".soft-progress")];
    const rows = [...panel.querySelectorAll(".planned-row")];
    const geometry = (elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    });
    return {
      heading: {
        text: panel.querySelector("h3").textContent.trim(),
        visual: pick(panel.querySelector("h3"))
      },
      input: pick(inputs[0]),
      inputGeometry: geometry(inputs),
      note: {
        text: documentRoot.getElementById("plannedWeekLabel").textContent.trim(),
        visual: pick(documentRoot.getElementById("plannedWeekLabel"))
      },
      panel: pick(panel),
      progress: pick(progress[0]),
      progressGeometry: geometry(progress),
      row: pick(rows[0]),
      rowGeometry: geometry(rows)
    };
  })()`;
}

function assertEmptyState(state) {
  assert.equal(state.week, "2026-W37");
  assert.deepEqual(state.groups.map((group) => group.title), [
    "StudyPlanned 0h · Actual 0h",
    "LeisurePlanned 0h · Actual 0h"
  ]);
  assert.deepEqual(state.groups.map((group) => group.progress), [
    "Study progress0 / soft",
    "Leisure progress0 / soft"
  ]);
  assert.deepEqual(
    state.groups.flatMap((group) => group.rows.map((row) => row.value)),
    ["", "", "", "", "", ""]
  );
}

function assertPopulatedState(state) {
  assert.deepEqual(state.groups.map((group) => group.title), [
    "StudyPlanned 6.5h · Actual 3h",
    "LeisurePlanned 4h · Actual 3.5h"
  ]);
  assert.deepEqual(state.groups.map((group) => group.progress), [
    "Study progress3 / 6.5",
    "Leisure progress3.5 / 4"
  ]);
  assert.deepEqual(state.groups.map((group) => group.progressWidth), ["46%", "88%"]);
  assert.deepEqual(state.groups.flatMap((group) => group.rows.map((row) => row.id)), [
    "planned-transcendence", "planned-mobileDevelopment", "planned-portfolioJobPrep", "planned-skate", "planned-gym", "planned-guitar"
  ]);
  assert.deepEqual(state.groups.flatMap((group) => group.rows.map((row) => row.actual)), [
    "2h", "1h", "0h", "1h", "2h", "0.5h"
  ]);
  state.groups.flatMap((group) => group.rows).forEach((row) => {
    assert.deepEqual({ inputMode: row.inputMode, max: row.max, min: row.min, step: row.step }, {
      inputMode: "decimal", max: "168", min: "0", step: "0.25"
    });
  });
}

function assertTranscendenceEditState(state, value, plannedTotal, progressWidth) {
  assert.equal(state.week, "2026-W37");
  assert.equal(state.groups[0].title, `StudyPlanned ${plannedTotal}h · Actual 3h`);
  assert.equal(state.groups[0].progress, `Study progress3 / ${plannedTotal}`);
  assert.equal(state.groups[0].progressWidth, progressWidth);
  assert.equal(state.groups[0].rows[0].value, value);
  assert.equal(state.groups[1].title, "LeisurePlanned 4h · Actual 3.5h");
  assert.equal(state.groups[1].progressWidth, "88%");
}

function visualBox(overrides) {
  return {
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
    gridTemplateColumns: "none",
    height: 0,
    lineHeight: "23.2px",
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedPlannedActualVisual(mobile) {
  const inputWidth = mobile ? 68 : 72;
  const contentWidth = mobile ? 279 : 352;
  const repeatedGeometry = (count, height, width) => Array.from(
    { length: count },
    () => ({ height, width })
  );
  return {
    heading: {
      text: "Planned vs actual",
      visual: visualBox({
        fontSize: mobile ? "20px" : "26.4px",
        fontWeight: "570",
        height: mobile ? 23.1875 : 30.625,
        lineHeight: mobile ? "23.2px" : "30.624px",
        width: mobile ? 160.703125 : 212.125
      })
    },
    input: visualBox({
      background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "15px",
      color: "rgb(45, 47, 43)",
      fontSize: "14.72px",
      fontWeight: "430",
      height: 42,
      lineHeight: "18.4px",
      padding: "9px 12px",
      width: inputWidth
    }),
    inputGeometry: repeatedGeometry(6, 42, inputWidth),
    note: {
      text: "2026-W37",
      visual: visualBox({
        border: "0px none rgb(118, 118, 129)",
        color: "rgb(118, 118, 129)",
        fontWeight: "450",
        height: 23.1875,
        width: 77.859375
      })
    },
    panel: visualBox({
      background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
      height: mobile ? 641.84375 : 665.28125,
      width: mobile ? 370 : 459
    }),
    progress: visualBox({
      background: "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.72)",
      borderRadius: "15px",
      display: "grid",
      gap: "9px",
      gridTemplateColumns: mobile ? "253px" : "326px",
      height: 64.875,
      padding: "12px",
      width: contentWidth
    }),
    progressGeometry: repeatedGeometry(2, 64.875, contentWidth),
    row: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      display: "grid",
      fontSize: "14.72px",
      fontWeight: "510",
      gap: "12px",
      gridTemplateColumns: mobile ? "135px 68px 52px" : "192px 72px 64px",
      height: 42,
      lineHeight: "21.344px",
      width: contentWidth
    }),
    rowGeometry: repeatedGeometry(6, 42, contentWidth)
  };
}

async function editTranscendencePlan(planner) {
  const titleBeforeChange = await planner.browser.evaluate(`(() => {
    const input = document.getElementById("planned-transcendence");
    input.value = "5.25";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return document.querySelector("#plannedMount .planned-title").textContent.trim();
  })()`);
  assert.equal(titleBeforeChange, "StudyPlanned 6.5h · Actual 3h");
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const planned = JSON.parse(stored[PLANNED_KEY] || "{}");
    const entries = JSON.parse(stored["hivePlanner.activityLog"] || "[]");
    const latest = entries.at(-1);
    return planned.transcendence === 5.25
      && planned.futureActivity.preserve === true
      && latest?.action === "planned_hours_updated"
      && latest.before === 3.5
      && latest.after === 5.25
      && latest.meta?.group === "study";
  });
  await planner.browser.evaluate(`(() => {
    document.getElementById("planned-transcendence").dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#plannedMount .planned-title").textContent.includes("8.25h")');
  await planner.browser.reload();
  await planner.browser.waitForExpression('document.getElementById("planned-transcendence").value === "5.25"');
}

async function reviseTranscendencePlan(planner) {
  const titleBeforeChange = await planner.browser.evaluate(`(() => {
    const input = document.getElementById("planned-transcendence");
    input.value = "4.5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return document.querySelector("#plannedMount .planned-title").textContent.trim();
  })()`);
  assert.equal(titleBeforeChange, "StudyPlanned 8.25h · Actual 3h");
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const planned = JSON.parse(stored[PLANNED_KEY] || "{}");
    const entries = JSON.parse(stored["hivePlanner.activityLog"] || "[]");
    const latest = entries.at(-1);
    return planned.transcendence === 4.5
      && planned.futureActivity.preserve === true
      && latest?.action === "planned_hours_updated"
      && latest.before === 5.25
      && latest.after === 4.5
      && latest.meta?.group === "study";
  });
  await planner.browser.evaluate(`(() => {
    const input = document.getElementById("planned-transcendence");
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await planner.browser.waitForExpression('document.querySelector("#plannedMount .planned-title").textContent.includes("7.5h")');
}

async function assertPlannedLogSurvivesTaskWrite(planner, pageUrl) {
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression('document.documentElement.dataset.plannerReady === "true"');
  await planner.browser.evaluate(`(() => {
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setInput.call(document.getElementById("taskTitle"), "Storage bridge check");
    document.getElementById("taskTitle").dispatchEvent(new Event("input", { bubbles: true }));
    setInput.call(document.getElementById("taskTime"), "0");
    document.getElementById("taskTime").dispatchEvent(new Event("input", { bubbles: true }));
    setSelect.call(document.getElementById("taskActivity"), "other");
    document.getElementById("taskActivity").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("taskForm").dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  })()`);
  await planner.server.waitFor(async function () {
    const stored = await planner.server.readPlannerData();
    const entries = JSON.parse(stored["hivePlanner.activityLog"] || "[]");
    const tasks = JSON.parse(stored["hivePlanner.dailyTasks.2026-09-13"] || "[]");
    return tasks.some((task) => task.label === "Storage bridge check")
      && entries.some((entry) => entry.action === "planned_hours_updated" && entry.after === 4.5)
      && entries.some((entry) => entry.action === "task_created" && entry.after?.label === "Storage bridge check");
  });
}

test("Planned vs actual preserves totals, editing, logging, and its visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context);
  if (!planner) {
    return;
  }
  const pageUrl = `${planner.server.url}/?date=${TEST_DATE}`;

  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression('document.querySelectorAll("#plannedMount .planned-row").length === 6');

  assertEmptyState(await planner.browser.evaluate(plannedActualState("document")));

  await seedPlanner(planner.server.url);
  await planner.browser.reload();
  await planner.browser.waitForExpression('document.querySelector("#plannedMount .planned-title")?.textContent.includes("6.5h")');

  assertPopulatedState(await planner.browser.evaluate(plannedActualState("document")));
  await editTranscendencePlan(planner);
  assertTranscendenceEditState(
    await planner.browser.evaluate(plannedActualState("document")),
    "5.25",
    "8.25",
    "36%"
  );
  assert.deepEqual(
    await planner.browser.evaluate(plannedActualVisualContract("document")),
    expectedPlannedActualVisual(false)
  );

  await reviseTranscendencePlan(planner);
  assertTranscendenceEditState(
    await planner.browser.evaluate(plannedActualState("document")),
    "4.5",
    "7.5",
    "40%"
  );
  await assertPlannedLogSurvivesTaskWrite(planner, pageUrl);

  await planner.browser.setViewport(390, 844, true);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression('document.getElementById("planned-transcendence")?.value === "4.5"');
  assertTranscendenceEditState(
    await planner.browser.evaluate(plannedActualState("document")),
    "4.5",
    "7.5",
    "40%"
  );
  assert.deepEqual(
    await planner.browser.evaluate(plannedActualVisualContract("document")),
    expectedPlannedActualVisual(true)
  );
  assert.deepEqual(planner.browser.errors(), []);
});
