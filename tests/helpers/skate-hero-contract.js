// Pinned Skate hero contract. The state, computed styles, geometry, and
// rendered-image signature were captured from the standalone legacy page while
// it was still the live visual reference, so the production React route keeps
// protecting the same rendering without starting the legacy server.

function skateHeroState() {
  return `(() => {
    const documentRoot = document;
    const text = (id) => documentRoot.getElementById(id).textContent.trim();
    return {
      activeView: documentRoot.querySelector(".view.active").id,
      attemptBudget: text("skateAttemptBudget"),
      benchmarkHidden: documentRoot.getElementById("skateBenchmarkChip").hidden,
      benchmarkLabel: text("skateBenchmarkLabel"),
      blockLabel: text("skateBlockLabel"),
      boardHours: text("skateBoardHours"),
      currentDay: documentRoot.getElementById("skateCurrentDay").value,
      dayCount: text("skateDayCount"),
      extraRestDay: documentRoot.getElementById("skateExtraRestDay").value,
      finishDisabled: documentRoot.getElementById("finishSkateSession").disabled,
      flowFocus: text("skateFlowFocus"),
      heroSubtitle: text("skateHeroSubtitle"),
      intensity: documentRoot.querySelector("#skateIntensityToggle .active").dataset.intensity,
      intensityDescription: text("skateIntensityDescription"),
      intensityEffort: text("skateIntensityEffort"),
      mainFocus: text("skateMainFocus"),
      phaseBadge: text("skatePhaseBadge"),
      restDay: documentRoot.getElementById("skateRestDay").value,
      sessionDaysCount: text("skateSessionDaysCount"),
      sessionHint: text("skateSessionHint"),
      skateiqBlock: text("skateSkateiqBlock"),
      startDisabled: documentRoot.getElementById("startSkateSession").disabled,
      weekCount: text("skateWeekCount")
    };
  })()`;
}

function skateHeroVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: dimension(rect.height),
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".skate-hero-card");
    return {
      actions: pick(card.querySelector(".skate-session-actions-card")),
      card: pick(card),
      intensity: pick(card.querySelector(".skate-intensity-card")),
      layout: pick(card.querySelector(".skate-hero-layout")),
      main: pick(card.querySelector(".skate-main-strip")),
      metrics: pick(card.querySelector(".skate-hero-metrics")),
      panel: pick(card.querySelector(".panel-inner")),
      settings: pick(card.querySelector(".skate-settings-strip")),
      support: pick(card.querySelector(".skate-support-strip"))
    };
  })()`;
}

function prepareHeroScreenshot() {
  return `(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-hero-card").scrollIntoView({ block: "start" });
  })()`;
}

function heroClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".skate-hero-card").getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, documentRoot.defaultView.innerHeight)
    };
  })()`;
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization.
function expectedSkateHeroState() {
  return {
    activeView: "skateView",
    attemptBudget: "10-20 focused attempts",
    benchmarkHidden: false,
    benchmarkLabel: "Day 15 benchmark",
    blockLabel: "Day 15",
    boardHours: "0h",
    currentDay: "15",
    dayCount: "15 / 60",
    extraRestDay: "",
    finishDisabled: true,
    flowFocus: "Choose one direction today.",
    heroSubtitle: "Dynamic balance with 180s and shove-it still moving. Rest days this week: Sunday.",
    intensity: "yellow",
    intensityDescription: "Normal technical day · One main trick, stop while form still looks clean.",
    intensityEffort: "4-6/10",
    mainFocus: "Benchmark first, then 180.",
    phaseBadge: "Balance Blueprint · Week 3",
    restDay: "0",
    sessionDaysCount: "0 / 6",
    sessionHint: "Hit start when the session begins. Or use \"Log past session\" / the roadmap if you forgot to save yesterday.",
    skateiqBlock: "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min.",
    startDisabled: false,
    weekCount: "3 / 21"
  };
}

function expectedSkateHeroVisual(mobile) {
  return mobile
    ? {
        actions: {
          background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(236, 248, 255, 0.74)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 259.938,
          padding: "14px 16px",
          width: 338
        },
        card: {
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 1656.031,
          padding: "0px",
          width: 370
        },
        intensity: {
          background: "rgba(255, 255, 255, 0.64) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 183.594,
          padding: "14px 16px",
          width: 338
        },
        layout: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "16px",
          height: 893.875,
          padding: "0px",
          width: 338
        },
        main: {
          background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 228, 0.58)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 153.141,
          padding: "14px 16px",
          width: 338
        },
        metrics: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          height: 349.063,
          padding: "0px",
          width: 338
        },
        panel: {
          background: "radial-gradient(circle at 100% 0px, rgba(185, 238, 238, 0.18), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(247, 251, 255, 0.7), rgba(255, 250, 243, 0.6)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 1656.031,
          padding: "16px",
          width: 370
        },
        settings: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px 12px",
          height: 246.344,
          padding: "0px",
          width: 338
        },
        support: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          height: 253.203,
          padding: "0px",
          width: 338
        }
      }
    : {
        actions: {
          background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(236, 248, 255, 0.74)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 259.938,
          padding: "14px 16px",
          width: 350.406
        },
        card: {
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 824.422,
          padding: "0px",
          width: 940
        },
        intensity: {
          background: "rgba(255, 255, 255, 0.64) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 183.594,
          padding: "14px 16px",
          width: 350.406
        },
        layout: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "16px",
          height: 457.531,
          padding: "0px",
          width: 892
        },
        main: {
          background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 228, 0.58)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.34)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 205.281,
          padding: "14px 16px",
          width: 525.594
        },
        metrics: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          height: 79.766,
          padding: "0px",
          width: 892
        },
        panel: {
          background: "radial-gradient(circle at 100% 0px, rgba(185, 238, 238, 0.18), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(247, 251, 255, 0.7), rgba(255, 250, 243, 0.6)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 824.422,
          padding: "24px",
          width: 940
        },
        settings: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px 12px",
          height: 143.313,
          padding: "0px",
          width: 892
        },
        support: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          height: 238.25,
          padding: "0px",
          width: 525.594
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered card. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [234, 233, 235], [239, 239, 240], [247, 247, 249], [246, 247, 249],
  [244, 246, 249], [244, 249, 252], [232, 244, 247], [229, 244, 246],
  [248, 249, 250], [254, 254, 255], [243, 246, 247], [253, 254, 255],
  [245, 247, 249], [250, 253, 255], [243, 247, 249], [248, 252, 253],
  [240, 240, 241], [247, 247, 248], [241, 242, 243], [246, 246, 248],
  [244, 245, 247], [247, 249, 252], [246, 249, 251], [245, 249, 250],
  [244, 245, 246], [247, 247, 248], [251, 252, 253], [251, 252, 252],
  [250, 251, 253], [250, 251, 254], [249, 251, 253], [249, 251, 252],
  [239, 239, 240], [237, 237, 236], [246, 245, 242], [247, 246, 241],
  [248, 247, 243], [236, 237, 239], [244, 244, 243], [249, 249, 250],
  [252, 252, 250], [251, 250, 246], [251, 250, 245], [253, 251, 243],
  [252, 251, 245], [248, 248, 249], [243, 243, 235], [244, 246, 246],
  [247, 248, 249], [248, 249, 251], [248, 249, 251], [249, 249, 250],
  [249, 250, 251], [238, 239, 244], [240, 244, 240], [245, 248, 249],
  [244, 245, 248], [247, 248, 250], [249, 250, 252], [246, 246, 248],
  [248, 249, 251], [229, 229, 255], [238, 242, 237], [246, 250, 250]
];

const MOBILE_SCREENSHOT_TILES = [
  [230, 233, 234], [223, 227, 229], [222, 227, 229], [235, 241, 242],
  [234, 241, 242], [238, 247, 248], [211, 232, 233], [233, 246, 247],
  [246, 249, 250], [243, 247, 248], [251, 254, 254], [250, 253, 254],
  [249, 253, 253], [249, 253, 253], [248, 253, 253], [246, 252, 253],
  [246, 249, 250], [238, 243, 243], [249, 251, 252], [251, 254, 254],
  [251, 253, 254], [250, 253, 254], [250, 253, 254], [247, 252, 253],
  [245, 247, 248], [239, 241, 242], [250, 251, 252], [252, 254, 254],
  [251, 253, 254], [251, 253, 254], [251, 253, 254], [249, 252, 254],
  [239, 241, 242], [242, 243, 244], [252, 252, 253], [251, 252, 253],
  [251, 252, 253], [250, 252, 253], [250, 252, 253], [248, 250, 252],
  [236, 236, 238], [235, 236, 237], [241, 242, 243], [247, 248, 249],
  [247, 248, 249], [247, 248, 249], [246, 247, 249], [246, 247, 250],
  [243, 244, 246], [242, 242, 244], [242, 243, 244], [245, 245, 247],
  [246, 247, 249], [246, 248, 249], [246, 247, 249], [249, 250, 253],
  [245, 246, 247], [237, 237, 238], [240, 240, 239], [241, 241, 239],
  [241, 241, 238], [247, 247, 242], [248, 247, 242], [252, 251, 248]
];

function expectedSkateHeroScreenshot(mobile) {
  return mobile
    ? { height: 844, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 720, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  expectedSkateHeroScreenshot,
  expectedSkateHeroState,
  expectedSkateHeroVisual,
  heroClip,
  prepareHeroScreenshot,
  skateHeroState,
  skateHeroVisualContract
};
