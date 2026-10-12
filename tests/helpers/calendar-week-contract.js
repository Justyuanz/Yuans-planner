const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

const DAYS = [
  {
    badges: [{ className: "week-event-button transcendence-block", text: "Transcendence" }],
    className: "week-day-panel recovery-day selected-day",
    date: "Mon Sep 14",
    label: "Mon",
    status: "Space left1.5 / 4.5 load hours planned · 3 left.",
    type: "Recovery"
  },
  {
    badges: [
      { className: "week-event-button chores-block", text: "Chores" },
      { className: "week-event-button gym-block", text: "Gym" }
    ],
    className: "week-day-panel high-day",
    date: "Tue Sep 15",
    label: "Tue",
    status: "Space left0.5 / 9 load hours planned · 8.5 left.",
    type: "High-Intensity"
  },
  {
    badges: [],
    className: "week-day-panel normal-day",
    date: "Wed Sep 16",
    label: "Wed",
    status: "Space left0 / 7 load hours planned · 7 left.",
    type: "Normal"
  },
  {
    badges: [],
    className: "week-day-panel high-day",
    date: "Thu Sep 17",
    label: "Thu",
    status: "Space left0 / 9 load hours planned · 9 left.",
    type: "High-Intensity"
  },
  {
    badges: [],
    className: "week-day-panel normal-day",
    date: "Fri Sep 18",
    label: "Fri",
    status: "Space left0 / 7 load hours planned · 7 left.",
    type: "Normal"
  },
  {
    badges: [],
    className: "week-day-panel normal-day",
    date: "Sat Sep 19",
    label: "Sat",
    status: "Space left0 / 7 load hours planned · 7 left.",
    type: "Normal"
  },
  {
    badges: [],
    className: "week-day-panel normal-day",
    date: "Sun Sep 20",
    label: "Sun",
    status: "Space left0 / 7 load hours planned · 7 left.",
    type: "Normal"
  }
];

function expectedWeekState() {
  return {
    days: DAYS,
    editorHidden: true,
    label: "Every week needs at least one Recovery Day and no more than two High-Intensity Days."
  };
}

function visualBox(overrides) {
  return {
    background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "0px none rgb(23, 24, 32)",
    borderRadius: "0px",
    boxShadow: "none",
    color: "rgb(23, 24, 32)",
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    height: 0,
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedWeekVisual(mobile) {
  const contentWidth = mobile ? 338 : 892;
  return {
    card: visualBox({
      background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
      height: mobile ? 1319.891 : 1336.984,
      width: mobile ? 370 : 940
    }),
    firstBadge: visualBox({
      background: "rgba(0, 0, 0, 0) linear-gradient(rgba(244, 248, 255, 0.96), rgba(229, 238, 252, 0.9)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(185, 206, 240, 0.75)",
      borderRadius: "999px",
      boxShadow: "rgba(86, 79, 103, 0.035) 0px 6px 16px 0px, rgba(255, 255, 255, 0.6) 0px 1px 0px 0px inset",
      color: "rgb(113, 141, 185)",
      display: "flex",
      fontSize: "13.28px",
      fontWeight: "495",
      gap: "6px",
      height: 33.25,
      padding: "6px 11px",
      width: 115.672
    }),
    firstDay: visualBox({
      background: "rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(232, 247, 238, 0.3), rgba(255, 255, 255, 0.92) 42%, rgba(255, 255, 255, 0.74)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(84, 96, 144, 0.42)",
      borderRadius: "18px",
      boxShadow: "rgba(40, 40, 55, 0.08) 0px 14px 28px 0px",
      display: "grid",
      gap: "14px",
      height: mobile ? 158.266 : 170.266,
      padding: mobile ? "10px" : "16px 18px",
      width: contentWidth
    }),
    header: visualBox({
      display: "flex",
      gap: "12px",
      height: mobile ? 143.125 : 60.219,
      width: contentWidth
    }),
    mount: visualBox({
      display: "grid",
      gap: "14px",
      height: mobile ? 1120.766 : 1204.766,
      width: contentWidth
    }),
    panel: visualBox({
      background: "radial-gradient(circle at 100% 0px, rgba(245, 202, 221, 0.14), rgba(0, 0, 0, 0) 32%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(252, 251, 248, 0.92)) repeat scroll 0% 0% / auto padding-box border-box",
      display: "grid",
      gap: "10px",
      height: mobile ? 1319.891 : 1336.984,
      padding: mobile ? "16px" : "24px",
      width: mobile ? 370 : 940
    }),
    status: visualBox({
      display: "flex",
      gap: "8px",
      height: 23.188,
      width: mobile ? 316 : 854
    }),
    type: visualBox({
      background: "rgba(0, 0, 0, 0) linear-gradient(rgba(244, 251, 246, 0.9), rgba(232, 245, 236, 0.84)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(173, 209, 187, 0.34)",
      borderRadius: "999px",
      boxShadow: "rgba(255, 255, 255, 0.72) 0px 1px 0px 0px inset",
      color: "rgb(113, 148, 123)",
      display: "flex",
      fontSize: "13.12px",
      fontWeight: "460",
      height: 34,
      padding: "6px 11px",
      width: 79.406
    })
  };
}

module.exports = { expectedWeekState, expectedWeekVisual };
