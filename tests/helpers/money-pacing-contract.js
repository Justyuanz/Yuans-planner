// Pinned Money pace-and-projection contract. The computed-style and geometry
// values were captured from the standalone legacy page while it was still the
// live visual reference, so the direct React route keeps protecting the same
// rendering without starting the legacy server.

const { CARD_BACKGROUND, FONT_FAMILY, INK, MUTED, TRANSPARENT, gridColumns } = require("./money-visual-tokens");

function pacingState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-pacing-card");
    const progress = [...panel.querySelectorAll(".money-progress-card")].map((card) => {
      const estimate = card.querySelector(".money-estimate-block");
      return {
        className: card.className,
        copy: [...card.querySelector(".money-progress-copy").children].map((child) => child.textContent.trim()),
        estimate: estimate ? {
          head: [...estimate.querySelector(".money-bar-head").children].map((child) => child.textContent.trim()),
          width: estimate.querySelector(".money-bar-track span").style.width
        } : null,
        title: card.querySelector(".chart-title").textContent.trim(),
        width: card.querySelector(".money-progress-track span").style.width
      };
    });
    const categoryChart = panel.querySelector("#moneyCharts > .money-chart-card:not(details)");
    const history = panel.querySelector(".money-chart-dropdown");
    const rows = (container) => [...container.querySelectorAll(".money-bar-row")].map((row) => ({
      head: [...row.querySelector(".money-bar-head").children].map((child) => child.textContent.trim()),
      width: row.querySelector(".money-bar-track span").style.width
    }));
    return {
      categories: {
        rows: rows(categoryChart),
        title: categoryChart.querySelector(".chart-title").textContent.trim()
      },
      heading: panel.querySelector("h3").textContent.trim(),
      history: {
        open: history.open,
        rows: rows(history),
        summary: [...history.querySelector("summary").children].map((child) => child.textContent.trim())
      },
      note: panel.querySelector(".small-note").textContent.trim(),
      progress
    };
  })()`;
}

function pacingVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-pacing-card");
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
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        gridTemplateColumns: style.gridTemplateColumns,
        height: rect.height,
        justifyContent: style.justifyContent,
        lineHeight: style.lineHeight,
        marginBottom: style.marginBottom,
        overflow: style.overflow,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      categoryChart: pick(panel.querySelector("#moneyCharts > .money-chart-card:not(details)")),
      chartStack: pick(documentRoot.getElementById("moneyCharts")),
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      history: pick(panel.querySelector(".money-chart-dropdown")),
      historyRows: [...panel.querySelectorAll(".money-chart-dropdown .money-bar-row")].map(pick),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      progressCards: [...panel.querySelectorAll(".money-progress-card")].map((card) => ({
        children: [...card.children].map(pick),
        text: card.textContent.trim(),
        visual: pick(card)
      })),
      progressList: pick(documentRoot.getElementById("moneyProgressList")),
      state: ${pacingState()}
    };
  })()`;
}

const HEADING = "Pace and projection";
const NOTE = "The goal is clarity, not guilt. Let the pace explain what changed.";
const HISTORY_SUMMARY = ["Monthly spending over time", "Show up to 12 months"];
const PROGRESS_CLASS = "mini-chart money-chart-card money-progress-card";

// Remaining-by-category bars. A category with nothing left renders a full bar.
function expectedCategoryRows(overBudget) {
  return [
    { head: ["Eating out", "€35.00"], width: "0%" },
    { head: ["Fun", overBudget ? "€15.00" : "€25.00"], width: "0%" },
    ...(overBudget ? [{ head: ["Future fund", "€0.00"], width: "100%" }] : []),
    { head: ["Groceries", overBudget ? "€0.00" : "€120.00"], width: overBudget ? "100%" : "0%" },
    { head: ["Health", "€25.00"], width: "0%" },
    { head: ["Other", "€16.11"], width: "0%" },
    { head: ["ResQ", "€20.00"], width: "0%" },
    { head: ["Skate", "€20.00"], width: "0%" }
  ];
}

function progressCard(title, copy, width, estimate) {
  return { className: PROGRESS_CLASS, copy, estimate, title, width };
}

function expectedDefaultState(historyOpen = false) {
  return {
    categories: { rows: expectedCategoryRows(false), title: "Remaining by category" },
    heading: HEADING,
    history: { open: historyOpen, rows: [], summary: HISTORY_SUMMARY },
    note: NOTE,
    progress: [
      progressCard(
        "Monthly spending",
        ["€0.00 spent of €1,300.00", "€1,300.00 remaining", "0% used"],
        "4%",
        { head: ["Estimated spending", "€1,038.89"], width: "80%" }
      ),
      progressCard("Flexible spending", ["€0.00 spent of €261.11", "€261.11 remaining", "0% used"], "4%", null)
    ]
  };
}

function expectedPopulatedState() {
  return {
    categories: { rows: expectedCategoryRows(true), title: "Remaining by category" },
    heading: HEADING,
    history: {
      open: true,
      rows: [
        { head: ["26/09", "€1,050.00"], width: "100%" },
        { head: ["26/08", "€15.00"], width: "4%" },
        { head: ["26/07", "€5.00"], width: "4%" }
      ],
      summary: HISTORY_SUMMARY
    },
    note: NOTE,
    progress: [
      progressCard(
        "Monthly spending",
        ["€1,050.00 spent of €1,350.00", "€300.00 remaining", "78% used"],
        "78%",
        { head: ["Estimated spending", "€1,574.60"], width: "100%" }
      ),
      progressCard("Flexible spending", ["€250.00 spent of €311.11", "€61.11 remaining", "80% used"], "80%", null)
    ]
  };
}

// The pacing card shares the vendors/activity top-left glow.
const PACING_PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 0px 0px, rgba(185, 238, 238, 0.16), rgba(0, 0, 0, 0) 30%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.54), rgba(247, 249, 255, 0.76), rgba(255, 250, 245, 0.66)) repeat scroll 0% 0% / auto padding-box border-box";
const CHART_STACK_BACKGROUND =
  "radial-gradient(circle at 6% 18%, rgba(245, 202, 221, 0.26), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(112deg, rgba(255, 255, 255, 0.72), rgba(185, 238, 238, 0.16) 52%, rgba(255, 248, 184, 0.18)) repeat scroll 0% 0% / auto padding-box border-box";
const CHART_CARD_BACKGROUND = "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box";
const TRACK_BACKGROUND = "rgba(185, 206, 240, 0.22) none repeat scroll 0% 0% / auto padding-box border-box";
const CHART_CARD_BORDER = "1px solid rgba(224, 219, 209, 0.72)";

// Sizes that the responsive stylesheet keeps identical at both viewports.
const CATEGORY_CHART_HEIGHT = 409.6875;
const HISTORY_ROW_HEIGHT = 35.484375;
const PROGRESS_LIST_HEIGHT = 365.296875;
const PROGRESS_CARD_HEIGHTS = [198.390625, 156.90625];
const CARD_INNER_INSET = 26;

// Mirrors the 18 properties the browser contract reads for every element.
function visualBox(overrides) {
  return {
    alignItems: "normal",
    background: TRANSPARENT,
    border: `0px none ${INK}`,
    borderRadius: "0px",
    color: INK,
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    gridTemplateColumns: "none",
    justifyContent: "normal",
    lineHeight: "23.2px",
    marginBottom: "0px",
    overflow: "visible",
    padding: "0px",
    ...overrides
  };
}

function chartCard(width, height, overrides) {
  return visualBox({
    background: CHART_CARD_BACKGROUND,
    border: CHART_CARD_BORDER,
    borderRadius: "15px",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: gridColumns(width - CARD_INNER_INSET),
    height,
    padding: "12px",
    width,
    ...overrides
  });
}

// Title, spend copy, progress track, and — on the monthly card only — the
// estimated-spending block.
function progressCardChildren(innerWidth, withEstimate) {
  return [
    visualBox({
      fontSize: "15.04px",
      fontWeight: "560",
      height: 21.8125,
      lineHeight: "21.808px",
      marginBottom: "10px",
      width: innerWidth
    }),
    visualBox({
      border: `0px none ${MUTED}`,
      color: MUTED,
      display: "grid",
      fontSize: "13.12px",
      gap: "4px",
      gridTemplateColumns: gridColumns(innerWidth),
      height: 65.09375,
      lineHeight: "19.024px",
      width: innerWidth
    }),
    visualBox({
      background: TRACK_BACKGROUND,
      borderRadius: "999px",
      height: 10,
      overflow: "hidden",
      width: innerWidth
    }),
    ...(withEstimate ? [visualBox({ height: 29.484375, width: innerWidth })] : [])
  ];
}

const DESKTOP = {
  cardHeight: 1156.0625,
  cardWidth: 940,
  chartCardWidth: 859,
  chartStackHeight: 660.953125,
  chartStackWidth: 892,
  headingFontSize: "26.4px",
  headingHeight: 30.625,
  headingLineHeight: "30.624px",
  historyHeight: 216.265625,
  noteHeight: 23.1875,
  padding: "24px",
  progressWidth: 892,
  textWidth: 463.3125
};

const MOBILE = {
  cardHeight: 1177.625,
  cardWidth: 370,
  chartCardWidth: 305,
  chartStackHeight: 682.765625,
  chartStackWidth: 338,
  headingFontSize: "20px",
  headingHeight: 23.1875,
  headingLineHeight: "23.2px",
  historyHeight: 238.078125,
  noteHeight: 46.375,
  padding: "16px",
  progressWidth: 338,
  textWidth: 338
};

function expectedMoneyPacingVisual(mobile) {
  const layout = mobile ? MOBILE : DESKTOP;
  const chartInnerWidth = layout.chartCardWidth - CARD_INNER_INSET;
  const progressInnerWidth = layout.progressWidth - CARD_INNER_INSET;
  const populated = expectedPopulatedState();
  return {
    categoryChart: chartCard(layout.chartCardWidth, CATEGORY_CHART_HEIGHT),
    chartStack: visualBox({
      background: CHART_STACK_BACKGROUND,
      border: "1px solid rgba(245, 202, 221, 0.3)",
      borderRadius: "18px",
      display: "grid",
      gap: "8px",
      gridTemplateColumns: gridColumns(layout.chartStackWidth - 33),
      height: layout.chartStackHeight,
      overflow: "hidden",
      padding: "12px 14px 13px 17px",
      width: layout.chartStackWidth
    }),
    heading: {
      text: HEADING,
      visual: visualBox({
        fontSize: layout.headingFontSize,
        fontWeight: "570",
        height: layout.headingHeight,
        lineHeight: layout.headingLineHeight,
        width: layout.textWidth
      })
    },
    history: chartCard(layout.chartCardWidth, layout.historyHeight, { overflow: "hidden" }),
    historyRows: populated.history.rows.map(() =>
      visualBox({
        display: "grid",
        gap: "6px",
        gridTemplateColumns: gridColumns(chartInnerWidth),
        height: HISTORY_ROW_HEIGHT,
        width: chartInnerWidth
      })
    ),
    note: {
      text: NOTE,
      visual: visualBox({
        border: `0px none ${MUTED}`,
        color: MUTED,
        fontWeight: "450",
        height: layout.noteHeight,
        width: layout.textWidth
      })
    },
    panel: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.cardHeight,
      width: layout.cardWidth
    }),
    panelInner: visualBox({
      background: PACING_PANEL_INNER_BACKGROUND,
      height: layout.cardHeight,
      overflow: "hidden",
      padding: layout.padding,
      width: layout.cardWidth
    }),
    progressCards: populated.progress.map((card, index) => ({
      children: progressCardChildren(progressInnerWidth, card.estimate !== null),
      text: [card.title, ...card.copy, ...(card.estimate ? card.estimate.head : [])].join(""),
      visual: chartCard(layout.progressWidth, PROGRESS_CARD_HEIGHTS[index])
    })),
    progressList: visualBox({
      display: "grid",
      gap: "10px",
      gridTemplateColumns: gridColumns(layout.progressWidth),
      height: PROGRESS_LIST_HEIGHT,
      marginBottom: "14px",
      width: layout.progressWidth
    }),
    state: populated
  };
}

module.exports = {
  expectedCategoryRows,
  expectedDefaultState,
  expectedMoneyPacingVisual,
  expectedPopulatedState,
  pacingState,
  pacingVisualContract
};
