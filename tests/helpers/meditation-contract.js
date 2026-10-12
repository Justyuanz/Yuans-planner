// Pinned Meditation card contract. The state, computed styles, and geometry
// were captured from the standalone legacy page while it was still the live
// visual reference, so the production React route keeps protecting the same
// rendering without starting the legacy server.

function meditationState() {
  return `(() => {
    const documentRoot = document;
    const input = documentRoot.getElementById("meditationMinutes");
    const start = documentRoot.getElementById("startMeditation");
    const cancel = documentRoot.getElementById("cancelMeditation");
    return {
      cancel: { hidden: cancel.hidden, text: cancel.textContent.trim(), type: cancel.type },
      countdown: {
        ariaLabel: documentRoot.getElementById("meditationCountdown").getAttribute("aria-label"),
        text: documentRoot.getElementById("meditationCountdown").textContent.trim()
      },
      input: {
        disabled: input.disabled,
        max: input.max,
        min: input.min,
        required: input.required,
        step: input.step,
        type: input.type,
        value: input.value
      },
      start: { disabled: start.disabled, text: start.textContent.trim(), type: start.type },
      status: {
        role: documentRoot.getElementById("meditationStatus").getAttribute("role"),
        text: documentRoot.getElementById("meditationStatus").textContent.trim()
      }
    };
  })()`;
}

function meditationVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const card = documentRoot.querySelector(".meditation-card");
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
        lineHeight: style.lineHeight,
        margin: style.margin,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      controls: pick(documentRoot.getElementById("meditationForm")),
      countdown: pick(documentRoot.getElementById("meditationCountdown")),
      heading: { text: card.querySelector("h3").textContent.trim(), visual: pick(card.querySelector("h3")) },
      input: pick(documentRoot.getElementById("meditationMinutes")),
      note: { text: card.querySelector(".small-note").textContent.trim(), visual: pick(card.querySelector(".small-note")) },
      start: pick(documentRoot.getElementById("startMeditation")),
      state: ${meditationState()},
      status: pick(documentRoot.getElementById("meditationStatus"))
    };
  })()`;
}

// A fresh card offers a 1-180 minute number field and nothing running.
function expectedReadyState(savedMinutes, dateLabel) {
  return {
    cancel: { hidden: true, text: "Cancel", type: "button" },
    countdown: { ariaLabel: "Meditation time remaining", text: "Ready" },
    input: {
      disabled: false,
      max: "180",
      min: "1",
      required: true,
      step: "1",
      type: "number",
      value: "10"
    },
    start: { disabled: false, text: "Start", type: "submit" },
    status: { role: "status", text: `${savedMinutes} min saved for ${dateLabel}.` }
  };
}


const FONT_FAMILY =
  'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';
const TRANSPARENT = "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box";
const CARD_BACKGROUND =
  "rgba(0, 0, 0, 0) linear-gradient(110deg, rgb(250, 247, 253), rgb(246, 250, 247)) repeat scroll 0% 0% / auto padding-box border-box";
const INPUT_BACKGROUND = "rgba(255, 255, 255, 0.85) none repeat scroll 0% 0% / auto padding-box border-box";
const START_BACKGROUND = "rgb(236, 235, 255) none repeat scroll 0% 0% / auto padding-box border-box";
const INK = "rgb(23, 24, 32)";
const MUTED = "rgb(118, 118, 129)";
const START_COLOR = "rgb(113, 107, 255)";

const HEADING = "A quiet moment";
const NOTE = "Meditate today. Completed minutes flow into Mind.";

// Mirrors the 16 properties the browser contract reads for every element.
function visualBox(overrides) {
  return {
    alignItems: "normal",
    background: TRANSPARENT,
    border: `0px none ${INK}`,
    borderRadius: "0px",
    color: INK,
    display: "block",
    flexWrap: "nowrap",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    lineHeight: "23.2px",
    margin: "0px",
    padding: "0px",
    ...overrides
  };
}

function mutedText(height, width) {
  return visualBox({
    border: `0px none ${MUTED}`,
    color: MUTED,
    fontSize: "13.92px",
    fontWeight: "450",
    height,
    lineHeight: "19.7664px",
    width
  });
}

const DESKTOP = {
  cardHeight: 196.578125,
  cardWidth: 892,
  controlsHeight: 45.1875,
  innerWidth: 850,
  noteHeight: 19.765625
};

const MOBILE = {
  cardHeight: 272.34375,
  cardWidth: 338,
  // The narrow row wraps the minute field, Start and Cancel onto two lines.
  controlsHeight: 101.1875,
  innerWidth: 296,
  noteHeight: 39.53125
};

function expectedMeditationVisual(mobile, savedMinutes, dateLabel) {
  const layout = mobile ? MOBILE : DESKTOP;
  return {
    card: visualBox({
      background: CARD_BACKGROUND,
      border: "1px solid rgb(233, 226, 241)",
      borderRadius: "22px",
      height: layout.cardHeight,
      margin: "0px 0px 22px",
      padding: "20px",
      width: layout.cardWidth
    }),
    controls: visualBox({
      alignItems: "center",
      display: "flex",
      flexWrap: "wrap",
      gap: "14px",
      height: layout.controlsHeight,
      margin: "14px 0px 10px",
      width: layout.innerWidth
    }),
    countdown: visualBox({
      fontSize: "20.8px",
      height: 30.140625,
      lineHeight: "30.16px",
      width: 75
    }),
    heading: {
      text: HEADING,
      visual: visualBox({
        fontSize: "18.72px",
        fontWeight: "700",
        height: 27.140625,
        lineHeight: "27.144px",
        margin: "0px 0px 18.72px",
        width: layout.innerWidth
      })
    },
    input: visualBox({
      background: INPUT_BACKGROUND,
      border: "1px solid rgba(224, 219, 209, 0.72)",
      borderRadius: "14px",
      height: 45.1875,
      padding: "10px 12px",
      width: 85
    }),
    note: { text: NOTE, visual: mutedText(layout.noteHeight, layout.innerWidth) },
    start: visualBox({
      background: START_BACKGROUND,
      border: `0px none ${START_COLOR}`,
      borderRadius: "12px",
      color: START_COLOR,
      fontWeight: "510",
      height: 42,
      padding: "9px 15px",
      width: 64.40625
    }),
    state: expectedReadyState(savedMinutes, dateLabel),
    status: mutedText(19.765625, layout.innerWidth)
  };
}

module.exports = {
  expectedMeditationVisual,
  expectedReadyState,
  meditationState,
  meditationVisualContract
};
