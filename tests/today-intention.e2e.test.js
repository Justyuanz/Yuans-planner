const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

const TEST_DATE = "2026-09-17";
const ROUTINE_KEY = "hivePlanner.routine.week.2026-W38";
const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

function routineWithThursday(type) {
  return {
    week: "2026-W38",
    isConfigured: true,
    days: ["normal", "recovery", "normal", type, "high", "normal", "recovery"]
      .map((dayType) => ({ type: dayType }))
  };
}

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
      && documentRoot.getElementById("todayThemeBadge")?.classList.contains("day-type-pill"));
  })()`);
}

function intentionState(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const badge = documentRoot.getElementById("todayThemeBadge");
    return {
      label: documentRoot.querySelector(".intention-block-head > strong").textContent.trim(),
      badge: badge.textContent.trim(),
      badgeClass: badge.className
    };
  })()`;
}

function intentionVisualContract(documentExpression = "document") {
  return `(() => {
    const documentRoot = ${documentExpression};
    const view = documentRoot.defaultView;
    const block = documentRoot.querySelector(".intention-block");
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
      block: pick(block),
      head: pick(block.querySelector(".intention-block-head")),
      label: pick(block.querySelector(".intention-block-head > strong")),
      badge: pick(documentRoot.getElementById("todayThemeBadge"))
    };
  })()`;
}

function expectedIntentionVisual(blockWidth, headWidth) {
  const shared = {
    color: "rgb(23, 24, 32)",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    lineHeight: "23.2px"
  };
  return {
    block: {
      alignItems: "normal",
      background: "rgba(0, 0, 0, 0) linear-gradient(90deg, rgba(231, 251, 255, 0.68), rgba(245, 246, 214, 0.58)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(79, 136, 133, 0.13)",
      borderRadius: "15px",
      ...shared,
      display: "grid",
      flexWrap: "nowrap",
      fontWeight: "410",
      gap: "10px",
      height: 63.1875,
      justifyContent: "normal",
      margin: "0px 0px 14px",
      minHeight: "0px",
      padding: "12px",
      width: blockWidth
    },
    head: {
      alignItems: "center",
      background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(23, 24, 32)",
      borderRadius: "0px",
      ...shared,
      display: "flex",
      flexWrap: "wrap",
      fontWeight: "410",
      gap: "8px",
      height: 37.1875,
      justifyContent: "space-between",
      margin: "0px",
      minHeight: "auto",
      padding: "0px",
      width: headWidth
    },
    label: {
      alignItems: "normal",
      background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "0px none rgb(23, 24, 32)",
      borderRadius: "0px",
      ...shared,
      display: "block",
      flexWrap: "nowrap",
      fontWeight: "560",
      gap: "normal",
      height: 23.1875,
      justifyContent: "normal",
      margin: "0px",
      minHeight: "auto",
      padding: "0px",
      width: 126.421875
    },
    badge: {
      alignItems: "center",
      background: "rgba(0, 0, 0, 0) linear-gradient(rgba(255, 244, 248, 0.92), rgba(252, 228, 238, 0.84)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(229, 174, 201, 0.34)",
      borderRadius: "999px",
      ...shared,
      color: "rgb(176, 109, 140)",
      display: "flex",
      flexWrap: "nowrap",
      fontWeight: "410",
      gap: "normal",
      height: 37.1875,
      justifyContent: "normal",
      margin: "0px",
      minHeight: "34px",
      padding: "6px 11px",
      width: 159.265625
    }
  };
}

test("today intention preserves defaults, stored day types, aliases, and reload behavior", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context, { frontendMode: "react" });
  if (!planner) {
    return;
  }

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "Normal Day",
    badgeClass: "progress-pill day-type-pill normal-day"
  });

  await putStoredValue(planner.server.url, ROUTINE_KEY, routineWithThursday("skate"));
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "High-Intensity Day",
    badgeClass: "progress-pill day-type-pill high-day"
  });

  await planner.browser.reload();
  await planner.browser.waitForExpression(
    'document.getElementById("todayThemeBadge")?.textContent === "High-Intensity Day"'
  );
  assert.deepEqual(planner.browser.errors(), []);
});

test("today intention preserves its desktop and mobile visual contract", { timeout: 60_000 }, async function (context) {
  const planner = await startBrowserPlanner(context, { frontendMode: "react" });
  if (!planner) {
    return;
  }
  await putStoredValue(planner.server.url, ROUTINE_KEY, routineWithThursday("high"));

  await planner.browser.setViewport(1280, 720);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "High-Intensity Day",
    badgeClass: "progress-pill day-type-pill high-day"
  });
  assert.deepEqual(
    await planner.browser.evaluate(intentionVisualContract()),
    expectedIntentionVisual(892, 866)
  );

  await planner.browser.setViewport(390, 844, true);
  await openPlanner(planner.browser, `${planner.server.url}/?view=todayView&date=${TEST_DATE}`);
  assert.deepEqual(await planner.browser.evaluate(intentionState()), {
    label: "Today's intention",
    badge: "High-Intensity Day",
    badgeClass: "progress-pill day-type-pill high-day"
  });
  assert.deepEqual(
    await planner.browser.evaluate(intentionVisualContract()),
    expectedIntentionVisual(338, 312)
  );

  const recoveryRoutine = JSON.stringify(routineWithThursday("rest"));
  await putStoredValue(planner.server.url, ROUTINE_KEY, routineWithThursday("rest"));
  await planner.browser.evaluate(`window.dispatchEvent(new StorageEvent("storage", {
    key: ${JSON.stringify(ROUTINE_KEY)},
    newValue: ${JSON.stringify(recoveryRoutine)}
  }))`);
  await planner.browser.waitForExpression(`(() => {
    const badge = document.getElementById("todayThemeBadge");
    return badge?.textContent === "Recovery Day" && badge.classList.contains("recovery-day");
  })()`);

  await planner.browser.reload();
  await planner.browser.waitForExpression(`(() => {
    const badge = document.getElementById("todayThemeBadge");
    return badge?.textContent === "Recovery Day"
      && badge.classList.contains("recovery-day");
  })()`);
  assert.deepEqual(planner.browser.errors(), []);
});
