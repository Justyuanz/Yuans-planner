// Pinned Money vendors contract. The computed-style and geometry values were
// captured from the standalone legacy page while it was still the live visual
// reference, so the direct React route keeps protecting the same rendering
// without starting the legacy server.

const { CARD_BACKGROUND, FONT_FAMILY, INK, MUTED, TRANSPARENT, gridColumns } = require("./money-visual-tokens");

function vendorsState() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".money-vendors-card");
    return {
      heading: panel.querySelector("h3").textContent.trim(),
      note: panel.querySelector(".small-note").textContent.trim(),
      rows: [...documentRoot.querySelectorAll("#moneyVendorList .money-vendor-row")].map((row) => ({
        head: [...row.querySelectorAll(".money-vendor-head > *")].map((child) => child.textContent.trim()),
        metrics: [...row.querySelectorAll(".money-vendor-metrics > *")].map((child) => child.textContent.trim()),
        text: row.textContent.trim()
      }))
    };
  })()`;
}

function vendorsVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-vendors-card");
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
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      list: pick(documentRoot.querySelector("#moneyVendorList .money-vendor-list")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      rows: [...panel.querySelectorAll(".money-vendor-row")].map((row) => ({
        children: [...row.children].map(pick),
        text: row.textContent.trim(),
        visual: pick(row)
      })),
      state: ${vendorsState()}
    };
  })()`;
}

const HEADING = "Vendors";
const NOTE = "See who gets the money, how often, and what category they usually land in.";
const EMPTY_TEXT = "No vendors yetTransactions with vendor names will build this automatically.";

function expectedEmptyState() {
  return {
    heading: HEADING,
    note: NOTE,
    rows: [{ head: [], metrics: [], text: EMPTY_TEXT }]
  };
}

// name, category label, visit count, average, month total, previous-month total
const POPULATED_ROWS = [
  ["Market", "Food", 3, "€6.67", "€20.01", "€7.00"],
  ["Cafe", "Future fund", 1, "€19.00", "€19.00", "€0.00"],
  ["Alpha", "Other", 1, "€18.00", "€18.00", "€0.00"],
  ["Bravo", "Fun", 1, "€17.00", "€17.00", "€0.00"],
  ["Charlie", "Fun", 1, "€16.00", "€16.00", "€0.00"],
  ["Delta", "Fun", 1, "€15.00", "€15.00", "€0.00"],
  ["Echo", "Fun", 1, "€14.00", "€14.00", "€0.00"],
  ["Foxtrot", "Fun", 1, "€13.00", "€13.00", "€0.00"]
];

function populatedRow([name, category, visits, average, total, previous]) {
  const summary = `${category} · ${visits} visits · avg ${average}`;
  const previousLabel = `Prev month ${previous}`;
  return {
    head: [name, summary],
    metrics: [total, previousLabel],
    text: `${name}${summary}${total}${previousLabel}`
  };
}

function expectedPopulatedState() {
  return { heading: HEADING, note: NOTE, rows: POPULATED_ROWS.map(populatedRow) };
}

// The vendors card uses its own top-left glow instead of the shared corner one.
const VENDORS_PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 0px 0px, rgba(185, 238, 238, 0.16), rgba(0, 0, 0, 0) 30%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.54), rgba(247, 249, 255, 0.76), rgba(255, 250, 245, 0.66)) repeat scroll 0% 0% / auto padding-box border-box";
const LIST_BACKGROUND =
  "radial-gradient(circle at 6% 18%, rgba(245, 202, 221, 0.26), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(112deg, rgba(255, 255, 255, 0.72), rgba(185, 238, 238, 0.16) 52%, rgba(255, 248, 184, 0.18)) repeat scroll 0% 0% / auto padding-box border-box";
const ROW_BACKGROUND = "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box";
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
  cardHeight: 804.6875,
  cardWidth: 940,
  headingFontSize: "26.4px",
  headingHeight: 30.625,
  headingLineHeight: "30.624px",
  listColumns: gridColumns(859),
  listHeight: 688.875,
  listWidth: 892,
  metricsAlign: { justifyItems: "end", textAlign: "right" },
  metricsWidth: 103.71875,
  noteHeight: 23.1875,
  padding: "24px",
  rowColumns: gridColumns(721.28125, 103.71875),
  rowHeight: 75.734375,
  rowWidth: 859,
  summaryWidth: 721.28125,
  textWidth: 554.078125
};

const MOBILE = {
  cardHeight: 1266.3125,
  cardWidth: 370,
  headingFontSize: "20px",
  headingHeight: 23.1875,
  headingLineHeight: "23.2px",
  listColumns: gridColumns(305),
  listHeight: 1150.75,
  listWidth: 338,
  // Narrow rows stack the metrics under the vendor name and align them left.
  metricsAlign: { justifyItems: "start", textAlign: "left" },
  metricsWidth: 279,
  noteHeight: 46.375,
  padding: "16px",
  rowColumns: gridColumns(279),
  rowHeight: 133.46875,
  rowWidth: 305,
  summaryWidth: 279,
  textWidth: 338
};

// Every populated vendor row renders at the same size; only its text differs.
function expectedRow(layout, text) {
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
    children: [
      column(layout.summaryWidth),
      column(layout.metricsWidth, layout.metricsAlign)
    ],
    text,
    visual: visualBox({
      alignItems: "start",
      background: ROW_BACKGROUND,
      border: "1px solid rgba(224, 219, 209, 0.72)",
      borderRadius: "15px",
      display: "grid",
      gap: "8px",
      gridTemplateColumns: layout.rowColumns,
      height: layout.rowHeight,
      padding: "12px",
      width: layout.rowWidth
    })
  };
}

function expectedMoneyVendorsVisual(mobile) {
  const layout = mobile ? MOBILE : DESKTOP;
  return {
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
    list: visualBox({
      background: LIST_BACKGROUND,
      border: "1px solid rgba(245, 202, 221, 0.3)",
      borderRadius: "18px",
      display: "grid",
      gap: "8px",
      gridTemplateColumns: layout.listColumns,
      height: layout.listHeight,
      padding: "12px 14px 13px 17px",
      width: layout.listWidth
    }),
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
      background: VENDORS_PANEL_INNER_BACKGROUND,
      height: layout.cardHeight,
      padding: layout.padding,
      width: layout.cardWidth
    }),
    rows: POPULATED_ROWS.map((row) => expectedRow(layout, populatedRow(row).text)),
    state: expectedPopulatedState()
  };
}

module.exports = {
  expectedEmptyState,
  expectedMoneyVendorsVisual,
  expectedPopulatedState,
  vendorsState,
  vendorsVisualContract
};
