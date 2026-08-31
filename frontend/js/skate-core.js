(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanSkateCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TOTAL_WEEKS = 21;
  var STREAK_DAYS = 60;
  var SEASON_START = new Date(2026, 7, 29);
  var DAY_MS = 24 * 60 * 60 * 1000;

  function cloneDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, count) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
  }

  function formatDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function diffDays(left, right) {
    return Math.round((cloneDate(left).getTime() - cloneDate(right).getTime()) / DAY_MS);
  }

  function dayPlan(dayNumber, intensity, skateiq, mainFocus, flow, extras) {
    var payload = extras && typeof extras === "object" ? extras : {};
    return {
      dayNumber: dayNumber,
      intensity: intensity,
      skateiq: skateiq,
      mainFocus: mainFocus,
      flow: flow,
      benchmark: Boolean(payload.benchmark),
      benchmarkLabel: payload.benchmarkLabel || "",
      note: payload.note || ""
    };
  }

  function weeklySession(label, intensity, skateiq, mainFocus, flow, extras) {
    var payload = extras && typeof extras === "object" ? extras : {};
    return {
      label: label,
      intensity: intensity,
      skateiq: skateiq,
      mainFocus: mainFocus,
      flow: flow,
      benchmark: Boolean(payload.benchmark),
      note: payload.note || "",
      dateKeys: Array.isArray(payload.dateKeys) ? payload.dateKeys.slice() : []
    };
  }

  var PRIORITIES = [
    { id: "main", label: "Main", focus: "FS/BS 180 + shove-it", detail: "Choose one serious trick focus per session." },
    { id: "transition", label: "Transition", focus: "Rock and roll", detail: "Main transition project when ramp and energy fit." },
    { id: "build", label: "Build", focus: "Axle stall", detail: "Low-pressure prerequisites until it deserves more volume." },
    { id: "maintain", label: "Maintain", focus: "Rolling ollie + fakie ollie + bank ollies", detail: "A few clean reps on non-blue days." },
    { id: "flow", label: "Flow", focus: "Bowl", detail: "Keep speed, carving, confidence, and fun alive." },
    { id: "play", label: "Play", focus: "Wallride + nollie + switch ollie", detail: "Exploration only, no obligation." }
  ];

  var INTENSITY_META = {
    blue: {
      id: "blue",
      label: "Blue",
      effort: "1-3/10",
      attempts: "0-5 focused attempts",
      tone: "Recovery/control day",
      description: "Cruise, carve, balance work, and skip serious trick volume."
    },
    yellow: {
      id: "yellow",
      label: "Yellow",
      effort: "4-6/10",
      attempts: "10-20 focused attempts",
      tone: "Normal technical day",
      description: "One main trick, stop while form still looks clean."
    },
    green: {
      id: "green",
      label: "Green",
      effort: "6-8/10",
      attempts: "20-30 focused attempts",
      tone: "Focused session",
      description: "Small sets with real rests, then finish with fun skating."
    }
  };

  var WEEK_PLANS = [
    {
      weekNumber: 1,
      phase: "Balance Blueprint",
      summary: "Board feel first. No heroic Day 1 needed.",
      days: [
        dayPlan(1, "blue", "Heel Toe Press 3x1 min; Board Shifts 3x15; Walking (static) 2x2 min; easy roll to 30 min.", "Easy ride + baseline video only if you feel okay.", "A few comfortable ollies are enough.", { benchmark: true, benchmarkLabel: "Day 1 benchmark" }),
        dayPlan(2, "blue", "Single Leg Balance 3x1 min; Snake 5 min; Alt. Lift the Nose 3x20; micro-manual / nose-lift practice to 30 min.", "Easy bowl / cruising.", "No need to force tricks yet."),
        dayPlan(3, "yellow", "Bunny Hops 3x20; Alternating Hippy Jump 3x10; Walking Snakes 5 min; easy control work to 30 min.", "180 - choose one direction.", "Keep it low-pressure."),
        dayPlan(4, "blue", "Repeat the weakest of B1-B3 for 20 min, then 10 min easy switch stance / body rotation.", "Shove-it.", "0-5 thoughtful attempts only."),
        dayPlan(5, "yellow", "Single Leg Balance 3x1 min; Snake 5 min; Alt. Lift the Nose 3x20; micro-manual / nose-lift practice to 30 min.", "Rock and roll.", "Transition focus."),
        dayPlan(6, "yellow", "Bunny Hops 3x20; Alternating Hippy Jump 3x10; Walking Snakes 5 min; easy control work to 30 min.", "180 - choose the other or weaker direction.", "Stay smooth."),
        dayPlan(7, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / fun skate.", "Wallride play only if it feels inviting.")
      ]
    },
    {
      weekNumber: 2,
      phase: "Balance Blueprint",
      summary: "Single-leg control, micro-manuals, fakie kickturns, rotation.",
      days: [
        dayPlan(8, "yellow", "Push Single Leg Hold 20 reps; Toe Taps 3x15; Narrow Short Manuals 5 min.", "180 - choose one direction today.", "Keep the rest easy."),
        dayPlan(9, "yellow", "Deconstructed Tic Tacs 3x1 min; Manual (static) 10 min; Upper Body Rotation 3x20.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(10, "green", "Full Squat 3x10; Alt. Fakie Kickturns 3x20; BS 10-degree Powerslides 25 reps; easy fakie control to 30 min.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(11, "blue", "Repeat the weakest of B4-B6 for 20 min, then 10 min low-speed step-offs / run-outs on flat.", "Rock and roll.", "Transition focus."),
        dayPlan(12, "yellow", "Deconstructed Tic Tacs 3x1 min; Manual (static) 10 min; Upper Body Rotation 3x20.", "180 - choose the other or weaker direction.", "Clean reps only."),
        dayPlan(13, "yellow", "Full Squat 3x10; Alt. Fakie Kickturns 3x20; BS 10-degree Powerslides 25 reps; easy fakie control to 30 min.", "Shove-it or axle-stall preparation.", "Choose one."),
        dayPlan(14, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / fun skate.", "Wallride play only if it feels inviting.")
      ]
    },
    {
      weekNumber: 3,
      phase: "Balance Blueprint",
      summary: "Dynamic balance with 180s and shove-it still moving.",
      days: [
        dayPlan(15, "yellow", "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min.", "Benchmark first, then 180.", "Choose one direction today.", { benchmark: true, benchmarkLabel: "Day 15 benchmark" }),
        dayPlan(16, "green", "Alternating Hippy Jumps 50; Alternating Nose Lift 50; Tail Scrape 20; rest as needed.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(17, "yellow", "Full Swing Push 5 min; Short Nose Manuals 30; BS Manual 360 15.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(18, "blue", "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min.", "Rock and roll.", "Transition focus."),
        dayPlan(19, "yellow", "Alternating Hippy Jumps 50; Alternating Nose Lift 50; Tail Scrape 20; rest as needed.", "180 - choose the other or weaker direction.", "Stay patient."),
        dayPlan(20, "yellow", "Full Swing Push 5 min; Short Nose Manuals 30; BS Manual 360 15.", "Shove-it or axle-stall preparation.", "Choose one."),
        dayPlan(21, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / fun skate.", "Wallride play only if it feels inviting.")
      ]
    },
    {
      weekNumber: 4,
      phase: "Balance Blueprint",
      summary: "180-oriented balance and more serious transition if confidence fits.",
      days: [
        dayPlan(22, "yellow", "Alternating Fakie Tic Tacs 2x5 min; Single Leg Squat 3x5 each leg; Hippy Jump Staggered 3x10.", "180 - choose one direction today.", "Low-pressure sets."),
        dayPlan(23, "green", "Hippy Jump 180 3x20; Toe Taps (dynamic) 3x1 min; Tic Tacs 5 min; controlled rotation to 30 min.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(24, "yellow", "Quick Taps 2x30; Manuals (dynamic) 10 min; Hippy Jump Hit Tail 3x10.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(25, "blue", "Alternating Fakie Tic Tacs 2x5 min; Single Leg Squat 3x5 each leg; Hippy Jump Staggered 3x10.", "Rock and roll.", "Transition focus."),
        dayPlan(26, "yellow", "Hippy Jump 180 3x20; Toe Taps (dynamic) 3x1 min; Tic Tacs 5 min; controlled rotation to 30 min.", "180 - choose the other or weaker direction.", "Stay clean."),
        dayPlan(27, "yellow", "Quick Taps 2x30; Manuals (dynamic) 10 min; Hippy Jump Hit Tail 3x10.", "Shove-it or axle-stall preparation.", "Choose one."),
        dayPlan(28, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / fun skate.", "Wallride play only if it feels inviting.")
      ]
    },
    {
      weekNumber: 5,
      phase: "Balance Blueprint",
      summary: "Consolidate weak balance skills before Essentials.",
      days: [
        dayPlan(29, "yellow", "Manual support: nose lifts 5 min; micro-manual attempts 10 min; short rolling manuals 10 min; easy roll 5 min.", "180 - choose one direction today.", "Stay at your actual level."),
        dayPlan(30, "green", "Rotation support: slow kickturns / tic tacs 10 min; hippy-jump 180 or body rotation 10 min; easy fakie / switch turns 10 min.", "Benchmark first, then shove-it.", "Thoughtful small sets.", { benchmark: true, benchmarkLabel: "Day 30 benchmark" }),
        dayPlan(31, "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(32, "yellow", "Manual support: nose lifts 5 min; micro-manual attempts 10 min; short rolling manuals 10 min; easy roll 5 min.", "Rock and roll.", "Transition focus."),
        dayPlan(33, "yellow", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "180 - choose the other or weaker direction.", "Smooth reps."),
        dayPlan(34, "yellow", "Choose the Balance Blueprint session that still feels weakest. Practice it for 30 min without trying to pass it.", "Shove-it or axle-stall preparation.", "Choose one."),
        dayPlan(35, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / fun skate.", "Wallride play only if it feels inviting.")
      ]
    },
    {
      weekNumber: 6,
      phase: "Essentials",
      summary: "Begin Essentials without changing your trick priorities.",
      days: [
        dayPlan(36, "yellow", "Essentials W1D1: Tuck Jump 3x10; Hand Ollie 25; Ollie Complex 10; Tail Scrape 10.", "180 - choose one direction today.", "Stay technical."),
        dayPlan(37, "yellow", "Essentials W1D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; Slow 180 Kickturns 5 min.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(38, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(39, "yellow", "Essentials W1D3: Manual 5 min; Deconstructed Moonwalk 5 min; Short Narrow Manuals 10; Throwdown 15.", "Rock and roll.", "Transition focus."),
        dayPlan(40, "blue", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "180 - choose the other or weaker direction.", "Keep it light."),
        dayPlan(41, "green", "Essentials W1D4: Full Swing Push 3x1 min; Deconstructed Tic Tacs 5 min; Short Manuals 20; Bunny Hops 3x20.", "Rock and roll.", "If already landed, work on calmer repeatability."),
        dayPlan(42, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / bowl flow.", "Wallride play only if fresh.")
      ]
    },
    {
      weekNumber: 7,
      phase: "Essentials",
      summary: "Keep pop mechanics clean without turning every day into an ollie marathon.",
      days: [
        dayPlan(43, "yellow", "Essentials W1D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Hippy Jump Hit Tail 50.", "180 - choose one direction today.", "Stay technical."),
        dayPlan(44, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(45, "green", "Essentials W2D1: Tuck Hippy Jump 3x10; One Foot Ollie 25; Ollie Complex 10; Ollie Tail Scrape 15.", "Benchmark first, then choose 180 or shove-it.", "One main trick only.", { benchmark: true, benchmarkLabel: "Day 45 benchmark" }),
        dayPlan(46, "yellow", "Essentials W2D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; 360 (static) 5 min.", "Rock and roll.", "Transition focus."),
        dayPlan(47, "blue", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "Axle-stall preparation / low-pressure attempts + bowl.", "No forcing."),
        dayPlan(48, "yellow", "Essentials W2D3: Manual 5 min; Deconstructed Moonwalk 5 min; Narrow Manuals 10; Caveman 15.", "Rock and roll.", "Work on calmer repeatability."),
        dayPlan(49, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Recovery / bowl flow.", "Wallride play only if fresh.")
      ]
    },
    {
      weekNumber: 8,
      phase: "Essentials",
      summary: "Rotation and board control keep building. Axle-stall prep can get one focused session.",
      days: [
        dayPlan(50, "yellow", "Essentials W2D4: Full Swing Push 3x1 min; Deconstructed Tic Tacs 5 min; Short Manuals 20; Bunny Hops 3x20.", "180 - choose one direction today.", "Stay technical."),
        dayPlan(51, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(52, "green", "Essentials W2D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Alternating Fakie Tic Tacs 50.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(53, "yellow", "Essentials W3D1: Tuck Hippy Jump 3x10; One Foot Ollie 25; Ollie Complex 10; BS 10-degree Powerslides 3x10.", "Rock and roll.", "Transition focus."),
        dayPlan(54, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Axle-stall preparation / low-pressure attempts + bowl.", "Stay relaxed."),
        dayPlan(55, "green", "Essentials W3D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; Wheel Drags 2:30.", "Rock and roll.", "If landed, go for calmer repeatability."),
        dayPlan(56, "blue", "Control support: Full Swing Push 5 min; Snakes 5 min; Tic Tacs 5 min; single-leg balance / toe taps 5 min; easy board control 10 min.", "Recovery / bowl flow.", "Wallride play only if fresh.")
      ]
    },
    {
      weekNumber: 9,
      phase: "Essentials",
      summary: "Finish the daily streak without cramming.",
      days: [
        dayPlan(57, "yellow", "Essentials W3D3: Manual 5 min; Deconstructed Moonwalk 5 min; Manuals 10; Switch Throwdown 20.", "180 - choose one direction today.", "Stay technical."),
        dayPlan(58, "blue", "Recovery SkateIQ: 30 min easy board control only.", "Shove-it.", "Thoughtful small sets."),
        dayPlan(59, "yellow", "Essentials W3D4: Full Swing Push 3x1 min; Deconstructed Tic Tacs 5 min; Short Manuals 20; Bunny Hops 3x20.", "Bowl flow / free skate.", "No trick obligation."),
        dayPlan(60, "yellow", "Final 30-min review: Full Swing Push 5 min; Snakes 5 min; Tic Tacs 5 min; micro-manuals 5 min; easy switch 5 min; gentle carving 5 min.", "Day 60 benchmark.", "Same baseline first, then favorite improvements and one fun line.", { benchmark: true, benchmarkLabel: "Day 60 benchmark" })
      ],
      afterStreak: [
        weeklySession("Post-Day-60 Session A", "yellow", "Essentials W3D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Walking Snakes 5 min.", "180 or shove-it.", "Choose one.", { dateKeys: ["2026-10-29"] }),
        weeklySession("Post-Day-60 Session B", "yellow", "Essentials W4D1: Tuck Hippy Jump 3x10; One Foot Ollie 25; Ollie Complex 10; BS Ollie Tail Scrapes 25.", "Bowl / transition after the block.", "Keep it fun.", { dateKeys: ["2026-10-30", "2026-10-31"] })
      ]
    },
    {
      weekNumber: 10,
      phase: "Essentials",
      summary: "One main flatground priority at a time.",
      sessions: [
        weeklySession("Session 1", "yellow", "Essentials W4D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; Deconstructed Moonwalk 5 min.", "180 family", "Stay technical."),
        weeklySession("Session 2", "yellow", "Essentials W4D3: Manual 5 min; Deconstructed Moonwalk 5 min; Manuals 10; Switch Caveman 15.", "Shove-it", "Thoughtful sets."),
        weeklySession("Session 3", "yellow", "Essentials W4D4: Full Swing Push 3x1 min; Tic Tacs 5 min; Short Manuals 20; Indiana Jones 3x8.", "Rock and roll / axle stall", "Transition session."),
        weeklySession("Session 4", "yellow", "Essentials W4D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Walking 360s 3 min.", "Bowl flow / free skate", "No trick obligation."),
        weeklySession("Optional Session 5", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Bowl / free skate only.", "No serious trick obligation.")
      ]
    },
    {
      weekNumber: 11,
      phase: "Essentials",
      summary: "Transition can progress from rock and roll toward axle stall.",
      sessions: [
        weeklySession("Session 1", "yellow", "Essentials W5D1: Tuck Hippy Jump 3x10; One Foot Ollie 25; Ollie Complex 10; FS Ollie Tail Scrape 25.", "180 family", "Stay technical."),
        weeklySession("Session 2", "yellow", "Essentials W5D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; Deconstructed Moonwalk 90-degree 5 min.", "Shove-it", "Thoughtful sets."),
        weeklySession("Session 3", "yellow", "Essentials W5D3: Manual 5 min; Deconstructed Moonwalk 5 min; Narrow Manuals 5 min; Short Fakie Manuals 5 min.", "Rock and roll / axle stall", "Transition session."),
        weeklySession("Session 4", "yellow", "Essentials W5D4: Full Swing Push 3x1 min; Tic Tacs 5 min; Short Manuals 20; Foot Pivot 3x1 min.", "Bowl flow / free skate", "No trick obligation."),
        weeklySession("Optional Session 5", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Bowl / free skate only.", "No serious trick obligation.")
      ]
    },
    {
      weekNumber: 12,
      phase: "Essentials",
      summary: "More switch and fakie exposure, still exploratory.",
      sessions: [
        weeklySession("Session 1", "yellow", "Essentials W5D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Heel Drag Stop 25.", "180 family", "Stay technical."),
        weeklySession("Session 2", "yellow", "Essentials W6D1: Tuck Hippy Jump 3x10; One Foot Ollie 25; Ollie Complex 10; FS Ollie Tail Scrape 25.", "Shove-it", "Thoughtful sets."),
        weeklySession("Session 3", "yellow", "Essentials W6D2: Board Shift Lift Nose 3x10; Manual Squat-to-Stand 30; Wheel Hovers 4x10; Deconstructed Spacewalk 3x1 min.", "Rock and roll / axle stall", "Transition session."),
        weeklySession("Session 4", "yellow", "Essentials W6D3: Manual 10 min; Deconstructed Moonwalk 10 min; Manuals 10 min; One Foot Wheel Taps 30.", "Bowl flow / free skate", "No trick obligation."),
        weeklySession("Optional Session 5", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Bowl / free skate only.", "No serious trick obligation.")
      ]
    },
    {
      weekNumber: 13,
      phase: "Essentials",
      summary: "Finish Essentials, repeat weak drills, set up the popping phase.",
      sessions: [
        weeklySession("Session 1", "yellow", "Essentials W6D4: Full Swing Push 3x1 min; Tic Tacs 5 min; Short Manuals 35; Switch Ollie Complex 10.", "180 family", "Stay technical."),
        weeklySession("Session 2", "yellow", "Essentials W6D5: Single Leg Snakes 5 min; Alt. Nose Lift + Tail Tap 50; FS Powerslide 10; Switch Heel Drag Stop 25.", "Shove-it", "Thoughtful sets."),
        weeklySession("Review Session", "blue", "Repeat the two Essentials drills that still feel least natural. 15 min each, scaled to your level.", "Film an end-of-Essentials benchmark.", "Keep it honest.", { benchmark: true }),
        weeklySession("Fun Session", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure bowl / lines / friends.", "Finish the phase wanting to skate.")
      ]
    },
    {
      weekNumber: 14,
      phase: "Art of Popping",
      summary: "Start pop work fresh. Use drills to improve mechanics, not prove height.",
      sessions: [
        weeklySession("Popping 1", "yellow", "Popping W1&2 D1: Heel Toe Press 3x1 min; Straight Leg Jump 3x10; Heelside Jump 3x8.", "180 family", "Stay technical."),
        weeklySession("Popping 2", "yellow", "Popping W1&2 D2: Alternating Nose Lift 3x20; Hippy Jump Lift Nose 5x10; Alt. Lateral Hop 3x20.", "Shove-it", "Thoughtful sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Rotation support: slow kickturns / tic tacs 10 min; hippy-jump 180 or body rotation 10 min; easy fakie / switch turns 10 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 15,
      phase: "Art of Popping",
      summary: "Repeat the first pop block and watch timing and landing quality.",
      sessions: [
        weeklySession("Popping 1", "green", "Popping W1&2 D3: Alternating Hip Circles 3x20; Alternating Tail Jump 40; Hand Ollies 20.", "180 family", "Focused sets."),
        weeklySession("Popping 2", "yellow", "Popping W1&2 D1: Heel Toe Press 3x1 min; Straight Leg Jump 3x10; Heelside Jump 3x8.", "Shove-it", "Thoughtful sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 16,
      phase: "Art of Popping",
      summary: "Finish the first repeated pop block and keep extras exploratory.",
      sessions: [
        weeklySession("Popping 1", "yellow", "Popping W1&2 D2: Alternating Nose Lift 3x20; Hippy Jump Lift Nose 5x10; Alt. Lateral Hop 3x20.", "180 family", "Stay technical."),
        weeklySession("Popping 2", "green", "Popping W1&2 D3: Alternating Hip Circles 3x20; Alternating Tail Jump 40; Hand Ollies 20.", "Shove-it", "Focused sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Rotation support: slow kickturns / tic tacs 10 min; hippy-jump 180 or body rotation 10 min; easy fakie / switch turns 10 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 17,
      phase: "Art of Popping",
      summary: "Second pop block. Choose the weaker 180 as the main rotational project.",
      sessions: [
        weeklySession("Popping 1", "yellow", "Popping W3&4 D1: Tuck Jump 3x8; Hippy Jump with Pause 4x10; Deconstructed Tic Tacs 3x1 min.", "180 family", "Stay technical."),
        weeklySession("Popping 2", "yellow", "Popping W3&4 D2: Bunny Hops 3x20; Narrow Squat Snakes 5 min; Hippy Jump Lift Nose 3x10.", "Shove-it", "Thoughtful sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 18,
      phase: "Art of Popping",
      summary: "Transition priority can shift toward axle stall if rock and roll is calm.",
      sessions: [
        weeklySession("Popping 1", "green", "Popping W3&4 D3: Alternating Hip Circles 3x20; Ollie Complex 25 reps.", "180 family", "Focused sets."),
        weeklySession("Popping 2", "yellow", "Popping W3&4 D1: Tuck Jump 3x8; Hippy Jump with Pause 4x10; Deconstructed Tic Tacs 3x1 min.", "Shove-it", "Thoughtful sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Rotation support: slow kickturns / tic tacs 10 min; hippy-jump 180 or body rotation 10 min; easy fakie / switch turns 10 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 19,
      phase: "Art of Popping",
      summary: "Finish the second pop block and keep shove-it in regular rotation.",
      sessions: [
        weeklySession("Popping 1", "yellow", "Popping W3&4 D2: Bunny Hops 3x20; Narrow Squat Snakes 5 min; Hippy Jump Lift Nose 3x10.", "180 family", "Stay technical."),
        weeklySession("Popping 2", "green", "Popping W3&4 D3: Alternating Hip Circles 3x20; Ollie Complex 25 reps.", "Shove-it", "Focused sets."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target."),
        weeklySession("Optional 5th", "blue", "Recovery SkateIQ: 30 min easy board control only.", "Pure fun / bowl / wallride play.", "No obligation.")
      ]
    },
    {
      weekNumber: 20,
      phase: "Art of Popping",
      summary: "Higher-impact final pop block. Protect your legs.",
      sessions: [
        weeklySession("Popping 1", "green", "Popping W5&6 D1: Single Leg Tuck Jump 3x5; Ollie Tail Scrapes 30; Tuck Hippy Jump 15.", "180 family", "Focused sets."),
        weeklySession("Popping 2", "green", "Popping W5&6 D2: Bunny Hops 3x20; Tic Tacs 3x1 min; Snap Ollies 2x20.", "Shove-it", "Focused sets."),
        weeklySession("Popping 3", "green", "Popping W5&6 D3: Alternating Hip Circles 3x20; BS Ollie Tail Scrapes 3x10; FS Ollie Tail Scrapes 3x10; Ollie Complex 25.", "Rock and roll / axle stall", "Focused transition day."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Rotation support: slow kickturns / tic tacs 10 min; hippy-jump 180 or body rotation 10 min; easy fakie / switch turns 10 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target.")
      ]
    },
    {
      weekNumber: 21,
      phase: "Art of Popping",
      summary: "Repeat the final block, benchmark, and finish the 21-week season.",
      sessions: [
        weeklySession("Popping 1", "green", "Popping W5&6 D1: Single Leg Tuck Jump 3x5; Ollie Tail Scrapes 30; Tuck Hippy Jump 15.", "180 family", "Focused sets."),
        weeklySession("Popping 2", "green", "Popping W5&6 D2: Bunny Hops 3x20; Tic Tacs 3x1 min; Snap Ollies 2x20.", "Shove-it", "Focused sets."),
        weeklySession("Popping 3", "green", "Popping W5&6 D3: Alternating Hip Circles 3x20; BS Ollie Tail Scrapes 3x10; FS Ollie Tail Scrapes 3x10; Ollie Complex 25.", "Rock and roll / axle stall", "Focused transition day."),
        weeklySession("Control Day", "blue", "Easy balance review: Heel Toe Press 3x1 min; Snakes 5 min; Alt. Nose Lift 3x20; easy micro-manuals / carving / switch to 30 min.", "Bowl flow / free skate.", "Keep it easy."),
        weeklySession("Skill Day", "yellow", "Switch support: Heel Toe Press 3x1 min; Full Body Rotation 3x20; Switch Squat 5 min; Single Leg Balance 3x30 sec; easy switch riding to 30 min.", "Choose one current priority: 180, shove-it, or transition.", "One main target.", { benchmark: true })
      ]
    }
  ];

  function intensityMeta(level) {
    return INTENSITY_META[level] || INTENSITY_META.yellow;
  }

  function seasonDayNumber(date) {
    var offset = diffDays(date, SEASON_START) + 1;
    return offset > 0 ? offset : 0;
  }

  function getWeekPlan(weekNumber) {
    return WEEK_PLANS.find(function (week) {
      return week.weekNumber === weekNumber;
    }) || null;
  }

  function weekNumberForDate(date) {
    var dayNumber = seasonDayNumber(date);
    if (!dayNumber) {
      return 1;
    }
    return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor((dayNumber - 1) / 7) + 1));
  }

  function weekNumberForDayNumber(dayNumber) {
    var safeDayNumber = Math.max(1, Math.min(STREAK_DAYS, Number(dayNumber) || 1));
    return Math.max(1, Math.floor((safeDayNumber - 1) / 7) + 1);
  }

  function phaseForWeek(weekNumber) {
    if (weekNumber <= 5) return "Balance Blueprint";
    if (weekNumber <= 13) return "Essentials";
    return "Art of Popping";
  }

  function seasonState(date) {
    var today = cloneDate(date);
    var dayNumber = seasonDayNumber(today);
    var weekNumber = weekNumberForDate(today);
    var finalDate = addDays(SEASON_START, (TOTAL_WEEKS * 7) - 1);
    var state = {
      seasonStart: formatDate(SEASON_START),
      finalDate: formatDate(finalDate),
      status: "prestart",
      weekNumber: weekNumber,
      totalWeeks: TOTAL_WEEKS,
      phase: phaseForWeek(weekNumber),
      dayNumber: dayNumber,
      streakDay: 0,
      streakActive: false
    };
    if (dayNumber <= 0) {
      return state;
    }
    state.status = dayNumber <= (TOTAL_WEEKS * 7) ? "active" : "complete";
    state.streakActive = dayNumber <= STREAK_DAYS;
    state.streakDay = state.streakActive ? dayNumber : STREAK_DAYS;
    return state;
  }

  function dayPlanForDate(date) {
    var state = seasonState(date);
    if (state.dayNumber <= 0 || state.dayNumber > STREAK_DAYS) {
      return null;
    }
    return dayPlanByNumber(state.dayNumber);
  }

  function dayPlanByNumber(dayNumber) {
    var safeDayNumber = Math.max(1, Math.min(STREAK_DAYS, Number(dayNumber) || 1));
    var weekPlan = getWeekPlan(weekNumberForDayNumber(safeDayNumber));
    if (!weekPlan || !Array.isArray(weekPlan.days)) {
      return null;
    }
    return weekPlan.days.find(function (entry) {
      return entry.dayNumber === safeDayNumber;
    }) || null;
  }

  function weekPlanForNumber(weekNumber) {
    return getWeekPlan(Math.max(1, Math.min(TOTAL_WEEKS, Number(weekNumber) || 1)));
  }

  function weekPlanForDate(date) {
    return getWeekPlan(weekNumberForDate(date));
  }

  function firstDailyPlanDate() {
    return addDays(SEASON_START, STREAK_DAYS - 1);
  }

  function isDailyPlanWeek(weekNumber) {
    return Math.max(1, Number(weekNumber) || 1) <= weekNumberForDayNumber(STREAK_DAYS);
  }

  function dayPlanWeekSummary(dayNumber) {
    var weekNumber = weekNumberForDayNumber(dayNumber);
    var weekPlan = getWeekPlan(weekNumber);
    if (!weekPlan) {
      return null;
    }
    return {
      weekNumber: weekNumber,
      weekPlan: weekPlan
    };
  }

  function weeklySessionsForDate(date) {
    var state = seasonState(date);
    var weekPlan = getWeekPlan(state.weekNumber);
    if (!weekPlan) {
      return [];
    }
    if (state.dayNumber > STREAK_DAYS && state.weekNumber === 9 && Array.isArray(weekPlan.afterStreak)) {
      return weekPlan.afterStreak.slice();
    }
    return Array.isArray(weekPlan.sessions) ? weekPlan.sessions.slice() : [];
  }

  function nextSessionIndex(completedCount, totalSessions) {
    var safeCompleted = Math.max(0, Number(completedCount) || 0);
    var safeTotal = Math.max(1, Number(totalSessions) || 1);
    return Math.min(safeCompleted, safeTotal - 1);
  }

  function exactWeekNinePostStreakSession(date) {
    var weekPlan = getWeekPlan(9);
    if (!weekPlan || !Array.isArray(weekPlan.afterStreak)) {
      return null;
    }
    var key = formatDate(date);
    for (var i = 0; i < weekPlan.afterStreak.length; i += 1) {
      var session = weekPlan.afterStreak[i];
      if (Array.isArray(session.dateKeys) && session.dateKeys.indexOf(key) !== -1) {
        return session;
      }
    }
    return null;
  }

  function heroContent(date, completedSessionsThisWeek) {
    var state = seasonState(date);
    var weekPlan = getWeekPlan(state.weekNumber);
    var previewDate = state.dayNumber <= 0 ? SEASON_START : date;
    var planDay = dayPlanForDate(previewDate);
    var weeklySessions = weeklySessionsForDate(previewDate);
    var previewMode = state.dayNumber <= 0;
    var daysUntilStart = previewMode ? diffDays(SEASON_START, date) : 0;

    if (planDay) {
      return {
        state: state,
        weekPlan: weekPlan,
        title: previewMode ? (daysUntilStart === 1 ? "Program starts tomorrow" : "Program starts soon") : "Today",
        subtitle: previewMode ? "Previewing Day 1 for Saturday, August 29, 2026." : weekPlan.summary,
        phaseWeekLabel: weekPlan.phase + " · Week " + weekPlan.weekNumber,
        blockLabel: "Day " + planDay.dayNumber,
        skateiq: planDay.skateiq,
        mainFocus: planDay.mainFocus,
        flow: planDay.flow,
        benchmark: planDay.benchmark,
        benchmarkLabel: planDay.benchmarkLabel,
        defaultIntensity: planDay.intensity,
        note: planDay.note || ""
      };
    }

    if (state.dayNumber > STREAK_DAYS && state.weekNumber === 9) {
      var exactSession = exactWeekNinePostStreakSession(previewDate);
      if (!exactSession) {
        return {
          state: state,
          weekPlan: weekPlan,
          title: "This week",
          subtitle: weekPlan ? weekPlan.summary : "Long-form skate progression",
          phaseWeekLabel: (weekPlan ? weekPlan.phase : state.phase) + " · Week " + state.weekNumber,
          blockLabel: "Rest / open week",
          skateiq: "No fixed 30-minute block is scheduled for Wednesday, October 28, 2026. The daily streak ended on Tuesday, October 27, 2026.",
          mainFocus: "Recovery, rest, or open skate only if you want it.",
          flow: "The next scheduled session starts on Thursday, October 29, 2026.",
          benchmark: false,
          benchmarkLabel: "",
          defaultIntensity: "blue",
          note: "After Day 60, missed days do not reset anything."
        };
      }
      return {
        state: state,
        weekPlan: weekPlan,
        title: "This week",
        subtitle: weekPlan ? weekPlan.summary : "Long-form skate progression",
        phaseWeekLabel: (weekPlan ? weekPlan.phase : state.phase) + " · Week " + state.weekNumber,
        blockLabel: exactSession.label,
        skateiq: exactSession.skateiq,
        mainFocus: exactSession.mainFocus,
        flow: exactSession.flow,
        benchmark: exactSession.benchmark,
        benchmarkLabel: exactSession.benchmark ? "Benchmark / review session" : "",
        defaultIntensity: exactSession.intensity,
        note: exactSession.note || ""
      };
    }

    var sessionIndex = nextSessionIndex(completedSessionsThisWeek, weeklySessions.length || 1);
    var sessionPlan = weeklySessions[sessionIndex] || weeklySessions[0] || weeklySession("Session", "yellow", "Keep the 30-minute block light and technical.", "Choose one current priority.", "Bowl / free skate.", {});
    return {
      state: state,
      weekPlan: weekPlan,
      title: "This week",
      subtitle: weekPlan ? weekPlan.summary : "Long-form skate progression",
      phaseWeekLabel: (weekPlan ? weekPlan.phase : state.phase) + " · Week " + state.weekNumber,
      blockLabel: sessionPlan.label,
      skateiq: sessionPlan.skateiq,
      mainFocus: sessionPlan.mainFocus,
      flow: sessionPlan.flow,
      benchmark: sessionPlan.benchmark,
      benchmarkLabel: sessionPlan.benchmark ? "Benchmark / review session" : "",
      defaultIntensity: sessionPlan.intensity,
      note: sessionPlan.note || ""
    };
  }

  return {
    TOTAL_WEEKS: TOTAL_WEEKS,
    STREAK_DAYS: STREAK_DAYS,
    SEASON_START: formatDate(SEASON_START),
    PRIORITIES: PRIORITIES,
    WEEK_PLANS: WEEK_PLANS,
    intensityMeta: intensityMeta,
    seasonState: seasonState,
    dayPlanForDate: dayPlanForDate,
    dayPlanByNumber: dayPlanByNumber,
    weekNumberForDayNumber: weekNumberForDayNumber,
    weekPlanForNumber: weekPlanForNumber,
    weekPlanForDate: weekPlanForDate,
    firstDailyPlanDate: firstDailyPlanDate,
    isDailyPlanWeek: isDailyPlanWeek,
    dayPlanWeekSummary: dayPlanWeekSummary,
    weeklySessionsForDate: weeklySessionsForDate,
    heroContent: heroContent,
    formatDate: formatDate
  };
}));
