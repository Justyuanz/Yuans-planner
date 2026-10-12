// Pinned Money budgets contract. The seeded state, computed styles, and
// geometry were captured from the standalone legacy page while it was still the
// live visual reference, so the direct React route keeps protecting the same
// rendering without starting the legacy server.

const { FONT_FAMILY, INK, MUTED, TRANSPARENT, gridColumns } = require("./money-visual-tokens");

function budgetState() {
  return `(() => {
    const documentRoot = document;
    const card = documentRoot.querySelector(".money-budget-card");
    const settings = card.querySelector(".money-settings-panel");
    const transferPanel = card.querySelector(".money-transfer-panel");
    return {
      heading: card.querySelector("h3").textContent.trim(),
      note: card.querySelector(".small-note").textContent.trim(),
      settings: {
        open: settings.open,
        summary: [...settings.querySelector("summary").children].map((child) => child.textContent.trim())
      },
      target: {
        readOnly: documentRoot.getElementById("moneyMonthlyTarget").readOnly,
        value: documentRoot.getElementById("moneyMonthlyTarget").value
      },
      sections: [...card.querySelectorAll(".money-budget-section")].map((section) => ({
        open: section.open,
        summary: [...section.querySelector("summary").children].map((child) => child.textContent.trim()),
        rows: [...section.querySelectorAll(".money-budget-row")].map((row) => ({
          className: row.className,
          heading: [...row.querySelectorAll(".money-budget-head strong, .money-budget-head span")]
            .map((child) => child.textContent.trim()),
          inputs: [...row.querySelectorAll("input")].map((input) => ({
            ariaLabel: input.getAttribute("aria-label"),
            inputMode: input.inputMode,
            placeholder: input.placeholder,
            value: input.value
          })),
          guide: row.querySelector(".money-budget-pace").textContent.trim()
        }))
      })),
      transfer: {
        open: transferPanel.open,
        summary: [...transferPanel.querySelector("summary").children].map((child) => child.textContent.trim()),
        from: [...documentRoot.getElementById("moneyTransferFrom").options]
          .map((option) => [option.value, option.textContent.trim()]),
        to: [...documentRoot.getElementById("moneyTransferTo").options]
          .map((option) => [option.value, option.textContent.trim()]),
        amount: {
          inputMode: documentRoot.getElementById("moneyTransferAmount").inputMode,
          placeholder: documentRoot.getElementById("moneyTransferAmount").placeholder,
          value: documentRoot.getElementById("moneyTransferAmount").value
        },
        rows: [...documentRoot.querySelectorAll("#moneyTransferList .money-transfer-row")].map((row) => ({
          button: row.querySelector("button").textContent.trim(),
          text: row.textContent.trim()
        }))
      }
    };
  })()`;
}

function budgetVisualContract() {
  return `(() => {
    const documentRoot = document;
    const card = documentRoot.querySelector(".money-budget-card");
    const view = documentRoot.defaultView;
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
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      heading: pick(card.querySelector("h3")),
      note: pick(card.querySelector(".small-note")),
      panelInner: pick(card.querySelector(".panel-inner")),
      settings: pick(card.querySelector(".money-settings-panel")),
      settingsSummary: pick(card.querySelector(".money-settings-panel > summary")),
      target: pick(documentRoot.getElementById("moneyMonthlyTarget")),
      section: pick(card.querySelector(".money-budget-section")),
      sectionSummary: pick(card.querySelector(".money-budget-section > summary")),
      row: pick(card.querySelector(".money-budget-row")),
      rowHead: pick(card.querySelector(".money-budget-head")),
      rowInputs: pick(card.querySelector(".money-budget-inputs")),
      inputs: [...card.querySelectorAll(".money-budget-row input")].slice(0, 2).map(pick)
    };
  })()`;
}

const HEADING = "Budgets and categories";
const NOTE = "Protect the fixed money, then give every flexible euro a job.";
const SETTINGS_SUMMARY = ["Budget settings", "Open when you want to adjust monthly setup."];
const TRANSFER_SUMMARY = ["Move budget between categories", "Only when one category needs cover."];

// Flexible categories are the only valid transfer endpoints, in stored order.
const FLEX_OPTIONS = [
  ["groceries", "Food"],
  ["eating-out", "Eating out"],
  ["resq", "ResQ"],
  ["health", "Health"],
  ["fun", "Fun"],
  ["skate-school", "Skate"],
  ["other", "Other"],
  ["future", "Future fund"]
];

// name, spent, left, month input, week input, and whether the row is negative.
const FIXED_ROWS = [
  ["HSL", "€0.00", "€73.90", "73.90", "14.78", false],
  ["Lenses", "€0.00", "€44.00", "44", "8.80", false],
  ["Pets", "€0.00", "€0.00", "0", "0", false],
  ["Rent", "€800.00", "-€22.00", "778", "155.60", true],
  ["Subscriptions", "€0.00", "€2.99", "2.99", "0.59", false],
  ["Therapy", "€0.00", "€140.00", "140", "28", false]
];

const FLEX_ROWS = [
  ["Eating out", "€0.00", "€35.00", "35", "8.75", false],
  ["Food", "€200.00", "-€70.00", "120", "30", true],
  ["Fun", "€0.00", "€15.00", "25", "6.25", false],
  ["Future fund", "€50.00", "€0.00", "50", "10", false],
  ["Health", "€0.00", "€25.00", "25", "6.25", false],
  ["Other", "€0.00", "€16.11", "16.11", "4.03", false],
  ["ResQ", "€0.00", "€20.00", "20", "5", false],
  ["Skate", "€0.00", "€20.00", "20", "5", false]
];

// The inputs show the trimmed stored value while the guide line always prints
// two decimals.
function budgetRow(kind, [name, spent, left, month, week, negative]) {
  return {
    className: `money-budget-row money-budget-row-${kind}${negative ? " is-negative" : ""}`,
    guide: `Guide €${Number(week).toFixed(2)} / week`,
    heading: [name, kind === "fixed" ? "Fixed" : "Flex", `Spent ${spent}`, `${left} left`],
    inputs: [
      { ariaLabel: `${name} month`, inputMode: "decimal", placeholder: "Month", value: month },
      { ariaLabel: `${name} week`, inputMode: "decimal", placeholder: "Week", value: week }
    ]
  };
}

function expectedSeededState({ settingsOpen, sectionsOpen, transferOpen, target = "1350", transferAmount = "", transferRows }) {
  const [fixedOpen, flexOpen] = sectionsOpen;
  return {
    heading: HEADING,
    note: NOTE,
    sections: [
      {
        open: fixedOpen,
        rows: FIXED_ROWS.map((row) => budgetRow("fixed", row)),
        summary: ["Fixed", "Protected baseline. · 6"]
      },
      {
        open: flexOpen,
        rows: FLEX_ROWS.map((row) => budgetRow("flex", row)),
        summary: ["Flexible", "Weekly pace. · 8"]
      }
    ],
    settings: { open: settingsOpen, summary: SETTINGS_SUMMARY },
    target: { readOnly: true, value: target },
    transfer: {
      amount: { inputMode: "decimal", placeholder: "10", value: transferAmount },
      from: FLEX_OPTIONS,
      open: transferOpen,
      rows: transferRows,
      summary: TRANSFER_SUMMARY,
      to: FLEX_OPTIONS
    }
  };
}

const SEEDED_TRANSFER_ROW = { button: "Delete", text: "Food€10.00 moved from FunDelete" };
const ADDED_TRANSFER_ROW = { button: "Delete", text: "Future fund€10.00 moved from FunDelete" };

const CARD_BACKGROUND = "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box";
const PANEL_BACKGROUND = "rgba(255, 255, 255, 0.68) none repeat scroll 0% 0% / auto padding-box border-box";
const SECTION_BACKGROUND = "rgba(255, 255, 255, 0.52) none repeat scroll 0% 0% / auto padding-box border-box";
const FIELD_BACKGROUND = "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box";
const PANEL_BORDER = "1px solid rgba(224, 219, 209, 0.72)";

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
    justifyContent: "normal",
    lineHeight: "23.2px",
    padding: "0px",
    textAlign: "start",
    ...overrides
  };
}


// The budgets card shares the vendors/activity top-left glow.
const PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 0px 0px, rgba(185, 238, 238, 0.16), rgba(0, 0, 0, 0) 30%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.54), rgba(247, 249, 255, 0.76), rgba(255, 250, 245, 0.66)) repeat scroll 0% 0% / auto padding-box border-box";
const SETTINGS_BACKGROUND = "rgba(255, 255, 255, 0.54) none repeat scroll 0% 0% / auto padding-box border-box";
const ROW_BACKGROUND = "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box";
const BUDGET_INPUT_BACKGROUND = "rgba(255, 255, 255, 0.88) none repeat scroll 0% 0% / auto padding-box border-box";

// Sizes the responsive stylesheet keeps identical at both viewports.
const TARGET_WIDTH = 240;
const SECTION_SUMMARY_HEIGHT = 44.875;
const BUDGET_INPUT_HEIGHT = 38;

const DESKTOP_VISUAL = {
  cardHeight: 167,
  cardWidth: 940,
  innerWidth: 892,
  padding: "24px",
  rowColumns: gridColumns(438, 354),
  rowHeadColumns: gridColumns(351.266, 72.7344),
  rowHeadHeight: 40.046875,
  rowHeadWidth: 438,
  rowHeight: 114.9375,
  rowInputColumns: gridColumns(173, 173),
  rowInputHeight: 57.765625,
  rowInputWidth: 354,
  rowWidth: 836,
  sectionHeight: 788.5,
  sectionWidth: 862,
  settingsHeight: 51.1875,
  settingsSummaryAlign: "center",
  settingsSummaryHeight: 49.1875,
  headingFontSize: "26.4px",
  headingHeight: 30.625,
  headingLineHeight: "30.624px",
  inputWidth: 173,
  noteHeight: 23.1875,
  textWidth: 434.890625
};

const MOBILE_VISUAL = {
  cardHeight: 186.734375,
  cardWidth: 370,
  innerWidth: 338,
  padding: "16px",
  // Narrow rows stack the head and the two inputs in one full-width column.
  rowColumns: gridColumns(252),
  rowHeadColumns: gridColumns(252),
  rowHeadHeight: 77.21875,
  rowHeadWidth: 252,
  rowHeight: 271.921875,
  rowInputColumns: gridColumns(252),
  rowInputHeight: 123.53125,
  rowInputWidth: 252,
  rowWidth: 282,
  sectionHeight: 1730.40625,
  sectionWidth: 308,
  settingsHeight: 71.171875,
  settingsSummaryAlign: "start",
  settingsSummaryHeight: 69.171875,
  headingFontSize: "20px",
  headingHeight: 23.1875,
  headingLineHeight: "23.2px",
  inputWidth: 252,
  noteHeight: 46.375,
  textWidth: 338
};

function expectedBudgetVisual(mobile) {
  const layout = mobile ? MOBILE_VISUAL : DESKTOP_VISUAL;
  const budgetInput = visualBox({
    background: BUDGET_INPUT_BACKGROUND,
    border: "1px solid rgba(185, 206, 240, 0.58)",
    borderRadius: "16px",
    fontSize: "14.08px",
    height: BUDGET_INPUT_HEIGHT,
    lineHeight: "20.416px",
    padding: "7px 10px",
    textAlign: "left",
    width: layout.inputWidth
  });
  return {
    card: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.cardHeight,
      width: layout.cardWidth
    }),
    heading: visualBox({
      fontSize: layout.headingFontSize,
      fontWeight: "570",
      height: layout.headingHeight,
      lineHeight: layout.headingLineHeight,
      width: layout.textWidth
    }),
    inputs: [budgetInput, budgetInput],
    note: visualBox({
      border: `0px none ${MUTED}`,
      color: MUTED,
      fontWeight: "450",
      height: layout.noteHeight,
      width: layout.textWidth
    }),
    panelInner: visualBox({
      background: PANEL_INNER_BACKGROUND,
      display: "grid",
      gridTemplateColumns: gridColumns(layout.innerWidth),
      height: layout.cardHeight,
      padding: layout.padding,
      width: layout.cardWidth
    }),
    row: visualBox({
      alignItems: "start",
      background: ROW_BACKGROUND,
      border: "1px solid rgba(185, 206, 240, 0.3)",
      borderRadius: "15px",
      display: "grid",
      gap: "14px",
      gridTemplateColumns: layout.rowColumns,
      height: layout.rowHeight,
      padding: "12px 14px",
      width: layout.rowWidth
    }),
    rowHead: visualBox({
      alignItems: "center",
      display: "grid",
      gap: "14px",
      gridTemplateColumns: layout.rowHeadColumns,
      height: layout.rowHeadHeight,
      width: layout.rowHeadWidth
    }),
    rowInputs: visualBox({
      display: "grid",
      gap: "8px",
      gridTemplateColumns: layout.rowInputColumns,
      height: layout.rowInputHeight,
      width: layout.rowInputWidth
    }),
    section: visualBox({
      background: SECTION_BACKGROUND,
      border: PANEL_BORDER,
      borderRadius: "16px",
      height: layout.sectionHeight,
      width: layout.sectionWidth
    }),
    sectionSummary: visualBox({
      alignItems: "center",
      border: `0px none ${MUTED}`,
      color: MUTED,
      display: "flex",
      fontSize: "12.16px",
      gap: "12px",
      height: SECTION_SUMMARY_HEIGHT,
      justifyContent: "space-between",
      lineHeight: "17.632px",
      padding: "12px 14px",
      width: layout.sectionWidth - 2
    }),
    settings: visualBox({
      background: SETTINGS_BACKGROUND,
      border: PANEL_BORDER,
      borderRadius: "18px",
      height: layout.settingsHeight,
      width: layout.innerWidth
    }),
    settingsSummary: visualBox({
      alignItems: layout.settingsSummaryAlign,
      display: "flex",
      fontWeight: "550",
      gap: "12px",
      height: layout.settingsSummaryHeight,
      justifyContent: "space-between",
      padding: "13px 14px",
      width: layout.innerWidth - 2
    }),
    target: visualBox({
      background: FIELD_BACKGROUND,
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "15px",
      color: "rgb(45, 47, 43)",
      fontWeight: "430",
      height: 42,
      lineHeight: "20px",
      padding: "9px 12px",
      width: TARGET_WIDTH
    })
  };
}

module.exports = {
  ADDED_TRANSFER_ROW,
  CARD_BACKGROUND,
  FIELD_BACKGROUND,
  PANEL_BACKGROUND,
  PANEL_BORDER,
  SECTION_BACKGROUND,
  SEEDED_TRANSFER_ROW,
  budgetState,
  budgetVisualContract,
  expectedBudgetVisual,
  expectedSeededState
};
