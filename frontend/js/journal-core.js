(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanJournalCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ENERGY_STATES = ["", "empty", "low", "okay", "good", "strong"];
  var FOCUS_STATES = ["", "foggy", "wavy", "steady", "clear"];

  function normalizeTracker(tracker) {
    var safeTracker = tracker && typeof tracker === "object" ? tracker : {};
    var energy = typeof safeTracker.energy === "string" ? safeTracker.energy.trim().toLowerCase() : "";
    var focus = typeof safeTracker.focus === "string" ? safeTracker.focus.trim().toLowerCase() : "";
    var context = typeof safeTracker.context === "string" ? safeTracker.context : "";
    return {
      energy: ENERGY_STATES.indexOf(energy) !== -1 ? energy : "",
      focus: FOCUS_STATES.indexOf(focus) !== -1 ? focus : "",
      context: context.trim()
    };
  }

  function hasTrackerContent(tracker) {
    var safeTracker = normalizeTracker(tracker);
    return Boolean(safeTracker.energy || safeTracker.focus || safeTracker.context);
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    var date = typeof entry.date === "string" ? entry.date.trim() : "";
    if (!date) {
      return null;
    }

    var content = typeof entry.content === "string" ? entry.content : "";
    var title = typeof entry.title === "string" ? entry.title : "";
    var createdAt = typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : "";
    var updatedAt = typeof entry.updatedAt === "string" && entry.updatedAt ? entry.updatedAt : createdAt;
    var tracker = normalizeTracker(entry.tracker);

    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : "journal-" + date,
      date: date,
      title: title.trim(),
      content: content,
      tracker: tracker,
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  function hasEntryContent(entry) {
    return Boolean(entry && (entry.title || entry.content.trim() || hasTrackerContent(entry.tracker)));
  }

  function normalizeEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map(normalizeEntry)
      .filter(hasEntryContent);
  }

  function compareEntriesNewestFirst(a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""))
      || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
      || String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      || String(b.id || "").localeCompare(String(a.id || ""));
  }

  function sortEntriesNewestFirst(entries) {
    return normalizeEntries(entries).slice().sort(compareEntriesNewestFirst);
  }

  function filterEntries(entries, query) {
    var sorted = sortEntriesNewestFirst(entries);
    var normalizedQuery = String(query || "").trim().toLowerCase();
    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter(function (entry) {
      var haystack = [
        entry.date,
        entry.title,
        entry.content,
        entry.tracker && entry.tracker.energy,
        entry.tracker && entry.tracker.focus,
        entry.tracker && entry.tracker.context
      ].join("\n").toLowerCase();
      return haystack.indexOf(normalizedQuery) !== -1;
    });
  }

  function findEntryByDate(entries, date) {
    var normalizedDate = String(date || "").trim();
    if (!normalizedDate) {
      return null;
    }
    return normalizeEntries(entries).find(function (entry) {
      return entry.date === normalizedDate;
    }) || null;
  }

  function buildPreview(entry, maxLength) {
    var limit = Math.max(24, Number(maxLength) || 140);
    var tracker = normalizeTracker(entry && entry.tracker);
    var text = String((entry && entry.content) || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text && hasTrackerContent(tracker)) {
      text = [
        tracker.energy ? "Energy: " + tracker.energy : "",
        tracker.focus ? "Focus: " + tracker.focus : "",
        tracker.context
      ].filter(Boolean).join(" · ");
    }
    if (!text) {
      return "A tiny note lives here.";
    }
    if (text.length <= limit) {
      return text;
    }
    return text.slice(0, limit - 1).trimEnd() + "…";
  }

  return {
    buildPreview: buildPreview,
    compareEntriesNewestFirst: compareEntriesNewestFirst,
    filterEntries: filterEntries,
    findEntryByDate: findEntryByDate,
    hasTrackerContent: hasTrackerContent,
    normalizeEntries: normalizeEntries,
    normalizeTracker: normalizeTracker,
    sortEntriesNewestFirst: sortEntriesNewestFirst
  };
}));
