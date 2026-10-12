const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SELECTED_PILLS = [
  {
    className: "event-pill transcendence-block",
    text: "09:00Deep work",
    title: "09:00-10:30 Deep work · 09:00–10:30 · 1h 30m · Coding · Finish the bridge"
  },
  {
    className: "event-pill chores-block",
    text: "12:00Lunch reminder",
    title: "Lunch reminder · 12:00 · Reminder · Chore"
  },
  {
    className: "event-pill mobile-development-block",
    text: "18:30Evening class",
    title: "Evening class · 18:30–19:00 · 30m · Python"
  },
  {
    className: "event-pill social-block",
    text: "20:00Call family",
    title: "Call family · 20:00 · Social"
  },
  { className: "event-pill more-pill", text: "+1 more", title: "" }
];

const DAY_TYPE_BY_INDEX = new Map([
  [15, "today selected recovery-day"],
  [16, "recovery-day"],
  [17, "high-day"],
  [20, "high-day"],
  [21, "recovery-day"]
]);

function cellDate(index) {
  if (index < 2) return { month: "Aug", day: 30 + index, outside: true };
  if (index < 32) return { month: "Sep", day: index - 1, outside: false };
  return { month: "Oct", day: index - 31, outside: true };
}

function expectedCell(index) {
  const date = cellDate(index);
  const dayType = DAY_TYPE_BY_INDEX.get(index) || "normal-day";
  const outside = date.outside ? "outside " : "";
  return {
    ariaLabel: `Select ${WEEKDAYS[index % 7]} ${date.month} ${date.day}`,
    className: `day-cell ${outside}${dayType}`,
    day: String(date.day),
    pills: index === 15 ? SELECTED_PILLS : []
  };
}

function expectedCalendarState() {
  return {
    activeView: "calendarView",
    cells: Array.from({ length: 42 }, (_, index) => expectedCell(index)),
    label: "September 2026",
    weekdays: WEEKDAYS
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
    textAlign: "start",
    width: 0,
    ...overrides
  };
}

const PILL_COLORS = [
  {
    background: "rgba(0, 0, 0, 0) linear-gradient(rgba(244, 248, 255, 0.96), rgba(229, 238, 252, 0.9)) repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(185, 206, 240, 0.75)",
    color: "rgb(113, 141, 185)"
  },
  {
    background: "rgba(0, 0, 0, 0) linear-gradient(rgba(247, 251, 255, 0.98), rgba(232, 241, 255, 0.92)) repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(201, 223, 255, 0.58)",
    color: "rgb(106, 135, 181)"
  },
  {
    background: "rgba(0, 0, 0, 0) linear-gradient(rgba(241, 249, 236, 0.96), rgba(224, 241, 220, 0.9)) repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(174, 209, 181, 0.64)",
    color: "rgb(102, 133, 94)"
  },
  {
    background: "rgba(0, 0, 0, 0) linear-gradient(rgba(255, 245, 250, 0.98), rgba(250, 230, 241, 0.92)) repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(237, 192, 220, 0.54)",
    color: "rgb(181, 121, 154)"
  },
  {
    background: "rgba(255, 255, 255, 0.76) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "1px solid rgba(224, 219, 209, 0.74)",
    color: "rgb(118, 118, 129)"
  }
];

function expectedPillVisual(index, mobile) {
  const hidden = mobile && index > 1;
  return visualBox({
    ...PILL_COLORS[index],
    borderRadius: "999px",
    boxShadow: "rgba(114, 99, 135, 0.12) 0px 8px 18px 0px",
    display: hidden ? "none" : "flex",
    fontSize: mobile ? "8.32px" : "12.48px",
    fontWeight: "470",
    gap: mobile ? "2px" : "5px",
    height: hidden ? 0 : mobile ? 16.16 : 30.846,
    padding: mobile ? "2px 4px" : "5px 7px",
    textAlign: "left",
    width: hidden ? 0 : mobile ? 38.096 : 95.469
  });
}

function expectedCalendarVisual(mobile) {
  const contentWidth = mobile ? 338 : 892;
  return {
    card: visualBox({
      background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
      borderRadius: "18px",
      boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
      height: mobile ? 553.375 : 1236.5,
      width: mobile ? 370 : 940
    }),
    firstCell: visualBox({
      background: "rgba(255, 255, 255, 0.42) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(224, 219, 209, 0.68)",
      borderRadius: mobile ? "11px" : "20px",
      boxShadow: mobile
        ? "rgba(40, 40, 55, 0.035) 0px 6px 14px 0px"
        : "rgba(40, 40, 55, 0.04) 0px 10px 24px 0px",
      color: "rgb(181, 173, 183)",
      height: mobile ? 68 : 156,
      padding: mobile ? "4px 3px" : "11px",
      textAlign: "left",
      width: mobile ? 45.703 : 117.141
    }),
    grid: visualBox({
      display: "grid",
      gap: mobile ? "3px" : "12px",
      height: mobile ? 446 : 1107.688,
      width: contentWidth
    }),
    panel: visualBox({
      background: "radial-gradient(circle at 100% 0px, rgba(245, 202, 221, 0.14), rgba(0, 0, 0, 0) 32%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(252, 251, 248, 0.92)) repeat scroll 0% 0% / auto padding-box border-box",
      display: "grid",
      gap: "14px",
      height: mobile ? 553.375 : 1236.5,
      padding: mobile ? "16px" : "24px",
      width: mobile ? 370 : 940
    }),
    selectedCell: visualBox({
      background: "radial-gradient(circle at 84% 16%, rgba(255, 255, 255, 0.86), rgba(0, 0, 0, 0) 24%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(185, 238, 238, 0.78), rgba(255, 248, 184, 0.68) 58%, rgba(245, 202, 221, 0.62)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(106, 154, 152, 0.18)",
      borderRadius: mobile ? "11px" : "20px",
      boxShadow: "rgba(126, 116, 255, 0.16) 0px 22px 44px 0px, rgba(64, 110, 108, 0.09) 0px 8px 18px 0px",
      height: mobile ? 68.68 : 230.273,
      padding: mobile ? "4px 3px" : "11px",
      textAlign: "left",
      width: mobile ? 46.176 : 120.069
    }),
    selectedPills: PILL_COLORS.map((_, index) => expectedPillVisual(index, mobile)),
    toolbar: visualBox({
      background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
      border: "",
      display: "flex",
      gap: mobile ? "10px" : "12px",
      height: mobile ? 61.375 : 66.813,
      padding: mobile ? "0px 0px 10px" : "0px 0px 8px",
      width: contentWidth
    }),
    weekday: visualBox({
      border: "0px none rgb(118, 118, 129)",
      borderRadius: "999px",
      color: "rgb(118, 118, 129)",
      fontSize: mobile ? "9.92px" : "13.12px",
      fontWeight: "430",
      height: mobile ? 20 : 31.031,
      padding: mobile ? "2px 1px" : "6px 4px",
      textAlign: "center",
      width: mobile ? 45.703 : 117.141
    })
  };
}

module.exports = { expectedCalendarState, expectedCalendarVisual };
