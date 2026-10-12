// Pinned Skate roadmap contract. The state, computed styles, geometry, and
// rendered-image signature were captured from the standalone legacy page while
// it was still the live visual reference, so the production React route keeps
// protecting the same rendering without starting the legacy server.

function roadmapState() {
  return `(() => {
    const documentRoot = document;
    const grid = documentRoot.querySelector("#skateTrendCharts .skate-roadmap-grid");
    return {
      days: [...documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-day")].map((day) => ({
        ariaLabel: day.getAttribute("aria-label"),
        className: day.className,
        title: day.title,
        type: day.type
      })),
      empty: documentRoot.querySelector("#skateTrendCharts .body-support-empty")?.textContent.trim() || "",
      gridColumns: grid?.style.getPropertyValue("--roadmap-columns") || "",
      months: [...documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-month")].map((month) => ({
        column: month.style.gridColumn,
        label: month.textContent.trim()
      })),
      spacers: documentRoot.querySelectorAll("#skateTrendCharts .skate-roadmap-spacer").length
    };
  })()`;
}

function roadmapVisualContract() {
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
        overflowX: style.overflowX,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".skate-trends-card");
    const days = card.querySelectorAll(".skate-roadmap-day");
    return {
      card: pick(card),
      firstDay: pick(days[0]),
      grid: pick(card.querySelector(".skate-roadmap-grid")),
      loggedDay: pick(card.querySelector(".intensity-green")),
      months: pick(card.querySelector(".skate-roadmap-months")),
      panel: pick(card.querySelector(".panel-inner")),
      roadmap: pick(card.querySelector(".skate-roadmap"))
    };
  })()`;
}

function prepareRoadmapScreenshot() {
  return `(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-trends-card").scrollIntoView({ block: "start" });
  })()`;
}

function cardClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".skate-trends-card").getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: rect.height
    };
  })()`;
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization.
function expectedSkateRoadmapState() {
  return {
    days: [
      {
        ariaLabel: "Sat Aug 29 · 1 skate session",
        className: "skate-roadmap-day intensity-blue",
        title: "Sat Aug 29 · BLUE · Baseline ride",
        type: "button"
      },
      {
        ariaLabel: "Sun Aug 30 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Sun Aug 30",
        type: "button"
      },
      {
        ariaLabel: "Mon Aug 31 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Mon Aug 31",
        type: "button"
      },
      {
        ariaLabel: "Tue Sep 1 · 2 skate sessions",
        className: "skate-roadmap-day intensity-green",
        title: "Tue Sep 1 · GREEN · Latest session",
        type: "button"
      },
      {
        ariaLabel: "Wed Sep 2 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Wed Sep 2",
        type: "button"
      },
      {
        ariaLabel: "Thu Sep 3 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Thu Sep 3",
        type: "button"
      },
      {
        ariaLabel: "Fri Sep 4 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Fri Sep 4",
        type: "button"
      },
      {
        ariaLabel: "Sat Sep 5 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Sat Sep 5",
        type: "button"
      },
      {
        ariaLabel: "Sun Sep 6 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Sun Sep 6",
        type: "button"
      },
      {
        ariaLabel: "Mon Sep 7 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Mon Sep 7",
        type: "button"
      },
      {
        ariaLabel: "Tue Sep 8 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Tue Sep 8",
        type: "button"
      },
      {
        ariaLabel: "Wed Sep 9 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Wed Sep 9",
        type: "button"
      },
      {
        ariaLabel: "Thu Sep 10 · 1 skate session",
        className: "skate-roadmap-day intensity-yellow",
        title: "Thu Sep 10 · YELLOW · Compatibility session",
        type: "button"
      },
      {
        ariaLabel: "Fri Sep 11 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Fri Sep 11",
        type: "button"
      },
      {
        ariaLabel: "Sat Sep 12 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Sat Sep 12",
        type: "button"
      },
      {
        ariaLabel: "Sun Sep 13 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Sun Sep 13",
        type: "button"
      },
      {
        ariaLabel: "Mon Sep 14 · no logged session",
        className: "skate-roadmap-day intensity-empty",
        title: "Mon Sep 14",
        type: "button"
      }
    ],
    empty: "",
    gridColumns: "4",
    months: [
      {
        column: "1",
        label: "Aug"
      },
      {
        column: "2",
        label: "Sep"
      }
    ],
    spacers: 6
  };
}

function expectedSkateRoadmapVisual(mobile) {
  return mobile
    ? {
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
          height: 282.25,
          overflowX: "visible",
          padding: "0px",
          width: 370
        },
        firstDay: {
          background: "rgba(110, 176, 255, 0.22) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "4px",
          boxShadow: "none",
          color: "rgb(46, 95, 159)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 14,
          overflowX: "visible",
          padding: "0px",
          width: 14
        },
        grid: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 138,
          overflowX: "auto",
          padding: "0px 0px 4px",
          width: 338
        },
        loggedDay: {
          background: "rgba(122, 205, 122, 0.26) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "4px",
          boxShadow: "none",
          color: "rgb(45, 109, 60)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 14,
          overflowX: "visible",
          padding: "0px",
          width: 14
        },
        months: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 16.688,
          overflowX: "visible",
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
          height: 282.25,
          overflowX: "visible",
          padding: "16px",
          width: 370
        },
        roadmap: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 166.688,
          overflowX: "visible",
          padding: "0px",
          width: 338
        }
      }
    : {
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
          height: 282.5,
          overflowX: "visible",
          padding: "0px",
          width: 940
        },
        firstDay: {
          background: "rgba(110, 176, 255, 0.22) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "4px",
          boxShadow: "none",
          color: "rgb(46, 95, 159)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 14,
          overflowX: "visible",
          padding: "0px",
          width: 14
        },
        grid: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 138,
          overflowX: "auto",
          padding: "0px 0px 4px",
          width: 892
        },
        loggedDay: {
          background: "rgba(122, 205, 122, 0.26) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "4px",
          boxShadow: "none",
          color: "rgb(45, 109, 60)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 14,
          overflowX: "visible",
          padding: "0px",
          width: 14
        },
        months: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 16.688,
          overflowX: "visible",
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
          height: 282.5,
          overflowX: "visible",
          padding: "24px",
          width: 940
        },
        roadmap: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          height: 166.688,
          overflowX: "visible",
          padding: "0px",
          width: 892
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered card. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [247, 247, 247], [248, 248, 249], [252, 252, 254], [251, 252, 255],
  [250, 251, 255], [248, 251, 254], [245, 250, 252], [242, 249, 249],
  [210, 210, 212], [198, 198, 202], [237, 237, 241], [239, 240, 243],
  [238, 240, 244], [242, 244, 247], [246, 250, 251], [243, 249, 249],
  [250, 249, 250], [251, 251, 253], [249, 250, 253], [248, 249, 253],
  [248, 249, 253], [248, 250, 252], [247, 250, 251], [242, 247, 247],
  [251, 251, 253], [252, 253, 255], [251, 252, 255], [250, 252, 255],
  [250, 251, 254], [250, 251, 253], [248, 250, 251], [246, 250, 249],
  [249, 250, 252], [252, 252, 255], [251, 252, 255], [250, 251, 255],
  [250, 251, 254], [251, 251, 253], [249, 250, 251], [247, 250, 249],
  [250, 251, 253], [252, 252, 255], [251, 252, 255], [250, 251, 255],
  [250, 251, 254], [251, 251, 252], [250, 251, 250], [249, 250, 249],
  [249, 251, 254], [251, 252, 255], [250, 252, 255], [250, 251, 255],
  [251, 251, 253], [252, 251, 252], [251, 251, 250], [250, 250, 248],
  [250, 251, 254], [251, 252, 255], [250, 251, 255], [250, 251, 254],
  [251, 251, 253], [252, 251, 251], [253, 251, 250], [252, 250, 248]
];

const MOBILE_SCREENSHOT_TILES = [
  [228, 227, 229], [217, 217, 219], [223, 223, 226], [214, 215, 218],
  [251, 252, 255], [247, 251, 254], [243, 250, 253], [241, 249, 251],
  [241, 241, 243], [236, 236, 238], [237, 238, 241], [235, 236, 239],
  [236, 237, 241], [233, 236, 240], [231, 236, 240], [239, 245, 247],
  [243, 243, 245], [238, 239, 242], [237, 238, 242], [238, 239, 243],
  [237, 238, 243], [234, 236, 241], [238, 241, 244], [246, 250, 251],
  [245, 245, 248], [249, 250, 254], [251, 252, 255], [250, 252, 255],
  [250, 251, 255], [250, 251, 254], [250, 251, 253], [244, 245, 246],
  [249, 251, 253], [245, 248, 252], [250, 252, 255], [250, 251, 255],
  [250, 251, 254], [251, 251, 253], [252, 251, 252], [252, 251, 251],
  [249, 251, 253], [247, 249, 253], [250, 251, 255], [250, 251, 254],
  [251, 251, 253], [251, 251, 252], [252, 251, 251], [253, 251, 250],
  [249, 250, 254], [247, 248, 250], [250, 251, 255], [250, 251, 254],
  [251, 251, 253], [252, 251, 252], [253, 251, 251], [254, 251, 250],
  [245, 248, 254], [248, 250, 254], [250, 251, 254], [251, 251, 253],
  [252, 251, 252], [253, 251, 250], [253, 251, 249], [254, 250, 248]
];

function expectedSkateRoadmapScreenshot(mobile) {
  return mobile
    ? { height: 282, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 282, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

// Before the season starts the roadmap shows only its empty-state note.
function expectedPreSeasonRoadmapState() {
  return {
    days: [],
    empty: "Roadmap starts on Saturday, August 29, 2026. Dots appear after the season begins and stay visible as the history grows.",
    gridColumns: "",
    months: [],
    spacers: 0
  };
}

module.exports = {
  cardClip,
  expectedPreSeasonRoadmapState,
  expectedSkateRoadmapScreenshot,
  expectedSkateRoadmapState,
  expectedSkateRoadmapVisual,
  prepareRoadmapScreenshot,
  roadmapState,
  roadmapVisualContract
};
