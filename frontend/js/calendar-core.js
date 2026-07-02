(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanCalendarCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parseEventTimeMinutes(title) {
    var match = String(title || "").trim().match(/^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/);
    if (!match) {
      return null;
    }
    var hours = Number(match[1]);
    var minutes = match[2] ? Number(match[2]) : 0;
    if (hours > 23 || minutes > 59) {
      return null;
    }
    return (hours * 60) + minutes;
  }

  function compareEventsChronologically(a, b) {
    var timeA = parseEventTimeMinutes(a.title);
    var timeB = parseEventTimeMinutes(b.title);
    if (timeA !== null && timeB !== null && timeA !== timeB) {
      return timeA - timeB;
    }
    if (timeA !== null && timeB === null) {
      return -1;
    }
    if (timeA === null && timeB !== null) {
      return 1;
    }
    return String(a.createdAt || a.updatedAt || "")
      .localeCompare(String(b.createdAt || b.updatedAt || ""))
      || String(a.id || "").localeCompare(String(b.id || ""));
  }

  function sortedEvents(events) {
    return (Array.isArray(events) ? events : []).slice().sort(compareEventsChronologically);
  }

  function eventDayPart(event) {
    var timeValue = parseEventTimeMinutes(event && event.title);
    if (timeValue !== null) {
      if (timeValue < 12 * 60) {
        return "morning";
      }
      if (timeValue < 18 * 60) {
        return "afternoon";
      }
      return "evening";
    }
    if (event && (event.dayPart === "morning" || event.dayPart === "afternoon" || event.dayPart === "evening")) {
      return event.dayPart;
    }
    return "afternoon";
  }

  function groupEventsByPart(events) {
    var groups = {
      morning: [],
      afternoon: [],
      evening: []
    };
    sortedEvents(events).forEach(function (event) {
      groups[eventDayPart(event)].push(event);
    });
    return groups;
  }

  return {
    compareEventsChronologically: compareEventsChronologically,
    eventDayPart: eventDayPart,
    groupEventsByPart: groupEventsByPart,
    parseEventTimeMinutes: parseEventTimeMinutes,
    sortedEvents: sortedEvents
  };
}));
