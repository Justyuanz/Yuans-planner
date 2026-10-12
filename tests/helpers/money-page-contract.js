// Pinned direct Money page contract. The state, geometry, and rendered-image
// signature were captured from the standalone legacy page while it was still
// the live visual reference, so the production React route keeps protecting the
// same screen without starting the legacy server.

function pageState() {
  return `(() => {
    const documentRoot = document;
    return {
      activeTab: documentRoot.querySelector(".tab-button.active")?.textContent.trim(),
      cardHeadings: [...documentRoot.querySelectorAll("#moneyView article h2, #moneyView article h3")]
        .map((heading) => heading.textContent.trim()),
      date: documentRoot.getElementById("dashboardDate")?.textContent.trim(),
      heading: documentRoot.querySelector(".hero h1")?.textContent.trim(),
      iframeCount: documentRoot.querySelectorAll("iframe").length,
      moneyActive: documentRoot.getElementById("moneyView")?.classList.contains("active"),
      subtitle: documentRoot.getElementById("todaySubtitle")?.textContent.trim()
    };
  })()`;
}

function pageGeometry() {
  return `(() => {
    const documentRoot = document;
    const rect = (selector) => {
      const value = documentRoot.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      app: rect(".app"),
      moneyPage: rect(".money-page"),
      overview: rect(".money-overview-card"),
      sidebarDisplay: documentRoot.defaultView.getComputedStyle(
        documentRoot.querySelector(".sidebar")
      ).display,
      workspace: rect(".workspace"),
      overflow: documentRoot.documentElement.scrollWidth > documentRoot.documentElement.clientWidth
    };
  })()`;
}

function mascotPosition() {
  return `(() => {
    const style = document.querySelector(".mascot-card").style;
    return {
      x: style.getPropertyValue("--mascot-drag-x"),
      y: style.getPropertyValue("--mascot-drag-y")
    };
  })()`;
}

function overviewClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".money-overview-card").getBoundingClientRect();
    return {
      height: rect.height,
      width: rect.width,
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY
    };
  })()`;
}

const CARD_HEADINGS = [
    "Money planner",
    "Pace and projection",
    "Vendors",
    "Budgets and categories"
  ];

function expectedMoneyPageState() {
  return {
    activeTab: "Money",
    cardHeadings: CARD_HEADINGS,
    date: "Mon Sep 14",
    heading: "Yuan's Planner",
    iframeCount: 0,
    moneyActive: true,
    subtitle: "A soft little map for the shape of your day."
  };
}

function expectedMoneyPageGeometry(mobile) {
  return mobile
    ? {
        app: {
          height: 2105.875,
          width: 390,
          x: 0,
          y: 0
        },
        moneyPage: {
          height: 1827.625,
          width: 370,
          x: 10,
          y: 254.25
        },
        overflow: false,
        overview: {
          height: 259.578125,
          width: 370,
          x: 10,
          y: 266.25
        },
        sidebarDisplay: "block",
        workspace: {
          height: 2033.875,
          width: 390,
          x: 0,
          y: 72
        }
      }
    : {
        app: {
          height: 1975.875,
          width: 1212,
          x: 34,
          y: 34
        },
        moneyPage: {
          height: 1754.40625,
          width: 940,
          x: 275,
          y: 218.46875
        },
        overflow: false,
        overview: {
          height: 220.09375,
          width: 940,
          x: 275,
          y: 240.46875
        },
        sidebarDisplay: "flex",
        workspace: {
          height: 1973.875,
          width: 1000,
          x: 245,
          y: 35
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered overview card. This keeps screen-level
// visual coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [255, 254, 253], [255, 254, 253], [255, 253, 252], [255, 253, 252],
  [255, 253, 252], [255, 253, 250], [254, 251, 244], [253, 250, 239],
  [206, 206, 207], [206, 206, 207], [255, 253, 252], [255, 253, 252],
  [255, 253, 251], [255, 253, 250], [242, 241, 238], [233, 232, 229],
  [239, 238, 239], [236, 235, 235], [235, 234, 235], [237, 235, 236],
  [239, 238, 237], [255, 253, 250], [253, 251, 246], [253, 250, 243],
  [254, 253, 253], [254, 253, 252], [254, 253, 252], [254, 253, 252],
  [254, 253, 251], [254, 253, 250], [254, 252, 247], [254, 252, 243],
  [243, 243, 244], [250, 249, 249], [255, 255, 254], [255, 255, 254],
  [242, 241, 241], [252, 252, 251], [255, 254, 251], [255, 253, 247],
  [235, 235, 235], [255, 254, 254], [255, 255, 254], [255, 255, 253],
  [237, 236, 236], [255, 254, 253], [255, 255, 252], [255, 253, 248],
  [244, 243, 244], [244, 244, 244], [255, 255, 254], [255, 254, 253],
  [241, 240, 240], [251, 250, 249], [255, 255, 252], [255, 253, 249],
  [254, 253, 252], [254, 252, 251], [254, 252, 251], [254, 252, 250],
  [254, 252, 250], [254, 252, 249], [254, 252, 247], [254, 252, 244]
];
const MOBILE_SCREENSHOT_TILES = [
  [227, 226, 227], [228, 227, 228], [223, 222, 222], [243, 241, 241],
  [255, 253, 252], [251, 250, 249], [251, 250, 247], [253, 251, 243],
  [238, 237, 238], [228, 227, 228], [231, 230, 230], [235, 233, 234],
  [254, 252, 251], [243, 242, 243], [210, 210, 211], [245, 244, 240],
  [241, 240, 240], [231, 230, 231], [232, 231, 232], [234, 233, 234],
  [241, 239, 239], [254, 252, 251], [253, 252, 250], [253, 251, 246],
  [249, 248, 247], [245, 244, 243], [246, 245, 244], [248, 246, 246],
  [254, 252, 251], [254, 253, 250], [254, 253, 249], [254, 253, 247],
  [248, 247, 247], [241, 241, 241], [243, 243, 243], [250, 250, 249],
  [246, 245, 244], [242, 241, 241], [243, 242, 242], [255, 253, 251],
  [241, 241, 240], [225, 226, 226], [255, 255, 254], [254, 254, 252],
  [233, 232, 232], [238, 237, 237], [255, 255, 253], [254, 254, 251],
  [243, 242, 242], [236, 236, 237], [241, 241, 241], [251, 250, 249],
  [246, 245, 244], [241, 241, 240], [241, 241, 240], [252, 251, 249],
  [254, 253, 251], [254, 253, 252], [254, 253, 251], [254, 253, 250],
  [254, 253, 250], [254, 253, 250], [254, 253, 250], [254, 252, 249]
];

function expectedMoneyPageScreenshot(mobile) {
  return mobile
    ? { height: 259, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 220, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  expectedMoneyPageGeometry,
  expectedMoneyPageScreenshot,
  expectedMoneyPageState,
  mascotPosition,
  overviewClip,
  pageGeometry,
  pageState
};
