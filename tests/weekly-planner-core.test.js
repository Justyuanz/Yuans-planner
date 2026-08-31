const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../frontend/js/weekly-planner-core.js");

function block(category, startTime, endTime) {
  return {
    id: category + "-" + startTime,
    category,
    title: core.categoryMeta(category).shortLabel,
    startTime,
    endTime
  };
}

test("missing Recovery Day fails validation", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "high" },
      { type: "high" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.validateWeekPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /Recovery Day/);
});

test("third High-Intensity Day fails validation", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "recovery" },
      { type: "high" },
      { type: "high" },
      { type: "high" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.validateWeekPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /two High-Intensity Days/i);
});

test("the only Recovery Day stays locked until another day becomes Recovery", function () {
  const plan = core.normalizeWeekPlan({
    week: "2026-W35",
    isConfigured: true,
    days: [
      { type: "recovery" },
      { type: "normal" },
      { type: "normal" },
      { type: "normal" },
      { type: "high" },
      { type: "high" },
      { type: "normal" }
    ]
  }, "2026-W35");

  const result = core.dayTypeChangeAllowed(plan, 0, "normal", [], { skateStreakActive: true });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /Keep one Recovery Day protected/i);
});

test("Recovery Day allows light life-maintenance categories but blocks heavy activities and long skating", function () {
  const choresResult = core.canAddActivity("recovery", [], block("Chores/groceries", "10:00", "10:30"), {
    skateStreakActive: true
  });
  const guitarResult = core.canAddActivity("recovery", [], block("Guitar", "11:00", "11:30"), {
    skateStreakActive: false
  });
  const personalResult = core.canAddActivity("recovery", [], block("Personal", "12:00", "13:00"), {
    skateStreakActive: false
  });
  const studyResult = core.canAddActivity("recovery", [], block("Study/school", "10:00", "10:30"), {
    skateStreakActive: true
  });
  const socialResult = core.canAddActivity("recovery", [], block("Social", "12:00", "13:00"), {
    skateStreakActive: true
  });
  const longSkateResult = core.canAddActivity("recovery", [], block("Skate", "10:00", "10:20"), {
    skateStreakActive: true
  });
  const shortSkateResult = core.canAddActivity("recovery", [], block("Skate", "10:00", "10:10"), {
    skateStreakActive: true
  });

  assert.equal(choresResult.allowed, true);
  assert.equal(guitarResult.allowed, true);
  assert.equal(personalResult.allowed, true);
  assert.equal(studyResult.allowed, false);
  assert.equal(socialResult.allowed, false);
  assert.equal(longSkateResult.allowed, false);
  assert.equal(shortSkateResult.allowed, true);
});

test("capacity locking marks a full day and rejects another optional activity", function () {
  const activities = [
    block("Study/school", "10:00", "12:00"),
    block("Cooking", "13:00", "13:30"),
    block("Guitar", "15:00", "16:00"),
    block("Personal", "18:00", "19:00")
  ];
  const summary = core.daySummary("normal", activities);
  const addResult = core.canAddActivity("normal", activities, block("Guitar", "19:00", "19:30"));

  assert.equal(summary.status, "Day full");
  assert.equal(summary.canAddActivity, false);
  assert.equal(addResult.allowed, false);
});

test("remaining capacity recommendations use only remaining points", function () {
  const stillFlexible = core.daySummary("normal", [
    block("Skate", "10:00", "11:00")
  ]);
  const mediumRoomLeft = core.daySummary("normal", [
    block("Study/school", "10:00", "12:00")
  ]);

  assert.equal(stillFlexible.remainingPoints, 4);
  assert.equal(stillFlexible.recommendedMaxMinutes, null);
  assert.equal(mediumRoomLeft.remainingPoints, 1.5);
  assert.equal(mediumRoomLeft.recommendedMaxMinutes, null);

  const shortOnly = core.daySummary("normal", [
    block("Study/school", "10:00", "11:40"),
    block("Guitar", "18:00", "19:00")
  ]);
  assert.equal(shortOnly.remainingPoints, 1);
  assert.equal(shortOnly.recommendedMaxMinutes, 30);

  const tooLong = core.canAddActivity("normal", [
    block("Study/school", "10:00", "11:40"),
    block("Guitar", "18:00", "19:00"),
    block("Cooking", "20:00", "20:30")
  ], block("Personal", "21:00", "23:30"));
  assert.equal(tooLong.allowed, false);
  assert.match(tooLong.reason, /Day full|light personal block|smaller block|too heavy/i);
});

test("normal day allows a 1-hour skate session plus a long school block", function () {
  const addResult = core.canAddActivity("normal", [
    block("Skate", "10:00", "11:00")
  ], {
    category: "Study/school",
    title: "School",
    startTime: "12:30",
    endTime: "17:30"
  });

  assert.equal(addResult.allowed, true);
});

test("normal day with long study plus two light blocks leaves only half a point", function () {
  const summary = core.daySummary("normal", [
    block("Skate", "10:00", "10:30"),
    {
      category: "Study/school",
      title: "Study",
      startTime: "13:00",
      endTime: "16:00"
    },
    block("Skate", "18:00", "19:00")
  ]);

  assert.equal(summary.usedPoints, 4);
  assert.equal(summary.remainingPoints, 0.5);
});

test("high-intensity day does not leave fake room after a packed training-and-study mix", function () {
  const addResult = core.canAddActivity("high", [
    block("Skate", "10:00", "11:30"),
    block("Gym", "14:00", "15:00"),
    {
      category: "Study/school",
      title: "School",
      startTime: "16:00",
      endTime: "20:00"
    }
  ], block("Cooking", "20:30", "21:00"));

  assert.equal(addResult.allowed, false);
});

test("study blocks longer than three hours still cap at three points", function () {
  assert.equal(core.pointsForActivity("Study/school", 181), 3);
  assert.equal(core.pointsForActivity("Study/school", 300), 3);
});

test("repeated categories stay as separate blocks in one day", function () {
  const activities = core.normalizeActivities([
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "16:00"),
    block("Study/school", "20:00", "21:00")
  ]);

  assert.deepEqual(activities.map(function (activity) {
    return activity.category + "@" + activity.startTime;
  }), [
    "Study/school@10:00",
    "Skate@15:00",
    "Study/school@20:00"
  ]);
});

test("moving or shortening a block recalculates remaining capacity", function () {
  const original = core.daySummary("high", [
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "16:30"),
    block("Gym", "19:00", "20:30")
  ]);
  const shortened = core.daySummary("high", [
    block("Study/school", "10:00", "12:00"),
    block("Skate", "15:00", "15:30"),
    block("Gym", "19:00", "19:30")
  ]);

  assert.equal(original.remainingPoints, 0);
  assert.equal(shortened.remainingPoints, 2.5);
  assert.equal(shortened.status, "Space left");
});

test("am pm times are accepted and normalized for planner activities", function () {
  const addResult = core.canAddActivity("normal", [], {
    category: "Skate",
    title: "Skate",
    startTime: "10:30 AM",
    endTime: "12:00 PM"
  });
  const summary = core.daySummary("normal", [
    block("Skate", "10:30 AM", "12:00 PM")
  ]);

  assert.equal(addResult.allowed, true);
  assert.equal(summary.usedPoints, 2.5);
  assert.equal(summary.activities[0].startTime, "10:30");
  assert.equal(summary.activities[0].endTime, "12:00");
});

test("end time before start gets a specific planner error", function () {
  const addResult = core.canAddActivity("normal", [], {
    category: "Skate",
    title: "Skate",
    startTime: "10:30 AM",
    endTime: "12:00 AM"
  });

  assert.equal(addResult.allowed, false);
  assert.match(addResult.reason, /End time needs to be after start time/i);
});

test("one hour skate, guitar, and personal blocks cost half a point", function () {
  assert.equal(core.pointsForActivity("Skate", 60), 0.5);
  assert.equal(core.pointsForActivity("Guitar", 60), 0.5);
  assert.equal(core.pointsForActivity("Personal", 60), 0.5);
});

test("long skate blocks now use more of a high-intensity day", function () {
  const summary = core.daySummary("high", [
    block("Skate", "10:30", "12:00"),
    {
      category: "Study/school",
      title: "Home CPP9, ex01",
      startTime: "13:00",
      endTime: "17:00"
    },
    block("Skate", "18:00", "20:00")
  ]);

  assert.equal(summary.usedPoints, 8.5);
  assert.equal(summary.remainingPoints, 0);
  assert.equal(core.canAddActivity("high", summary.activities, block("Guitar", "20:30", "21:00")).allowed, false);
  assert.equal(core.canAddActivity("high", summary.activities, block("Guitar", "20:30", "21:00")).reason, "Day full.");
  assert.equal(core.canAddActivity("high", summary.activities, block("Cooking", "20:30", "21:00")).allowed, false);
});

test("two-hour skate costs more than a one-hour gentle block", function () {
  assert.equal(core.pointsForActivity("Skate", 120), 3);
});

test("guitar follows the same tighter long-session scoring as skate", function () {
  assert.equal(core.pointsForActivity("Guitar", 60), 0.5);
  assert.equal(core.pointsForActivity("Guitar", 90), 2.5);
  assert.equal(core.pointsForActivity("Guitar", 120), 3);
  assert.equal(core.pointsForActivity("Guitar", 150), 3);
});

test("very long study plus two skate blocks and a short guitar block leaves almost nothing", function () {
  const summary = core.daySummary("high", [
    {
      category: "Study/school",
      title: "Study for exam",
      startTime: "10:00",
      endTime: "15:00"
    },
    block("Skate", "16:30", "17:30"),
    block("Skate", "18:30", "20:00"),
    block("Guitar", "20:30", "21:00")
  ]);

  assert.equal(summary.usedPoints, 6.5);
  assert.equal(summary.remainingPoints, 0.5);
});

test("changing a 90-minute skate block to two hours reduces the remaining points", function () {
  const ninetyMinuteSummary = core.daySummary("high", [
    {
      category: "Study/school",
      title: "Home CPP9, ex01",
      startTime: "09:00",
      endTime: "14:00"
    },
    block("Skate", "16:30", "17:30"),
    block("Skate", "18:30", "20:00"),
    block("Guitar", "20:30", "21:00")
  ]);
  const twoHourSummary = core.daySummary("high", [
    {
      category: "Study/school",
      title: "Home CPP9, ex01",
      startTime: "09:00",
      endTime: "14:00"
    },
    block("Skate", "16:30", "17:30"),
    block("Skate", "18:30", "20:30"),
    block("Guitar", "20:30", "21:00")
  ]);

  assert.equal(ninetyMinuteSummary.remainingPoints, 0.5);
  assert.equal(twoHourSummary.remainingPoints, 0);
});

test("reminder-only items cost zero points and can stay on a full day", function () {
  const activities = [
    block("Study/school", "10:00", "12:00"),
    block("Cooking", "13:00", "13:30"),
    block("Guitar", "15:00", "16:00"),
    block("Personal", "18:00", "19:00")
  ];
  const addResult = core.canAddActivity("normal", activities, {
    category: "Personal",
    title: "Call clinic",
    reminderOnly: true
  });
  const summary = core.daySummary("normal", activities.concat([{
    category: "Personal",
    title: "Call clinic",
    reminderOnly: true
  }]));

  assert.equal(addResult.allowed, true);
  assert.equal(summary.usedPoints, 5);
  assert.equal(summary.remainingPoints, 0);
  assert.equal(summary.activities[4].title, "Call clinic");
  assert.equal(summary.activities[4].points, 0);
});

test("reminder-only items are allowed on Recovery Day", function () {
  const addResult = core.canAddActivity("recovery", [], {
    category: "Personal",
    title: "Wash hair",
    reminderOnly: true,
    startTime: "20:00",
    endTime: "20:10"
  });

  assert.equal(addResult.allowed, true);
});

test("reminder-only items reject half-filled times", function () {
  const addResult = core.canAddActivity("normal", [], {
    category: "Personal",
    title: "Call clinic",
    reminderOnly: true,
    startTime: "13:00"
  });

  assert.equal(addResult.allowed, false);
  assert.match(addResult.reason, /both a start and end time/i);
});
