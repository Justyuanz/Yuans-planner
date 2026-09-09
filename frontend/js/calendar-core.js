(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanCalendarCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MORNING_END = 12 * 60;
  var EVENING_START = 19 * 60;

  function parseEventTimeMinutes(title) {
    if (title && typeof title === "object" && title.startTime) {
      return parseEventTimeMinutes(String(title.startTime));
    }
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

  function parseEventTimeRange(title) {
    if (title && typeof title === "object" && title.startTime && title.endTime) {
      return parseEventTimeRange(String(title.startTime) + "-" + String(title.endTime));
    }
    var text = String(title || "").trim();
    var match = text.match(/^(\d{1,2})(?::?(\d{2}))?\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?(?=\s|$)/);
    if (!match) {
      return null;
    }
    var startHours = Number(match[1]);
    var startMinutes = match[2] ? Number(match[2]) : 0;
    var endHours = Number(match[3]);
    var endMinutes = match[4] ? Number(match[4]) : 0;
    if (startHours > 23 || startMinutes > 59 || endMinutes > 59) {
      return null;
    }
    if (endHours > 24 || (endHours === 24 && endMinutes !== 0)) {
      return null;
    }
    var start = (startHours * 60) + startMinutes;
    var end = (endHours * 60) + endMinutes;
    if (end <= start) {
      return null;
    }
    return {
      start: start,
      end: end
    };
  }

  function eventTimeLabel(event) {
    if (!event) return "";
    var range = parseEventTimeRange(event.startTime && event.endTime ? event : event.title);
    function clock(minutes) {
      return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
    }
    if (range && !event.reminderOnly) {
      var minutes = range.end - range.start;
      var duration = [Math.floor(minutes / 60) ? Math.floor(minutes / 60) + "h" : "", minutes % 60 ? (minutes % 60) + "m" : ""].filter(Boolean).join(" ");
      return clock(range.start) + "–" + clock(range.end) + " · " + duration;
    }
    var start = parseEventTimeMinutes(event.startTime || event.title);
    return [start === null ? "" : clock(start), event.reminderOnly ? "Reminder" : ""].filter(Boolean).join(" · ");
  }

  function compareEventsChronologically(a, b) {
    var timeA = parseEventTimeMinutes(a && (a.startTime || a.title));
    var timeB = parseEventTimeMinutes(b && (b.startTime || b.title));
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
    var timeValue = parseEventTimeMinutes(event && (event.startTime || event.title));
    if (timeValue !== null) {
      if (timeValue < MORNING_END) {
        return "morning";
      }
      if (timeValue < EVENING_START) {
        return "afternoon";
      }
      return "evening";
    }
    if (event && (event.dayPart === "morning" || event.dayPart === "afternoon" || event.dayPart === "evening")) {
      return event.dayPart;
    }
    return "afternoon";
  }

  function eventDayParts(event) {
    var range = parseEventTimeRange(event && event.startTime && event.endTime ? event : event && event.title);
    if (range) {
      var parts = [];
      if (range.start < MORNING_END) {
        parts.push("morning");
      }
      if (range.start < EVENING_START && range.end > MORNING_END) {
        parts.push("afternoon");
      }
      if (range.end > EVENING_START) {
        parts.push("evening");
      }
      return parts.length ? parts : [eventDayPart(event)];
    }
    return [eventDayPart(event)];
  }

  function groupEventsByPart(events) {
    var groups = {
      morning: [],
      afternoon: [],
      evening: []
    };
    sortedEvents(events).forEach(function (event) {
      eventDayParts(event).forEach(function (part) {
        groups[part].push(event);
      });
    });
    return groups;
  }

  return {
    eventTimeLabel: eventTimeLabel,
    compareEventsChronologically: compareEventsChronologically,
    eventDayPart: eventDayPart,
    groupEventsByPart: groupEventsByPart,
    parseEventTimeRange: parseEventTimeRange,
    parseEventTimeMinutes: parseEventTimeMinutes,
    sortedEvents: sortedEvents
  };
}));
