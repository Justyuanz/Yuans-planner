// Pinned Money recent-activity contract. The computed-style and geometry values
// were captured from the standalone legacy page while it was still the live
// visual reference, so the direct React route keeps protecting the same
// rendering without starting the legacy server.

const { CARD_BACKGROUND, FONT_FAMILY, INK, TRANSPARENT, gridColumns } = require("./money-visual-tokens");

function activityState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-activity-card");
    const details = panel.querySelector("details");
    return {
      open: details.open,
      summary: [...details.querySelector("summary").children].map((child) => child.textContent.trim()),
      rows: [...documentRoot.querySelectorAll("#moneyRecentActivity .money-vendor-row")].map((row) => ({
        head: [...row.querySelectorAll(".money-vendor-head > *")].map((child) => child.textContent.trim()),
        metrics: [...row.querySelectorAll(".money-vendor-metrics > *")].map((child) => child.textContent.trim()),
        text: row.textContent.trim()
      }))
    };
  })()`;
}

function activityVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-activity-card");
    const details = panel.querySelector("details");
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
        justifyItems: style.justifyItems,
        lineHeight: style.lineHeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      body: pick(details.querySelector(".money-settings-body")),
      details: pick(details),
      list: pick(documentRoot.getElementById("moneyRecentActivity")),
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      rows: [...details.querySelectorAll(".money-vendor-row")].map((row) => ({
        children: [...row.children].map(pick),
        text: row.textContent.trim(),
        visual: pick(row)
      })),
      state: ${activityState()},
      summary: pick(details.querySelector("summary"))
    };
  })()`;
}

const SUMMARY = ["Recent activity", "Open for the latest transactions."];
const EMPTY_TEXT = "No activity yetYour latest spending will show up here.";

function expectedEmptyState(open) {
  return { open, summary: SUMMARY, rows: [{ head: [], metrics: [], text: EMPTY_TEXT }] };
}

// category label, vendor label, date, amount, and the desktop metrics-column
// width, which the browser sizes to whichever of the amount or category label
// is wider. Newest first, eight rows maximum.
const POPULATED_ROWS = [
  ["Future fund", "Lab", "2026-09-14", "€9.99", 67.78125],
  ["Food", "Market", "2026-09-14", "€12.50", 52.96875],
  ["Other", "No vendor", "2026-09-14", "€3.00", 43.203125],
  ["Fun", "Cinema", "2026-09-13", "€4.50", 43.203125],
  ["Eating out", "Cafe", "2026-09-12", "€6.00", 60.25],
  ["ResQ", "ResQ", "2026-09-11", "€7.00", 43.203125],
  ["Health", "Pharmacy", "2026-09-10", "€8.00", 43.203125],
  ["HSL", "HSL", "2026-08-31", "€9.00", 43.203125]
];

function populatedRow([category, vendor, date, amount]) {
  const source = `${vendor} · ${date}`;
  return {
    head: [category, source],
    metrics: [amount, category],
    text: `${category}${source}${amount}${category}`
  };
}

function expectedPopulatedState() {
  return { open: true, summary: SUMMARY, rows: POPULATED_ROWS.map(populatedRow) };
}

// The activity card uses the same top-left glow as the vendors card.
const ACTIVITY_PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 0px 0px, rgba(185, 238, 238, 0.16), rgba(0, 0, 0, 0) 30%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.54), rgba(247, 249, 255, 0.76), rgba(255, 250, 245, 0.66)) repeat scroll 0% 0% / auto padding-box border-box";
const DETAILS_BACKGROUND = "rgba(255, 255, 255, 0.68) none repeat scroll 0% 0% / auto padding-box border-box";
const ROW_BACKGROUND = "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box";
const ROW_BORDER = "1px solid rgba(224, 219, 209, 0.72)";
const ROW_HEAD_HEIGHT = 49.734375;

// Mirrors the 17 properties the browser contract reads for every element.
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
    justifyItems: "normal",
    lineHeight: "23.2px",
    padding: "0px",
    textAlign: "start",
    ...overrides
  };
}

const DESKTOP = {
  bodyColumns: "862px",
  bodyHeight: 619.875,
  cardHeight: 695.0625,
  cardWidth: 940,
  detailsHeight: 671.0625,
  detailsWidth: 892,
  innerPadding: "0px 24px 24px",
  innerWidth: 890,
  listHeight: 605.875,
  // Desktop keeps the amount beside the vendor; mobile stacks and left-aligns it.
  metricsAlign: { justifyItems: "end", textAlign: "right" },
  mobile: false,
  rowHeight: 75.734375,
  rowWidth: 862,
  summaryAlign: "center",
  summaryHeight: 49.1875
};

const MOBILE = {
  bodyColumns: "308px",
  bodyHeight: 1081.75,
  cardHeight: 1154.53125,
  cardWidth: 370,
  detailsHeight: 1138.53125,
  detailsWidth: 338,
  innerPadding: "0px 16px 16px",
  innerWidth: 336,
  listHeight: 1067.75,
  metricsAlign: { justifyItems: "start", textAlign: "left" },
  mobile: true,
  rowHeight: 133.46875,
  rowWidth: 308,
  summaryAlign: "start",
  summaryHeight: 54.78125
};

function expectedRow(layout, row) {
  // Narrow rows stack both columns at full row width.
  const metricsWidth = layout.mobile ? layout.rowWidth - 26 : row[4];
  const summaryWidth = layout.mobile ? metricsWidth : layout.rowWidth - 34 - metricsWidth;
  const column = (width, overrides) =>
    visualBox({
      display: "grid",
      gap: "8px",
      gridTemplateColumns: gridColumns(width),
      height: ROW_HEAD_HEIGHT,
      width,
      ...overrides
    });
  return {
    children: [column(summaryWidth), column(metricsWidth, layout.metricsAlign)],
    text: populatedRow(row).text,
    visual: visualBox({
      alignItems: "start",
      background: ROW_BACKGROUND,
      border: ROW_BORDER,
      borderRadius: "15px",
      display: "grid",
      gap: "8px",
      gridTemplateColumns: layout.mobile
        ? gridColumns(metricsWidth)
        : gridColumns(summaryWidth, metricsWidth),
      height: layout.rowHeight,
      padding: "12px",
      width: layout.rowWidth
    })
  };
}

function expectedMoneyActivityVisual(mobile) {
  const layout = mobile ? MOBILE : DESKTOP;
  return {
    body: visualBox({
      display: "grid",
      gap: "14px",
      gridTemplateColumns: layout.bodyColumns,
      height: layout.bodyHeight,
      padding: "0px 14px 14px",
      width: layout.innerWidth
    }),
    details: visualBox({
      background: DETAILS_BACKGROUND,
      border: ROW_BORDER,
      borderRadius: "18px",
      height: layout.detailsHeight,
      width: layout.detailsWidth
    }),
    list: visualBox({ height: layout.listHeight, width: Number(layout.bodyColumns.replace("px", "")) }),
    panel: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.cardHeight,
      width: layout.cardWidth
    }),
    panelInner: visualBox({
      background: ACTIVITY_PANEL_INNER_BACKGROUND,
      height: layout.cardHeight,
      padding: layout.innerPadding,
      width: layout.cardWidth
    }),
    rows: POPULATED_ROWS.map((row) => expectedRow(layout, row)),
    state: expectedPopulatedState(),
    summary: visualBox({
      alignItems: layout.summaryAlign,
      display: "flex",
      fontWeight: "550",
      gap: "12px",
      height: layout.summaryHeight,
      padding: "13px 14px",
      width: layout.innerWidth
    })
  };
}

module.exports = {
  activityState,
  activityVisualContract,
  expectedEmptyState,
  expectedMoneyActivityVisual,
  expectedPopulatedState
};
