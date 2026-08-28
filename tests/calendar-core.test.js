const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../frontend/js/calendar-core.js");

test("parseEventTimeMinutes handles manual time prefixes", function () {
  assert.equal(core.parseEventTimeMinutes("09 Doctor"), 9 * 60);
  assert.equal(core.parseEventTimeMinutes("11:30 Therapy"), (11 * 60) + 30);
  assert.equal(core.parseEventTimeMinutes("17 Study"), 17 * 60);
  assert.equal(core.parseEventTimeMinutes("17-20 UFF + cafe"), 17 * 60);
  assert.equal(core.parseEventTimeMinutes("9:7 typo"), null);
  assert.equal(core.parseEventTimeMinutes("P90X3"), null);
  assert.equal(core.parseEventTimeMinutes("28:99 impossible"), null);
});

test("parseEventTimeRange handles valid ranges and rejects impossible ones", function () {
  assert.deepEqual(core.parseEventTimeRange("10:30-17:30 School"), {
    start: (10 * 60) + 30,
    end: (17 * 60) + 30
  });
  assert.deepEqual(core.parseEventTimeRange("17-20 Dinner"), {
    start: 17 * 60,
    end: 20 * 60
  });
  assert.equal(core.parseEventTimeRange("20-17 backwards"), null);
  assert.equal(core.parseEventTimeRange("24:30 impossible"), null);
});

test("compareEventsChronologically sorts timed events before untimed events", function () {
  const events = [
    { id: "c", title: "P90X3", createdAt: "2026-07-02T12:00:00.000Z" },
    { id: "b", title: "17 Study", createdAt: "2026-07-02T11:00:00.000Z" },
    { id: "a", title: "09 Doctor", createdAt: "2026-07-02T10:00:00.000Z" }
  ];
  assert.deepEqual(core.sortedEvents(events).map(function (event) { return event.id; }), ["a", "b", "c"]);
});

test("compareEventsChronologically keeps untimed events stable by timestamps then id", function () {
  const events = [
    { id: "b", title: "Portfolio", createdAt: "2026-07-02T10:00:00.000Z" },
    { id: "a", title: "Laundry", createdAt: "2026-07-02T10:00:00.000Z" },
    { id: "c", title: "Therapy note", createdAt: "2026-07-02T11:00:00.000Z" }
  ];
  assert.deepEqual(core.sortedEvents(events).map(function (event) { return event.id; }), ["a", "b", "c"]);
});

test("eventDayPart uses typed time first and falls back to saved dayPart", function () {
  assert.equal(core.eventDayPart({ title: "09 Doctor" }), "morning");
  assert.equal(core.eventDayPart({ title: "15 Cafe study" }), "afternoon");
  assert.equal(core.eventDayPart({ title: "20 P90X3" }), "evening");
  assert.equal(core.eventDayPart({ title: "Untimed", dayPart: "evening" }), "evening");
  assert.equal(core.eventDayPart({ title: "Untimed" }), "afternoon");
});

test("groupEventsByPart keeps each bucket chronologically sorted", function () {
  const grouped = core.groupEventsByPart([
    { id: "a", title: "21 Trauma heal", createdAt: "2026-07-02T10:00:00.000Z" },
    { id: "b", title: "09 Doctor", createdAt: "2026-07-02T11:00:00.000Z" },
    { id: "c", title: "17 Skate", createdAt: "2026-07-02T12:00:00.000Z" },
    { id: "d", title: "11:30 Therapy", createdAt: "2026-07-02T13:00:00.000Z" },
    { id: "e", title: "P90X3", dayPart: "evening", createdAt: "2026-07-02T14:00:00.000Z" }
  ]);

  assert.deepEqual(grouped.morning.map(function (event) { return event.id; }), ["b", "d"]);
  assert.deepEqual(grouped.afternoon.map(function (event) { return event.id; }), ["c"]);
  assert.deepEqual(grouped.evening.map(function (event) { return event.id; }), ["a", "e"]);
});

test("groupEventsByPart repeats spanning events across touched planner blocks", function () {
  const grouped = core.groupEventsByPart([
    { id: "school", title: "10:30-17:30 School", createdAt: "2026-07-02T10:00:00.000Z" },
    { id: "dinner", title: "17-20 Dinner", createdAt: "2026-07-02T11:00:00.000Z" },
    { id: "study", title: "18:30-20 Study", createdAt: "2026-07-02T12:00:00.000Z" }
  ]);

  assert.deepEqual(grouped.morning.map(function (event) { return event.id; }), ["school"]);
  assert.deepEqual(grouped.afternoon.map(function (event) { return event.id; }), ["school", "dinner", "study"]);
  assert.deepEqual(grouped.evening.map(function (event) { return event.id; }), ["dinner", "study"]);
});
