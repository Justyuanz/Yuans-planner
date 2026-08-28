(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanJournalCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

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

    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : "journal-" + date,
      date: date,
      title: title.trim(),
      content: content,
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  function hasEntryContent(entry) {
    return Boolean(entry && (entry.title || entry.content.trim()));
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
        entry.content
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
    var text = String((entry && entry.content) || "")
      .replace(/\s+/g, " ")
      .trim();

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
    normalizeEntries: normalizeEntries,
    sortEntriesNewestFirst: sortEntriesNewestFirst
  };
}));
