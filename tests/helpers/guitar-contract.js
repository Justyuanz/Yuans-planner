// Pinned direct Guitar page contract. The state, computed styles, geometry, and
// rendered-image signatures were captured from the standalone legacy page while
// it was still the live visual reference, so the production React route keeps
// protecting the same screen without starting the legacy server.

function guitarContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const goalCard = documentRoot.querySelector(".guitar-goal-card");
    const sessionCard = documentRoot.querySelector(".guitar-session-card");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
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
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: rect.width,
        x: rect.x,
        y: rect.y
      };
    };
    return {
      activeView: documentRoot.querySelector(".view.active")?.id,
      focus: documentRoot.getElementById("guitarFocusInput")?.value,
      focusInput: pick(documentRoot.getElementById("guitarFocusInput")),
      goalCard: pick(goalCard),
      goalPanel: pick(goalCard.querySelector(".panel-inner")),
      heading: documentRoot.getElementById("guitarHeading")?.textContent.trim(),
      history: [...documentRoot.querySelectorAll("#guitarRecentSessions > *")].map((row) => ({
        text: row.textContent.trim(),
        title: row.getAttribute("title")
      })),
      nextStep: documentRoot.getElementById("guitarNextStepInput")?.value,
      iframeCount: documentRoot.querySelectorAll("iframe").length,
      overflow: documentRoot.documentElement.scrollWidth > documentRoot.documentElement.clientWidth,
      plan: documentRoot.getElementById("guitarSessionPlan")?.textContent.trim(),
      sessionCard: pick(sessionCard),
      sessionHint: documentRoot.getElementById("guitarSessionHint")?.textContent.trim(),
      sessionStatus: documentRoot.getElementById("guitarSessionStatus")?.textContent.trim(),
      summary: [...documentRoot.querySelectorAll("#guitarSessionSummary .guitar-summary-card")]
        .map((card) => card.textContent.trim()),
      timerButtons: [...documentRoot.querySelectorAll("#startGuitarSession, #finishGuitarSession")]
        .map((button) => ({ disabled: button.disabled, text: button.textContent.trim() }))
    };
  })()`;
}

// Extra bottom padding lets a tall card scroll fully into view, and the
// animated mascot is hidden so it cannot add capture noise.
function prepareCardScreenshot(selector) {
  return `(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    documentRoot.body.style.paddingBottom = "1000px";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "start" });
  })()`;
}

function cardClip(selector) {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, documentRoot.defaultView.innerHeight)
    };
  })()`;
}

// The production CSS minifier writes the authored `circle at 100% 0%` as
// `circle at 100% 0`, which Chrome serializes as `0px`. Both describe the same
// gradient origin, so the pinned panel background uses the built form.
function expectedGuitarContract(mobile) {
  return mobile
    ? {
        activeView: "guitarView",
        focus: "Clean chord changes",
        focusInput: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "15px",
          boxShadow: "none",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 42,
          lineHeight: "20px",
          padding: "9px 12px",
          width: 338,
          x: 26,
          y: 395.65625
        },
        goalCard: {
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
          height: 262.4375,
          lineHeight: "23.2px",
          padding: "0px",
          width: 370,
          x: 10,
          y: 276.25
        },
        goalPanel: {
          background: "radial-gradient(circle at 100% 0px, rgba(217, 210, 243, 0.3), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.58), rgba(248, 242, 255, 0.48), rgba(227, 251, 250, 0.18)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 262.4375,
          lineHeight: "23.2px",
          padding: "16px",
          width: 370,
          x: 10,
          y: 276.25
        },
        heading: "Progress planner",
        history: [
          {
            text: "Tue Sep 15Fingerstyle45 min",
            title: "Fingerstyle"
          },
          {
            text: "Mon Sep 14Chord switch30 min",
            title: "Clean chord changes"
          },
          {
            text: "Thu Sep 10Old practice60 min",
            title: "Old practice"
          }
        ],
        iframeCount: 0,
        nextStep: "Play the bridge slowly",
        overflow: false,
        plan: "This week: 75 / 120 min. 2 more sessions and about 45 min to hit the target. Practice next: Play the bridge slowly. Current focus: Clean chord changes.",
        sessionCard: {
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
          height: 946.09375,
          lineHeight: "23.2px",
          padding: "0px",
          width: 370,
          x: 10,
          y: 560.6875
        },
        sessionHint: "If a Guitar task is on today’s dashboard, the finished time can land there too.",
        sessionStatus: "No active Guitar session.",
        summary: [
          "This week2 / 4",
          "Weekly target4",
          "Minutes played75 min",
          "Average session38 min"
        ],
        timerButtons: [
          {
            disabled: false,
            text: "Start session"
          },
          {
            disabled: true,
            text: "Finish session"
          }
        ]
      }
    : {
        activeView: "guitarView",
        focus: "Clean chord changes",
        focusInput: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "15px",
          boxShadow: "none",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 42,
          lineHeight: "20px",
          padding: "9px 12px",
          width: 892,
          x: 299,
          y: 330.125
        },
        goalCard: {
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
          height: 262.6875,
          lineHeight: "23.2px",
          padding: "0px",
          width: 940,
          x: 275,
          y: 218.46875
        },
        goalPanel: {
          background: "radial-gradient(circle at 100% 0px, rgba(217, 210, 243, 0.3), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.58), rgba(248, 242, 255, 0.48), rgba(227, 251, 250, 0.18)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 262.6875,
          lineHeight: "23.2px",
          padding: "24px",
          width: 940,
          x: 275,
          y: 218.46875
        },
        heading: "Progress planner",
        history: [
          {
            text: "Tue Sep 15Fingerstyle45 min",
            title: "Fingerstyle"
          },
          {
            text: "Mon Sep 14Chord switch30 min",
            title: "Clean chord changes"
          },
          {
            text: "Thu Sep 10Old practice60 min",
            title: "Old practice"
          }
        ],
        iframeCount: 0,
        nextStep: "Play the bridge slowly",
        overflow: false,
        plan: "This week: 75 / 120 min. 2 more sessions and about 45 min to hit the target. Practice next: Play the bridge slowly. Current focus: Clean chord changes.",
        sessionCard: {
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
          height: 593.046875,
          lineHeight: "23.2px",
          padding: "0px",
          width: 940,
          x: 275,
          y: 503.15625
        },
        sessionHint: "If a Guitar task is on today’s dashboard, the finished time can land there too.",
        sessionStatus: "No active Guitar session.",
        summary: [
          "This week2 / 4",
          "Weekly target4",
          "Minutes played75 min",
          "Average session38 min"
        ],
        timerButtons: [
          {
            disabled: false,
            text: "Start session"
          },
          {
            disabled: true,
            text: "Finish session"
          }
        ]
      };
}

// Coarse 8x8 RGB tiles of the two rendered Guitar cards. This keeps screen-level
// visual coverage without storing legacy PNGs or re-rendering the legacy page.
const DESKTOP_GOAL_TILES = [
  [252, 250, 251], [253, 251, 253], [253, 251, 254], [253, 250, 254],
  [251, 248, 254], [249, 247, 253], [245, 244, 252], [242, 240, 251],
  [213, 212, 215], [208, 207, 210], [253, 250, 254], [252, 249, 254],
  [251, 248, 254], [234, 232, 239], [231, 229, 238], [231, 230, 240],
  [246, 244, 246], [254, 251, 254], [253, 250, 254], [252, 249, 254],
  [251, 248, 254], [249, 248, 253], [246, 245, 252], [243, 242, 251],
  [250, 249, 251], [251, 250, 252], [253, 252, 254], [252, 251, 254],
  [252, 250, 254], [251, 250, 254], [249, 249, 253], [246, 247, 252],
  [241, 241, 242], [240, 240, 241], [253, 252, 254], [252, 251, 254],
  [252, 251, 254], [251, 251, 254], [250, 250, 254], [248, 248, 253],
  [243, 241, 244], [248, 246, 250], [252, 249, 254], [252, 248, 254],
  [251, 249, 254], [250, 249, 254], [247, 247, 253], [245, 246, 252],
  [237, 237, 238], [236, 236, 237], [253, 253, 255], [253, 252, 255],
  [253, 252, 255], [253, 253, 255], [252, 253, 254], [250, 251, 253],
  [253, 251, 254], [252, 250, 254], [252, 249, 254], [251, 249, 254],
  [251, 250, 254], [251, 250, 254], [250, 251, 253], [248, 249, 252]
];

const DESKTOP_SESSION_TILES = [
  [236, 235, 236], [237, 236, 238], [253, 252, 253], [253, 250, 253],
  [252, 250, 253], [246, 244, 249], [240, 238, 245], [239, 236, 245],
  [243, 242, 243], [244, 243, 244], [251, 250, 252], [251, 250, 252],
  [250, 248, 252], [244, 242, 253], [237, 237, 244], [237, 239, 228],
  [245, 245, 247], [249, 248, 250], [242, 241, 244], [247, 246, 249],
  [241, 239, 243], [251, 250, 253], [244, 243, 248], [249, 248, 253],
  [243, 242, 245], [245, 245, 247], [244, 243, 246], [244, 243, 247],
  [240, 238, 244], [244, 243, 246], [239, 238, 244], [244, 244, 248],
  [241, 240, 242], [250, 249, 251], [253, 252, 254], [252, 251, 254],
  [252, 251, 254], [253, 252, 254], [252, 252, 254], [248, 247, 251],
  [239, 238, 240], [252, 251, 253], [253, 251, 254], [252, 251, 254],
  [253, 252, 254], [253, 252, 255], [253, 252, 254], [249, 249, 252],
  [244, 243, 245], [251, 250, 253], [252, 251, 254], [253, 252, 254],
  [253, 252, 255], [253, 252, 254], [253, 252, 254], [251, 251, 253],
  [243, 242, 245], [251, 250, 253], [252, 251, 254], [253, 252, 254],
  [253, 252, 254], [253, 252, 254], [253, 253, 254], [251, 251, 253]
];

const MOBILE_GOAL_TILES = [
  [231, 229, 231], [223, 223, 225], [249, 247, 250], [235, 234, 238],
  [237, 235, 240], [233, 230, 238], [234, 231, 242], [242, 239, 250],
  [222, 221, 223], [208, 207, 210], [250, 249, 252], [234, 232, 237],
  [237, 235, 241], [232, 230, 238], [246, 243, 252], [244, 241, 251],
  [252, 250, 252], [252, 249, 252], [253, 250, 254], [252, 249, 254],
  [251, 248, 254], [250, 247, 254], [247, 245, 253], [245, 244, 252],
  [247, 245, 248], [242, 241, 245], [251, 249, 253], [252, 250, 254],
  [251, 249, 254], [250, 249, 254], [249, 249, 253], [248, 248, 253],
  [244, 243, 245], [231, 231, 232], [231, 230, 232], [228, 228, 230],
  [253, 252, 255], [252, 252, 255], [253, 253, 255], [251, 251, 254],
  [244, 241, 245], [239, 236, 242], [239, 236, 242], [248, 245, 251],
  [251, 249, 254], [251, 249, 254], [250, 250, 254], [250, 250, 253],
  [244, 242, 245], [237, 236, 239], [233, 232, 235], [235, 234, 237],
  [250, 250, 253], [252, 252, 254], [252, 252, 254], [251, 252, 254],
  [250, 248, 252], [246, 245, 248], [243, 242, 245], [246, 245, 249],
  [250, 250, 253], [251, 252, 254], [251, 252, 254], [250, 251, 253]
];

const MOBILE_SESSION_TILES = [
  [232, 230, 232], [226, 225, 227], [243, 242, 245], [231, 229, 234],
  [241, 239, 245], [243, 241, 247], [241, 238, 246], [245, 242, 250],
  [244, 242, 250], [235, 234, 249], [237, 236, 249], [239, 240, 230],
  [235, 236, 225], [236, 238, 228], [243, 241, 247], [246, 244, 251],
  [247, 247, 249], [243, 242, 245], [250, 249, 251], [249, 249, 251],
  [248, 248, 250], [250, 250, 252], [252, 251, 254], [250, 249, 253],
  [249, 248, 251], [248, 248, 250], [250, 250, 252], [253, 252, 254],
  [253, 252, 254], [253, 251, 254], [252, 251, 254], [251, 250, 253],
  [247, 246, 249], [238, 237, 242], [247, 246, 248], [253, 252, 254],
  [253, 251, 254], [253, 252, 254], [253, 252, 254], [252, 251, 254],
  [240, 239, 244], [235, 233, 240], [242, 241, 245], [241, 240, 244],
  [241, 240, 244], [240, 239, 243], [242, 241, 245], [246, 245, 249],
  [240, 238, 243], [229, 228, 232], [241, 240, 244], [248, 247, 250],
  [248, 247, 250], [248, 247, 250], [244, 243, 247], [249, 249, 252],
  [245, 244, 248], [238, 237, 240], [243, 243, 245], [253, 252, 254],
  [253, 252, 254], [253, 252, 254], [249, 248, 251], [250, 250, 253]
];

const CARD_SIGNATURES = {
  desktop: {
    ".guitar-goal-card": { height: 262, tiles: DESKTOP_GOAL_TILES, width: 940 },
    ".guitar-session-card": { height: 593, tiles: DESKTOP_SESSION_TILES, width: 940 }
  },
  mobile: {
    ".guitar-goal-card": { height: 262, tiles: MOBILE_GOAL_TILES, width: 370 },
    ".guitar-session-card": { height: 844, tiles: MOBILE_SESSION_TILES, width: 370 }
  }
};

function expectedGuitarCardScreenshot(mobile, selector) {
  return CARD_SIGNATURES[mobile ? "mobile" : "desktop"][selector];
}

module.exports = {
  cardClip,
  expectedGuitarCardScreenshot,
  expectedGuitarContract,
  guitarContract,
  prepareCardScreenshot
};
