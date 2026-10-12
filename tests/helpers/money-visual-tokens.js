// Shared computed-style values used by the pinned Money card contracts. Chrome
// serializes these identically on every Money card, so keeping one copy stops
// the card contracts from drifting apart.

const FONT_FAMILY =
  'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';
const TRANSPARENT = "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box";
const CARD_BACKGROUND = "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box";
const STAT_BACKGROUND = "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box";

// The production CSS minifier shortens the authored `circle at 100% 0%` to
// `circle at 100% 0`, which Chrome then serializes as `0px`. Both describe the
// same gradient origin, so the pinned value uses the built serialization.
const PANEL_INNER_BACKGROUND =
  "radial-gradient(circle at 100% 0px, rgba(255, 249, 204, 0.32), rgba(0, 0, 0, 0) 32%) repeat scroll 0% 0% / auto padding-box border-box, " +
  "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.58), rgba(255, 252, 247, 0.92)) repeat scroll 0% 0% / auto padding-box border-box";

const INK = "rgb(23, 24, 32)";
const MUTED = "rgb(118, 118, 129)";

const SIGNIFICANT_DIGITS = 6;

// Chrome serializes a grid template with six significant digits and breaks an
// exact tie towards the even digit, which `toPrecision` does not do.
function toSixSignificantDigits(width) {
  const decimals = SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(Math.abs(width)));
  const scale = 10 ** decimals;
  const scaled = width * scale;
  const isTie = Math.abs(scaled % 1) === 0.5;
  const rounded = isTie ? 2 * Math.round(scaled / 2) : Math.round(scaled);
  return rounded / scale;
}

// Pinned grid templates go through this because the element rect that the same
// contract records keeps full precision.
function gridColumns(...widths) {
  return widths.map((width) => `${toSixSignificantDigits(width)}px`).join(" ");
}

module.exports = {
  CARD_BACKGROUND,
  FONT_FAMILY,
  INK,
  MUTED,
  PANEL_INNER_BACKGROUND,
  STAT_BACKGROUND,
  TRANSPARENT,
  gridColumns
};
