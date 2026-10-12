// Pinned Money quick-log contract. The computed-style and geometry values were
// captured from the standalone legacy page while it was still the live visual
// reference, so the direct React route keeps protecting the same rendering
// without starting the legacy server.

const { FONT_FAMILY, INK, MUTED, TRANSPARENT, gridColumns } = require("./money-visual-tokens");

function moneyQuickState() {
  return `(() => {
    const documentRoot = document;
    const amount = documentRoot.getElementById("moneyQuickAmount");
    const category = documentRoot.getElementById("moneyQuickCategory");
    const vendor = documentRoot.getElementById("moneyQuickVendor");
    return {
      amount: {
        autocomplete: amount.autocomplete,
        inputMode: amount.inputMode,
        placeholder: amount.placeholder,
        value: amount.value
      },
      badge: documentRoot.getElementById("moneyPaceBadge").textContent.trim(),
      category: {
        ariaLabel: category.getAttribute("aria-label"),
        options: [...category.options].map((option) => [option.value, option.textContent.trim()]),
        value: category.value
      },
      impact: documentRoot.getElementById("moneyQuickImpact").textContent.trim(),
      shortcuts: [...documentRoot.querySelectorAll("#moneyQuickShortcuts .money-shortcut")].map((button) => ({
        text: button.textContent.trim(),
        type: button.type
      })),
      summary: [...documentRoot.querySelectorAll("#moneyQuickSummary .money-mini-stat")].map((item) => ({
        className: item.className,
        text: item.textContent.trim()
      })),
      vendor: {
        autocomplete: vendor.autocomplete,
        maxLength: vendor.maxLength,
        placeholder: vendor.placeholder,
        value: vendor.value
      }
    };
  })()`;
}

function moneyQuickVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".money-quick-card");
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
        gridTemplateAreas: style.gridTemplateAreas,
        gridTemplateColumns: style.gridTemplateColumns,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      badge: pick(documentRoot.getElementById("moneyPaceBadge")),
      form: pick(documentRoot.getElementById("moneyQuickForm")),
      heading: { text: panel.querySelector("h2").textContent.trim(), visual: pick(panel.querySelector("h2")) },
      impact: pick(documentRoot.getElementById("moneyQuickImpact")),
      inputs: ["moneyQuickAmount", "moneyQuickCategory", "moneyQuickVendor"].map((id) => pick(documentRoot.getElementById(id))),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      shortcuts: [...panel.querySelectorAll(".money-shortcut")].map((item) => ({ text: item.textContent.trim(), visual: pick(item) })),
      state: ${moneyQuickState()},
      summary: [...panel.querySelectorAll(".money-mini-stat")].map((item) => ({ text: item.textContent.trim(), visual: pick(item) }))
    };
  })()`;
}

const CATEGORY_OPTIONS = [
  ["groceries", "Groceries"],
  ["therapy", "Therapy"],
  ["fun", "Fun"],
  ["eating-out", "Eating out"],
  ["resq", "ResQ"],
  ["health", "Health"],
  ["hsl", "HSL"],
  ["contact-lenses", "Lenses"],
  ["other", "Other"],
  ["pets", "Pets"],
  ["rent", "Rent"],
  ["skate-school", "Skate"],
  ["subscriptions", "Subscriptions"]
];

const SHORTCUTS = [
  { text: "Groceries€30.00 / week", type: "button" },
  { text: "Therapy€28.00 / week", type: "button" },
  { text: "Eating out€8.75 / week", type: "button" },
  { text: "Other€4.03 / week", type: "button" }
];

const IDLE_IMPACT = "Saving a transaction will update the rest of the week and month immediately.";
const INVALID_IMPACT = "Add a valid amount before saving.";
const HEADING = "Money quick log";
const NOTE = "Fast spending check-in with the remaining money shown first.";

// Empty form fields, the full category list, and the four weekly shortcuts stay
// the same whatever the stored totals are.
function expectedIdleForm(summaryTexts, impact = IDLE_IMPACT) {
  return {
    amount: { autocomplete: "off", inputMode: "decimal", placeholder: "12.50", value: "" },
    badge: "On pace",
    category: { ariaLabel: "Money category", options: CATEGORY_OPTIONS, value: "groceries" },
    impact,
    shortcuts: SHORTCUTS,
    summary: summaryTexts.map((text) => ({ className: "money-mini-stat", text })),
    vendor: { autocomplete: "off", maxLength: 80, placeholder: "Lidl, K-Market, HSL...", value: "" }
  };
}

const DEFAULT_SUMMARY = ["Remaining this week€107.45", "Remaining this month€261.11"];
// One €12.50 grocery transaction on the seeded date.
const SEEDED_SUMMARY = ["Remaining this week€102.34", "Remaining this month€248.61"];

const FIELD_BACKGROUND = "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box";
const SHORTCUT_BACKGROUND = "rgba(255, 255, 255, 0.8) none repeat scroll 0% 0% / auto padding-box border-box";
const STAT_BACKGROUND = "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box";
const CARD_BACKGROUND = "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box";
const BADGE_BACKGROUND = "rgba(255, 255, 255, 0.74) none repeat scroll 0% 0% / auto padding-box border-box";
const BADGE_COLOR = "rgb(79, 136, 133)";
const FIELD_COLOR = "rgb(45, 47, 43)";

// The category select paints its own chevron and divider, so its background is
// three layered gradients rather than a flat colour. The production CSS
// minifier writes the authored `to right` as the equivalent `90deg`.
const SELECT_BACKGROUND =
  "linear-gradient(45deg, rgba(0, 0, 0, 0) 50%, rgb(138, 134, 255) 50%) no-repeat scroll calc(100% - 20px) calc(50% - 3px) / 6px 6px padding-box border-box, " +
  "linear-gradient(135deg, rgb(138, 134, 255) 50%, rgba(0, 0, 0, 0) 50%) no-repeat scroll calc(100% - 14px) calc(50% - 3px) / 6px 6px padding-box border-box, " +
  "rgba(255, 255, 255, 0.88) linear-gradient(90deg, rgba(185, 206, 240, 0.32), rgba(185, 206, 240, 0.32)) no-repeat scroll calc(100% - 40px) 50% / 1px 20px padding-box border-box";

const FORM_TEMPLATE_AREAS = '"amount category save" "vendor vendor vendor"';
const SHORTCUT_HEIGHT = 64.375;
const STAT_HEIGHT = 84;

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
    gridTemplateAreas: "none",
    gridTemplateColumns: "none",
    lineHeight: "23.2px",
    padding: "0px",
    ...overrides
  };
}

function mutedText(height, width) {
  return visualBox({ border: `0px none ${MUTED}`, color: MUTED, fontWeight: "450", height, width });
}

const DESKTOP = {
  amountWidth: 414.40625,
  cardHeight: 534.625,
  cardWidth: 940,
  categoryWidth: 342.34375,
  fieldHeight: 42,
  fieldPadding: "9px 12px",
  formHeight: 151.25,
  headingFontSize: "26.4px",
  headingHeight: 30.625,
  headingLineHeight: "30.624px",
  impactHeight: 23.1875,
  innerWidth: 892,
  noteHeight: 23.1875,
  selectHeight: 45.1875,
  selectPadding: "10px 42px 10px 14px",
  shortcutWidth: 208.75,
  statWidth: 425.5,
  textWidth: 451.109375
};

const MOBILE = {
  amountWidth: 84,
  cardHeight: 728.8125,
  cardWidth: 370,
  categoryWidth: 112.75,
  fieldHeight: 54,
  fieldPadding: "10px 14px",
  formHeight: 158.125,
  headingFontSize: "20px",
  headingHeight: 23.1875,
  headingLineHeight: "23.2px",
  impactHeight: 46.375,
  innerWidth: 338,
  noteHeight: 46.375,
  selectHeight: 54,
  selectPadding: "10px 14px",
  shortcutWidth: 148.5,
  statWidth: 305,
  textWidth: 241.203125
};

// Amount input, category select, and the full-width vendor input.
function expectedInputs(layout) {
  const field = (width) =>
    visualBox({
      background: FIELD_BACKGROUND,
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "15px",
      color: FIELD_COLOR,
      fontWeight: "430",
      height: layout.fieldHeight,
      lineHeight: "20px",
      padding: layout.fieldPadding,
      width
    });
  return [
    field(layout.amountWidth),
    visualBox({
      alignItems: "center",
      background: SELECT_BACKGROUND,
      border: "1px solid rgba(185, 206, 240, 0.58)",
      borderRadius: "16px",
      height: layout.selectHeight,
      padding: layout.selectPadding,
      width: layout.categoryWidth
    }),
    field(layout.innerWidth)
  ];
}

function expectedMoneyQuickVisual(mobile, summaryTexts) {
  const layout = mobile ? MOBILE : DESKTOP;
  // The save button fills the rest of the first form row.
  const saveWidth = layout.innerWidth - layout.amountWidth - layout.categoryWidth - 20;
  return {
    badge: visualBox({
      alignItems: "center",
      background: BADGE_BACKGROUND,
      border: `0px none ${BADGE_COLOR}`,
      borderRadius: "999px",
      color: BADGE_COLOR,
      display: "flex",
      height: 35.1875,
      padding: "6px 11px",
      width: 84.796875
    }),
    form: visualBox({
      alignItems: "end",
      display: "grid",
      gap: "10px",
      gridTemplateAreas: FORM_TEMPLATE_AREAS,
      gridTemplateColumns: gridColumns(layout.amountWidth, layout.categoryWidth, saveWidth),
      height: layout.formHeight,
      width: layout.innerWidth
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
    impact: mutedText(layout.impactHeight, layout.innerWidth),
    inputs: expectedInputs(layout),
    note: { text: NOTE, visual: mutedText(layout.noteHeight, layout.textWidth) },
    panel: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.cardHeight,
      width: layout.cardWidth
    }),
    shortcuts: SHORTCUTS.map((shortcut) => ({
      text: shortcut.text,
      visual: visualBox({
        background: SHORTCUT_BACKGROUND,
        border: "1px solid rgba(185, 206, 240, 0.48)",
        borderRadius: "14px",
        height: SHORTCUT_HEIGHT,
        padding: "8px 10px",
        width: layout.shortcutWidth
      })
    })),
    state: expectedIdleForm(summaryTexts),
    summary: summaryTexts.map((text) => ({
      text,
      visual: visualBox({
        background: STAT_BACKGROUND,
        border: "1px solid rgba(224, 219, 209, 0.72)",
        borderRadius: "15px",
        display: "grid",
        gap: "8px",
        gridTemplateColumns: gridColumns(layout.statWidth - 26),
        height: STAT_HEIGHT,
        padding: "12px",
        width: layout.statWidth
      })
    }))
  };
}

module.exports = {
  DEFAULT_SUMMARY,
  IDLE_IMPACT,
  INVALID_IMPACT,
  SEEDED_SUMMARY,
  expectedIdleForm,
  expectedMoneyQuickVisual,
  moneyQuickState,
  moneyQuickVisualContract
};
