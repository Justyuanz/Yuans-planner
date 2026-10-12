// Pinned weekly goals and Life Pie contracts. The computed styles, geometry,
// and rendered-image signatures were captured from the standalone legacy page
// while it was still the live visual reference, so the production React route
// keeps protecting the same rendering without starting the legacy server.

const GOALS_PANEL_CLIP = `(() => {
  const rect = document.querySelector(".goals-card").getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
})()`;

const LIFE_PANEL_CLIP = `(() => {
  const rect = document.querySelector(".life-card").getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`;

function weeklyGoalsVisualContract() {
  return `(() => {
    const documentRoot = document;
    const panel = documentRoot.querySelector(".goals-card");
    const list = documentRoot.getElementById("weeklyGoals");
    const firstCard = list.querySelector(".weekly-goal-card");
    const firstInput = list.querySelector(".weekly-goal-input");
    const heading = panel.querySelector("h2");
    const note = panel.querySelector(".small-note");
    const pick = (element) => {
      const style = getComputedStyle(element);
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
        width: rect.width
      };
    };
    return {
      cards: [...list.querySelectorAll(".weekly-goal-card")].map((card) => ({
        label: card.querySelector(".weekly-goal-track").textContent.trim(),
        value: card.querySelector(".weekly-goal-input").value
      })),
      heading: { text: heading.textContent.trim(), visual: pick(heading) },
      input: pick(firstInput),
      list: pick(list),
      note: { text: note.textContent.trim(), visual: pick(note) },
      panel: pick(panel),
      card: pick(firstCard)
    };
  })()`;
}

function lifePieVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const panel = documentRoot.querySelector(".life-card");
    const heading = panel.querySelector("h3");
    const donut = documentRoot.getElementById("lifeDonut");
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        alignItems: style.alignItems,
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
        width: rect.width
      };
    };
    const rows = (selector) => [...documentRoot.querySelectorAll(selector)].map((row) => ({
      text: row.textContent.trim(),
      visual: pick(row)
    }));
    return {
      breakdown: rows("#lifeBreakdown .breakdown-row"),
      donut: {
        ariaLabel: donut.getAttribute("aria-label"),
        text: donut.textContent.trim(),
        visual: pick(donut)
      },
      heading: { text: heading.textContent.trim(), visual: pick(heading) },
      lifePie: pick(panel.querySelector(".life-pie")),
      panel: pick(panel),
      periods: rows("#statsPeriodTabs .period-button"),
      summary: rows("#lifeSummary .pie-summary-row")
    };
  })()`;
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization.
function expectedWeeklyGoalsVisual() {
  return {
    cards: [
      {
        label: "Study",
        value: "Finish the React boundary"
      },
      {
        label: "Body",
        value: "Take a recovery walk"
      },
      {
        label: "Mind",
        value: "Practice one song"
      }
    ],
    heading: {
      text: "Weekly goals",
      visual: {
        background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
        border: "0px none rgb(23, 24, 32)",
        borderRadius: "0px",
        boxShadow: "none",
        color: "rgb(23, 24, 32)",
        display: "block",
        fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
        fontSize: "26.4px",
        fontWeight: "570",
        gap: "normal",
        height: 30.625,
        lineHeight: "30.624px",
        padding: "0px",
        width: 163.53125
      }
    },
    input: {
      background: "rgba(255, 255, 255, 0.9) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "16px",
      boxShadow: "rgba(255, 255, 255, 0.7) 0px 1px 0px 0px inset",
      color: "rgb(23, 24, 32)",
      display: "block",
      fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
      fontSize: "16px",
      fontWeight: "410",
      gap: "normal",
      height: 52,
      lineHeight: "23.2px",
      padding: "12px 16px",
      width: 344
    },
    list: {
      background: "radial-gradient(circle at 6% 18%, rgba(245, 202, 221, 0.26), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(112deg, rgba(255, 255, 255, 0.72), rgba(185, 238, 238, 0.16) 52%, rgba(255, 248, 184, 0.18)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(245, 202, 221, 0.3)",
      borderRadius: "18px",
      boxShadow: "none",
      color: "rgb(23, 24, 32)",
      display: "grid",
      fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
      fontSize: "16px",
      fontWeight: "410",
      gap: "8px",
      height: 398.640625,
      lineHeight: "23.2px",
      padding: "12px 14px 13px 17px",
      width: 411
    },
    note: {
      text: "Keep these until they feel done.",
      visual: {
        background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
        border: "0px none rgb(118, 118, 129)",
        borderRadius: "0px",
        boxShadow: "none",
        color: "rgb(118, 118, 129)",
        display: "block",
        fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
        fontSize: "16px",
        fontWeight: "450",
        gap: "normal",
        height: 23.1875,
        lineHeight: "23.2px",
        padding: "0px",
        width: 232.640625
      }
    },
    panel: {
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
      height: 491.265625,
      lineHeight: "23.2px",
      padding: "0px",
      width: 459
    },
    card: {
      background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 239, 245, 0.62), rgba(232, 251, 255, 0.72), rgba(249, 248, 212, 0.54)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.68)",
      borderRadius: "18px",
      boxShadow: "rgba(255, 255, 255, 0.34) 0px 0px 0px 1px inset",
      color: "rgb(23, 24, 32)",
      display: "grid",
      fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
      fontSize: "16px",
      fontWeight: "410",
      gap: "14px",
      height: 118.546875,
      lineHeight: "23.2px",
      padding: "16px",
      width: 378
    }
  };
}

function expectedLifePieVisual(mobile) {
  return mobile
    ? {
        breakdown: [
          {
            text: "Transcendence57% · 2h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Mobile Development0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Portfolio / Job Prep0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Skate29% · 1h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Gym0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Guitar14% · 0.5h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          }
        ],
        donut: {
          ariaLabel: "Work 2h, Body 1h, Guitar 0.5h",
          text: "3.5h",
          visual: {
            alignItems: "center",
            background: "rgba(0, 0, 0, 0) conic-gradient(rgb(203, 220, 243) 0deg, rgb(203, 220, 243) 205.714deg, rgb(219, 232, 199) 205.714deg, rgb(219, 232, 199) 308.571deg, rgb(228, 217, 243) 308.571deg, rgb(228, 217, 243) 360deg) repeat scroll 0% 0% / auto padding-box border-box",
            border: "0px none rgb(23, 24, 32)",
            borderRadius: "50%",
            boxShadow: "rgba(126, 121, 255, 0.18) 0px 15px 28px 0px",
            color: "rgb(23, 24, 32)",
            display: "grid",
            fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
            fontSize: "16px",
            fontWeight: "410",
            gap: "normal",
            height: 128,
            lineHeight: "23.2px",
            padding: "0px",
            width: 128
          }
        },
        heading: {
          text: "Life pie",
          visual: {
            alignItems: "normal",
            background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
            border: "0px none rgb(23, 24, 32)",
            borderRadius: "0px",
            boxShadow: "none",
            color: "rgb(23, 24, 32)",
            display: "block",
            fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
            fontSize: "20px",
            fontWeight: "570",
            gap: "normal",
            height: 23.1875,
            lineHeight: "23.2px",
            padding: "0px",
            width: 68.046875
          }
        },
        lifePie: {
          alignItems: "center",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 248.984375,
          lineHeight: "23.2px",
          padding: "0px",
          width: 338
        },
        panel: {
          alignItems: "normal",
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
          height: 532.359375,
          lineHeight: "23.2px",
          padding: "0px",
          width: 370
        },
        periods: [
          {
            text: "Day",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 45.734375
            }
          },
          {
            text: "Week",
            visual: {
              alignItems: "normal",
              background: "rgb(240, 246, 211) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(104, 119, 67, 0.2)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(102, 118, 67)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 57.453125
            }
          },
          {
            text: "Month",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 62.75
            }
          },
          {
            text: "All",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 37.5
            }
          }
        ],
        summary: [
          {
            text: "Work57% · 2h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Body29% · 1h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          },
          {
            text: "Guitar14% · 0.5h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 305
            }
          }
        ]
      }
    : {
        breakdown: [
          {
            text: "Transcendence57% · 2h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          },
          {
            text: "Mobile Development0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          },
          {
            text: "Portfolio / Job Prep0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          },
          {
            text: "Skate29% · 1h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          },
          {
            text: "Gym0% · 0h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          },
          {
            text: "Guitar14% · 0.5h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 378
            }
          }
        ],
        donut: {
          ariaLabel: "Work 2h, Body 1h, Guitar 0.5h",
          text: "3.5h",
          visual: {
            alignItems: "center",
            background: "rgba(0, 0, 0, 0) conic-gradient(rgb(203, 220, 243) 0deg, rgb(203, 220, 243) 205.714deg, rgb(219, 232, 199) 205.714deg, rgb(219, 232, 199) 308.571deg, rgb(228, 217, 243) 308.571deg, rgb(228, 217, 243) 360deg) repeat scroll 0% 0% / auto padding-box border-box",
            border: "0px none rgb(23, 24, 32)",
            borderRadius: "50%",
            boxShadow: "rgba(126, 121, 255, 0.18) 0px 15px 28px 0px",
            color: "rgb(23, 24, 32)",
            display: "grid",
            fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
            fontSize: "16px",
            fontWeight: "410",
            gap: "normal",
            height: 128,
            lineHeight: "23.2px",
            padding: "0px",
            width: 128
          }
        },
        heading: {
          text: "Life pie",
          visual: {
            alignItems: "normal",
            background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
            border: "0px none rgb(23, 24, 32)",
            borderRadius: "0px",
            boxShadow: "none",
            color: "rgb(23, 24, 32)",
            display: "block",
            fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
            fontSize: "26.4px",
            fontWeight: "570",
            gap: "normal",
            height: 30.625,
            lineHeight: "30.624px",
            padding: "0px",
            width: 89.828125
          }
        },
        lifePie: {
          alignItems: "center",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 128,
          lineHeight: "23.2px",
          padding: "0px",
          width: 411
        },
        panel: {
          alignItems: "normal",
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
          height: 491.265625,
          lineHeight: "23.2px",
          padding: "0px",
          width: 459
        },
        periods: [
          {
            text: "Day",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 45.734375
            }
          },
          {
            text: "Week",
            visual: {
              alignItems: "normal",
              background: "rgb(240, 246, 211) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(104, 119, 67, 0.2)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(102, 118, 67)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 57.453125
            }
          },
          {
            text: "Month",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 62.75
            }
          },
          {
            text: "All",
            visual: {
              alignItems: "normal",
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgba(224, 219, 209, 0.72)",
              borderRadius: "999px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "block",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.08px",
              fontWeight: "510",
              gap: "normal",
              height: 30.40625,
              lineHeight: "20.416px",
              padding: "4px 9px",
              width: 37.5
            }
          }
        ],
        summary: [
          {
            text: "Work57% · 2h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 236
            }
          },
          {
            text: "Body29% · 1h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 236
            }
          },
          {
            text: "Guitar14% · 0.5h",
            visual: {
              alignItems: "center",
              background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "0px none rgb(118, 118, 129)",
              borderRadius: "0px",
              boxShadow: "none",
              color: "rgb(118, 118, 129)",
              display: "flex",
              fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
              fontSize: "14.72px",
              fontWeight: "510",
              gap: "12px",
              height: 21.328125,
              lineHeight: "21.344px",
              padding: "0px",
              width: 236
            }
          }
        ]
      };
}

// The weekly goals card is hidden at phone width, so only its desktop
// rendering has a signature.
const GOALS_TILES = [
  [234, 232, 234], [223, 221, 223], [227, 225, 227], [241, 239, 240],
  [245, 244, 245], [246, 244, 245], [245, 243, 245], [249, 247, 249],
  [253, 248, 250], [242, 238, 243], [247, 247, 250], [244, 249, 252],
  [241, 250, 253], [241, 250, 250], [243, 250, 245], [250, 250, 248],
  [251, 246, 249], [241, 241, 243], [237, 239, 240], [237, 240, 241],
  [241, 244, 245], [251, 253, 253], [251, 253, 251], [250, 250, 245],
  [252, 248, 250], [239, 237, 239], [243, 246, 250], [240, 248, 251],
  [238, 249, 250], [240, 249, 246], [243, 249, 240], [250, 250, 246],
  [251, 250, 251], [242, 242, 244], [238, 240, 242], [237, 240, 241],
  [250, 254, 254], [250, 254, 252], [251, 253, 250], [250, 250, 244],
  [251, 251, 252], [238, 239, 244], [243, 248, 251], [240, 249, 251],
  [239, 250, 250], [241, 250, 246], [244, 250, 240], [251, 251, 245],
  [251, 251, 252], [241, 242, 244], [239, 241, 243], [240, 244, 246],
  [249, 253, 254], [250, 253, 252], [250, 253, 249], [251, 251, 244],
  [252, 252, 253], [248, 251, 252], [247, 251, 253], [246, 251, 252],
  [248, 251, 250], [249, 251, 248], [251, 251, 245], [253, 251, 248]
];

const DESKTOP_LIFE_TILES = [
  [235, 234, 236], [227, 226, 228], [253, 253, 253], [251, 252, 252],
  [244, 246, 240], [242, 244, 234], [245, 246, 246], [248, 249, 249],
  [246, 246, 245], [237, 238, 249], [239, 243, 250], [242, 238, 242],
  [246, 248, 249], [246, 251, 252], [243, 246, 244], [248, 249, 247],
  [237, 242, 230], [234, 238, 239], [229, 235, 248], [231, 230, 233],
  [240, 244, 246], [243, 251, 250], [235, 238, 235], [246, 246, 242],
  [249, 246, 250], [222, 222, 233], [234, 234, 239], [249, 251, 252],
  [247, 251, 251], [248, 251, 250], [244, 245, 244], [249, 249, 247],
  [250, 246, 249], [219, 214, 218], [220, 220, 223], [232, 237, 238],
  [244, 250, 251], [246, 251, 249], [240, 242, 238], [245, 245, 242],
  [251, 249, 249], [230, 229, 231], [247, 250, 251], [244, 251, 252],
  [244, 250, 250], [247, 251, 248], [239, 241, 236], [247, 246, 243],
  [252, 252, 252], [239, 240, 241], [249, 251, 252], [247, 251, 252],
  [248, 251, 251], [250, 251, 249], [244, 244, 241], [250, 249, 247],
  [254, 253, 253], [254, 253, 254], [254, 253, 254], [254, 253, 254],
  [254, 253, 254], [254, 253, 254], [254, 253, 254], [254, 253, 254]
];

const MOBILE_LIFE_TILES = [
  [239, 238, 240], [237, 236, 239], [253, 252, 253], [248, 247, 248],
  [239, 241, 225], [247, 247, 245], [249, 248, 249], [249, 248, 249],
  [239, 242, 235], [232, 231, 240], [223, 233, 247], [250, 250, 253],
  [254, 253, 254], [254, 253, 254], [254, 253, 254], [254, 253, 254],
  [240, 242, 238], [231, 238, 244], [226, 233, 249], [251, 250, 254],
  [254, 253, 254], [254, 253, 254], [254, 253, 254], [254, 253, 254],
  [250, 246, 249], [225, 220, 225], [248, 248, 250], [246, 251, 252],
  [244, 250, 251], [246, 251, 249], [236, 238, 235], [246, 245, 242],
  [252, 249, 251], [237, 235, 237], [248, 250, 251], [246, 251, 251],
  [246, 250, 250], [246, 249, 247], [243, 244, 240], [249, 248, 245],
  [250, 245, 249], [223, 218, 222], [221, 220, 223], [228, 232, 233],
  [240, 247, 248], [245, 251, 249], [235, 238, 236], [244, 244, 241],
  [249, 248, 249], [217, 217, 219], [237, 240, 241], [232, 238, 239],
  [244, 250, 250], [246, 251, 248], [234, 235, 232], [243, 243, 239],
  [252, 251, 252], [234, 236, 237], [247, 251, 252], [246, 251, 252],
  [247, 251, 250], [248, 250, 247], [243, 243, 240], [249, 247, 244]
];

function expectedWeeklyGoalsScreenshot() {
  return { height: 491, tiles: GOALS_TILES, width: 459 };
}

function expectedLifePieScreenshot(mobile) {
  return mobile
    ? { height: 532, tiles: MOBILE_LIFE_TILES, width: 370 }
    : { height: 491, tiles: DESKTOP_LIFE_TILES, width: 459 };
}

// The goals card collapses out of the phone layout entirely.
function expectedMobileShell() {
  return { display: "none", overflow: false };
}

module.exports = {
  GOALS_PANEL_CLIP,
  LIFE_PANEL_CLIP,
  expectedLifePieScreenshot,
  expectedLifePieVisual,
  expectedMobileShell,
  expectedWeeklyGoalsScreenshot,
  expectedWeeklyGoalsVisual,
  lifePieVisualContract,
  weeklyGoalsVisualContract
};
