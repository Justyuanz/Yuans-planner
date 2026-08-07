const test = require("node:test");
const assert = require("node:assert/strict");
const skateCore = require("../frontend/js/skate-core.js");

function localDate(isoDate) {
  const parts = isoDate.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

test("seasonState stays in prestart mode on Friday, August 7, 2026", function () {
  const state = skateCore.seasonState(localDate("2026-08-07"));
  assert.equal(state.status, "prestart");
  assert.equal(state.dayNumber, 0);
  assert.equal(state.weekNumber, 1);
  assert.equal(state.streakActive, false);
});

test("heroContent previews Day 1 before the program starts on Saturday, August 8, 2026", function () {
  const hero = skateCore.heroContent(localDate("2026-08-07"), 0);
  assert.equal(hero.title, "Program starts tomorrow");
  assert.equal(hero.blockLabel, "Day 1");
  assert.equal(hero.defaultIntensity, "blue");
  assert.equal(hero.benchmark, true);
});

test("dayPlanForDate returns the active streak day on Saturday, August 8, 2026", function () {
  const plan = skateCore.dayPlanForDate(localDate("2026-08-08"));
  assert.equal(plan.dayNumber, 1);
  assert.equal(plan.intensity, "blue");
  assert.match(plan.mainFocus, /baseline video/i);
});

test("after Tuesday, October 6, 2026 the plan switches to weekly sessions", function () {
  const state = skateCore.seasonState(localDate("2026-10-07"));
  const weekly = skateCore.weeklySessionsForDate(localDate("2026-10-07"));
  assert.equal(state.streakActive, false);
  assert.equal(state.streakDay, 60);
  assert.ok(weekly.length >= 1);
  assert.equal(weekly[0].label, "Post-Day-60 Session A");
});

test("every streak date from Saturday, August 8, 2026 through Tuesday, October 6, 2026 maps to the matching day number", function () {
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(2026, 7, 8 + offset);
    const state = skateCore.seasonState(date);
    const plan = skateCore.dayPlanForDate(date);
    assert.equal(state.dayNumber, offset + 1);
    assert.ok(plan, "expected a plan for " + date.toISOString().slice(0, 10));
    assert.equal(plan.dayNumber, offset + 1);
  }
});

test("benchmark days stay pinned to Day 1, 15, 30, 45, and 60", function () {
  const benchmarkDays = [1, 15, 30, 45, 60];
  for (let day = 1; day <= 60; day += 1) {
    const date = new Date(2026, 7, 8 + (day - 1));
    const plan = skateCore.dayPlanForDate(date);
    assert.equal(Boolean(plan.benchmark), benchmarkDays.includes(day), "unexpected benchmark state for day " + day);
  }
});

test("phases change on the documented week boundaries", function () {
  assert.equal(skateCore.seasonState(localDate("2026-08-08")).phase, "Balance Blueprint");
  assert.equal(skateCore.seasonState(localDate("2026-09-12")).phase, "Essentials");
  assert.equal(skateCore.seasonState(localDate("2026-11-07")).phase, "Art of Popping");
});

test("heroContent shows an open rest day on Wednesday, October 7, 2026", function () {
  const hero = skateCore.heroContent(localDate("2026-10-07"), 0);
  assert.equal(hero.blockLabel, "Rest / open week");
  assert.match(hero.skateiq, /No fixed 30-minute block is scheduled for Wednesday, October 7, 2026/i);
  assert.equal(hero.defaultIntensity, "blue");
});

test("heroContent resumes the first post-streak session on Thursday, October 8, 2026", function () {
  const hero = skateCore.heroContent(localDate("2026-10-08"), 0);
  assert.equal(hero.blockLabel, "Post-Day-60 Session A");
  assert.match(hero.skateiq, /Essentials W3D5/i);
});

test("heroContent reaches the week-10 continuing schedule on Saturday, October 10, 2026", function () {
  const hero = skateCore.heroContent(localDate("2026-10-10"), 0);
  assert.equal(hero.phaseWeekLabel, "Essentials · Week 10");
  assert.equal(hero.blockLabel, "Session 1");
  assert.match(hero.skateiq, /Essentials W4D2/i);
});

test("weekly session counts match the checked-in source plan from Week 10 onward", function () {
  const expected = new Map([
    [10, 5],
    [11, 5],
    [12, 5],
    [13, 4],
    [14, 5],
    [15, 5],
    [16, 5],
    [17, 5],
    [18, 5],
    [19, 5],
    [20, 5],
    [21, 5]
  ]);

  for (const [weekNumber, count] of expected.entries()) {
    const start = new Date(2026, 7, 8 + ((weekNumber - 1) * 7));
    const sessions = skateCore.weeklySessionsForDate(start);
    assert.equal(sessions.length, count, "unexpected session count for week " + weekNumber);
  }
});
