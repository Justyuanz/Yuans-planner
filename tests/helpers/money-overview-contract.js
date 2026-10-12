// Pinned Money overview contract. The computed-style and geometry values were
// captured from the standalone legacy page while it was still the live visual
// reference, so the direct React route keeps protecting the same rendering
// without starting the legacy server.

const {
  CARD_BACKGROUND,
  FONT_FAMILY,
  INK,
  MUTED,
  PANEL_INNER_BACKGROUND,
  STAT_BACKGROUND,
  TRANSPARENT
} = require("./money-visual-tokens");

// Mirrors the 16 properties the browser contract reads for every element.
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
    lineHeight: "23.2px",
    padding: "0px",
    ...overrides
  };
}

function mutedBox(overrides) {
  return visualBox({ border: `0px none ${MUTED}`, color: MUTED, ...overrides });
}

// Small label / big amount / small caption rows inside one mini stat.
function statChildren(statWidth, captionHeight) {
  const small = { fontSize: "12.8px", height: 18.546875, lineHeight: "18.56px", width: statWidth };
  return [
    mutedBox(small),
    visualBox({ fontWeight: "560", height: 23.1875, width: statWidth }),
    mutedBox({ ...small, height: captionHeight })
  ];
}

function statVisual(statWidth, height, width) {
  return visualBox({
    background: STAT_BACKGROUND,
    border: "1px solid rgba(224, 219, 209, 0.72)",
    borderRadius: "15px",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: `${statWidth}px`,
    height,
    padding: "12px",
    width
  });
}

function moneyOverviewState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-overview-card");
    return {
      heading: panel.querySelector("h2").textContent.trim(),
      month: documentRoot.getElementById("moneyMonthLabel").textContent.trim(),
      note: panel.querySelector(".small-note").textContent.trim(),
      stats: [...documentRoot.querySelectorAll("#moneyOverviewGrid .money-mini-stat")].map((item) => ({
        className: item.className,
        parts: [...item.children].map((child) => child.textContent.trim()),
        text: item.textContent.trim()
      }))
    };
  })()`;
}

function moneyOverviewVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-overview-card");
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
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      grid: pick(documentRoot.getElementById("moneyOverviewGrid")),
      heading: { text: panel.querySelector("h2").textContent.trim(), visual: pick(panel.querySelector("h2")) },
      month: { text: documentRoot.getElementById("moneyMonthLabel").textContent.trim(), visual: pick(documentRoot.getElementById("moneyMonthLabel")) },
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      state: ${moneyOverviewState()},
      stats: [...panel.querySelectorAll(".money-mini-stat")].map((item) => ({
        children: [...item.children].map(pick),
        text: item.textContent.trim(),
        visual: pick(item)
      }))
    };
  })()`;
}

const HEADING = "Money planner";
const MONTH = "September 2026";
const NOTE = "Keep the money visible enough that your brain does not have to hold it all.";
const WEEK_RANGE = "2026-09-14 to 2026-09-20";

function stat(className, label, amount, caption) {
  return {
    className,
    parts: [label, amount, caption],
    text: `${label}${amount}${caption}`
  };
}

function expectedDefaultState() {
  return {
    heading: HEADING,
    month: MONTH,
    note: NOTE,
    stats: [
      stat("money-mini-stat", "Remaining this week", "€107.45", WEEK_RANGE),
      stat("money-mini-stat", "Flexible money left", "€261.11", "Adjustable spending.")
    ]
  };
}

// One €300 grocery transaction overspends both the week and the flexible pool.
function expectedNegativeState() {
  return {
    heading: HEADING,
    month: MONTH,
    note: NOTE,
    stats: [
      stat("money-mini-stat is-negative", "Remaining this week", "-€38.89", WEEK_RANGE),
      stat("money-mini-stat is-negative", "Flexible money left", "-€38.89", "Adjustable spending.")
    ]
  };
}

const DESKTOP = {
  cardWidth: 940,
  cardHeight: 220.09375,
  headingFontSize: "26.4px",
  headingHeight: 30.625,
  headingLineHeight: "30.624px",
  gridHeight: 102.28125,
  gridWidth: 892,
  gridTemplateColumns: "439px 439px",
  monthFontSize: "14.72px",
  monthHeight: 41.328125,
  monthLineHeight: "21.344px",
  monthPadding: "9px 16px",
  monthWidth: 149.53125,
  noteHeight: 23.1875,
  padding: "24px",
  statCaptionHeights: [18.546875, 18.546875],
  statHeight: 102.28125,
  statInnerWidth: 413,
  statWidth: 439,
  textWidth: 546.78125
};

const MOBILE = {
  cardWidth: 370,
  cardHeight: 259.578125,
  headingFontSize: "20px",
  headingHeight: 23.1875,
  headingLineHeight: "23.2px",
  gridHeight: 120.828125,
  gridWidth: 338,
  gridTemplateColumns: "162px 162px",
  monthFontSize: "14.08px",
  monthHeight: 58.8125,
  monthLineHeight: "20.416px",
  monthPadding: "8px 13px",
  monthWidth: 100.625,
  noteHeight: 69.5625,
  padding: "16px",
  // The narrow first stat wraps its date range onto a second line.
  statCaptionHeights: [37.09375, 18.546875],
  statHeight: 120.828125,
  statInnerWidth: 136,
  statWidth: 162,
  textWidth: 225.375
};

function expectedMoneyOverviewVisual(mobile) {
  const layout = mobile ? MOBILE : DESKTOP;
  return {
    grid: visualBox({
      display: "grid",
      gap: "14px",
      gridTemplateColumns: layout.gridTemplateColumns,
      height: layout.gridHeight,
      width: layout.gridWidth
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
    month: {
      text: MONTH,
      visual: visualBox({
        alignItems: "center",
        background: CARD_BACKGROUND,
        border: "1px solid rgb(190, 186, 255)",
        borderRadius: "10px",
        color: "rgb(35, 35, 44)",
        display: "flex",
        fontSize: layout.monthFontSize,
        fontWeight: "560",
        height: layout.monthHeight,
        lineHeight: layout.monthLineHeight,
        padding: layout.monthPadding,
        width: layout.monthWidth
      })
    },
    note: {
      text: NOTE,
      visual: mutedBox({ fontWeight: "450", height: layout.noteHeight, width: layout.textWidth })
    },
    panel: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.cardHeight,
      width: layout.cardWidth
    }),
    panelInner: visualBox({
      background: PANEL_INNER_BACKGROUND,
      height: layout.cardHeight,
      padding: layout.padding,
      width: layout.cardWidth
    }),
    state: expectedNegativeState(),
    stats: expectedNegativeState().stats.map((item, index) => ({
      children: statChildren(layout.statInnerWidth, layout.statCaptionHeights[index]),
      text: item.text,
      visual: statVisual(layout.statInnerWidth, layout.statHeight, layout.statWidth)
    }))
  };
}

module.exports = {
  expectedDefaultState,
  expectedMoneyOverviewVisual,
  expectedNegativeState,
  moneyOverviewState,
  moneyOverviewVisualContract
};
