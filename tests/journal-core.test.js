const test = require("node:test");
const assert = require("node:assert/strict");
const journal = require("../frontend/js/journal-core.js");

test("normalizeEntries keeps only dated entries with real content", function () {
  const entries = journal.normalizeEntries([
    null,
    { id: "blank", date: "2026-08-01", title: "  ", content: "   " },
    { id: "missing-date", content: "hello" },
    { id: "real", date: "2026-08-02", title: "Soft day", content: "I wrote something." }
  ]);

  assert.deepEqual(entries.map(function (entry) { return entry.id; }), ["real"]);
});

test("sortEntriesNewestFirst prefers newer dates, then updated timestamps", function () {
  const sorted = journal.sortEntriesNewestFirst([
    { id: "older", date: "2026-08-02", content: "Older" },
    { id: "newer-updated", date: "2026-08-03", content: "A", updatedAt: "2026-08-03T10:00:00.000Z" },
    { id: "newer-later", date: "2026-08-03", content: "B", updatedAt: "2026-08-03T12:00:00.000Z" }
  ]);

  assert.deepEqual(sorted.map(function (entry) { return entry.id; }), ["newer-later", "newer-updated", "older"]);
});

test("filterEntries searches date, title, and content", function () {
  const entries = [
    { id: "1", date: "2026-08-01", title: "Rainy", content: "Soft little cafe day." },
    { id: "2", date: "2026-08-02", title: "Sunny", content: "Went skating after class." }
  ];

  assert.deepEqual(journal.filterEntries(entries, "cafe").map(function (entry) { return entry.id; }), ["1"]);
  assert.deepEqual(journal.filterEntries(entries, "2026-08-02").map(function (entry) { return entry.id; }), ["2"]);
  assert.deepEqual(journal.filterEntries(entries, "sunny").map(function (entry) { return entry.id; }), ["2"]);
});

test("findEntryByDate returns the matching entry when present", function () {
  const found = journal.findEntryByDate([
    { id: "a", date: "2026-08-03", content: "One" },
    { id: "b", date: "2026-08-04", content: "Two" }
  ], "2026-08-04");

  assert.equal(found.id, "b");
});

test("buildPreview compresses whitespace and trims long entries", function () {
  assert.equal(journal.buildPreview({ content: "hi\n\nthere" }, 40), "hi there");
  assert.equal(journal.buildPreview({ content: "x".repeat(50) }, 20), "xxxxxxxxxxxxxxxxxxxxxxx…");
});
