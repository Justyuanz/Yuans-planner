// Pinned direct Dashboard page contract. The state, geometry, and
// rendered-image signature were captured from the standalone legacy page while
// it was still the live visual reference, so the production React route keeps
// protecting the same screen without starting the legacy server.

function dashboardPageState() {
  return `(() => ({
    activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
    dashboardActive: document.getElementById("todayView")?.classList.contains("active"),
    date: document.getElementById("dashboardDate")?.textContent.trim(),
    headings: [...document.querySelectorAll("#todayView article h2, #todayView article h3")]
      .map((heading) => heading.textContent.trim()),
    iframeCount: document.querySelectorAll("iframe").length,
    insightTitle: document.getElementById("dashboardInsightTitle")?.textContent.trim(),
    taskCount: document.querySelectorAll("#tasksMount .task").length
  }))()`;
}

function dashboardPageGeometry() {
  return `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      dashboard: rect(".today-dashboard"),
      goals: rect(".goals-card"),
      life: rect(".life-card"),
      tasks: rect(".tasks-card"),
      planned: rect(".planned-card"),
      insight: rect(".insight-card"),
      money: rect(".money-quick-card"),
      taskParts: {
        banner: rect(".day-banner"),
        form: rect("#taskForm"),
        intention: rect(".intention-block"),
        list: rect("#tasksMount"),
        state: rect(".day-state-strip")
      },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  })()`;
}

function dashboardClip() {
  return `(() => {
    const rect = document.querySelector(".today-dashboard").getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: Math.min(rect.height, document.defaultView.innerHeight - rect.y)
    };
  })()`;
}

function expectedDashboardPageState() {
  return {
    activeTab: "Dashboard",
    dashboardActive: true,
    date: "Mon Sep 14",
    headings: [
      "Weekly goals",
      "Money quick log",
      "Today's tasks",
      "Life pie",
      "Planned vs actual",
      "Pattern noticed",
      "Energy trail"
    ],
    iframeCount: 0,
    insightTitle: "Today may be holding more tasks than you usually finish.",
    taskCount: 4
  };
}

function expectedDashboardPageGeometry(mobile) {
  return mobile
    ? {
        dashboard: {
          height: 3529.28125,
          width: 370,
          x: 10,
          y: 254.25
        },
        goals: {
          height: 0,
          width: 0,
          x: 0,
          y: 0
        },
        insight: {
          height: 315,
          width: 370,
          x: 10,
          y: 3258.25
        },
        life: {
          height: 532.359375,
          width: 370,
          x: 10,
          y: 2060.046875
        },
        money: {
          height: 728.8125,
          width: 370,
          x: 10,
          y: 254.25
        },
        overflow: false,
        planned: {
          height: 641.84375,
          width: 370,
          x: 10,
          y: 2604.40625
        },
        taskParts: {
          banner: {
            height: 90.375,
            width: 338,
            x: 26,
            y: 1259.984375
          },
          form: {
            height: 55,
            width: 338,
            x: 26,
            y: 1977.046875
          },
          intention: {
            height: 63.1875,
            width: 338,
            x: 26,
            y: 1048.25
          },
          list: {
            height: 602.6875,
            width: 338,
            x: 26,
            y: 1364.359375
          },
          state: {
            height: 120.546875,
            width: 338,
            x: 26,
            y: 1125.4375
          }
        },
        tasks: {
          height: 1052.984375,
          width: 370,
          x: 10,
          y: 995.0625
        }
      }
    : {
        dashboard: {
          height: 2760.5625,
          width: 940,
          x: 275,
          y: 218.46875
        },
        goals: {
          height: 491.265625,
          width: 459,
          x: 275,
          y: 218.46875
        },
        insight: {
          height: 665.28125,
          width: 459,
          x: 275,
          y: 1493.40625
        },
        life: {
          height: 491.265625,
          width: 459,
          x: 756,
          y: 218.46875
        },
        money: {
          height: 534.625,
          width: 940,
          x: 275,
          y: 2190.6875
        },
        overflow: false,
        planned: {
          height: 665.28125,
          width: 459,
          x: 756,
          y: 1493.40625
        },
        taskParts: {
          banner: {
            height: 57.1875,
            width: 892,
            x: 299,
            y: 984.09375
          },
          form: {
            height: 55,
            width: 892,
            x: 299,
            y: 1382.40625
          },
          intention: {
            height: 63.1875,
            width: 892,
            x: 299,
            y: 810.359375
          },
          list: {
            height: 317.125,
            width: 892,
            x: 299,
            y: 1055.28125
          },
          state: {
            height: 82.546875,
            width: 892,
            x: 299,
            y: 887.546875
          }
        },
        tasks: {
          height: 719.671875,
          width: 940,
          x: 275,
          y: 741.734375
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered dashboard. This keeps screen-level
// visual coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [229, 228, 229], [234, 232, 234], [246, 244, 245], [247, 244, 246],
  [232, 231, 233], [251, 251, 251], [243, 245, 237], [247, 247, 248],
  [247, 243, 247], [245, 248, 251], [241, 250, 251], [246, 248, 245],
  [237, 240, 249], [240, 241, 246], [246, 249, 250], [245, 247, 245],
  [248, 246, 248], [242, 244, 245], [242, 245, 245], [247, 247, 244],
  [232, 237, 246], [232, 235, 243], [240, 246, 246], [242, 244, 240],
  [245, 243, 244], [242, 247, 251], [239, 249, 248], [247, 248, 242],
  [239, 235, 243], [240, 241, 244], [247, 251, 251], [246, 246, 245],
  [247, 247, 248], [243, 246, 247], [242, 245, 245], [249, 248, 244],
  [237, 231, 235], [225, 228, 230], [245, 251, 250], [243, 244, 240],
  [245, 245, 248], [241, 248, 251], [240, 250, 247], [247, 248, 242],
  [240, 238, 239], [246, 250, 251], [246, 251, 249], [244, 244, 240],
  [248, 248, 249], [243, 245, 247], [241, 244, 244], [249, 249, 244],
  [246, 245, 245], [249, 252, 252], [250, 252, 251], [249, 248, 246],
  [249, 248, 250], [246, 248, 249], [248, 248, 246], [250, 247, 244],
  [252, 248, 249], [252, 249, 251], [252, 250, 251], [252, 249, 251]
];

const MOBILE_SCREENSHOT_TILES = [
  [232, 231, 233], [229, 228, 230], [226, 226, 227], [231, 231, 232],
  [242, 243, 244], [250, 251, 251], [244, 247, 248], [248, 250, 250],
  [249, 246, 248], [241, 239, 241], [242, 241, 243], [242, 243, 244],
  [246, 248, 249], [250, 252, 252], [250, 252, 251], [251, 252, 250],
  [252, 248, 250], [239, 238, 240], [245, 245, 246], [250, 252, 253],
  [249, 252, 252], [250, 252, 251], [251, 252, 250], [251, 251, 248],
  [252, 251, 252], [233, 234, 236], [241, 243, 244], [246, 248, 249],
  [250, 252, 252], [252, 252, 251], [253, 253, 250], [253, 252, 248],
  [248, 247, 249], [248, 247, 249], [245, 244, 246], [238, 238, 240],
  [249, 249, 250], [243, 245, 230], [240, 242, 226], [247, 248, 238],
  [249, 248, 250], [248, 247, 248], [250, 249, 250], [253, 253, 254],
  [253, 253, 254], [250, 251, 241], [249, 250, 240], [251, 251, 245],
  [251, 249, 251], [247, 246, 248], [247, 246, 248], [248, 248, 250],
  [251, 252, 253], [252, 253, 253], [252, 252, 253], [253, 252, 252],
  [252, 248, 251], [231, 231, 233], [241, 241, 243], [250, 253, 254],
  [235, 238, 240], [237, 238, 239], [251, 252, 251], [252, 252, 249]
];

function expectedDashboardPageScreenshot(mobile) {
  return mobile
    ? { height: 589, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 501, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  dashboardClip,
  dashboardPageGeometry,
  dashboardPageState,
  expectedDashboardPageGeometry,
  expectedDashboardPageScreenshot,
  expectedDashboardPageState
};

