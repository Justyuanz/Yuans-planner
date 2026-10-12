// Pinned direct Skate page contract. The state, geometry, and rendered-image
// signature were captured from the standalone legacy page while it was still
// the live visual reference, so the production React route keeps protecting the
// same screen without starting the legacy server.

function skatePageState() {
  return `(() => {
    const text = (id) => document.getElementById(id)?.textContent.trim();
    return {
      activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
      activeView: document.querySelector(".view.active")?.id,
      bodyMetrics: [...document.querySelectorAll("#skateWeeklyMetrics .body-support-chip")]
        .map((chip) => chip.textContent.trim()),
      cards: document.querySelectorAll(".skate-page > .panel").length,
      currentDay: document.getElementById("skateCurrentDay")?.value,
      hero: {
        boardHours: text("skateBoardHours"),
        dayCount: text("skateDayCount"),
        intensity: document.querySelector("#skateIntensityToggle .active")?.dataset.intensity,
        phase: text("skatePhaseBadge"),
        sessionDays: text("skateSessionDaysCount"),
        subtitle: text("skateHeroSubtitle")
      },
      iframeCount: document.querySelectorAll("iframe").length,
      roadmapDays: document.querySelectorAll("#skateTrendCharts .skate-roadmap-day").length,
      roadmapLogged: document.querySelectorAll("#skateTrendCharts .skate-roadmap-day:not(.intensity-empty)").length,
      trainingDay: document.querySelector(".skate-plan-today .skate-plan-kicker")?.textContent.trim(),
      trainingRows: document.querySelectorAll("#skateCoachFlow .skate-plan-row").length
    };
  })()`;
}

function skatePageGeometry() {
  return `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      body: rect(".body-log-card"),
      hero: rect(".skate-hero-card"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      page: rect(".skate-page"),
      roadmap: rect(".skate-trends-card"),
      training: rect(".skate-session-card")
    };
  })()`;
}

function prepareSkatePageScreenshot() {
  return `(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const mascot = document.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    document.querySelector(".skate-hero-card").scrollIntoView({ block: "start" });
  })()`;
}

function heroClip() {
  return `(() => {
    const rect = document.querySelector(".skate-hero-card").getBoundingClientRect();
    return {
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: Math.min(rect.height, innerHeight)
    };
  })()`;
}

function expectedSkatePageState() {
  return {
    activeTab: "Skate",
    activeView: "skateView",
    bodyMetrics: [
      "Gym1x30 min"
    ],
    cards: 4,
    currentDay: "15",
    hero: {
      boardHours: "0.5h",
      dayCount: "15 / 60",
      intensity: "yellow",
      phase: "Balance Blueprint · Week 3",
      sessionDays: "1 / 6",
      subtitle: "Dynamic balance with 180s and shove-it still moving. Rest days this week: Sunday."
    },
    iframeCount: 0,
    roadmapDays: 17,
    roadmapLogged: 1,
    trainingDay: "Day 15",
    trainingRows: 7
  };
}

function expectedSkatePageGeometry(mobile) {
  return mobile
    ? {
        body: {
          height: 394.28125,
          width: 370,
          x: 10,
          y: 2216.53125
        },
        hero: {
          height: 1656.03125,
          width: 370,
          x: 10,
          y: 254.25
        },
        overflow: false,
        page: {
          height: 4617.953125,
          width: 370,
          x: 10,
          y: 254.25
        },
        roadmap: {
          height: 282.25,
          width: 370,
          x: 10,
          y: 1922.28125
        },
        training: {
          height: 2249.390625,
          width: 370,
          x: 10,
          y: 2622.8125
        }
      }
    : {
        body: {
          height: 338.6875,
          width: 940,
          x: 275,
          y: 1369.390625
        },
        hero: {
          height: 824.421875,
          width: 940,
          x: 275,
          y: 218.46875
        },
        overflow: false,
        page: {
          height: 2907.171875,
          width: 940,
          x: 275,
          y: 218.46875
        },
        roadmap: {
          height: 282.5,
          width: 940,
          x: 275,
          y: 1064.890625
        },
        training: {
          height: 1395.5625,
          width: 940,
          x: 275,
          y: 1730.078125
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered hero. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [236, 236, 237], [241, 240, 242], [248, 248, 249], [247, 248, 249],
  [245, 247, 249], [245, 249, 252], [234, 245, 248], [231, 245, 247],
  [246, 247, 248], [254, 254, 255], [241, 243, 244], [252, 253, 254],
  [242, 243, 245], [250, 252, 255], [242, 247, 248], [247, 252, 253],
  [238, 238, 239], [242, 243, 244], [246, 247, 248], [247, 248, 249],
  [249, 250, 252], [248, 249, 252], [247, 249, 251], [246, 249, 250],
  [245, 245, 246], [246, 246, 245], [253, 252, 250], [252, 252, 249],
  [251, 251, 249], [242, 243, 245], [247, 248, 249], [248, 249, 249],
  [247, 247, 246], [244, 243, 241], [245, 244, 240], [248, 246, 240],
  [249, 248, 243], [244, 245, 245], [242, 241, 232], [245, 247, 247],
  [250, 250, 251], [252, 253, 252], [250, 251, 250], [252, 252, 250],
  [251, 251, 250], [241, 243, 245], [243, 246, 246], [246, 248, 250],
  [243, 244, 247], [244, 245, 248], [248, 249, 252], [244, 245, 247],
  [248, 248, 250], [230, 229, 255], [238, 243, 234], [246, 250, 250],
  [246, 247, 250], [248, 249, 251], [251, 252, 254], [251, 251, 253],
  [251, 251, 251], [235, 237, 239], [235, 238, 241], [243, 246, 247]
];

const MOBILE_SCREENSHOT_TILES = [
  [230, 233, 234], [223, 227, 229], [222, 227, 229], [235, 241, 242],
  [234, 241, 242], [238, 247, 248], [211, 232, 233], [233, 246, 247],
  [246, 249, 250], [243, 247, 248], [251, 254, 254], [250, 253, 254],
  [249, 253, 253], [249, 253, 253], [248, 253, 253], [246, 252, 253],
  [246, 249, 250], [238, 243, 243], [249, 251, 252], [251, 254, 254],
  [251, 253, 254], [250, 253, 254], [250, 253, 254], [247, 252, 253],
  [246, 248, 249], [239, 241, 242], [250, 251, 252], [252, 254, 254],
  [251, 253, 254], [251, 253, 254], [251, 253, 254], [249, 252, 254],
  [240, 242, 243], [238, 240, 241], [252, 252, 253], [251, 252, 253],
  [251, 252, 253], [250, 252, 253], [250, 252, 253], [248, 250, 252],
  [236, 236, 238], [235, 236, 237], [241, 242, 243], [247, 248, 249],
  [247, 248, 249], [247, 248, 249], [246, 247, 249], [246, 247, 250],
  [243, 244, 246], [242, 242, 244], [242, 243, 244], [245, 245, 247],
  [246, 247, 249], [246, 248, 249], [246, 247, 249], [249, 250, 253],
  [245, 246, 247], [237, 237, 238], [240, 240, 239], [241, 241, 239],
  [241, 241, 238], [247, 247, 242], [248, 247, 242], [252, 251, 248]
];

function expectedSkatePageScreenshot(mobile) {
  return mobile
    ? { height: 844, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 824, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  expectedSkatePageGeometry,
  expectedSkatePageScreenshot,
  expectedSkatePageState,
  heroClip,
  prepareSkatePageScreenshot,
  skatePageGeometry,
  skatePageState
};
