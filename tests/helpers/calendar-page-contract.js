function expectedCalendarPageState() {
  return {
    activeTab: "Calendar",
    activeView: "calendarView",
    dayCells: 42,
    eventPills: ["09:00Deep work", "12:00Lunch reminder"],
    iframeCount: 0,
    month: "September 2026",
    selected: "Select Mon Sep 14",
    weekDays: [
      "Mon Sep 14",
      "Tue Sep 15",
      "Wed Sep 16",
      "Thu Sep 17",
      "Fri Sep 18",
      "Sat Sep 19",
      "Sun Sep 20"
    ]
  };
}

function expectedCalendarPageGeometry(mobile) {
  return mobile
    ? {
        calendar: { height: 1899.265625, width: 370, x: 10, y: 254.25 },
        month: { height: 553.375, width: 370, x: 10, y: 254.25 },
        overflow: false,
        week: { height: 1319.890625, width: 370, x: 10, y: 833.625 }
      }
    : {
        calendar: { height: 2530.828125, width: 940, x: 275, y: 218.46875 },
        month: { height: 1167.84375, width: 940, x: 275, y: 218.46875 },
        overflow: false,
        week: { height: 1336.984375, width: 940, x: 275, y: 1412.3125 }
      };
}

module.exports = { expectedCalendarPageGeometry, expectedCalendarPageState };
