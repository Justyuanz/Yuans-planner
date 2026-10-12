// Pinned Journal archive contract. The state, computed styles, and geometry
// were captured from the standalone legacy page while it was still the live
// visual reference, so the production React route keeps protecting the same
// rendering without starting the legacy server.

function archiveState() {
  return `(() => {
    const documentRoot = document;
    const search = documentRoot.getElementById("journalSearch");
    return {
      cards: [...documentRoot.querySelectorAll("#journalArchiveList .journal-entry-card")].map((card) => ({
        active: card.classList.contains("active"),
        date: card.querySelector(".journal-entry-card-head span").textContent.trim(),
        meta: card.querySelector(".journal-entry-meta")?.textContent.trim() || "",
        preview: card.querySelector(".journal-entry-preview").textContent.trim(),
        title: card.querySelector(".journal-entry-card-head strong").textContent.trim(),
        type: card.type
      })),
      empty: documentRoot.querySelector("#journalArchiveList .journal-empty-state")?.textContent.trim() || "",
      listAriaLive: documentRoot.getElementById("journalArchiveList").getAttribute("aria-live"),
      search: {
        autocomplete: search.autocomplete,
        maxLength: search.maxLength,
        placeholder: search.placeholder,
        value: search.value
      }
    };
  })()`;
}

function archiveVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".journal-archive-card");
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
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        textAlign: style.textAlign,
        width: rect.width
      };
    };
    return {
      cards: [...panel.querySelectorAll(".journal-entry-card")].map((card) => ({
        head: pick(card.querySelector(".journal-entry-card-head")),
        meta: card.querySelector(".journal-entry-meta") ? pick(card.querySelector(".journal-entry-meta")) : null,
        preview: pick(card.querySelector(".journal-entry-preview")),
        text: card.textContent.trim(),
        visual: pick(card)
      })),
      heading: { text: panel.querySelector("h3").textContent.trim(), visual: pick(panel.querySelector("h3")) },
      list: pick(documentRoot.getElementById("journalArchiveList")),
      note: { text: panel.querySelector(".small-note").textContent.trim(), visual: pick(panel.querySelector(".small-note")) },
      panel: pick(panel),
      panelInner: pick(panel.querySelector(".panel-inner")),
      search: pick(documentRoot.getElementById("journalSearch")),
      state: ${archiveState()}
    };
  })()`;
}

const SEARCH_FIELD = {
  autocomplete: "off",
  maxLength: 80,
  placeholder: "Search by feeling, date, or phrase",
  value: ""
};
const NO_ENTRIES_TEXT = "Your old journals will stack here as soon as you write one.";
const NO_MATCH_TEXT = "No journal entry matches that search yet.";
const LONG_CONTENT_LENGTH = 150;
// Long previews are clipped and get a trailing ellipsis.
const CLIPPED_PREVIEW = `${"x".repeat(131)}…`;

function expectedEmptyState(empty = NO_ENTRIES_TEXT) {
  return { cards: [], empty, listAriaLive: "polite", search: SEARCH_FIELD };
}

// active, date, title, meta, preview — newest first.
const POPULATED_CARDS = [
  [true, "Mon Sep 14", "Soft start", "Energy Good · Focus Clear · Outside walk.", "I felt calm. Then I took a walk."],
  [false, "Sun Sep 13", "Sun Sep 13", "", "Cafe notes after class."],
  [false, "Sat Sep 12", "Sat Sep 12", "Energy Low · Focus Foggy · Late night.", "Energy: low · Focus: foggy · Late night."],
  [false, "Fri Sep 11", "Fri Sep 11", "", "A tiny note lives here."],
  [false, "Thu Sep 10", "Thu Sep 10", "", CLIPPED_PREVIEW]
];

function archiveCard([active, date, title, meta, preview]) {
  return { active, date, meta, preview, title, type: "button" };
}

function expectedPopulatedState({ activeIndex = 0, searchValue = "" } = {}) {
  return {
    cards: POPULATED_CARDS.map((card, index) => ({
      ...archiveCard(card),
      active: index === activeIndex
    })),
    empty: "",
    listAriaLive: "polite",
    search: { ...SEARCH_FIELD, value: searchValue }
  };
}


const FONT_FAMILY =
  'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';
const TRANSPARENT = "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box";
const CARD_BACKGROUND = "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box";
const FIELD_BACKGROUND = "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box";
const ENTRY_BACKGROUND =
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 234, 243, 0.72), rgba(255, 255, 255, 0.88) 38%, rgba(233, 249, 248, 0.74)) repeat scroll 0% 0% / auto padding-box border-box";
const PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 0px 0px, rgba(185, 238, 238, 0.2), rgba(0, 0, 0, 0) 28%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(239, 247, 255, 0.78), rgba(255, 250, 245, 0.68)) repeat scroll 0% 0% / auto padding-box border-box";

const INK = "rgb(23, 24, 32)";
const MUTED = "rgb(118, 118, 129)";
const HEADING_COLOR = "rgb(47, 51, 66)";
const ENTRY_COLOR = "rgb(60, 60, 68)";
const META_COLOR = "rgb(114, 109, 121)";
const PREVIEW_COLOR = "rgb(95, 97, 110)";
const ACTIVE_BORDER = "1px solid rgba(126, 116, 255, 0.42)";
const IDLE_BORDER = "1px solid rgba(224, 219, 209, 0.72)";

const HEADING = "Old journals";
const NOTE = "Come back to a date, a feeling, or a few remembered words.";

// The archive list and its cards overflow their card at both viewport sizes, so
// these widths are intentionally wider than the panel.
const LIST_WIDTH = 988.609375;
const ENTRY_INNER_WIDTH = 956.609375;
const LIST_HEIGHT = 514.109375;
const TEXT_WIDTH = 385.828125;
const ENTRY_HEIGHT_WITH_META = 110.078125;
const ENTRY_HEIGHT = 81.984375;

// Mirrors the 15 properties the browser contract reads for every element.
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
    lineHeight: "23.2px",
    padding: "0px",
    textAlign: "start",
    ...overrides
  };
}

function expectedCard([active, , , meta], text) {
  return {
    head: visualBox({
      alignItems: "center",
      border: `0px none ${ENTRY_COLOR}`,
      color: ENTRY_COLOR,
      display: "flex",
      gap: "8px",
      height: 20.875,
      textAlign: "left",
      width: ENTRY_INNER_WIDTH
    }),
    meta: meta
      ? visualBox({
          border: `0px none ${META_COLOR}`,
          color: META_COLOR,
          fontSize: "12.48px",
          height: 18.09375,
          lineHeight: "18.096px",
          textAlign: "left",
          width: ENTRY_INNER_WIDTH
        })
      : null,
    preview: visualBox({
      border: `0px none ${PREVIEW_COLOR}`,
      color: PREVIEW_COLOR,
      fontSize: "14.08px",
      height: 21.109375,
      lineHeight: "21.12px",
      textAlign: "left",
      width: ENTRY_INNER_WIDTH
    }),
    text,
    visual: visualBox({
      background: ENTRY_BACKGROUND,
      border: active ? ACTIVE_BORDER : IDLE_BORDER,
      borderRadius: "18px",
      color: ENTRY_COLOR,
      display: "grid",
      gap: "10px",
      height: meta ? ENTRY_HEIGHT_WITH_META : ENTRY_HEIGHT,
      padding: "14px 15px",
      textAlign: "left",
      width: LIST_WIDTH
    })
  };
}

const DESKTOP = {
  headingFontSize: "21.6px",
  headingHeight: 25.046875,
  headingLineHeight: "25.056px",
  padding: "24px",
  panelHeight: 725.953125,
  panelWidth: 940
};

const MOBILE = {
  headingFontSize: "17.6px",
  headingHeight: 20.40625,
  headingLineHeight: "20.416px",
  padding: "16px",
  panelHeight: 705.3125,
  // The overflowing list widens the card itself at phone width.
  panelWidth: 1020.609375
};

function expectedArchiveVisual(mobile) {
  const layout = mobile ? MOBILE : DESKTOP;
  const state = expectedPopulatedState();
  return {
    cards: POPULATED_CARDS.map((card, index) => {
      const entry = state.cards[index];
      const text = [entry.title, entry.date, entry.meta, entry.preview].filter(Boolean).join("");
      return expectedCard(card, text);
    }),
    heading: {
      text: HEADING,
      visual: visualBox({
        border: `0px none ${HEADING_COLOR}`,
        color: HEADING_COLOR,
        fontSize: layout.headingFontSize,
        fontWeight: "540",
        height: layout.headingHeight,
        lineHeight: layout.headingLineHeight,
        width: TEXT_WIDTH
      })
    },
    list: visualBox({ display: "grid", gap: "12px", height: LIST_HEIGHT, width: LIST_WIDTH }),
    note: {
      text: NOTE,
      visual: visualBox({
        border: `0px none ${MUTED}`,
        color: MUTED,
        fontSize: "13.92px",
        fontWeight: "450",
        height: 19.765625,
        lineHeight: "19.7664px",
        width: TEXT_WIDTH
      })
    },
    panel: visualBox({
      background: CARD_BACKGROUND,
      borderRadius: "18px",
      height: layout.panelHeight,
      width: layout.panelWidth
    }),
    panelInner: visualBox({
      background: PANEL_INNER_BACKGROUND,
      display: "grid",
      gap: "18px",
      height: layout.panelHeight,
      padding: layout.padding,
      width: layout.panelWidth
    }),
    search: visualBox({
      background: FIELD_BACKGROUND,
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "15px",
      color: "rgb(45, 47, 43)",
      fontWeight: "430",
      height: 42,
      lineHeight: "20px",
      padding: "9px 12px",
      width: LIST_WIDTH
    }),
    state
  };
}

module.exports = {
  CLIPPED_PREVIEW,
  LONG_CONTENT_LENGTH,
  NO_MATCH_TEXT,
  POPULATED_CARDS,
  archiveCard,
  archiveState,
  archiveVisualContract,
  expectedArchiveVisual,
  expectedEmptyState,
  expectedPopulatedState
};
