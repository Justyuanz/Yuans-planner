    (function () {
      "use strict";

      // All saved data uses these keys in SQLite/localStorage.
      var STORAGE = {
        databaseName: "yuanPlannerDatabase",
        goals: "hivePlanner.weeklyGoals",
        events: "hivePlanner.events",
        dailyTasksPrefix: "hivePlanner.dailyTasks.",
        plannedPrefix: "hivePlanner.planned.",
        skateFocus: "hivePlanner.skate.focus",
        skateTarget: "hivePlanner.skate.weeklyTarget",
        skateCurrentSession: "hivePlanner.skate.currentSession",
        skateSessions: "hivePlanner.skate.sessions",
        skateCoachTemplate: "hivePlanner.skate.coachTemplate",
        skateSettings: "hivePlanner.skate.settings",
        guitarFocus: "hivePlanner.guitar.focus",
        guitarGoal: "hivePlanner.guitar.goal",
        guitarNextStep: "hivePlanner.guitar.nextStep",
        guitarTarget: "hivePlanner.guitar.weeklyTarget",
        guitarCurrentSession: "hivePlanner.guitar.currentSession",
        guitarSessions: "hivePlanner.guitar.sessions",
        moneySettings: "hivePlanner.money.settings",
        moneyTransactions: "hivePlanner.money.transactions",
        moneyVendorRules: "hivePlanner.money.vendorRules",
        journalEntries: "hivePlanner.journal.entries",
        meditation: "hivePlanner.meditation",
        activityLog: "hivePlanner.activityLog",
        weeklyRoutinePrefix: "hivePlanner.routine.week.",
        goalPlanner: "hivePlanner.goalPlanner.items",
        studyOverviewPrefix: "hivePlanner.weekOverview.study.",
        skateBodyOverviewPrefix: "hivePlanner.weekOverview.skateBody.",
        physicalPlanPrefix: "hivePlanner.physical.week.",
        physicalLogs: "hivePlanner.physical.logs",
        mascotPosition: "hivePlanner.mascot.position",
        dayState: "hivePlanner.dayState",
        agentUiState: "hivePlanner.agent.uiState",
        agentUndo: "hivePlanner.agent.undo"
      };
      var memoryStore = {};
      var serverStorageAvailable = false;
      var browserStorageAvailable = true;
      var transientSessionStarts = {
        skate: null,
        guitar: null
      };
      var statsPeriod = "week";
      var skateTrendPeriod = "month";
      var editingEventId = null;
      var editingTaskId = null;
      var moneyLastImpactMessage = "Saving a transaction will update the rest of the week and month immediately.";
      var moneyBudgetSectionState = {
        fixed: false,
        flexible: false
      };
      var moneyQuickCategoryOrder = [
        "groceries",
        "therapy",
        "fun",
        "eating-out",
        "resq"
      ];
      var moneyQuickShortcutOrder = [
        "groceries",
        "therapy",
        "eating-out",
        "other"
      ];
      var journalSaveStatusTimer = null;
      var draftEventDayPart = "";
      var expandedGoalId = "";
      var pendingSkateLogDateKey = "";
      var MORNING_END = 12 * 60;
      var EVENING_START = 19 * 60;
      var INSIGHT_LOOKBACK_DAYS = 14;
      var MAX_MANUAL_TASK_HOURS = 24;
      // An active timer should never silently turn an overnight pause into a full workday.
      var MAX_TASK_TIMER_HOURS = 8;
      var MAX_TASK_TIMER_SECONDS = MAX_TASK_TIMER_HOURS * 60 * 60;
      var moneyCore = globalThis.YuanMoneyCore;
      var journalCore = globalThis.YuanJournalCore;
      var activityLogCore = globalThis.YuanActivityLog;
      var insightCore = globalThis.YuanInsightCore;
      var insightRules = globalThis.YuanInsightRules;
      var patternHistory = globalThis.YuanPatternHistory;
      var agentCore = globalThis.YuanAgentCore;
      var skateCore = globalThis.YuanSkateCore;
      var skateSessionCore = globalThis.YuanSkateSessionCore;
      var mascotRag = globalThis.YuanMascotRag;
      var weeklyPlannerCore = globalThis.YuanWeeklyPlannerCore;
      const storageCore = globalThis.YuanStorageCore;
      const calendarTaskSync = globalThis.YuanCalendarTaskSync;
      var currentInsightBundleState = null;
      var expandedHiddenTaskDates = {};
      var weeklyPlannerUiState = {
        weekSetupOpen: false,
        weekSetupDraft: null,
        activityPickerOpen: false,
        selectedActivityCategory: "",
        expandedDateKey: ""
      };
      var mascotState = {
        chatOpen: false,
        messages: [],
        bubbleOverride: "",
        lastSource: "",
        lastQuestion: ""
      };
      var calendarCore = globalThis.YuanCalendarCore || (function () {
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

        function parseEventTimeRange(title) {
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

        function compareEventsChronologically(a, b) {
          var timeA = parseEventTimeMinutes(a && a.title);
          var timeB = parseEventTimeMinutes(b && b.title);
          if (timeA !== null && timeB !== null && timeA !== timeB) {
            return timeA - timeB;
          }
          if (timeA !== null && timeB === null) {
            return -1;
          }
          if (timeA === null && timeB !== null) {
            return 1;
          }
          return String((a && (a.createdAt || a.updatedAt)) || "")
            .localeCompare(String((b && (b.createdAt || b.updatedAt)) || ""))
            || String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
        }

        function sortedEvents(events) {
          return (Array.isArray(events) ? events : []).slice().sort(compareEventsChronologically);
        }

        function eventDayPart(event) {
          var timeValue = parseEventTimeMinutes(event && event.title);
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
          var range = parseEventTimeRange(event && event.title);
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
          compareEventsChronologically: compareEventsChronologically,
          eventDayPart: eventDayPart,
          groupEventsByPart: groupEventsByPart,
          parseEventTimeMinutes: parseEventTimeMinutes,
          sortedEvents: sortedEvents
        };
      }());

      function parseTaskTimeMinutes(label) {
        var text = String(label || "").trim();
        var match = text.match(/^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/);
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

      function normalizeClockValue(value) {
        var text = String(value || "").trim();
        if (!text) {
          return "";
        }
        var amPmMatch = text.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
        var match = text.match(/^(\d{1,2}):(\d{2})$/);
        var hours = 0;
        var minutes = 0;
        if (amPmMatch) {
          hours = Number(amPmMatch[1]);
          minutes = amPmMatch[2] ? Number(amPmMatch[2]) : 0;
          if (hours < 1 || hours > 12 || minutes > 59) {
            return "";
          }
          if (hours === 12) {
            hours = 0;
          }
          if (amPmMatch[3].charAt(0).toLowerCase() === "p") {
            hours += 12;
          }
        } else if (match) {
          hours = Number(match[1]);
          minutes = Number(match[2]);
        } else if (/^\d{1,2}$/.test(text)) {
          hours = Number(text);
          minutes = 0;
        } else if (/^\d{3,4}$/.test(text)) {
          hours = Number(text.slice(0, text.length - 2));
          minutes = Number(text.slice(-2));
        } else {
          return "";
        }
        if (hours > 23 || minutes > 59) {
          return "";
        }
        return pad(hours) + ":" + pad(minutes);
      }

      function normalizeScheduledTime(value) {
        var text = String(value || "").trim();
        if (!text) {
          return "";
        }
        var normalized = text.replace(/\s*[–—]\s*/g, "-").replace(/\s+to\s+/gi, "-");
        var parts = normalized.split("-").map(function (part) {
          return part.trim();
        }).filter(Boolean);
        if (!parts.length) {
          return "";
        }
        var start = normalizeClockValue(parts[0]);
        if (!start) {
          return "";
        }
        if (parts.length === 1) {
          return start;
        }
        var end = normalizeClockValue(parts[1]);
        if (!end) {
          return start;
        }
        return start + "-" + end;
      }

      function parseTaskTimeMinutesFromTask(task) {
        var scheduled = normalizeScheduledTime(task && task.scheduledTime);
        if (scheduled) {
          return parseTaskTimeMinutes(scheduled.split("-")[0]);
        }
        return parseTaskTimeMinutes(task && task.label);
      }

      function compareTasksChronologically(a, b) {
        var timeA = parseTaskTimeMinutesFromTask(a);
        var timeB = parseTaskTimeMinutesFromTask(b);
        if (timeA !== null && timeB !== null && timeA !== timeB) {
          return timeA - timeB;
        }
        if (timeA !== null && timeB === null) {
          return -1;
        }
        if (timeA === null && timeB !== null) {
          return 1;
        }
        return String((a && a.createdAt) || "")
          .localeCompare(String((b && b.createdAt) || ""))
          || String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
      }

      var activities = [
        { id: "lc", label: "Leetcode", short: "lc", className: "lc", group: "study" },
        { id: "cpp", label: "Coding", short: "Coding", className: "cpp", group: "study" },
        { id: "python", label: "Python", short: "Python", className: "python", group: "study" },
        { id: "skate", label: "Skate", short: "Skate", className: "skate", group: "leisure" },
        { id: "p90x3", label: "Gym / Judo", short: "Gym / Judo", className: "gym", group: "leisure" },
        { id: "guitar", label: "Guitar", short: "Guitar", className: "guitar", group: "leisure" },
        { id: "other", label: "Other", short: "Other", className: "other", group: "other", showInStats: false }
      ];

      var routineLabelRenames = {
        "Leetcode morning": "Leetcode",
        "C++ one task": "Coding",
        "Python afternoon": "Python project"
      };

      var mascotLines = [
        "Pick the next useful move.",
        "Start ugly. Fix it on lap two.",
        "Open fewer tabs. Finish more things.",
        "A boring completed task still wins.",
        "Do the task your future self will brag about.",
        "Five focused minutes beats fake productivity theater.",
        "If it is fuzzy, name the next action.",
        "You do not need a reset. You need a starting point.",
        "One clean block can rescue the whole day.",
        "Make the problem smaller, then hit it.",
        "The bug is loud because it is scared.",
        "Leave one good note for future-you.",
        "Ship the useful version first.",
        "Today's plot twist: you actually finish the thing.",
        "Skate, code, breathe, repeat.",
        "If your brain is soup, choose the smallest real task.",
        "Done is allowed to look ordinary.",
        "You can be unsure and still continue.",
        "Pick the thing with the biggest relief after it is done.",
        "If you are procrastinating, the task is probably too wide.",
        "One problem. One tool. One pass.",
        "Make it work, then make it less cursed.",
        "The plan only needs to survive today.",
        "Use the good hour on the hard thing.",
        "A half-hour block can still move the week.",
        "Less dramatic planning. More actual reps.",
        "You are not behind in this exact minute.",
        "Name the target, not the vibe.",
        "A rough draft is already a location.",
        "Tiny progress still counts on difficult days.",
        "Protect your energy like it is part of the project.",
        "A clean stop is also progress.",
        "Do not optimize the warm-up forever.",
        "Pick the move that makes tomorrow easier.",
        "I am allowed to learn in public.",
        "I am building a life, not just finishing tasks.",
        "I am becoming more solid through repetition.",
        "I am allowed to be a beginner in one area and strong in another.",
        "I am capable of learning hard things slowly.",
        "I am not late to my own life.",
        "I am allowed to make progress without making a scene about it.",
        "I am someone who comes back and tries again.",
        "I am becoming more reliable to myself.",
        "I am not starting from zero today.",
        "I am gathering evidence that I can do difficult things.",
        "I am allowed to take myself seriously.",
        "I am more than this one bad hour.",
        "I am allowed to want a calmer life.",
        "I am building skill even when it feels unimpressive.",
        "I am learning to trust my own pace.",
        "I am allowed to make small moves toward a big life.",
        "I am not wasting time by learning carefully.",
        "I am someone who can finish what matters.",
        "I am allowed to rest without disappearing.",
        "I am becoming the kind of person who follows through.",
        "I am not too much and I am not behind.",
        "I am allowed to outgrow old panic habits.",
        "I am still moving, even if today is messy.",
        "I am building proof, not fantasy.",
        "I am learning how to hold pressure without folding.",
        "I am allowed to take up space in my own plans.",
        "I am becoming harder to knock off course.",
        "I am worth the effort it takes to rebuild.",
        "You have survived enough to trust your own recovery.",
        "The next step does not need to be glamorous to be important.",
        "You do not need to feel powerful before you begin.",
        "Your life does not need a dramatic reinvention every Monday.",
        "Do not confuse discomfort with failure.",
        "A small disciplined day can change a lot.",
        "Some seasons are for quiet rebuilding.",
        "You are allowed to want structure because life is hard, not because you are weak.",
        "The goal is not to look impressive. The goal is to make your life work.",
        "You can want tenderness and discipline at the same time.",
        "There is nothing wrong with needing a simpler plan today.",
        "A shaky start still counts as starting.",
        "You are allowed to be proud before the finish line.",
        "You do not need permission to take your future seriously.",
        "This is not your forever mood.",
        "Be strict about the task, gentle about the human.",
        "When in doubt, reduce the size and keep the direction.",
        "The right next step often looks boring from the outside.",
        "You can make a lot of progress without making a lot of noise.",
        "Being consistent is cooler than being intense for two days.",
        "The week gets easier when you stop negotiating with the obvious task.",
        "A decent plan today beats the perfect plan you never start.",
        "Let the day be useful, not cinematic.",
        "The most adult thing in the room might be your to-do list.",
        "Do the thing that removes the most mental static.",
        "Your brain likes closure more than chaos.",
        "You probably need a smaller task and a glass of water.",
        "The hard part is often just sitting down long enough.",
        "Keep the promise tiny if that is what lets you keep it.",
        "You are allowed to become impressive quietly.",
        "Progress looks a lot like returning.",
        "You do not need a new personality. You need one honest block of work.",
        "One good choice can still save a messy day.",
        "There is power in becoming less scattered.",
        "Even the fun parts of life need a little structure to survive.",
        "Do not hand the whole day to your mood.",
        "Make the next move so clear that tired-you can still do it.",
        "The future feels less scary when the next action is visible.",
        "A plan is kindness when your brain is tired.",
        "You are not trying to impress the planner. You are trying to help yourself.",
        "Keep going until the task feels lighter, not until your thoughts become perfect.",
        "Your life gets built in ordinary afternoons like this one.",
        "The best version of today is probably simpler than you think.",
        "Being steady is a flex.",
        "You can be soft and still be serious.",
        "Give the day a backbone.",
        "You do not need to earn the right to start over mid-day.",
        "Tiny cleanups count. Tiny reps count. Tiny courage counts."
      ];

      var defaultSkateCoachTemplate = {
        warmupGroups: [
          {
            title: "Flat",
            items: [
              { id: "flat-reverts", name: "Reverts (all directions)", target: "" },
              { id: "flat-ollie", name: "Ollie", target: "x10" },
              { id: "flat-fakie-ollie", name: "Fakie Ollie", target: "x10" }
            ]
          },
          {
            title: "Street",
            items: [
              { id: "street-curb-on", name: "Ollie onto curb", target: "x5" },
              { id: "street-obstacle", name: "Ollie over obstacle", target: "x5" },
              { id: "street-bank", name: "Ollie on bank", target: "x5" },
              { id: "street-drop", name: "Drop off curb", target: "x5" }
            ]
          },
          {
            title: "Transition",
            items: [
              { id: "transition-dropin", name: "Drop in", target: "x3-5" },
              { id: "transition-bowl", name: "Bowl laps", target: "5 min" },
              { id: "transition-fakie", name: "Ride up transition to fakie", target: "x10" },
              { id: "transition-rock-fakie", name: "Rock to Fakie", target: "x10" }
            ]
          }
        ],
        focusSuggestions: {
          flat: ["Shove-it", "Frontside 180", "Half Cab"],
          transition: ["Axle Stall", "Axle Drop", "Wall Ride"]
        },
        skillBuilder: {
          switchItems: ["Push switch", "Ride switch", "Switch kickturns"],
          reminder: "Finish with a few Fakie Ollies.",
          wallRide: "Only a few attempts. Focus on getting comfortable touching the wall and riding away. Not landing."
        },
        roadmapChains: [
          ["Rock to Fakie", "Axle Stall", "Axle Drop", "Rock & Roll"],
          ["Reverts", "Fakie Ollie", "Half Cab"],
          ["Switch Push", "Switch Ride", "Switch Ollie"]
        ]
      };

      var physicalWorkoutNames = [
        "Skate",
        "Total Synergistics",
        "Agility X",
        "X3 Yoga",
        "The Challenge",
        "CVX",
        "The Warrior",
        "Dynamix",
        "Ab Ripper",
        "Stretch",
        "Rest",
        "Other"
      ];

      var feedbackScales = {
        progressToday: ["stuck", "small win", "moving", "solid", "breakthrough"],
        confidence: ["scared", "hesitant", "normal", "confident", "very free"]
      };

      var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      var dayParts = ["morning", "afternoon", "evening"];
      var dayPartLimits = {
        morning: 1,
        afternoon: 2,
        evening: 1
      };
      var dayTypes = weeklyPlannerCore && Array.isArray(weeklyPlannerCore.DAY_TYPES)
        ? weeklyPlannerCore.DAY_TYPES.slice()
        : [
          { id: "recovery", label: "Recovery Day", shortLabel: "Recovery", className: "recovery-day", capacityPoints: 4.5 },
          { id: "normal", label: "Normal Day", shortLabel: "Normal", className: "normal-day", capacityPoints: 7 },
          { id: "high", label: "High-Intensity Day", shortLabel: "High-Intensity", className: "high-day", capacityPoints: 9 }
        ];
      var partLabels = {
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening"
      };
      var weeklyGoalTracks = [
        { id: "study", label: "Study", placeholder: "One study focus worth finishing this week." },
        { id: "body", label: "Body", placeholder: "Skate, gym, or recovery that would help." },
        { id: "mind", label: "Mind", placeholder: "Guitar, reading, or something steadying." }
      ];
      var studyOverviewPlaceholders = ["Coding project · one clear next step", "Rest", "Optional review"];
      var skateBodyOverviewPlaceholders = ["Total Synergistics", "Skate + Ab Ripper", "X3 Yoga"];
      var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      function todayFromUrl() {
        var params = new URLSearchParams(window.location.search || "");
        var text = String(params.get("date") || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          return new Date();
        }
        var parts = text.split("-").map(Number);
        var candidate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (
          candidate.getFullYear() !== parts[0] ||
          candidate.getMonth() !== parts[1] - 1 ||
          candidate.getDate() !== parts[2]
        ) {
          return new Date();
        }
        return candidate;
      }

      var today = todayFromUrl();
      var calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
      var selectedDate = formatDate(today);
      var selectedJournalDate = formatDate(today);
      var ENERGY_STATE_LABELS = {
        empty: "Empty",
        low: "Low",
        okay: "Okay",
        good: "Good",
        strong: "Strong"
      };
      var FOCUS_STATE_LABELS = {
        foggy: "Foggy",
        wavy: "Wavy",
        steady: "Steady",
        clear: "Clear"
      };

      var elements = {
        tabs: document.querySelectorAll("[data-view-target]"),
        views: document.querySelectorAll(".view"),
        todaySubtitle: document.getElementById("todaySubtitle"),
        weekKeyLabel: document.getElementById("weekKeyLabel"),
        dayMessage: document.getElementById("dayMessage"),
        progressText: document.getElementById("progressText"),
        weeklyGoals: document.getElementById("weeklyGoals"),
        journalDate: document.getElementById("journalDate"),
        journalDateLabel: document.getElementById("journalDateLabel"),
        journalTodayButton: document.getElementById("journalTodayButton"),
        journalEnergyOptions: document.getElementById("journalEnergyOptions"),
        journalFocusOptions: document.getElementById("journalFocusOptions"),
        journalStateContext: document.getElementById("journalStateContext"),
        journalTitle: document.getElementById("journalTitle"),
        journalContent: document.getElementById("journalContent"),
        journalSaveStatus: document.getElementById("journalSaveStatus"),
        journalSearch: document.getElementById("journalSearch"),
        journalArchiveList: document.getElementById("journalArchiveList"),
        moneyQuickForm: document.getElementById("moneyQuickForm"),
        moneyQuickAmount: document.getElementById("moneyQuickAmount"),
        moneyQuickCategory: document.getElementById("moneyQuickCategory"),
        moneyQuickVendor: document.getElementById("moneyQuickVendor"),
        moneyQuickSummary: document.getElementById("moneyQuickSummary"),
        moneyQuickShortcuts: document.getElementById("moneyQuickShortcuts"),
        moneyQuickImpact: document.getElementById("moneyQuickImpact"),
        moneyPaceBadge: document.getElementById("moneyPaceBadge"),
        tasksMount: document.getElementById("tasksMount"),
        taskForm: document.getElementById("taskForm"),
        taskTitle: document.getElementById("taskTitle"),
        taskTime: document.getElementById("taskTime"),
        taskReminder: document.getElementById("taskReminder"),
        taskActivity: document.getElementById("taskActivity"),
        todayThemeBadge: document.getElementById("todayThemeBadge"),
        dayStateOptions: document.getElementById("dayStateOptions"),
        weeklyPlannerLabel: document.getElementById("weeklyPlannerLabel"),
        weeklyPlannerMount: document.getElementById("weeklyPlannerMount"),
        setWeekButton: document.getElementById("setWeekButton"),
        prevWeek: document.getElementById("prevWeek"),
        nextWeek: document.getElementById("nextWeek"),
        goalPlannerIntro: document.getElementById("goalPlannerIntro"),
        goalPlannerMount: document.getElementById("goalPlannerMount"),
        addGoalPlannerItem: document.getElementById("addGoalPlannerItem"),
        skateHeroSubtitle: document.getElementById("skateHeroSubtitle"),
        skatePhaseBadge: document.getElementById("skatePhaseBadge"),
        skateWeekCount: document.getElementById("skateWeekCount"),
        skateDayCount: document.getElementById("skateDayCount"),
        skateSessionDaysCount: document.getElementById("skateSessionDaysCount"),
        skateBoardHours: document.getElementById("skateBoardHours"),
        skateRestDay: document.getElementById("skateRestDay"),
        skateExtraRestDay: document.getElementById("skateExtraRestDay"),
        skateCurrentDay: document.getElementById("skateCurrentDay"),
        skateSettingsNote: document.getElementById("skateSettingsNote"),
        skateBlockLabel: document.getElementById("skateBlockLabel"),
        skateMainFocus: document.getElementById("skateMainFocus"),
        skateSkateiqBlock: document.getElementById("skateSkateiqBlock"),
        skateMainFocusShort: document.getElementById("skateMainFocusShort"),
        skateFlowFocus: document.getElementById("skateFlowFocus"),
        skateBenchmarkChip: document.getElementById("skateBenchmarkChip"),
        skateBenchmarkLabel: document.getElementById("skateBenchmarkLabel"),
        skateIntensityToggle: document.getElementById("skateIntensityToggle"),
        skateIntensityDescription: document.getElementById("skateIntensityDescription"),
        skateIntensityEffort: document.getElementById("skateIntensityEffort"),
        skateAttemptBudget: document.getElementById("skateAttemptBudget"),
        skateWeekLabel: document.getElementById("skateWeekLabel"),
        skateCoachFlow: document.getElementById("skateCoachFlow"),
        startSkateSession: document.getElementById("startSkateSession"),
        finishSkateSession: document.getElementById("finishSkateSession"),
        logSkateSession: document.getElementById("logSkateSession"),
        skateSessionHint: document.getElementById("skateSessionHint"),
        guitarFocusInput: document.getElementById("guitarFocusInput"),
        guitarNextStepInput: document.getElementById("guitarNextStepInput"),
        guitarTargetInput: document.getElementById("guitarTargetInput"),
        guitarSessionCount: document.getElementById("guitarSessionCount"),
        guitarSessionStatus: document.getElementById("guitarSessionStatus"),
        guitarSessionHint: document.getElementById("guitarSessionHint"),
        guitarSessionSummary: document.getElementById("guitarSessionSummary"),
        guitarSessionPlan: document.getElementById("guitarSessionPlan"),
        guitarRecentSessions: document.getElementById("guitarRecentSessions"),
        startGuitarSession: document.getElementById("startGuitarSession"),
        finishGuitarSession: document.getElementById("finishGuitarSession"),
        statsPeriodTabs: document.getElementById("statsPeriodTabs"),
        lifeCard: document.querySelector(".life-card"),
        plannedCard: document.querySelector(".planned-card"),
        lifeDonut: document.getElementById("lifeDonut"),
        lifeDonutLabel: document.getElementById("lifeDonutLabel"),
        lifeSummary: document.getElementById("lifeSummary"),
        lifeBreakdown: document.getElementById("lifeBreakdown"),
        plannedWeekLabel: document.getElementById("plannedWeekLabel"),
        plannedMount: document.getElementById("plannedMount"),
        dashboardInsightCard: document.getElementById("dashboardInsightCard"),
        dashboardInsightMode: document.getElementById("dashboardInsightMode"),
        dashboardInsightTitle: document.getElementById("dashboardInsightTitle"),
        dashboardInsightWhy: document.getElementById("dashboardInsightWhy"),
        dashboardInsightActions: document.getElementById("dashboardInsightActions"),
        openPatternHistory: document.getElementById("openPatternHistory"),
        patternHistoryDialog: document.getElementById("patternHistoryDialog"),
        patternHistoryRange: document.getElementById("patternHistoryRange"),
        patternHistoryBody: document.getElementById("patternHistoryBody"),
        energyTrailList: document.getElementById("energyTrailList"),
        energyPatternNote: document.getElementById("energyPatternNote"),
        moneyMonthLabel: document.getElementById("moneyMonthLabel"),
        moneyOverviewGrid: document.getElementById("moneyOverviewGrid"),
        moneyMonthlyTarget: document.getElementById("moneyMonthlyTarget"),
        moneyCategoryBudgetList: document.getElementById("moneyCategoryBudgetList"),
        moneyTransferForm: document.getElementById("moneyTransferForm"),
        moneyTransferFrom: document.getElementById("moneyTransferFrom"),
        moneyTransferTo: document.getElementById("moneyTransferTo"),
        moneyTransferAmount: document.getElementById("moneyTransferAmount"),
        moneyTransferList: document.getElementById("moneyTransferList"),
        moneyProgressList: document.getElementById("moneyProgressList"),
        moneyCharts: document.getElementById("moneyCharts"),
        moneyVendorList: document.getElementById("moneyVendorList"),
        moneyRecentActivity: document.getElementById("moneyRecentActivity"),
        studyOverviewWeek: document.getElementById("studyOverviewWeek"),
        studyOverview: document.getElementById("studyOverview"),
        calendarHeading: document.getElementById("calendarHeading"),
        currentMonthLabel: document.getElementById("currentMonthLabel"),
        calendarGrid: document.getElementById("calendarGrid"),
        prevMonth: document.getElementById("prevMonth"),
        nextMonth: document.getElementById("nextMonth"),
        eventEditorCard: document.getElementById("eventEditorCard"),
        selectedDateHeading: document.getElementById("selectedDateHeading"),
        selectedDateHint: document.getElementById("selectedDateHint"),
        selectedDateEvents: document.getElementById("selectedDateEvents"),
        eventForm: document.getElementById("eventForm"),
        eventDate: document.getElementById("eventDate"),
        eventStartTime: document.getElementById("eventStartTime"),
        eventEndTime: document.getElementById("eventEndTime"),
        eventReminder: document.getElementById("eventReminder"),
        eventNote: document.getElementById("eventNote"),
        eventCategory: document.getElementById("eventCategory"),
        eventEffort: document.getElementById("eventEffort"),
        eventTitle: document.getElementById("eventTitle"),
        eventReminderOnly: document.getElementById("eventReminderOnly"),
        telegramReminderStatus: document.getElementById("telegramReminderStatus"),
        eventSaveButton: document.getElementById("eventSaveButton"),
        formHint: document.getElementById("formHint"),
        plannerLoadPreview: document.getElementById("plannerLoadPreview"),
        plannerAddActivityButton: document.getElementById("plannerAddActivityButton"),
        plannerDayStatusHint: document.getElementById("plannerDayStatusHint"),
        plannerActivityPicker: document.getElementById("plannerActivityPicker"),
        plannerActivityPickerHint: document.getElementById("plannerActivityPickerHint"),
        plannerActivityOptions: document.getElementById("plannerActivityOptions"),
        skateWeeklyMetrics: document.getElementById("skateWeeklyMetrics"),
        bodyLogForm: document.getElementById("bodyLogForm"),
        bodyWorkoutType: document.getElementById("bodyWorkoutType"),
        bodyWorkoutName: document.getElementById("bodyWorkoutName"),
        bodyWorkoutMinutes: document.getElementById("bodyWorkoutMinutes"),
        skateTrendCharts: document.getElementById("skateTrendCharts"),
        skateFeedbackDialog: document.getElementById("skateFeedbackDialog"),
        skateFeedbackForm: document.getElementById("skateFeedbackForm"),
        confidenceScale: document.getElementById("confidenceScale"),
        progressTodayScale: document.getElementById("progressTodayScale"),
        skateDurationMinutes: document.getElementById("skateDurationMinutes"),
        skateSessionDate: document.getElementById("skateSessionDate"),
        skateImprovedNote: document.getElementById("skateImprovedNote"),
        skateNextFocusNote: document.getElementById("skateNextFocusNote"),
        cancelSkateFeedback: document.getElementById("cancelSkateFeedback"),
        guitarSessionDialog: document.getElementById("guitarSessionDialog"),
        guitarSessionForm: document.getElementById("guitarSessionForm"),
        guitarDurationMinutes: document.getElementById("guitarDurationMinutes"),
        guitarSessionNote: document.getElementById("guitarSessionNote"),
        cancelGuitarSession: document.getElementById("cancelGuitarSession"),
        exportData: document.getElementById("exportData"),
        importData: document.getElementById("importData"),
        backupStatus: document.getElementById("backupStatus"),
        openAiAssist: document.getElementById("openAiAssist"),
        mascotCard: document.querySelector(".mascot-card"),
        softMascot: document.getElementById("softMascot"),
        mascotBubble: document.getElementById("mascotBubble"),
        toggleMascotChat: document.getElementById("toggleMascotChat"),
        mascotChat: document.getElementById("mascotChat"),
        mascotQuickAsks: document.getElementById("mascotQuickAsks"),
        mascotChatLog: document.getElementById("mascotChatLog"),
        mascotChatForm: document.getElementById("mascotChatForm"),
        mascotQuestion: document.getElementById("mascotQuestion")
      };

      function isPlannerKey(key) {
        return storageCore.isPlannerKey(key);
      }

      function writeBrowserStorage(key, value) {
        if (!browserStorageAvailable) {
          return;
        }
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          browserStorageAvailable = false;
          console.warn("Planner browser storage is unavailable; using the server copy instead.", error);
        }
      }

      function removeBrowserStorage(key) {
        if (!browserStorageAvailable) {
          return;
        }
        try {
          localStorage.removeItem(key);
        } catch (error) {
          browserStorageAvailable = false;
          console.warn("Planner browser storage is unavailable; using the server copy instead.", error);
        }
      }

      function removePlannerKey(key) {
        delete memoryStore[key];
        removeBrowserStorage(key);
        if (!serverStorageAvailable) {
          return;
        }
        fetch("/api/kv?key=" + encodeURIComponent(key), {
          method: "DELETE"
        }).catch(function () {
          serverStorageAvailable = false;
        });
      }

      function persistServerValue(key, value) {
        if (!serverStorageAvailable) {
          return;
        }
        fetch("/api/kv", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: key, value: value })
        }).catch(function () {
          serverStorageAvailable = false;
        });
      }

      function stripStartedAtFromStoredSkateSession() {
        var session = readJson(STORAGE.skateCurrentSession, null);
        if (!session || typeof session !== "object" || !session.startedAt) {
          return;
        }
        var sanitized = Object.assign({}, session);
        delete sanitized.startedAt;
        writeJson(STORAGE.skateCurrentSession, sanitized);
      }

      function sanitizeTransientSessionData() {
        transientSessionStarts.skate = null;
        transientSessionStarts.guitar = null;
        stripStartedAtFromStoredSkateSession();
        if (memoryStore[STORAGE.guitarCurrentSession] !== undefined) {
          removePlannerKey(STORAGE.guitarCurrentSession);
        }
      }

      async function hydrateStore() {
        memoryStore = {};
        try {
          var response = await fetch("/api/kv", { cache: "no-store" });
          if (response.ok) {
            var payload = await response.json();
            memoryStore = payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
              ? payload.data
              : {};
            serverStorageAvailable = true;
          }
        } catch (error) {
          serverStorageAvailable = false;
        }

        const browserValues = {};
        try {
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key && isPlannerKey(key)) {
              const storedValue = localStorage.getItem(key);
              if (typeof storedValue === "string") {
                browserValues[key] = storedValue;
              }
            }
          }
        } catch (error) {
          browserStorageAvailable = false;
          console.warn("Planner browser storage could not be read; using the server copy instead.", error);
        }

        const hydration = storageCore.mergeHydrationSources(memoryStore, browserValues);
        memoryStore = hydration.values;
        hydration.serverBackfills.forEach(function (entry) {
          persistServerValue(entry.key, entry.value);
        });
        sanitizeTransientSessionData();
      }

      function persistRaw(key, value) {
        if (memoryStore[key] === value) {
          writeBrowserStorage(key, value);
          return;
        }
        memoryStore[key] = value;
        writeBrowserStorage(key, value);
        if (!serverStorageAvailable) {
          return;
        }
        persistServerValue(key, value);
      }

      function syncExternalPlannerStorage(event) {
        if (!event.key || !isPlannerKey(event.key)) {
          return;
        }
        if (event.newValue === null) {
          delete memoryStore[event.key];
          if (dashboardInsightIsReactOwned()) {
            renderDashboardInsight();
          }
          return;
        }
        // React-owned mounts write from the parent document; keep legacy actions from overwriting them.
        memoryStore[event.key] = event.newValue;
        if (dashboardInsightIsReactOwned()) {
          renderDashboardInsight();
        }
      }

      function readText(key, fallback) {
        var value = memoryStore[key];
        return value === undefined || value === null ? fallback : value;
      }

      function writeText(key, value) {
        persistRaw(key, String(value));
      }

      function readJson(key, fallback) {
        try {
          var raw = readText(key, null);
          return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
          return fallback;
        }
      }

      function writeJson(key, value) {
        persistRaw(key, JSON.stringify(value));
      }

      function nextDateKey(dateKey) {
        var date = parseDate(dateKey);
        date.setDate(date.getDate() + 1);
        return formatDate(date);
      }

      function getDayStateMap() {
        var stored = readJson(STORAGE.dayState, {});
        return stored && typeof stored === "object" ? stored : {};
      }

      function getDayState(dateKey) {
        var stateMap = getDayStateMap();
        if (agentCore && typeof agentCore.normalizeDayState === "function") {
          return agentCore.normalizeDayState(stateMap[dateKey]);
        }
        return "okay";
      }

      function saveDayState(dateKey, value) {
        var stateMap = getDayStateMap();
        var normalized = agentCore && typeof agentCore.normalizeDayState === "function"
          ? agentCore.normalizeDayState(value)
          : "okay";
        var before = stateMap[dateKey] || "okay";
        stateMap[dateKey] = normalized;
        writeJson(STORAGE.dayState, stateMap);
        logActivity({
          action: "day_state_updated",
          entityType: "day_state",
          entityId: dateKey,
          dateKey: dateKey,
          before: before,
          after: normalized
        });
      }

      function normalizeJournalTracker(value) {
        if (journalCore && typeof journalCore.normalizeTracker === "function") {
          return journalCore.normalizeTracker(value);
        }
        var tracker = value && typeof value === "object" ? value : {};
        return {
          energy: typeof tracker.energy === "string" ? tracker.energy.trim().toLowerCase() : "",
          focus: typeof tracker.focus === "string" ? tracker.focus.trim().toLowerCase() : "",
          context: typeof tracker.context === "string" ? tracker.context.trim() : ""
        };
      }

      function getSelectedJournalTracker() {
        var energyButton = elements.journalEnergyOptions
          ? elements.journalEnergyOptions.querySelector(".is-active[data-energy-state]")
          : null;
        var focusButton = elements.journalFocusOptions
          ? elements.journalFocusOptions.querySelector(".is-active[data-focus-state]")
          : null;
        return normalizeJournalTracker({
          energy: energyButton ? energyButton.dataset.energyState : "",
          focus: focusButton ? focusButton.dataset.focusState : "",
          context: elements.journalStateContext ? elements.journalStateContext.value : ""
        });
      }

      function setActiveTrackerButtons(container, attributeName, value) {
        if (!container) {
          return;
        }
        Array.prototype.forEach.call(container.querySelectorAll("[" + attributeName + "]"), function (button) {
          button.classList.toggle("is-active", button.getAttribute(attributeName) === value);
        });
      }

      function renderJournalTracker(tracker) {
        var safeTracker = normalizeJournalTracker(tracker);
        setActiveTrackerButtons(elements.journalEnergyOptions, "data-energy-state", safeTracker.energy);
        setActiveTrackerButtons(elements.journalFocusOptions, "data-focus-state", safeTracker.focus);
        if (elements.journalStateContext) {
          elements.journalStateContext.value = safeTracker.context || "";
        }
      }

      function trackerSummaryBits(tracker) {
        var safeTracker = normalizeJournalTracker(tracker);
        return [
          safeTracker.energy ? "Energy " + (ENERGY_STATE_LABELS[safeTracker.energy] || safeTracker.energy) : "",
          safeTracker.focus ? "Focus " + (FOCUS_STATE_LABELS[safeTracker.focus] || safeTracker.focus) : ""
        ].filter(Boolean);
      }

      function normalizeAgentUiState(value) {
        var state = value && typeof value === "object" ? value : {};
        if (!state.hiddenTaskIdsByDate || typeof state.hiddenTaskIdsByDate !== "object") {
          state.hiddenTaskIdsByDate = {};
        }
        return state;
      }

      function getAgentUiState() {
        return normalizeAgentUiState(readJson(STORAGE.agentUiState, {}));
      }

      function saveAgentUiState(state) {
        writeJson(STORAGE.agentUiState, normalizeAgentUiState(state));
      }

      function getAgentUndoStack() {
        var stack = readJson(STORAGE.agentUndo, []);
        return Array.isArray(stack) ? stack : [];
      }

      function saveAgentUndoStack(stack) {
        writeJson(STORAGE.agentUndo, Array.isArray(stack) ? stack.slice(-10) : []);
      }

      function pushAgentUndo(entry) {
        var stack = getAgentUndoStack();
        stack.push(entry);
        saveAgentUndoStack(stack);
      }

      function popAgentUndo() {
        var stack = getAgentUndoStack();
        var entry = stack.pop() || null;
        saveAgentUndoStack(stack);
        return entry;
      }

      function pad(value) {
        return String(value).padStart(2, "0");
      }

      function formatDate(date) {
        return [
          date.getFullYear(),
          pad(date.getMonth() + 1),
          pad(date.getDate())
        ].join("-");
      }

      function parseDate(dateString) {
        var parts = dateString.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }

      function humanDate(dateString) {
        var date = parseDate(dateString);
        return weekdays[date.getDay()] + " " + monthNames[date.getMonth()].slice(0, 3) + " " + date.getDate();
      }

      function longHumanDate(dateString) {
        var date = parseDate(dateString);
        return weekdays[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
      }

      function isoWeekKey(date) {
        var temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNumber = temp.getUTCDay() || 7;
        temp.setUTCDate(temp.getUTCDate() + 4 - dayNumber);
        var isoYear = temp.getUTCFullYear();
        var yearStart = new Date(Date.UTC(isoYear, 0, 1));
        var week = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
        return isoYear + "-W" + pad(week);
      }

      function dailyTaskStorageKey(date) {
        return STORAGE.dailyTasksPrefix + formatDate(date);
      }

      function plannedStorageKey(date) {
        return STORAGE.plannedPrefix + isoWeekKey(date);
      }

      function physicalPlanStorageKey(date) {
        return STORAGE.physicalPlanPrefix + isoWeekKey(date);
      }

      function weekOverviewStorageKey(prefix, date) {
        return prefix + isoWeekKey(date);
      }

      function makeId(prefix) {
        return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }

      function getActivity(id) {
        return activities.find(function (activity) {
          return activity.id === id;
        }) || activities[0];
      }

      function taskActivityTracksTime(activityId) {
        return getActivity(activityId).trackTime !== false;
      }

      function activityShowsInStats(activity) {
        return activity.showInStats !== false;
      }

      function formatHours(value) {
        var number = Number(value);
        number = Number.isFinite(number) ? number : 0;
        if (Math.abs(number - Math.round(number)) < 0.001) {
          return String(Math.round(number)) + "h";
        }
        return String(Math.round(number * 100) / 100).replace(/\.0$/, "") + "h";
      }

      function workoutKind(name) {
        var normalized = String(name || "").toLowerCase();
        if (normalized.indexOf("skate") !== -1) {
          return "skate";
        }
        if (normalized.indexOf("ab ripper") !== -1) {
          return "abRipper";
        }
        if (normalized.indexOf("rest") !== -1) {
          return "rest";
        }
        return "p90x3";
      }

      function countsAsDone(status) {
        return status === "done" || status === "modified";
      }

      function average(values) {
        var filtered = values.filter(function (value) {
          return Number(value) > 0;
        });
        if (!filtered.length) {
          return 0;
        }
        return filtered.reduce(function (sum, value) {
          return sum + Number(value);
        }, 0) / filtered.length;
      }

      function scoreLabel(value) {
        return value ? (Math.round(value * 10) / 10) + " / 5" : "Not enough yet";
      }

      function emptyWeekOverview(date) {
        return {
          week: isoWeekKey(date),
          days: weekDates(date).map(function () {
            return "";
          })
        };
      }

      function normalizeWeekOverview(value, date) {
        var fallback = emptyWeekOverview(date);
        var days = Array.isArray(value && value.days) ? value.days : fallback.days;
        return {
          week: isoWeekKey(date),
          days: weekDates(date).map(function (_, index) {
            return typeof days[index] === "string" ? days[index] : "";
          })
        };
      }

      function getWeekOverview(prefix, date) {
        var stored = readJson(weekOverviewStorageKey(prefix, date), null);
        return stored ? normalizeWeekOverview(stored, date) : emptyWeekOverview(date);
      }

      function saveWeekOverview(prefix, date, overview) {
        writeJson(weekOverviewStorageKey(prefix, date), normalizeWeekOverview(overview, date));
      }

      function getEvents() {
        var events = readJson(STORAGE.events, []);
        return Array.isArray(events) ? events : [];
      }

      function saveEvents(events) {
        writeJson(STORAGE.events, events);
      }

      function eventsForDate(dateKey) {
        return calendarCore.sortedEvents(getEvents().filter(function (event) {
          return event.date === dateKey && !event.routineManaged;
        }));
      }

      function weekDates(date) {
        var range = weekRange(date);
        var dates = [];
        for (var index = 0; index < 7; index += 1) {
          dates.push(addDays(range.start, index));
        }
        return dates;
      }

      function weeklyPlannerStorageKey(date) {
        return STORAGE.weeklyRoutinePrefix + isoWeekKey(date);
      }

      function dayTypeById(id) {
        if (weeklyPlannerCore && typeof weeklyPlannerCore.dayTypeById === "function") {
          return weeklyPlannerCore.dayTypeById(id);
        }
        return dayTypes.find(function (type) {
          return type.id === id;
        }) || dayTypes[1];
      }

      function defaultWeeklyRoutine(date) {
        return weeklyPlannerCore && typeof weeklyPlannerCore.defaultWeekPlan === "function"
          ? weeklyPlannerCore.defaultWeekPlan(isoWeekKey(date))
          : {
            week: isoWeekKey(date),
            isConfigured: false,
            days: weekDates(date).map(function () {
              return { type: "normal" };
            })
          };
      }

      function normalizeRoutineDay(day, fallback) {
        return {
          type: dayTypeById(day && day.type || fallback && fallback.type).id
        };
      }

      function getWeeklyPlannerWeek(date) {
        var stored = readJson(weeklyPlannerStorageKey(date), null);
        if (weeklyPlannerCore && typeof weeklyPlannerCore.normalizeWeekPlan === "function") {
          return weeklyPlannerCore.normalizeWeekPlan(stored, isoWeekKey(date));
        }
        return stored && Array.isArray(stored.days) ? stored : defaultWeeklyRoutine(date);
      }

      function saveWeeklyPlannerWeek(date, routine) {
        writeJson(weeklyPlannerStorageKey(date), getWeeklyPlannerWeek(date).week === (routine && routine.week)
          ? routine
          : (weeklyPlannerCore && typeof weeklyPlannerCore.normalizeWeekPlan === "function"
            ? weeklyPlannerCore.normalizeWeekPlan(routine, isoWeekKey(date))
            : routine));
      }

      function emptyGoalStep() {
        return {
          id: makeId("goal-step"),
          text: "",
          minutes: 45,
          done: false,
          scheduledDay: "",
          eventId: ""
        };
      }

      function emptyGoalItem() {
        return {
          id: makeId("goal"),
          title: "",
          why: "",
          steps: [emptyGoalStep()]
        };
      }

      function getGoalPlannerItems() {
        var items = readJson(STORAGE.goalPlanner, null);
        if (!Array.isArray(items)) {
          return [emptyGoalItem()];
        }
        return items.map(function (goal) {
          return {
            id: goal && goal.id ? goal.id : makeId("goal"),
            title: typeof (goal && goal.title) === "string" ? goal.title : "",
            why: typeof (goal && goal.why) === "string" ? goal.why : "",
            steps: Array.isArray(goal && goal.steps) && goal.steps.length ? goal.steps.map(function (step) {
              return {
                id: step && step.id ? step.id : makeId("goal-step"),
                text: typeof (step && step.text) === "string" ? step.text : "",
                minutes: Math.max(15, Number(step && step.minutes) || 45),
                done: Boolean(step && step.done),
                scheduledDay: typeof (step && step.scheduledDay) === "string" ? step.scheduledDay : "",
                eventId: typeof (step && step.eventId) === "string" ? step.eventId : ""
              };
            }) : [emptyGoalStep()]
          };
        });
      }

      function saveGoalPlannerItems(items) {
        writeJson(STORAGE.goalPlanner, items);
      }

      function weeklyPlannerDayIndex(date) {
        return weekDates(date).findIndex(function (entry) {
          return formatDate(entry) === formatDate(date);
        });
      }

      function weeklyPlannerDayForDate(date) {
        var routine = getWeeklyPlannerWeek(date);
        var index = weeklyPlannerDayIndex(date);
        return {
          routine: routine,
          index: index,
          day: routine.days[index]
        };
      }

      function shiftSelectedWeek(amount) {
        var nextDate = addDays(parseDate(selectedDate), amount * 7);
        selectedDate = formatDate(nextDate);
        calendarCursor = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        renderWeeklyPlannerSection();
        renderCalendar();
        renderSelectedDate();
      }

      function updateGoalPlanner(mutator, shouldRender) {
        var items = getGoalPlannerItems();
        mutator(items);
        saveGoalPlannerItems(items);
        if (shouldRender !== false) {
          renderGoalPlanner();
        }
      }

      function removeGoalStepEvent(eventId) {
        if (!eventId) {
          return;
        }
        saveEvents(getEvents().filter(function (event) {
          return event.id !== eventId;
        }));
      }

      function clearGoalStepReferenceByEventId(eventId) {
        if (!eventId) {
          return;
        }
        var changed = false;
        var items = getGoalPlannerItems();
        items.forEach(function (goal) {
          goal.steps.forEach(function (step) {
            if (step.eventId === eventId) {
              step.eventId = "";
              step.scheduledDay = "";
              changed = true;
            }
          });
        });
        if (changed) {
          saveGoalPlannerItems(items);
        }
      }

      function syncGoalStepReferenceFromEvent(event) {
        if (!event || !event.goalId || !event.goalStepId) {
          return;
        }
        var changed = false;
        var items = getGoalPlannerItems();
        items.forEach(function (goal) {
          if (goal.id !== event.goalId) {
            return;
          }
          goal.steps.forEach(function (step) {
            if (step.id === event.goalStepId) {
              step.eventId = event.id;
              step.scheduledDay = event.date + "|" + calendarCore.eventDayPart(event);
              changed = true;
            }
          });
        });
        if (changed) {
          saveGoalPlannerItems(items);
        }
      }

      function scheduleGoalStep(goalId, stepId) {
        var items = getGoalPlannerItems();
        var goal = items.find(function (entry) { return entry.id === goalId; });
        if (!goal) {
          return;
        }
        var step = goal.steps.find(function (entry) { return entry.id === stepId; });
        if (!step || !step.text.trim() || !step.scheduledDay) {
          return;
        }
        var parts = step.scheduledDay.split("|");
        var dayKey = parts[0];
        var part = parts[1] || "afternoon";
        var events = getEvents();
        var linkedEvent = step.eventId ? events.find(function (event) {
          return event.id === step.eventId;
        }) : null;
        var noteParts = [];
        if (goal.title.trim()) {
          noteParts.push("Goal: " + goal.title.trim());
        }
        if (step.minutes) {
          noteParts.push(step.minutes + " min");
        }
        var payload = {
          date: dayKey,
          title: step.text.trim(),
          note: noteParts.join(" · "),
          category: "Study/school",
          dayPart: part,
          goalId: goal.id,
          goalStepId: step.id,
          updatedAt: new Date().toISOString()
        };

        if (linkedEvent) {
          Object.assign(linkedEvent, payload);
        } else {
          linkedEvent = Object.assign({
            id: makeId("event"),
            createdAt: new Date().toISOString()
          }, payload);
          events.push(linkedEvent);
        }

        step.eventId = linkedEvent.id;
        saveEvents(events);
        saveGoalPlannerItems(items);
        syncGoalStepReferenceFromEvent(linkedEvent);
        selectedDate = dayKey;
        calendarCursor = new Date(parseDate(dayKey).getFullYear(), parseDate(dayKey).getMonth(), 1);
        renderWeeklyPlannerSection();
        renderGoalPlanner();
        renderCalendar();
        renderSelectedDate();
      }

      function defaultPhysicalPlan(date) {
        var defaults = [
          ["Total Synergistics"],
          ["Skate", "Ab Ripper"],
          ["Skate", "Stretch"],
          ["X3 Yoga"],
          ["Skate", "Ab Ripper"],
          ["The Challenge"],
          ["Skate"]
        ];
        return {
          week: isoWeekKey(date),
          days: defaults.map(function (items) {
            return items.map(function (name) {
              return {
                id: makeId("plan"),
                name: name,
                status: "planned",
                minutes: 0,
                note: ""
              };
            });
          })
        };
      }

      function normalizePlanItem(item) {
        var name = typeof item.name === "string" ? item.name.trim() : String(item || "").trim();
        return {
          id: item.id || makeId("plan"),
          name: name || "Other",
          status: ["planned", "done", "modified", "skipped"].indexOf(item.status) === -1 ? "planned" : item.status,
          minutes: Math.max(0, Number(item.minutes) || 0),
          note: typeof item.note === "string" ? item.note : ""
        };
      }

      function normalizePhysicalPlan(plan, date) {
        var fallback = defaultPhysicalPlan(date);
        var days = Array.isArray(plan && plan.days) ? plan.days : fallback.days;
        return {
          week: isoWeekKey(date),
          days: weekDates(date).map(function (_, index) {
            var dayItems = Array.isArray(days[index]) ? days[index] : [];
            return dayItems.map(normalizePlanItem).filter(function (item) {
              return item.name;
            });
          })
        };
      }

      function getPhysicalPlan(date) {
        var stored = readJson(physicalPlanStorageKey(date), null);
        if (!stored) {
          return defaultPhysicalPlan(date);
        }
        return normalizePhysicalPlan(stored, date);
      }

      function getPhysicalLogs() {
        var logs = readJson(STORAGE.physicalLogs, []);
        if (!Array.isArray(logs)) {
          return [];
        }
        return logs.filter(function (log) {
          return log && log.date && log.name;
        }).map(function (log) {
          var kind = normalizeBodySupportType(log.kind || log.name);
          return {
            id: log.id || makeId("body"),
            date: log.date,
            kind: kind,
            name: String(log.name || bodySupportTypeLabel(kind)),
            status: ["done", "modified", "skipped"].indexOf(log.status) === -1 ? "done" : log.status,
            minutes: Math.max(0, Number(log.minutes) || 0),
            score: Math.max(0, Math.min(5, Number(log.score) || 0)),
            note: typeof log.note === "string" ? log.note : "",
            createdAt: log.createdAt || new Date().toISOString()
          };
        });
      }

      function savePhysicalLogs(logs) {
        writeJson(STORAGE.physicalLogs, logs);
      }

      function normalizeBodySupportType(value) {
        var normalized = String(value || "").trim().toLowerCase();
        if (["gym", "judo", "yoga", "stretch", "recovery", "walk", "other"].indexOf(normalized) !== -1) {
          return normalized;
        }
        return "other";
      }

      function bodySupportTypeLabel(type) {
        var normalized = normalizeBodySupportType(type);
        if (normalized === "gym") return "Gym";
        if (normalized === "judo") return "Judo";
        if (normalized === "yoga") return "Yoga";
        if (normalized === "stretch") return "Stretch";
        if (normalized === "recovery") return "Recovery";
        if (normalized === "walk") return "Walk";
        return "Other";
      }

      function defaultSkateSettings() {
        return {
          intensityByDate: {},
          currentProgramDay: 1,
          restDayOfWeek: 0,
          extraRestDayOfWeek: null
        };
      }

      function clampSkateProgramDay(value) {
        var maxDay = skateCore ? skateCore.STREAK_DAYS : 60;
        return Math.max(1, Math.min(maxDay, Math.round(Number(value) || 1)));
      }

      function normalizeSkateRestDay(value) {
        var day = Math.round(Number(value));
        if (day < 0 || day > 6 || !Number.isFinite(day)) {
          return 0;
        }
        return day;
      }

      function normalizeOptionalSkateRestDay(value, primaryDay) {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        var day = Math.round(Number(value));
        if (!Number.isFinite(day) || day < 0 || day > 6 || day === primaryDay) {
          return null;
        }
        return day;
      }

      function normalizeSkateSettings(value) {
        var fallback = defaultSkateSettings();
        var result = value && typeof value === "object" ? value : {};
        var restDayOfWeek = normalizeSkateRestDay(result.restDayOfWeek);
        return {
          intensityByDate: result.intensityByDate && typeof result.intensityByDate === "object" ? result.intensityByDate : fallback.intensityByDate,
          currentProgramDay: clampSkateProgramDay(result.currentProgramDay),
          restDayOfWeek: restDayOfWeek,
          extraRestDayOfWeek: normalizeOptionalSkateRestDay(result.extraRestDayOfWeek, restDayOfWeek)
        };
      }

      function getSkateSettings() {
        return normalizeSkateSettings(readJson(STORAGE.skateSettings, defaultSkateSettings()));
      }

      function saveSkateSettings(settings) {
        writeJson(STORAGE.skateSettings, normalizeSkateSettings(settings));
      }

      function updateSkateSettings(mutator) {
        var settings = getSkateSettings();
        mutator(settings);
        saveSkateSettings(settings);
        renderSkatePage();
      }

      function skateRestDayName(dayIndex) {
        var labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return labels[normalizeSkateRestDay(dayIndex)];
      }

      function skateRestDaysLabel(settings) {
        var names = [skateRestDayName(settings.restDayOfWeek)];
        if (settings.extraRestDayOfWeek !== null) {
          names.push(skateRestDayName(settings.extraRestDayOfWeek));
        }
        return names.join(" and ");
      }

      function isTodaySkateRestDay() {
        var settings = getSkateSettings();
        return settings.restDayOfWeek === today.getDay() || settings.extraRestDayOfWeek === today.getDay();
      }

      function countSkateSessionDaysForWeek(date) {
        var range = weekRange(date);
        var dayMap = {};
        getSkateSessions().forEach(function (session) {
          if (!session || !session.finishedAt) {
            return;
          }
          var key = skateSessionCore.sessionDateKey(session);
          var sessionDate = parseDate(key);
          if (!dateInRange(sessionDate, range.start, range.end)) {
            return;
          }
          dayMap[key] = true;
        });
        return Object.keys(dayMap).length;
      }

      function countSkateLogsForWeek(date) {
        var range = weekRange(date);
        return getSkateSessions().filter(function (session) {
          return session && session.finishedAt && dateInRange(parseDate(skateSessionCore.sessionDateKey(session)), range.start, range.end);
        }).length;
      }

      function currentSkateProgramDay() {
        return clampSkateProgramDay(getSkateSettings().currentProgramDay);
      }

      function programWeekNumberFromDay(dayNumber) {
        if (!skateCore || typeof skateCore.weekNumberForDayNumber !== "function") {
          return 1;
        }
        return skateCore.weekNumberForDayNumber(dayNumber);
      }

      function normalizeReminderMinutes(value) {
        var minutes = Number(value);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          return 0;
        }
        return Math.round(minutes);
      }

      function reminderLabel(minutes) {
        var normalized = normalizeReminderMinutes(minutes);
        if (!normalized) {
          return "";
        }
        if (normalized % 1440 === 0) {
          var days = normalized / 1440;
          return "Telegram " + days + " day" + (days === 1 ? "" : "s") + " before";
        }
        if (normalized % 60 === 0) {
          var hours = normalized / 60;
          return "Telegram " + hours + " hour" + (hours === 1 ? "" : "s") + " before";
        }
        return "Telegram " + normalized + " min before";
      }

      function taskScheduleLabel(task) {
        var parts = [];
        var scheduledTime = normalizeScheduledTime(task && task.scheduledTime);
        var reminder = reminderLabel(task && task.reminderMinutes);
        if (scheduledTime) {
          parts.push(scheduledTime);
        }
        if (reminder) {
          parts.push(reminder);
        }
        return parts.join(" · ");
      }

      function taskDisplayLabel(task) {
        var label = String((task && task.label) || "").trim();
        var scheduledTime = normalizeScheduledTime(task && task.scheduledTime);
        if (!scheduledTime || parseTaskTimeMinutes(label) !== null) {
          return label;
        }
        return scheduledTime + " " + label;
      }

      function eventHasTimedTitle(event) {
        return calendarCore.parseEventTimeMinutes(event && event.title) !== null;
      }

      function setTelegramReminderStatus(message, isError) {
        if (!elements.telegramReminderStatus) {
          return;
        }
        elements.telegramReminderStatus.textContent = message;
        elements.telegramReminderStatus.style.color = isError ? "#9b3d3d" : "";
      }

      async function refreshTelegramStatus() {
        if (!elements.telegramReminderStatus) {
          return;
        }
        try {
          var response = await fetch("/api/telegram/status", { cache: "no-store" });
          if (!response.ok) {
            throw new Error("status");
          }
          var payload = await response.json();
          var configured = Boolean(payload && payload.configured);
          var enabled = Boolean(payload && payload.enabled);
          if (!configured) {
            setTelegramReminderStatus("Telegram is not configured yet. Add bot token and chat ID in .env, then restart the planner.", false);
            return;
          }
          if (!enabled) {
            setTelegramReminderStatus("Telegram credentials are present, but reminders are disabled. Set YUAN_PLANNER_TELEGRAM_ENABLED=1 and restart.", false);
            return;
          }
          setTelegramReminderStatus("Telegram reminders are ready" + (payload.chatHint ? " for chat " + payload.chatHint : "") + ".", false);
        } catch (error) {
          setTelegramReminderStatus("Telegram status is unavailable while the backend is offline.", true);
        }
      }

      function normalizeEventCategory(category) {
        if (weeklyPlannerCore && typeof weeklyPlannerCore.normalizeCategory === "function") {
          return weeklyPlannerCore.normalizeCategory(category);
        }
        return category || "Personal";
      }

      function categoryClass(category) {
        var normalized = normalizeEventCategory(category);
        if (normalized === "Study/school") return "study-block";
        if (normalized === "Finnish") return "finnish-block";
        if (normalized === "Skate") return "skate-block";
        if (normalized === "Gym") return "gym-block";
        if (normalized === "Cooking") return "cooking-block";
        if (normalized === "Chores/groceries") return "chores-block";
        if (normalized === "Social") return "social-block";
        if (normalized === "Guitar") return "guitar-block";
        return "personal-block";
      }

      function isRoutineCategory(category) {
        return false;
      }

      function visibleMonthlyEvents(events) {
        return (Array.isArray(events) ? events : []).filter(function (event) {
          return !event.routineManaged && !isRoutineCategory(event.category);
        });
      }

      function monthEventChipLabel(title) {
        var cleaned = String(title || "")
          .replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[–-]\s*\d{1,2}(?::?(\d{2}))?)?\s*/, "")
          .trim();
        var shortLabel = cleaned || String(title || "").trim();
        if (shortLabel.length <= 20) {
          return shortLabel;
        }
        return shortLabel.slice(0, 17).trimEnd() + "...";
      }

      function setActiveView(viewId) {
        elements.tabs.forEach(function (button) {
          button.classList.toggle("active", button.dataset.viewTarget === viewId);
        });
        elements.views.forEach(function (view) {
          view.classList.toggle("active", view.id === viewId);
        });
        if (viewId === "calendarView") {
          runUiSafely("weekly planner", renderWeeklyPlannerSection);
          runUiSafely("calendar", renderCalendar);
          runUiSafely("selected day", renderSelectedDate);
        }
        if (viewId === "moneyView") {
          runUiSafely("money", renderMoneyPage);
        }
        if (viewId === "journalView") {
          runUiSafely("journal", renderJournalPage);
        }
        if (viewId === "guitarView") {
          runUiSafely("guitar", renderGuitarPage);
        }
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (error) {
          // Older embedded browsers may not support object-form scrollTo.
          window.scrollTo(0, 0);
        }
      }

      // Keep the rest of the planner usable if one optional dashboard panel fails.
      function runUiSafely(label, callback) {
        try {
          callback();
        } catch (error) {
          console.error("Planner UI error while rendering " + label + ".", error);
        }
      }

      function bindNavigation() {
        elements.tabs.forEach(function (button) {
          bindEvent(button, "click", function () {
            setActiveView(button.dataset.viewTarget);
          });
        });
      }

      function bindEvent(element, eventName, handler) {
        if (!element || typeof element.addEventListener !== "function") {
          return;
        }
        element.addEventListener(eventName, handler);
      }

      function initialViewFromUrl() {
        var params = new URLSearchParams(window.location.search || "");
        var requested = (params.get("view") || window.location.hash.replace(/^#/, "") || "").trim();
        var allowed = ["todayView", "journalView", "moneyView", "calendarView", "skateView", "guitarView"];
        return allowed.indexOf(requested) !== -1 ? requested : "todayView";
      }

      function getDefaultTasksForToday() {
        return [];
      }

      function getJournalEntries() {
        var entries = readJson(STORAGE.journalEntries, []);
        if (journalCore && typeof journalCore.sortEntriesNewestFirst === "function") {
          return journalCore.sortEntriesNewestFirst(entries);
        }
        return Array.isArray(entries) ? entries.slice() : [];
      }

      function saveJournalEntries(entries) {
        writeJson(STORAGE.journalEntries, entries);
        renderLifePie();
      }

      function getJournalEntry(dateString) {
        var entries = getJournalEntries();
        if (journalCore && typeof journalCore.findEntryByDate === "function") {
          return journalCore.findEntryByDate(entries, dateString);
        }
        return entries.find(function (entry) {
          return entry.date === dateString;
        }) || null;
      }

      function setJournalStatus(message) {
        if (!elements.journalSaveStatus) {
          return;
        }
        elements.journalSaveStatus.textContent = message;
      }

      function flashJournalSavedState(message) {
        if (journalSaveStatusTimer) {
          window.clearTimeout(journalSaveStatusTimer);
        }
        setJournalStatus(message || "");
        journalSaveStatusTimer = window.setTimeout(function () {
          setJournalStatus("");
        }, 1800);
      }

      function saveJournalDraft() {
        if (!elements.journalTitle || !elements.journalContent) {
          return;
        }

        var title = elements.journalTitle.value.trim();
        var content = elements.journalContent.value;
        var durationMinutes = YuanMindCore.minutes(document.getElementById("journalMinutes").value);
        var tracker = getSelectedJournalTracker();
        var entries = getJournalEntries().slice();
        var existingIndex = entries.findIndex(function (entry) {
          return entry.date === selectedJournalDate;
        });

        if (!durationMinutes && !title && !content.trim() && !tracker.energy && !tracker.focus && !tracker.context) {
          if (existingIndex !== -1) {
            logActivity({
              action: "journal_entry_deleted",
              entityType: "journal_entry",
              entityId: entries[existingIndex].id,
              dateKey: selectedJournalDate,
              before: entries[existingIndex],
              after: null,
              meta: { source: "journal-editor" }
            });
            entries.splice(existingIndex, 1);
            saveJournalEntries(entries);
          }
          currentInsightBundleState = null;
          renderJournalArchive();
          renderDashboardInsight();
          flashJournalSavedState("");
          return;
        }

        var nowStamp = new Date().toISOString();
        var existingEntry = existingIndex === -1 ? null : entries[existingIndex];
        var nextEntry = {
          id: existingEntry ? existingEntry.id : makeId("journal"),
          date: selectedJournalDate,
          title: title,
          content: content,
          durationMinutes: durationMinutes,
          tracker: tracker,
          createdAt: existingEntry ? existingEntry.createdAt : nowStamp,
          updatedAt: nowStamp
        };

        if (existingIndex === -1) {
          entries.push(nextEntry);
          logActivity({
            action: "journal_entry_created",
            entityType: "journal_entry",
            entityId: nextEntry.id,
            dateKey: selectedJournalDate,
            before: null,
            after: nextEntry,
            meta: { source: "journal-editor" }
          });
        } else {
          entries[existingIndex] = nextEntry;
          logActivity({
            action: "journal_entry_updated",
            entityType: "journal_entry",
            entityId: nextEntry.id,
            dateKey: selectedJournalDate,
            before: existingEntry,
            after: nextEntry,
            meta: { source: "journal-editor" }
          });
        }

        saveJournalEntries(entries);
        currentInsightBundleState = null;
        renderJournalArchive();
        renderDashboardInsight();
        flashJournalSavedState("");
      }

      function selectJournalDate(dateString) {
        selectedJournalDate = dateString || formatDate(today);
        if (elements.journalDate) {
          elements.journalDate.value = selectedJournalDate;
        }
        renderJournalPage();
      }

      function renderJournalArchive() {
        if (!elements.journalArchiveList) {
          return;
        }
        var archiveCard = elements.journalArchiveList.closest(".journal-archive-card");
        if (archiveCard && archiveCard.dataset.reactOwned === "true") {
          return;
        }

        var entries = getJournalEntries();
        var query = elements.journalSearch ? elements.journalSearch.value : "";
        if (journalCore && typeof journalCore.filterEntries === "function") {
          entries = journalCore.filterEntries(entries, query);
        }

        elements.journalArchiveList.innerHTML = "";

        if (!entries.length) {
          var empty = document.createElement("p");
          empty.className = "journal-empty-state";
          empty.textContent = query ? "No journal entry matches that search yet." : "Your old journals will stack here as soon as you write one.";
          elements.journalArchiveList.appendChild(empty);
          return;
        }

        entries.forEach(function (entry) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "journal-entry-card";
          if (entry.date === selectedJournalDate) {
            button.classList.add("active");
          }

          var header = document.createElement("div");
          header.className = "journal-entry-card-head";

          var title = document.createElement("strong");
          title.textContent = entry.title || humanDate(entry.date);
          header.appendChild(title);

          var date = document.createElement("span");
          date.textContent = humanDate(entry.date);
          header.appendChild(date);

          var preview = document.createElement("p");
          preview.className = "journal-entry-preview";
          if (journalCore && typeof journalCore.buildPreview === "function") {
            preview.textContent = journalCore.buildPreview(entry, 132);
          } else {
            preview.textContent = entry.content;
          }

          var trackerBits = trackerSummaryBits(entry.tracker);
          if (trackerBits.length || (entry.tracker && entry.tracker.context)) {
            var trackerMeta = document.createElement("p");
            trackerMeta.className = "journal-entry-meta";
            trackerMeta.textContent = trackerBits.concat(entry.tracker && entry.tracker.context ? [entry.tracker.context] : []).join(" · ");
            button.appendChild(header);
            button.appendChild(trackerMeta);
            button.appendChild(preview);
          } else {
            button.appendChild(header);
            button.appendChild(preview);
          }
          button.addEventListener("click", function () {
            selectJournalDate(entry.date);
          });
          elements.journalArchiveList.appendChild(button);
        });
      }

      function renderJournalPage() {
        if (!elements.journalDate || !elements.journalTitle || !elements.journalContent) {
          return;
        }

        var entry = getJournalEntry(selectedJournalDate);
        elements.journalDate.value = selectedJournalDate;
        elements.journalDateLabel.textContent = longHumanDate(selectedJournalDate);
        elements.journalTitle.value = entry ? entry.title : "";
        elements.journalContent.value = entry ? entry.content : "";
        document.getElementById("journalMinutes").value = entry && entry.durationMinutes ? entry.durationMinutes : "";
        renderMeditation();
        renderJournalTracker(entry && entry.tracker);
        setJournalStatus("");
        renderJournalArchive();
      }

      function getWeeklyGoals() {
        var stored = readJson(STORAGE.goals, null);
        var values = stored && typeof stored === "object" ? stored : {};
        return weeklyGoalTracks.map(function (track) {
          return {
            id: track.id,
            label: track.label,
            placeholder: track.placeholder,
            text: typeof values[track.id] === "string" ? values[track.id] : ""
          };
        });
      }

      function saveWeeklyGoals(goals) {
        var payload = {};
        (Array.isArray(goals) ? goals : []).forEach(function (goal) {
          if (!goal || !goal.id) {
            return;
          }
          payload[goal.id] = String(goal.text || "");
        });
        writeJson(STORAGE.goals, payload);
      }

      function createCalendarTask(event) {
        return calendarTaskSync.createTaskFromEvent(event, {
          id: makeId("calendar-task"),
          createdAt: new Date().toISOString(),
          scheduledTime: normalizeScheduledTime(event.startTime),
          reminderMinutes: normalizeReminderMinutes(event.reminderMinutes)
        });
      }

      function mergedTodayTasks(tasks) {
        const normalizedTasks = normalizeTasks(tasks);
        const events = plannerEventsForDate(formatDate(today));
        const result = calendarTaskSync.mergeLinkedTasks(normalizedTasks, events, createCalendarTask);
        return {
          tasks: result.importedCount ? normalizeTasks(result.tasks) : result.tasks,
          changed: result.changed
        };
      }

      function normalizeTasks(tasks) {
        if (!Array.isArray(tasks)) {
          return [];
        }
        return tasks
          .filter(function (task) {
            return task && typeof task.label === "string" && task.label.trim();
          })
          .map(function (task) {
            var label = task.label.trim();
            return {
              id: task.id || makeId("task"),
              label: routineLabelRenames[label] || label,
              activity: activities.some(function (activity) {
                return activity.id === (task.activity || task.track);
              }) ? (task.activity || task.track) : "lc",
              hours: normalizeTaskHours(task.hours),
              timerSeconds: normalizeTaskTimerSeconds(task.timerSeconds),
              timerStartedAt: validTimerStartedAt(task.timerStartedAt),
              done: Boolean(task.done),
              createdAt: task.createdAt || new Date().toISOString(),
              sourceEventId: typeof task.sourceEventId === "string" ? task.sourceEventId : "",
              useSourceEventReminder: task.sourceEventId ? task.useSourceEventReminder !== false : false,
              scheduledTime: normalizeScheduledTime(task.scheduledTime),
              reminderMinutes: normalizeReminderMinutes(task.reminderMinutes),
              reminderSentAt: typeof task.reminderSentAt === "string" ? task.reminderSentAt : "",
              reminderSentFor: typeof task.reminderSentFor === "string" ? task.reminderSentFor : ""
            };
          })
          .sort(compareTasksChronologically);
      }

      function normalizeTaskHours(value) {
        var hours = Number(value);
        return Number.isFinite(hours) ? Math.min(MAX_MANUAL_TASK_HOURS, Math.max(0, hours)) : 0;
      }

      function normalizeTaskTimerSeconds(value) {
        var seconds = Number(value);
        return Number.isFinite(seconds) ? Math.min(MAX_TASK_TIMER_SECONDS, Math.max(0, seconds)) : 0;
      }

      function validTimerStartedAt(value) {
        var timestamp = typeof value === "string" ? Date.parse(value) : NaN;
        return Number.isFinite(timestamp) ? value : null;
      }

      function elapsedTaskSeconds(task) {
        var seconds = normalizeTaskTimerSeconds(task && task.timerSeconds);
        var startedAt = task && validTimerStartedAt(task.timerStartedAt);
        if (startedAt) {
          var elapsed = Math.floor((Date.now() - Date.parse(startedAt)) / 1000);
          if (Number.isFinite(elapsed)) {
            seconds += Math.max(0, elapsed);
          }
        }
        return normalizeTaskTimerSeconds(seconds);
      }

      function hoursFromSeconds(seconds) {
        return Math.round((normalizeTaskTimerSeconds(seconds) / 3600) * 100) / 100;
      }

      function effectiveTaskHours(task) {
        if (task.timerStartedAt || Number(task.timerSeconds) > 0) {
          return hoursFromSeconds(elapsedTaskSeconds(task));
        }
        return normalizeTaskHours(task.hours);
      }

      function effectiveTaskHoursForDate(dateKey, task) {
        if (dateKey === formatDate(today)) {
          return effectiveTaskHours(task);
        }
        if (Number(task.timerSeconds) > 0) {
          return hoursFromSeconds(task.timerSeconds);
        }
        return normalizeTaskHours(task.hours);
      }

      function formatTimer(seconds) {
        var numericSeconds = Number(seconds);
        var safeSeconds = Number.isFinite(numericSeconds) ? Math.max(0, Math.floor(numericSeconds)) : 0;
        var hours = Math.floor(safeSeconds / 3600);
        var minutes = Math.floor((safeSeconds % 3600) / 60);
        var secs = safeSeconds % 60;
        if (hours > 0) {
          return hours + ":" + pad(minutes) + ":" + pad(secs);
        }
        return minutes + ":" + pad(secs);
      }

      function startedSessionSeconds(startedAt) {
        var timestamp = typeof startedAt === "string" ? Date.parse(startedAt) : NaN;
        if (!Number.isFinite(timestamp)) {
          return 0;
        }
        return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
      }

      function sessionDurationMinutes(startedAt, fallbackMinutes) {
        if (startedAt) {
          return Math.max(1, Math.round(startedSessionSeconds(startedAt) / 60));
        }
        return Math.max(1, Number(fallbackMinutes) || 30);
      }

      function sessionStatusText(label, startedAt) {
        if (!startedAt) {
          return "No active " + label + " session.";
        }
        return label + " session running · " + formatTimer(startedSessionSeconds(startedAt));
      }

      function getTodayTasks() {
        var key = dailyTaskStorageKey(today);
        var stored = readJson(key, null);
        if (stored === null) {
          var seeded = mergedTodayTasks(getDefaultTasksForToday());
          writeJson(key, seeded.tasks);
          return seeded.tasks;
        }
        var cleanedStored = removeLegacyRoutineTasks(stored);
        var merged = mergedTodayTasks(cleanedStored);
        if (merged.changed || cleanedStored.length !== stored.length) {
          writeJson(key, merged.tasks);
        }
        return merged.tasks;
      }

      function removeLegacyRoutineTasks(tasks) {
        return (Array.isArray(tasks) ? tasks : []).filter(function (task) {
          return !(task && (task.createdAt === "routine" || String(task.id || "").indexOf("routine-") === 0));
        });
      }

      function saveTodayTasks(tasks) {
        writeJson(dailyTaskStorageKey(today), normalizeTasks(tasks));
      }

      function getTasksForDateKey(dateKey) {
        if (dateKey === formatDate(today)) {
          return getTodayTasks();
        }
        return normalizeTasks(readJson(STORAGE.dailyTasksPrefix + dateKey, []));
      }

      function saveTasksForDateKey(dateKey, tasks) {
        writeJson(STORAGE.dailyTasksPrefix + dateKey, normalizeTasks(tasks));
      }

      function getActivityLog() {
        var entries = readJson(STORAGE.activityLog, []);
        if (activityLogCore && typeof activityLogCore.normalizeEntries === "function") {
          return activityLogCore.normalizeEntries(entries);
        }
        return Array.isArray(entries) ? entries.slice() : [];
      }

      function saveActivityLog(entries) {
        writeJson(STORAGE.activityLog, entries);
      }

      function cloneLogValue(value) {
        if (value === null || value === undefined) {
          return value;
        }
        return JSON.parse(JSON.stringify(value));
      }

      function logActivity(input) {
        if (!activityLogCore || typeof activityLogCore.createEntry !== "function") {
          return null;
        }
        var entry = activityLogCore.createEntry({
          id: makeId("activity"),
          timestamp: new Date().toISOString(),
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          dateKey: input.dateKey || "",
          field: input.field || "",
          before: cloneLogValue(input.before),
          after: cloneLogValue(input.after),
          meta: cloneLogValue(input.meta || {})
        });
        if (!entry) {
          return null;
        }
        var entries = getActivityLog();
        entries.push(entry);
        saveActivityLog(entries);
        return entry;
      }

      function logTaskFieldChange(taskId, dateKey, field, beforeValue, afterValue, meta) {
        if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
          return;
        }
        logActivity({
          action: "task_updated",
          entityType: "task",
          entityId: taskId,
          dateKey: dateKey,
          field: field,
          before: beforeValue,
          after: afterValue,
          meta: meta || {}
        });
      }

      function buildInsightTaskMap() {
        var taskMap = {};
        Object.keys(memoryStore).forEach(function (key) {
          if (key.indexOf(STORAGE.dailyTasksPrefix) !== 0) {
            return;
          }
          var dateKey = key.slice(STORAGE.dailyTasksPrefix.length);
          taskMap[dateKey] = normalizeTasks(readJson(key, []));
        });
        var todayKey = formatDate(today);
        if (!taskMap[todayKey]) {
          taskMap[todayKey] = getTodayTasks();
        }
        return taskMap;
      }

      function currentInsightMetrics() {
        if (!insightCore || typeof insightCore.buildMetrics !== "function") {
          return null;
        }
        return insightCore.buildMetrics({
          taskMap: buildInsightTaskMap(),
          activityLog: getActivityLog(),
          moneyState: getMoneyState(),
          moneyTransactions: getMoneyTransactions(),
          journalEntries: getJournalEntries(),
          currentDateKey: formatDate(today),
          lookbackDays: INSIGHT_LOOKBACK_DAYS
        });
      }

      function currentInsightBundle() {
        if (!insightRules) {
          return null;
        }
        var metrics = currentInsightMetrics();
        var insights = insightRules.deriveInsights(metrics || {});
        var topInsight = insightRules.selectTopInsight(insights);
        currentInsightBundleState = {
          metrics: metrics,
          insights: insights,
          topInsight: topInsight
        };
        return currentInsightBundleState;
      }

      function focusTodayTaskInput() {
        setActiveView("todayView");
        if (elements.taskTitle) {
          elements.taskTitle.focus();
        }
      }

      function scrollToPlannedHours() {
        const plannedMount = document.getElementById("plannedMount") || elements.plannedMount;
        if (plannedMount && plannedMount.scrollIntoView) {
          plannedMount.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      function applyInsightAction(actionId) {
        var actionHandlers = {
          open_money_view: function () {
            setActiveView("moneyView");
          },
          pause_extra_spending: function () {
            setActiveView("moneyView");
          },
          review_planned_hours: scrollToPlannedHours,
          focus_today_tasks: focusTodayTaskInput,
          make_one_task_concrete: focusTodayTaskInput
        };
        if (actionHandlers[actionId]) {
          actionHandlers[actionId]();
        }
      }

      function dashboardInsightIsReactOwned() {
        return Boolean(elements.dashboardInsightCard
          && elements.dashboardInsightCard.dataset.reactOwned === "true");
      }

      function notifyDashboardInsightUpdated() {
        window.dispatchEvent(new CustomEvent("hive-planner-dashboard-insight-updated"));
      }

      function exposeDashboardInsightBridge() {
        globalThis.YuanPlannerDashboardInsightBridge = Object.freeze({
          applyAction: function (actionId) {
            applyInsightAction(actionId);
          },
          currentInsight: function () {
            const bundle = currentInsightBundle();
            return bundle ? bundle.topInsight : null;
          },
          openHistory: function () {
            openPatternHistoryDialog();
          }
        });
      }

      function defaultMascotBubbleText() {
        var bundle = currentInsightBundleState || currentInsightBundle();
        if (mascotState.bubbleOverride) {
          return mascotState.bubbleOverride;
        }
        if (bundle && bundle.topInsight) {
          return bundle.topInsight.title;
        }
        return randomMascotLine();
      }

      function syncMascotBubble() {
        setMascotBubble(defaultMascotBubbleText());
      }

      function mascotJournalContext() {
        return getJournalEntries().slice(0, 5).map(function (entry) {
          return {
            date: entry.date,
            title: entry.title,
            content: entry.content
          };
        });
      }

      function mascotMoneyContext() {
        var state = getMoneyState();
        if (!state) {
          return null;
        }
        return {
          month: {
            spentCents: state.month && state.month.spentCents,
            targetCents: state.month && state.month.targetCents,
            flexibleSpentCents: state.month && state.month.flexibleSpentCents,
            flexibleBudgetCents: state.month && state.month.flexibleBudgetCents,
            flexibleRemainingCents: state.month && state.month.flexibleRemainingCents,
            availableWeekCents: state.month && state.month.availableWeekCents,
            projectedTotalCents: state.month && state.month.projectedTotalCents
          },
          categories: (state.categories || []).slice(0, 8).map(function (category) {
            return {
              id: category.id,
              name: category.name,
              kind: category.kind,
              spentCents: category.spentCents,
              remainingCents: category.remainingCents,
              budgetCents: category.budgetCents
            };
          }),
          vendors: (state.vendors || []).slice(0, 5).map(function (vendor) {
            return {
              vendor: vendor.vendor,
              spentCents: vendor.spentCents,
              count: vendor.count,
              topCategoryId: vendor.topCategoryId
            };
          })
        };
      }

      function mascotPlannedHoursContext() {
        return readJson(plannedStorageKey(today), {});
      }

      function mascotSkateContext() {
        var hero = currentSkateHero();
        var session = getCurrentSkateSession();
        var recentSessions = getSkateSessions().slice().sort(function (left, right) {
          return String(right.finishedAt || "").localeCompare(String(left.finishedAt || ""));
        }).slice(0, 8).map(function (entry) {
          return {
            date: entry.finishedAt ? entry.finishedAt.slice(0, 10) : "",
            intensity: entry.intensity || "yellow",
            mainFocus: entry.mainFocus || entry.focus || "",
            flowFocus: entry.flowFocus || "",
            durationHours: Number(entry.durationHours) || 0,
            improvedNote: entry.improvedNote || "",
            nextFocusNote: entry.nextFocusNote || ""
          };
        });
        var supportThisWeek = getPhysicalLogs().filter(function (log) {
          return countsAsDone(log.status) && dateInRange(parseDate(log.date), weekRange(today).start, weekRange(today).end);
        }).map(function (log) {
          return {
            date: log.date,
            type: bodySupportTypeLabel(log.kind),
            minutes: log.minutes,
            note: log.note
          };
        });
        return {
          todayPlan: hero ? {
            title: hero.title,
            phaseWeekLabel: hero.phaseWeekLabel,
            blockLabel: hero.blockLabel,
            mainFocus: hero.mainFocus,
            flow: hero.flow,
            skateiq: hero.skateiq,
            benchmark: hero.benchmark,
            defaultIntensity: hero.defaultIntensity
          } : null,
          todayState: {
            selectedIntensity: skateIntensityForToday(hero, session)
          },
          priorities: skateCore ? skateCore.PRIORITIES : [],
          recentSessions: recentSessions,
          supportThisWeek: supportThisWeek
        };
      }

      function mascotRecentTaskHistory() {
        var bundle = currentInsightBundleState || currentInsightBundle();
        var summaries = bundle && bundle.metrics && Array.isArray(bundle.metrics.dailySummaries)
          ? bundle.metrics.dailySummaries
          : [];
        return summaries.slice(-7).map(function (summary) {
          return {
            dateKey: summary.dateKey,
            plannedCount: summary.plannedCount,
            completedCount: summary.completedCount,
            plannedHours: summary.plannedHours,
            completedHours: summary.completedHours,
            unscheduledCount: summary.unscheduledCount,
            eveningHours: summary.eveningHours,
            unfinishedLabels: (summary.unfinishedLabels || []).slice(0, 5)
          };
        });
      }

      function currentAgentActionSuggestions(question) {
        if (!agentCore || typeof agentCore.proposeActions !== "function") {
          return [];
        }
        var bundle = currentInsightBundleState || currentInsightBundle();
        return agentCore.proposeActions({
          question: question || mascotState.lastQuestion || "",
          dayState: getDayState(formatDate(today)),
          todayTasks: getTodayTasks(),
          recentTaskHistory: mascotRecentTaskHistory(),
          metrics: bundle && bundle.metrics
        }).slice(0, 2);
      }

      function currentMascotRagPayload() {
        var bundle = currentInsightBundleState || currentInsightBundle();
        return {
          dayState: getDayState(formatDate(today)),
          metrics: bundle ? bundle.metrics : null,
          insights: bundle ? bundle.insights : [],
          topInsight: bundle ? bundle.topInsight : null,
          journalEntries: mascotJournalContext(),
          todayTasks: getTodayTasks(),
          recentTaskHistory: mascotRecentTaskHistory(),
          plannedHours: mascotPlannedHoursContext(),
          moneyState: mascotMoneyContext(),
          skate: mascotSkateContext(),
          activityLog: getActivityLog(),
          currentDateKey: formatDate(today)
        };
      }

      function localMascotAnswer(question) {
        if (!mascotRag || typeof mascotRag.answerMascotQuestion !== "function") {
          return {
            answer: "I cannot answer that yet because the mascot engine is missing.",
            evidence: []
          };
        }
        return mascotRag.answerMascotQuestion(question, currentMascotRagPayload());
      }

      async function requestMascotServerAnswer(question) {
        var response = await fetch("/api/mascot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question,
            context: currentMascotRagPayload()
          })
        });
        if (!response.ok) {
          throw new Error("Mascot server unavailable");
        }
        var payload = await response.json();
        if (!payload || !payload.ok || !payload.reply || typeof payload.reply.answer !== "string" || !payload.reply.answer.trim()) {
          throw new Error("Mascot server returned an invalid reply");
        }
        return payload.reply;
      }

      function syncMascotMobileVisibility() {
        if (!elements.mascotCard) {
          return;
        }
        elements.mascotCard.classList.toggle("is-mobile-open", mascotState.chatOpen && window.innerWidth <= 1120);
      }

      function setMascotChatOpen(isOpen) {
        mascotState.chatOpen = Boolean(isOpen);
        if (elements.mascotChat) {
          elements.mascotChat.hidden = !mascotState.chatOpen;
        }
        syncMascotMobileVisibility();
        if (elements.toggleMascotChat) {
          elements.toggleMascotChat.textContent = mascotState.chatOpen ? "Hide Sprouty" : "Ask Sprouty";
        }
        if (!mascotState.chatOpen) {
          mascotState.bubbleOverride = "";
          syncMascotBubble();
        } else if (elements.mascotQuestion) {
          if (!mascotState.messages.length) {
            primeMascotConversation();
          }
          window.setTimeout(function () {
            elements.mascotQuestion.focus();
          }, 0);
        }
      }

      function renderDayStateOptions() {
        if (!elements.dayStateOptions) {
          return;
        }
        var activeState = getDayState(formatDate(today));
        Array.prototype.forEach.call(elements.dayStateOptions.querySelectorAll("[data-day-state]"), function (button) {
          button.classList.toggle("is-active", button.dataset.dayState === activeState);
        });
      }

      function logAgentActionSummary(result, beforeState, afterState) {
        logActivity({
          action: "agent_action_applied",
          entityType: "agent_action",
          entityId: result.actionId,
          dateKey: formatDate(today),
          before: beforeState,
          after: afterState,
          meta: {
            label: result.actionLabel,
            dayState: getDayState(formatDate(today))
          }
        });
      }

      function logAgentTaskDiffs(beforeTasks, afterTasks, dateKey, actionId) {
        var beforeById = {};
        var afterById = {};
        (beforeTasks || []).forEach(function (task) {
          beforeById[task.id] = task;
        });
        (afterTasks || []).forEach(function (task) {
          afterById[task.id] = task;
        });

        Object.keys(beforeById).forEach(function (taskId) {
          var beforeTask = beforeById[taskId];
          var afterTask = afterById[taskId];
          if (!afterTask) {
            logActivity({
              action: "task_deleted",
              entityType: "task",
              entityId: taskId,
              dateKey: dateKey,
              before: beforeTask,
              after: null,
              meta: {
                label: beforeTask.label,
                activity: beforeTask.activity,
                agentAction: actionId
              }
            });
            return;
          }
          if (beforeTask.label !== afterTask.label) {
            logActivity({
              action: "task_updated",
              entityType: "task",
              entityId: taskId,
              dateKey: dateKey,
              field: "label",
              before: beforeTask.label,
              after: afterTask.label,
              meta: {
                label: afterTask.label,
                activity: afterTask.activity,
                agentAction: actionId
              }
            });
          }
        });

        Object.keys(afterById).forEach(function (taskId) {
          if (beforeById[taskId]) {
            return;
          }
          var afterTask = afterById[taskId];
          logActivity({
            action: "task_created",
            entityType: "task",
            entityId: taskId,
            dateKey: dateKey,
            before: null,
            after: afterTask,
            meta: {
              label: afterTask.label,
              activity: afterTask.activity,
              agentAction: actionId
            }
          });
        });
      }

      function applyAgentAction(actionId) {
        if (!agentCore || typeof agentCore.applyAction !== "function") {
          return null;
        }
        var todayKey = formatDate(today);
        var tomorrowKey = nextDateKey(todayKey);
        var plannedHours = mascotPlannedHoursContext();
        var currentUiState = getAgentUiState();
        var result = agentCore.applyAction(actionId, {
          todayDateKey: todayKey,
          tomorrowDateKey: tomorrowKey,
          dayState: getDayState(todayKey),
          todayTasks: getTasksForDateKey(todayKey),
          tomorrowTasks: getTasksForDateKey(tomorrowKey),
          plannedHours: plannedHours,
          agentState: currentUiState,
          idFactory: makeId
        });
        if (!result || !result.changed) {
          return null;
        }

        saveTasksForDateKey(todayKey, result.todayTasks);
        saveTasksForDateKey(tomorrowKey, result.tomorrowTasks);
        saveAgentUiState(result.agentState);
        pushAgentUndo({
          actionId: result.actionId,
          actionLabel: result.actionLabel,
          todayKey: todayKey,
          tomorrowKey: tomorrowKey,
          snapshot: result.undo
        });
        logAgentActionSummary(result, result.undo.before, result.undo.after);
        logAgentTaskDiffs(result.undo.before.todayTasks, result.undo.after.todayTasks, todayKey, result.actionId);
        logAgentTaskDiffs(result.undo.before.tomorrowTasks, result.undo.after.tomorrowTasks, tomorrowKey, result.actionId);
        expandedHiddenTaskDates[todayKey] = false;
        renderTasks();
        renderTotals();
        renderDashboardInsight();
        syncMascotBubble();
        return result;
      }

      function undoLastAgentAction() {
        if (!agentCore || typeof agentCore.undoAction !== "function") {
          return null;
        }
        var undoEntry = popAgentUndo();
        if (!undoEntry) {
          return null;
        }
        var restored = agentCore.undoAction(undoEntry.snapshot);
        if (!restored) {
          return null;
        }
        saveTasksForDateKey(undoEntry.todayKey, restored.todayTasks);
        saveTasksForDateKey(undoEntry.tomorrowKey, restored.tomorrowTasks);
        saveAgentUiState(restored.agentState);
        logActivity({
          action: "agent_action_undone",
          entityType: "agent_action",
          entityId: undoEntry.actionId,
          dateKey: undoEntry.todayKey,
          before: undoEntry.snapshot.after,
          after: undoEntry.snapshot.before,
          meta: {
            label: undoEntry.actionLabel
          }
        });
        expandedHiddenTaskDates[undoEntry.todayKey] = false;
        renderTasks();
        renderTotals();
        renderDashboardInsight();
        syncMascotBubble();
        return undoEntry;
      }

      function primeMascotConversation() {
        var bundle = currentInsightBundleState || currentInsightBundle();
        if (bundle && bundle.topInsight) {
          appendMascotMessage("assistant", bundle.topInsight.title, [bundle.topInsight.why], {
            source: "local"
          });
          renderMascotChatLog();
          return;
        }
        appendMascotMessage("assistant", "Ask me about what keeps slipping, what to cut today, what to move to tomorrow, or which task to make smaller.", [], {
          source: "local"
        });
        renderMascotChatLog();
      }

      function appendMascotMessage(role, text, evidence, meta) {
        mascotState.messages.push({
          role: role,
          text: text,
          evidence: Array.isArray(evidence) ? evidence.slice(0, 3) : [],
          meta: meta && typeof meta === "object" ? meta : {}
        });
        mascotState.messages = mascotState.messages.slice(-6);
      }

      function replaceLastMascotMessage(role, text, evidence, meta) {
        if (!mascotState.messages.length) {
          appendMascotMessage(role, text, evidence, meta);
          return;
        }
        mascotState.messages[mascotState.messages.length - 1] = {
          role: role,
          text: text,
          evidence: Array.isArray(evidence) ? evidence.slice(0, 3) : [],
          meta: meta && typeof meta === "object" ? meta : {}
        };
      }

      function renderMascotChatLog() {
        if (!elements.mascotChatLog) {
          return;
        }
        elements.mascotChatLog.innerHTML = "";
        mascotState.messages.forEach(function (message) {
          var card = document.createElement("div");
          card.className = "mascot-message " + message.role;
          var label = document.createElement("strong");
          label.textContent = message.role === "user" ? "You" : "Mascot";
          if (message.meta && message.meta.source && message.role === "assistant") {
            var source = document.createElement("span");
            source.className = "mascot-message-source";
            source.textContent = message.meta.source === "openai" ? "OpenAI" : message.meta.source;
            card.appendChild(source);
          }
          var text = document.createElement("p");
          text.textContent = message.text;
          card.appendChild(label);
          card.appendChild(text);
          if (message.role === "assistant" && message.evidence.length) {
            var evidenceList = document.createElement("ul");
            message.evidence.forEach(function (line) {
              var item = document.createElement("li");
              item.textContent = line;
              evidenceList.appendChild(item);
            });
            card.appendChild(evidenceList);
          }
          elements.mascotChatLog.appendChild(card);
        });
      }

      function finalizeMascotReply(question, response) {
        var safeResponse = response && typeof response === "object" ? response : {};
        var actions = currentAgentActionSuggestions(question);
        var answer = String(safeResponse.answer || "").trim();
        if (!answer) {
          answer = "I do not have a solid answer yet.";
        }
        if (actions.length) {
          var suggestion = actions[0].suggestion || actions[0].label;
          if (answer.toLowerCase().indexOf("useful next step:") === -1) {
            answer += " Useful next step: " + suggestion + ".";
          }
        }
        return {
          answer: answer,
          evidence: Array.isArray(safeResponse.evidence) ? safeResponse.evidence : [],
          source: safeResponse.source || "local"
        };
      }

      async function askMascot(question) {
        var trimmed = String(question || "").trim();
        if (!trimmed) {
          return;
        }
        mascotState.lastQuestion = trimmed;
        appendMascotMessage("user", trimmed);
        appendMascotMessage("assistant", "Thinking...", [], { source: "thinking", pending: true });
        renderMascotChatLog();
        try {
          var response = finalizeMascotReply(trimmed, await requestMascotServerAnswer(trimmed));
          mascotState.lastSource = response.source || "openai";
          replaceLastMascotMessage("assistant", response.answer, response.evidence, { source: mascotState.lastSource });
        } catch (error) {
          try {
            var fallbackResponse = finalizeMascotReply(trimmed, localMascotAnswer(trimmed));
            mascotState.lastSource = fallbackResponse.source || "local";
            replaceLastMascotMessage("assistant", fallbackResponse.answer, fallbackResponse.evidence, { source: mascotState.lastSource });
          } catch (fallbackError) {
            mascotState.lastSource = "error";
            replaceLastMascotMessage("assistant", "The mascot reply failed just now. Try again once, and if it keeps happening I need to inspect the exact response body.", [], { source: mascotState.lastSource });
          }
        }
        mascotState.bubbleOverride = mascotState.messages[mascotState.messages.length - 1].text;
        renderMascotChatLog();
        syncMascotBubble();
      }

      function renderMascotQuickAsks() {
        if (!elements.mascotQuickAsks || !mascotRag || typeof mascotRag.suggestedPrompts !== "function") {
          return;
        }
        elements.mascotQuickAsks.innerHTML = "";
        mascotRag.suggestedPrompts(getDayState(formatDate(today))).forEach(function (prompt) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "mascot-quick-ask";
          button.textContent = prompt;
          button.addEventListener("click", function () {
            setMascotChatOpen(true);
            askMascot(prompt);
          });
          elements.mascotQuickAsks.appendChild(button);
        });
      }

      function clearDashboardInsightCard() {
        elements.dashboardInsightCard.hidden = false;
        elements.dashboardInsightActions.innerHTML = "";
        elements.dashboardInsightMode.textContent = "quiet mode";
        elements.dashboardInsightTitle.textContent = "No strong pattern needs attention yet.";
        elements.dashboardInsightWhy.textContent = "This space will surface patterns when your recent planner data shows something clear, but right now nothing looks urgent or obviously off-track.";
        if (elements.openPatternHistory) {
          elements.openPatternHistory.hidden = false;
        }
      }

      function renderDashboardInsightActions(actions) {
        elements.dashboardInsightActions.innerHTML = "";
        actions.slice(0, 2).forEach(function (action) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "insight-action";
          button.textContent = action.label;
          button.addEventListener("click", function () {
            applyInsightAction(action.id);
          });
          elements.dashboardInsightActions.appendChild(button);
        });
      }

      function renderDashboardInsight() {
        if (!elements.dashboardInsightCard || !elements.dashboardInsightMode || !elements.dashboardInsightTitle || !elements.dashboardInsightWhy || !elements.dashboardInsightActions || !insightRules) {
          renderEnergyTrail();
          return;
        }
        var bundle = currentInsightBundle();
        var topInsight = bundle ? bundle.topInsight : null;

        if (dashboardInsightIsReactOwned()) {
          if (!topInsight) {
            syncMascotBubble();
          } else if (!mascotState.chatOpen) {
            mascotState.bubbleOverride = "";
            syncMascotBubble();
          }
          notifyDashboardInsightUpdated();
          renderEnergyTrail();
          return;
        }

        if (!topInsight) {
          clearDashboardInsightCard();
          syncMascotBubble();
          renderEnergyTrail();
          return;
        }

        elements.dashboardInsightCard.hidden = false;
        elements.dashboardInsightMode.textContent = topInsight.mode + " · " + topInsight.sampleSize + " days";
        elements.dashboardInsightTitle.textContent = topInsight.title;
        elements.dashboardInsightWhy.textContent = topInsight.why;
        renderDashboardInsightActions(topInsight.actions || []);
        if (elements.openPatternHistory) {
          elements.openPatternHistory.hidden = false;
        }
        if (!mascotState.chatOpen) {
          mascotState.bubbleOverride = "";
          syncMascotBubble();
        }
        renderEnergyTrail();
      }

      function renderEnergyTrail() {
        if (!elements.energyTrailList || !elements.energyPatternNote) {
          return;
        }
        var energyTrailCard = elements.energyTrailList.closest(".state-history-card");
        if (energyTrailCard && energyTrailCard.dataset.reactOwned === "true") {
          return;
        }
        var entries = getJournalEntries().filter(function (entry) {
          var tracker = normalizeJournalTracker(entry && entry.tracker);
          return tracker.energy || tracker.focus || tracker.context;
        }).slice(0, 7);
        var bundle = currentInsightBundle();
        var pattern = bundle && bundle.metrics ? bundle.metrics.energyCrashPattern : null;

        elements.energyTrailList.innerHTML = "";
        if (!entries.length) {
          var empty = document.createElement("p");
          empty.className = "pattern-history-empty";
          empty.textContent = "Start with one tiny check-in. Your recent energy trail will show up here.";
          elements.energyTrailList.appendChild(empty);
        } else {
          entries.forEach(function (entry) {
            var item = document.createElement("button");
            item.type = "button";
            item.className = "state-trail-item";

            var head = document.createElement("div");
            head.className = "state-trail-head";
            var title = document.createElement("strong");
            title.textContent = humanDate(entry.date);
            var chips = document.createElement("span");
            chips.className = "state-trail-chips";
            chips.textContent = trackerSummaryBits(entry.tracker).join(" · ") || "Check-in saved";
            head.appendChild(title);
            head.appendChild(chips);
            item.appendChild(head);

            if (entry.tracker && entry.tracker.context) {
              var context = document.createElement("p");
              context.className = "state-trail-context";
              context.textContent = entry.tracker.context;
              item.appendChild(context);
            }

            item.addEventListener("click", function () {
              setActiveView("journalView");
              selectJournalDate(entry.date);
            });
            elements.energyTrailList.appendChild(item);
          });
        }

        if (pattern && pattern.lowEnergyDays >= 2) {
          elements.energyPatternNote.textContent = "Low-energy check-ins have recently followed evenings averaging "
            + (Math.round((Number(pattern.lowEnergyPreviousEveningHours) || 0) * 10) / 10)
            + "h, compared with "
            + (Math.round((Number(pattern.otherPreviousEveningHours) || 0) * 10) / 10)
            + "h before steadier days.";
        } else {
          elements.energyPatternNote.textContent = "Once a few rough days are logged, this will compare what tended to come before them.";
        }
      }

      function renderPatternHistoryDialog() {
        if (!patternHistory || !elements.patternHistoryBody || !elements.patternHistoryRange) {
          return;
        }
        var bundle = currentInsightBundleState || currentInsightBundle();
        var model = patternHistory.buildPatternHistoryModel({
          insights: bundle && bundle.insights,
          metrics: bundle && bundle.metrics,
          currentDateKey: formatDate(today),
          lookbackDays: INSIGHT_LOOKBACK_DAYS
        });

        elements.patternHistoryRange.textContent = model.rangeLabel;
        elements.patternHistoryBody.innerHTML = "";

        if (model.isEmpty) {
          var empty = document.createElement("p");
          empty.className = "pattern-history-empty";
          empty.textContent = "There is not enough stable pattern evidence yet. Keep logging normally and this will fill in.";
          elements.patternHistoryBody.appendChild(empty);
          return;
        }

        model.groups.forEach(function (group) {
          var section = document.createElement("section");
          section.className = "pattern-history-group";

          var title = document.createElement("h3");
          title.className = "pattern-history-group-title";
          title.textContent = group.title;
          section.appendChild(title);

          group.items.forEach(function (item) {
            var card = document.createElement("article");
            card.className = "pattern-history-item";

            var head = document.createElement("div");
            head.className = "pattern-history-item-head";
            var heading = document.createElement("strong");
            heading.textContent = item.title;
            var meta = document.createElement("span");
            meta.className = "pattern-history-meta";
            meta.textContent = item.sampleSize + " days";
            head.appendChild(heading);
            head.appendChild(meta);
            card.appendChild(head);

            var summary = document.createElement("p");
            summary.className = "pattern-history-summary";
            summary.textContent = item.summary;
            card.appendChild(summary);

            if (item.actions && item.actions.length) {
              var actionRow = document.createElement("div");
              actionRow.className = "insight-actions";
              item.actions.forEach(function (action) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "insight-action";
                button.textContent = action.label;
                button.addEventListener("click", function () {
                  applyInsightAction(action.id);
                });
                actionRow.appendChild(button);
              });
              card.appendChild(actionRow);
            }

            if (item.evidence && item.evidence.length) {
              var details = document.createElement("details");
              details.className = "pattern-history-evidence";
              var detailsSummary = document.createElement("summary");
              detailsSummary.textContent = "Show evidence";
              details.appendChild(detailsSummary);
              var list = document.createElement("ul");
              item.evidence.forEach(function (line) {
                var row = document.createElement("li");
                row.textContent = line;
                list.appendChild(row);
              });
              details.appendChild(list);
              card.appendChild(details);
            }

            section.appendChild(card);
          });

          elements.patternHistoryBody.appendChild(section);
        });
      }

      function openPatternHistoryDialog() {
        if (!elements.patternHistoryDialog || typeof elements.patternHistoryDialog.showModal !== "function") {
          return;
        }
        renderPatternHistoryDialog();
        elements.patternHistoryDialog.showModal();
      }

      function syncSessionTimeToTodayTask(activityId, durationHours) {
        var tasks = getTodayTasks();
        if (!skateSessionCore || typeof skateSessionCore.applySessionDurationToTasks !== "function") {
          return null;
        }
        var result = skateSessionCore.applySessionDurationToTasks(tasks, activityId, durationHours, Date.now());
        if (!result.linkedTaskLabel) {
          return null;
        }
        saveTodayTasks(result.tasks);
        renderTasks();
        renderTotals();
        return result.linkedTaskLabel;
      }

      function formatMoney(centsValue) {
        if (moneyCore && typeof moneyCore.formatCents === "function") {
          return moneyCore.formatCents(centsValue);
        }
        return "EUR " + (Math.round((Number(centsValue) || 0)) / 100).toFixed(2);
      }

      function getMoneySettings() {
        var stored = readJson(STORAGE.moneySettings, null);
        if (moneyCore && typeof moneyCore.normalizeSettings === "function") {
          return moneyCore.normalizeSettings(stored);
        }
        return stored || { monthlyTargetCents: 130000, categories: [], transfers: [] };
      }

      function saveMoneySettings(settings) {
        writeJson(STORAGE.moneySettings, settings);
      }

      function getMoneyTransactions() {
        var stored = readJson(STORAGE.moneyTransactions, []);
        if (moneyCore && typeof moneyCore.normalizeTransactions === "function") {
          return moneyCore.normalizeTransactions(stored);
        }
        return Array.isArray(stored) ? stored : [];
      }

      function saveMoneyTransactions(transactions) {
        writeJson(STORAGE.moneyTransactions, transactions);
      }

      function getMoneyVendorRules() {
        var stored = readJson(STORAGE.moneyVendorRules, null);
        if (moneyCore && typeof moneyCore.normalizeVendorRules === "function") {
          return moneyCore.normalizeVendorRules(stored);
        }
        return Array.isArray(stored) ? stored : [];
      }

      function saveMoneyVendorRules(rules) {
        writeJson(STORAGE.moneyVendorRules, rules);
      }

      function getMoneyState() {
        if (!moneyCore || typeof moneyCore.calculateState !== "function") {
          return null;
        }
        return moneyCore.calculateState({
          settings: getMoneySettings(),
          transactions: getMoneyTransactions(),
          referenceDate: today
        });
      }

      function moneyCategoryById(categoryId) {
        return getMoneySettings().categories.find(function (category) {
          return category.id === categoryId;
        }) || null;
      }

      function moneyCategoryName(categoryId) {
        var category = moneyCategoryById(categoryId);
        return category ? category.name : "Other";
      }

      function moneyFlexCategories() {
        return getMoneySettings().categories.filter(function (category) {
          return category.kind === "flex";
        });
      }

      function orderMoneyCategories(categories, preferredOrder) {
        var orderMap = {};
        preferredOrder.forEach(function (id, index) {
          orderMap[id] = index;
        });
        return categories.slice().sort(function (a, b) {
          var aRank = Object.prototype.hasOwnProperty.call(orderMap, a.id) ? orderMap[a.id] : Number.MAX_SAFE_INTEGER;
          var bRank = Object.prototype.hasOwnProperty.call(orderMap, b.id) ? orderMap[b.id] : Number.MAX_SAFE_INTEGER;
          return aRank - bRank || a.name.localeCompare(b.name);
        });
      }

      function moneyQuickShortcutCategories(state) {
        var categories = (state && Array.isArray(state.categories) ? state.categories : []).filter(function (category) {
          return moneyQuickShortcutOrder.indexOf(category.id) !== -1;
        });
        return orderMoneyCategories(categories, moneyQuickShortcutOrder).slice(0, 4);
      }

      function updateMoneyCategorySetting(categoryId, key, value) {
        updateMoneySettings(function (nextSettings) {
          var found = false;
          nextSettings.categories = nextSettings.categories.map(function (item) {
            if (item.id !== categoryId) {
              return item;
            }
            found = true;
            item[key] = value;
            return item;
          });
          if (!found) {
            nextSettings.categories.push({
              id: categoryId,
              kind: "flex",
              budgetCents: 0,
              weeklyBudgetCents: 0,
              protected: false,
              [key]: value
            });
          }
        });
      }

      function createMoneyBudgetField(category, key, labelText, value) {
        var field = document.createElement("label");
        field.className = "money-budget-field";
        field.innerHTML = "<span>" + labelText + "</span>";

        var input = document.createElement("input");
        input.value = value;
        input.setAttribute("inputmode", "decimal");
        input.setAttribute("placeholder", labelText);
        input.setAttribute("aria-label", category.name + " " + labelText.toLowerCase());
        input.title = labelText;
        input.addEventListener("change", function () {
          var nextValue = moneyCore.parseAmountToCents(input.value);
          if (nextValue == null) {
            renderMoney();
            return;
          }
          if (key === "budgetCents" && moneyCore && typeof moneyCore.deriveWeeklyBudgetCents === "function") {
            var derivedWeeklyBudget = moneyCore.deriveWeeklyBudgetCents(nextValue, today);
            updateMoneyCategorySetting(category.id, "budgetCents", nextValue);
            updateMoneyCategorySetting(category.id, "weeklyBudgetCents", derivedWeeklyBudget);
            return;
          }
          updateMoneyCategorySetting(category.id, key, nextValue);
        });

        field.appendChild(input);
        return field;
      }

      function syncMoneyCategoryInputs() {
        var categories = getMoneySettings().categories.slice();
        var orderedQuickCategories = orderMoneyCategories(categories, moneyQuickCategoryOrder);
        var quickValue = elements.moneyQuickCategory ? elements.moneyQuickCategory.value : "";
        var transferFromValue = elements.moneyTransferFrom ? elements.moneyTransferFrom.value : "";
        var transferToValue = elements.moneyTransferTo ? elements.moneyTransferTo.value : "";
        var flexCategories = categories.filter(function (category) {
          return category.kind === "flex";
        });
        var moneyBudgetCard = elements.moneyCategoryBudgetList
          ? elements.moneyCategoryBudgetList.closest(".money-budget-card")
          : null;
        var moneyBudgetOwned = moneyBudgetCard && moneyBudgetCard.dataset.reactOwned === "true";

        var moneyQuickCard = elements.moneyQuickCategory
          ? elements.moneyQuickCategory.closest(".money-quick-card")
          : null;
        var moneyQuickOwned = moneyQuickCard && moneyQuickCard.dataset.reactOwned === "true";
        if (elements.moneyQuickCategory && !moneyQuickOwned) {
          elements.moneyQuickCategory.innerHTML = "";
          orderedQuickCategories.forEach(function (category) {
            var option = document.createElement("option");
            option.value = category.id;
            option.textContent = category.name;
            elements.moneyQuickCategory.appendChild(option);
          });
          if (quickValue) {
            elements.moneyQuickCategory.value = quickValue;
          }
          if (!elements.moneyQuickCategory.value && orderedQuickCategories[0]) {
            elements.moneyQuickCategory.value = orderedQuickCategories[0].id;
          }
        }

        [elements.moneyTransferFrom, elements.moneyTransferTo].forEach(function (select, index) {
          if (!select || moneyBudgetOwned) {
            return;
          }
          var previousValue = index === 0 ? transferFromValue : transferToValue;
          select.innerHTML = "";
          flexCategories.forEach(function (category) {
            var option = document.createElement("option");
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
          });
          if (previousValue) {
            select.value = previousValue;
          }
        });
      }

      function updateMoneySettings(mutator) {
        var settings = getMoneySettings();
        mutator(settings);
        if (moneyCore && typeof moneyCore.normalizeSettings === "function") {
          settings = moneyCore.normalizeSettings(settings);
        }
        saveMoneySettings(settings);
        renderMoney();
      }

      function upsertMoneyVendorRule(vendor, categoryId) {
        var normalizedVendor = String(vendor || "").trim().toLowerCase();
        if (!normalizedVendor || !categoryId) {
          return;
        }
        var rules = getMoneyVendorRules();
        var existing = rules.find(function (rule) {
          return rule.match === normalizedVendor;
        });
        if (existing) {
          existing.categoryId = categoryId;
        } else {
          rules.unshift({
            id: moneyCore && typeof moneyCore.makeId === "function" ? moneyCore.makeId("vendor") : makeId("vendor"),
            match: normalizedVendor,
            categoryId: categoryId
          });
        }
        saveMoneyVendorRules(rules);
      }

      function applyMoneyVendorCategorySuggestion() {
        if (!elements.moneyQuickVendor || !elements.moneyQuickCategory || !moneyCore) {
          return;
        }
        var suggestedCategory = moneyCore.categorizeVendor(elements.moneyQuickVendor.value, getMoneyVendorRules());
        if (suggestedCategory) {
          elements.moneyQuickCategory.value = suggestedCategory;
        }
      }

      function moneyImpactMessage(beforeState, afterState, transaction) {
        var category = afterState.categories.find(function (item) {
          return item.id === transaction.categoryId;
        });
        var changeWeek = (beforeState ? beforeState.month.availableWeekCents : 0) - afterState.month.availableWeekCents;
        var intro = "Saved " + formatMoney(transaction.amountCents) + " to " + moneyCategoryName(transaction.categoryId) + ".";
        var pace = " This week now has " + formatMoney(afterState.month.availableWeekCents) + " left and this month has " + formatMoney(afterState.month.remainingCents) + " left.";
        var categoryLine = category
          ? " " + category.name + " now has " + formatMoney(category.remainingCents) + " left this month and about " + formatMoney(category.weeklyBudgetCents) + " for the week."
          : "";
        if (changeWeek <= 0) {
          return intro + categoryLine;
        }
        return intro + " This week's remaining changed by " + formatMoney(changeWeek) + "." + categoryLine + pace;
      }

      function addMoneyTransaction(event) {
        event.preventDefault();
        if (!moneyCore) {
          return;
        }
        var amountCents = moneyCore.parseAmountToCents(elements.moneyQuickAmount.value);
        var categoryId = elements.moneyQuickCategory.value;
        var vendor = elements.moneyQuickVendor.value.trim();
        if (!amountCents || amountCents <= 0) {
          elements.moneyQuickImpact.textContent = "Add a valid amount before saving.";
          elements.moneyQuickAmount.focus();
          return;
        }
        if (!categoryId) {
          elements.moneyQuickImpact.textContent = "Choose a category before saving.";
          elements.moneyQuickCategory.focus();
          return;
        }

        var beforeState = getMoneyState();
        var transactions = getMoneyTransactions();
        var transaction = {
          id: moneyCore.makeId("txn"),
          date: formatDate(today),
          amountCents: amountCents,
          categoryId: categoryId,
          vendor: vendor,
          note: "",
          createdAt: new Date().toISOString()
        };
        transactions.unshift(transaction);
        saveMoneyTransactions(transactions);
        logActivity({
          action: "money_transaction_created",
          entityType: "money_transaction",
          entityId: transaction.id,
          dateKey: transaction.date,
          before: null,
          after: transaction,
          meta: {
            amountCents: transaction.amountCents,
            categoryId: transaction.categoryId
          }
        });
        upsertMoneyVendorRule(vendor, categoryId);
        var afterState = getMoneyState();
        moneyLastImpactMessage = moneyImpactMessage(beforeState, afterState, transaction);
        elements.moneyQuickAmount.value = "";
        elements.moneyQuickVendor.value = "";
        renderMoney();
        elements.moneyQuickAmount.focus();
      }

      function addMoneyTransfer(event) {
        event.preventDefault();
        if (!moneyCore) {
          return;
        }
        var amountCents = moneyCore.parseAmountToCents(elements.moneyTransferAmount.value);
        var fromCategoryId = elements.moneyTransferFrom.value;
        var toCategoryId = elements.moneyTransferTo.value;
        if (!amountCents || amountCents <= 0 || !fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) {
          return;
        }
        updateMoneySettings(function (settings) {
          settings.transfers = Array.isArray(settings.transfers) ? settings.transfers : [];
          settings.transfers.unshift({
            id: moneyCore.makeId("transfer"),
            fromCategoryId: fromCategoryId,
            toCategoryId: toCategoryId,
            amountCents: amountCents,
            note: "",
            createdAt: new Date().toISOString()
          });
        });
        elements.moneyTransferAmount.value = "";
      }

      function deleteMoneyTransfer(transferId) {
        updateMoneySettings(function (settings) {
          settings.transfers = (Array.isArray(settings.transfers) ? settings.transfers : []).filter(function (transfer) {
            return transfer.id !== transferId;
          });
        });
      }

      function renderMoneyQuickSummary(state) {
        if (!elements.moneyQuickSummary || !state) {
          return;
        }
        var items = [
          { label: "Remaining this week", value: state.month.availableWeekCents },
          { label: "Remaining this month", value: state.month.flexibleRemainingCents }
        ];
        elements.moneyQuickSummary.innerHTML = "";
        items.forEach(function (item) {
          var card = document.createElement("div");
          card.className = "money-mini-stat" + (item.value < 0 ? " is-negative" : "");
          card.innerHTML = "<span>" + item.label + "</span><strong>" + formatMoney(item.value) + "</strong>";
          elements.moneyQuickSummary.appendChild(card);
        });
        if (elements.moneyPaceBadge) {
          elements.moneyPaceBadge.textContent = state.month.paceDeltaCents > 0 ? "Above pace" : "On pace";
        }
        if (elements.moneyQuickImpact) {
          elements.moneyQuickImpact.textContent = moneyLastImpactMessage;
        }
      }

      function renderMoneyQuickShortcuts(state) {
        if (!elements.moneyQuickShortcuts || !state) {
          return;
        }
        elements.moneyQuickShortcuts.innerHTML = "";
        moneyQuickShortcutCategories(state).forEach(function (category) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "money-shortcut";
          button.innerHTML = "<strong>" + category.name + "</strong><span>" + formatMoney(category.weeklyBudgetCents || category.budgetCents) + " / week</span>";
          button.addEventListener("click", function () {
            if (elements.moneyQuickCategory) {
              elements.moneyQuickCategory.value = category.id;
            }
            if (elements.moneyQuickAmount) {
              elements.moneyQuickAmount.focus();
            }
          });
          elements.moneyQuickShortcuts.appendChild(button);
        });
      }

      function renderMoneyOverview(state) {
        if (!elements.moneyOverviewGrid || !state) {
          return;
        }
        var overviewCard = elements.moneyOverviewGrid.closest(".money-overview-card");
        if (overviewCard && overviewCard.dataset.reactOwned === "true") {
          return;
        }
        var items = [
          { label: "Remaining this week", value: state.month.availableWeekCents, note: state.currentWeek.start + " to " + state.currentWeek.end },
          { label: "Flexible money left", value: state.month.flexibleRemainingCents, note: "Adjustable spending." }
        ];
        elements.moneyOverviewGrid.innerHTML = "";
        items.forEach(function (item) {
          var card = document.createElement("div");
          card.className = "money-mini-stat" + (item.value < 0 ? " is-negative" : "");
          card.innerHTML = "<span>" + item.label + "</span><strong>" + formatMoney(item.value) + "</strong><span>" + item.note + "</span>";
          elements.moneyOverviewGrid.appendChild(card);
        });
        if (elements.moneyMonthLabel) {
          elements.moneyMonthLabel.textContent = monthNames[today.getMonth()] + " " + today.getFullYear();
        }
      }

      function renderMoneyBudgetEditor(state) {
        if (!elements.moneyCategoryBudgetList || !state) {
          return;
        }
        var budgetCard = elements.moneyCategoryBudgetList.closest(".money-budget-card");
        if (budgetCard && budgetCard.dataset.reactOwned === "true") {
          return;
        }
        if (elements.moneyMonthlyTarget) {
          elements.moneyMonthlyTarget.value = (state.month.targetCents / 100).toFixed(2).replace(/\.00$/, "");
        }
        var wrapper = document.createElement("div");
        wrapper.className = "money-budget-list";
        var sections = [
          {
            key: "fixed",
            title: "Fixed",
            note: "Protected baseline.",
            categories: state.categories.filter(function (category) { return category.kind === "fixed"; })
          },
          {
            key: "flexible",
            title: "Flexible",
            note: "Weekly pace.",
            categories: state.categories.filter(function (category) { return category.kind !== "fixed"; })
          }
        ];

        sections.forEach(function (section) {
          var sectionCard = document.createElement("details");
          sectionCard.className = "money-budget-section";
          sectionCard.open = !!moneyBudgetSectionState[section.key];
          sectionCard.addEventListener("toggle", function () {
            moneyBudgetSectionState[section.key] = sectionCard.open;
          });
          sectionCard.innerHTML = "<summary class=\"money-budget-section-head\"><strong>" + section.title + "</strong><span>" + section.note + " · " + section.categories.length + "</span></summary>";
          var grid = document.createElement("div");
          grid.className = "money-budget-grid";

          section.categories.forEach(function (category) {
          var row = document.createElement("div");
          row.className = "money-budget-row money-budget-row-" + category.kind + (category.remainingCents < 0 ? " is-negative" : "");

          var head = document.createElement("div");
          head.className = "money-budget-head";
          head.innerHTML = [
            "<div class=\"money-budget-title-block\">",
            "<strong>", category.name, "</strong>",
            "<span class=\"money-budget-kind\">", (category.kind === "fixed" ? "Fixed" : "Flex"), "</span>",
            "</div>",
            "<div class=\"money-budget-summary\">",
            "<span>Spent ", formatMoney(category.spentCents), "</span>",
            "<strong>", formatMoney(category.remainingCents), " left</strong>",
            "</div>"
          ].join("");

          var inputs = document.createElement("div");
          inputs.className = "money-budget-inputs";
          inputs.appendChild(createMoneyBudgetField(
            category,
            "budgetCents",
            "Month",
            (category.budgetCents / 100).toFixed(2).replace(/\.00$/, "")
          ));
          inputs.appendChild(createMoneyBudgetField(
            category,
            "weeklyBudgetCents",
            "Week",
            (category.weeklyBudgetCents / 100).toFixed(2).replace(/\.00$/, "")
          ));

          var metrics = document.createElement("div");
          metrics.className = "money-budget-metrics";
          metrics.innerHTML = "<span class=\"money-budget-pace\">Guide " + formatMoney(category.weeklyBudgetCents) + " / week</span>";

          row.appendChild(head);
          row.appendChild(inputs);
          row.appendChild(metrics);
          grid.appendChild(row);
          });

          sectionCard.appendChild(grid);
          wrapper.appendChild(sectionCard);
        });

        elements.moneyCategoryBudgetList.innerHTML = "";
        elements.moneyCategoryBudgetList.appendChild(wrapper);
      }

      function renderMoneyTransfers() {
        if (!elements.moneyTransferList) {
          return;
        }
        var budgetCard = elements.moneyTransferList.closest(".money-budget-card");
        if (budgetCard && budgetCard.dataset.reactOwned === "true") {
          return;
        }
        var settings = getMoneySettings();
        elements.moneyTransferList.innerHTML = "";
        (settings.transfers || []).forEach(function (transfer) {
          var row = document.createElement("div");
          row.className = "money-transfer-row";
          row.innerHTML = "<strong>" + moneyCategoryName(transfer.toCategoryId) + "</strong><span>" + formatMoney(transfer.amountCents) + " moved from " + moneyCategoryName(transfer.fromCategoryId) + "</span>";
          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "secondary-button";
          remove.textContent = "Delete";
          remove.addEventListener("click", function () {
            deleteMoneyTransfer(transfer.id);
          });
          row.appendChild(remove);
          elements.moneyTransferList.appendChild(row);
        });
      }

      function appendMoneyBarChart(container, title, rows, formatter) {
        var card = document.createElement("div");
        card.className = "mini-chart money-chart-card";
        var heading = document.createElement("strong");
        heading.className = "chart-title";
        heading.textContent = title;
        card.appendChild(heading);
        var list = document.createElement("div");
        list.className = "money-bar-list";
        var maxValue = rows.reduce(function (max, row) {
          return Math.max(max, row.value);
        }, 0) || 1;
        rows.forEach(function (row) {
          var item = document.createElement("div");
          item.className = "money-bar-row";
          item.innerHTML = "<div class=\"money-bar-head\"><span>" + row.label + "</span><span>" + formatter(row.value) + "</span></div>";
          var track = document.createElement("div");
          track.className = "money-bar-track";
          var fill = document.createElement("span");
          var widthPercent = typeof row.fillPercent === "number"
            ? Math.max(0, Math.min(100, row.fillPercent))
            : Math.max(4, Math.round((row.value / maxValue) * 100));
          fill.style.width = widthPercent + "%";
          track.appendChild(fill);
          item.appendChild(track);
          list.appendChild(item);
        });
        card.appendChild(list);
        container.appendChild(card);
      }

      function appendMoneyBarChartDropdown(container, title, rows, formatter, options) {
        options = options || {};
        var details = document.createElement("details");
        details.className = "mini-chart money-chart-card money-chart-dropdown";

        var summary = document.createElement("summary");
        summary.className = "money-chart-summary";
        summary.innerHTML = "<strong class=\"chart-title\">" + title + "</strong><span>" + (options.summaryText || "Show") + "</span>";
        details.appendChild(summary);

        var limitedRows = rows.slice(0, options.maxRows || 12);
        var list = document.createElement("div");
        list.className = "money-bar-list";
        var maxValue = limitedRows.reduce(function (max, row) {
          return Math.max(max, row.value);
        }, 0) || 1;

        limitedRows.forEach(function (row) {
          var item = document.createElement("div");
          item.className = "money-bar-row";
          item.innerHTML = "<div class=\"money-bar-head\"><span>" + row.label + "</span><span>" + formatter(row.value) + "</span></div>";
          var track = document.createElement("div");
          track.className = "money-bar-track";
          var fill = document.createElement("span");
          fill.style.width = Math.max(4, Math.round((row.value / maxValue) * 100)) + "%";
          track.appendChild(fill);
          item.appendChild(track);
          list.appendChild(item);
        });

        details.appendChild(list);
        container.appendChild(details);
      }

      function appendMoneyProgressCard(container, title, spentCents, budgetCents, options) {
        options = options || {};
        var remainingCents = budgetCents - spentCents;
        var usedPercent = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;
        var card = document.createElement("div");
        card.className = "mini-chart money-chart-card money-progress-card" + (remainingCents < 0 ? " is-negative" : "");
        card.innerHTML = [
          "<strong class=\"chart-title\">", title, "</strong>",
          "<div class=\"money-progress-copy\">",
          "<span>", formatMoney(spentCents), " spent of ", formatMoney(budgetCents), "</span>",
          "<span>", formatMoney(remainingCents), " remaining</span>",
          "<span>", usedPercent, "% used</span>",
          "</div>"
        ].join("");
        var track = document.createElement("div");
        track.className = "money-progress-track";
        var fill = document.createElement("span");
        fill.style.width = Math.max(4, Math.min(100, usedPercent)) + "%";
        track.appendChild(fill);
        card.appendChild(track);

        if (options.estimatedTotalCents != null) {
          var estimateWrap = document.createElement("div");
          estimateWrap.className = "money-estimate-block";
          estimateWrap.innerHTML = [
            "<div class=\"money-bar-head\"><span>Estimated spending</span><span>",
            formatMoney(options.estimatedTotalCents),
            "</span></div>"
          ].join("");
          var estimateTrack = document.createElement("div");
          estimateTrack.className = "money-bar-track";
          var estimateFill = document.createElement("span");
          var estimatePercent = budgetCents > 0 ? Math.round((options.estimatedTotalCents / budgetCents) * 100) : 0;
          estimateFill.style.width = Math.max(4, Math.min(100, estimatePercent)) + "%";
          estimateTrack.appendChild(estimateFill);
          estimateWrap.appendChild(estimateTrack);
          card.appendChild(estimateWrap);
        }

        container.appendChild(card);
      }

      function renderMoneyProgress(state) {
        if (!elements.moneyProgressList || !state) {
          return;
        }
        var pacingCard = elements.moneyProgressList.closest(".money-pacing-card");
        if (pacingCard && pacingCard.dataset.reactOwned === "true") {
          return;
        }
        elements.moneyProgressList.innerHTML = "";
        appendMoneyProgressCard(
          elements.moneyProgressList,
          "Monthly spending",
          state.month.spentCents,
          state.month.targetCents,
          { estimatedTotalCents: state.month.projectedTotalCents }
        );
        appendMoneyProgressCard(
          elements.moneyProgressList,
          "Flexible spending",
          state.month.flexibleSpentCents,
          state.month.flexibleBudgetCents
        );
      }

      function renderMoneyCharts(state) {
        if (!elements.moneyCharts || !state) {
          return;
        }
        var pacingCard = elements.moneyCharts.closest(".money-pacing-card");
        if (pacingCard && pacingCard.dataset.reactOwned === "true") {
          return;
        }
        elements.moneyCharts.innerHTML = "";
        appendMoneyBarChart(elements.moneyCharts, "Remaining by category", state.categories.filter(function (category) {
          return category.kind === "flex";
        }).slice().sort(function (a, b) {
          return a.name.localeCompare(b.name);
        }).map(function (category) {
          var spentPercent = category.budgetCents > 0
            ? Math.round((category.spentCents / category.budgetCents) * 100)
            : (category.spentCents > 0 ? 100 : 0);
          return {
            label: category.name,
            value: Math.max(0, category.remainingCents),
            fillPercent: spentPercent
          };
        }), formatMoney);
        appendMoneyBarChartDropdown(elements.moneyCharts, "Monthly spending over time", state.month.monthlyTotalsRows.slice().reverse().map(function (row) {
          return {
            label: row.label,
            value: row.spentCents
          };
        }), formatMoney, {
          summaryText: "Show up to 12 months",
          maxRows: 12
        });
      }

      function renderMoneyVendors(state) {
        if (!elements.moneyVendorList || !state) {
          return;
        }
        var vendorsCard = elements.moneyVendorList.closest(".money-vendors-card");
        if (vendorsCard && vendorsCard.dataset.reactOwned === "true") {
          return;
        }
        var wrapper = document.createElement("div");
        wrapper.className = "money-vendor-list";
        var topVendors = state.vendors.slice(0, 8);
        if (!topVendors.length) {
          wrapper.innerHTML = "<div class=\"money-vendor-row\"><strong>No vendors yet</strong><span>Transactions with vendor names will build this automatically.</span></div>";
        }
        topVendors.forEach(function (vendor) {
          var row = document.createElement("div");
          row.className = "money-vendor-row";
          row.innerHTML = [
            "<div class=\"money-vendor-head\"><strong>", vendor.vendor, "</strong><span>",
            moneyCategoryName(vendor.topCategoryId),
            " · ", vendor.count, " visits · avg ", formatMoney(vendor.averageCents),
            "</span></div>",
            "<div class=\"money-vendor-metrics\"><strong>", formatMoney(vendor.spentCents), "</strong><span>Prev month ",
            formatMoney(vendor.previousMonthSpentCents), "</span></div>"
          ].join("");
          wrapper.appendChild(row);
        });
        elements.moneyVendorList.innerHTML = "";
        elements.moneyVendorList.appendChild(wrapper);
      }

      function renderMoneyRecentActivity(state) {
        if (!elements.moneyRecentActivity || !state) {
          return;
        }
        var activityCard = elements.moneyRecentActivity.closest(".money-activity-card");
        if (activityCard && activityCard.dataset.reactOwned === "true") {
          return;
        }
        elements.moneyRecentActivity.innerHTML = "";
        var recentTransactions = state.transactions.slice(0, 8);
        if (!recentTransactions.length) {
          elements.moneyRecentActivity.innerHTML = "<div class=\"money-vendor-row\"><strong>No activity yet</strong><span>Your latest spending will show up here.</span></div>";
          return;
        }
        recentTransactions.forEach(function (entry) {
          var row = document.createElement("div");
          row.className = "money-vendor-row";
          row.innerHTML = [
            "<div class=\"money-vendor-head\"><strong>", moneyCategoryName(entry.categoryId), "</strong><span>",
            entry.vendor || "No vendor", " · ", entry.date,
            "</span></div>",
            "<div class=\"money-vendor-metrics\"><strong>", formatMoney(entry.amountCents), "</strong><span>",
            moneyCategoryName(entry.categoryId), "</span></div>"
          ].join("");
          elements.moneyRecentActivity.appendChild(row);
        });
      }

      function renderMoneyPage() {
        var state = getMoneyState();
        if (!state) {
          return;
        }
        renderMoneyOverview(state);
        renderMoneyProgress(state);
        renderMoneyBudgetEditor(state);
        renderMoneyTransfers();
        renderMoneyCharts(state);
        renderMoneyVendors(state);
        renderMoneyRecentActivity(state);
      }

      function renderMoneyDashboard() {
        var state = getMoneyState();
        if (!state) {
          return;
        }
        syncMoneyCategoryInputs();
        var moneyQuickCard = elements.moneyQuickForm
          ? elements.moneyQuickForm.closest(".money-quick-card")
          : null;
        if (moneyQuickCard && moneyQuickCard.dataset.reactOwned === "true") {
          return;
        }
        renderMoneyQuickSummary(state);
        renderMoneyQuickShortcuts(state);
      }

      function renderMoney() {
        renderMoneyDashboard();
        renderMoneyPage();
      }

      function renderActivities() {
        if (!elements.taskActivity) {
          return;
        }
        elements.taskActivity.innerHTML = "";
        activities.forEach(function (activity) {
          var option = document.createElement("option");
          option.value = activity.id;
          option.textContent = activity.label;
          elements.taskActivity.appendChild(option);
        });
        elements.taskActivity.value = "other";
      }

      // Today's tasks are editable and saved by exact date.
      function renderTasks() {
        if (!elements.todaySubtitle || !elements.weekKeyLabel || !elements.dayMessage || !elements.tasksMount || !elements.progressText) {
          return;
        }
        var todayKey = formatDate(today);
        var tasks = getTodayTasks();
        var agentUiState = getAgentUiState();
        var hiddenTaskIds = Array.isArray(agentUiState.hiddenTaskIdsByDate[todayKey]) ? agentUiState.hiddenTaskIdsByDate[todayKey] : [];
        var showHidden = Boolean(expandedHiddenTaskDates[todayKey]);
        var visibleTasks = showHidden ? tasks.slice() : tasks.filter(function (task) {
          return hiddenTaskIds.indexOf(task.id) === -1;
        });
        var doneCount = tasks.filter(function (task) {
          return Boolean(task.done);
        }).length;
        var dashboardDate = document.getElementById("dashboardDate");

        renderDayStateOptions();
        elements.todaySubtitle.textContent = "A soft little map for the shape of your day.";
        if (dashboardDate) {
          dashboardDate.textContent = humanDate(todayKey);
        }
        elements.weekKeyLabel.textContent = "Live plan for " + todayKey;
        elements.dayMessage.textContent = "Tasks from your calendar and planner.";
        elements.tasksMount.innerHTML = "";

        if (tasks.length === 0) {
          elements.tasksMount.innerHTML = [
            '<p class="empty">',
            "Clear day. Add only what actually matters today.",
            "</p>"
          ].join("");
          elements.progressText.textContent = "0 / 0 tasks done today";
          renderDashboardInsight();
          return;
        }
        var list = document.createElement("ul");
        list.className = "task-list";

        if (hiddenTaskIds.length) {
          var hiddenBanner = document.createElement("div");
          hiddenBanner.className = "agent-focus-banner";
          hiddenBanner.innerHTML = "<strong>Focus mode is on.</strong><span>" + hiddenTaskIds.length + " tasks are hidden to lower the noise.</span>";
          var hiddenActions = document.createElement("div");
          hiddenActions.className = "agent-focus-actions";
          var toggleHidden = document.createElement("button");
          toggleHidden.type = "button";
          toggleHidden.className = "secondary-button";
          toggleHidden.textContent = showHidden ? "Hide extra tasks" : "Show hidden tasks";
          toggleHidden.addEventListener("click", function () {
            expandedHiddenTaskDates[todayKey] = !showHidden;
            renderTasks();
          });
          var undoButton = document.createElement("button");
          undoButton.type = "button";
          undoButton.className = "secondary-button";
          undoButton.textContent = "Undo last agent change";
          undoButton.addEventListener("click", function () {
            var undone = undoLastAgentAction();
            if (undone) {
              appendMascotMessage("assistant", "Undid \"" + undone.actionLabel + "\".", [], {
                source: "action"
              });
              renderMascotChatLog();
            }
          });
          hiddenActions.appendChild(toggleHidden);
          hiddenActions.appendChild(undoButton);
          hiddenBanner.appendChild(hiddenActions);
          elements.tasksMount.appendChild(hiddenBanner);
        }

        visibleTasks.forEach(function (task) {
          var index = tasks.findIndex(function (item) {
            return item.id === task.id;
          });
          var activity = getActivity(task.activity);
          var tracksTime = taskActivityTracksTime(task.activity);
          var item = document.createElement("li");
          item.className = "task";

          var card = document.createElement("div");
          card.className = "task-card " + activity.className;
          if (task.done) {
            card.classList.add("done");
          }
          if (editingTaskId === task.id) {
            card.classList.add("is-editing");
          }

          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "task-check";
          checkbox.id = "task-" + task.id;
          checkbox.checked = Boolean(task.done);

          var content = document.createElement("div");
          content.className = "task-content";
          content.tabIndex = 0;

          if (editingTaskId === task.id) {
            renderTaskEditor(content, tasks, index);
          } else {
            var titleButton = document.createElement("button");
            titleButton.type = "button";
            titleButton.className = "task-title-button";
            titleButton.addEventListener("click", function () {
              editingTaskId = task.id;
              renderTasks();
            });

            var label = document.createElement("span");
            label.className = "task-title";
            label.textContent = taskDisplayLabel(task);

            titleButton.appendChild(label);
            content.appendChild(titleButton);

            var badge = document.createElement("span");
            badge.className = "activity-badge " + activity.className;
            badge.textContent = activity.short;
            content.appendChild(badge);
          }

          var hoursWrap = document.createElement("div");
          hoursWrap.className = "task-hours";
          if (!tracksTime) {
            hoursWrap.classList.add("is-passive");
          }

          var hoursLabel = document.createElement("label");
          hoursLabel.setAttribute("for", "task-hours-" + task.id);
          hoursLabel.textContent = "Hours";

          var hoursInput = document.createElement("input");
          hoursInput.id = "task-hours-" + task.id;
          hoursInput.type = "number";
          hoursInput.min = "0";
          hoursInput.max = "24";
          hoursInput.step = "0.01";
          hoursInput.inputMode = "decimal";
          hoursInput.value = effectiveTaskHours(task) ? String(effectiveTaskHours(task)) : "";
          hoursInput.placeholder = "0";
          hoursInput.hidden = !tracksTime;

          var timerReadout = document.createElement("span");
          timerReadout.className = "timer-readout";
          timerReadout.dataset.timerId = task.id;
          timerReadout.textContent = formatTimer(elapsedTaskSeconds(task));
          timerReadout.hidden = !tracksTime;

          var timerControls = document.createElement("div");
          timerControls.className = "timer-controls";
          timerControls.hidden = !tracksTime;

          var startPauseButton = document.createElement("button");
          startPauseButton.className = "timer-button";
          startPauseButton.type = "button";
          startPauseButton.textContent = task.timerStartedAt ? "Pause" : "Start";

          var endButton = document.createElement("button");
          endButton.className = "timer-button end";
          endButton.type = "button";
          endButton.textContent = "End";

          var deleteButton = document.createElement("button");
          deleteButton.className = "task-delete";
          deleteButton.type = "button";
          deleteButton.setAttribute("aria-label", "Delete " + task.label);
          deleteButton.textContent = "×";

          checkbox.addEventListener("change", function () {
            var beforeDone = Boolean(tasks[index].done);
            tasks[index].done = checkbox.checked;
            saveTodayTasks(tasks);
            logActivity({
              action: "task_done_changed",
              entityType: "task",
              entityId: task.id,
              dateKey: todayKey,
              field: "done",
              before: beforeDone,
              after: Boolean(tasks[index].done),
              meta: { activity: task.activity, label: task.label }
            });
            renderTasks();
          });

          hoursInput.addEventListener("input", function () {
            var beforeHours = effectiveTaskHours(tasks[index]);
            tasks[index].hours = normalizeTaskHours(hoursInput.value);
            tasks[index].timerSeconds = Math.round(tasks[index].hours * 3600);
            tasks[index].timerStartedAt = null;
            saveTodayTasks(tasks);
            logTaskFieldChange(task.id, todayKey, "hours", beforeHours, tasks[index].hours, {
              activity: task.activity,
              label: task.label
            });
            renderTotals();
          });

          startPauseButton.addEventListener("click", function () {
            if (tasks[index].timerStartedAt) {
              var beforePauseSeconds = elapsedTaskSeconds(tasks[index]);
              tasks[index].timerSeconds = elapsedTaskSeconds(tasks[index]);
              tasks[index].timerStartedAt = null;
              tasks[index].hours = hoursFromSeconds(tasks[index].timerSeconds);
              logActivity({
                action: "task_timer_paused",
                entityType: "task",
                entityId: task.id,
                dateKey: todayKey,
                before: beforePauseSeconds,
                after: tasks[index].timerSeconds,
                meta: { activity: task.activity, label: task.label }
              });
            } else {
              tasks[index].timerSeconds = elapsedTaskSeconds(tasks[index]);
              tasks[index].timerStartedAt = new Date().toISOString();
              logActivity({
                action: "task_timer_started",
                entityType: "task",
                entityId: task.id,
                dateKey: todayKey,
                before: tasks[index].timerSeconds,
                after: tasks[index].timerStartedAt,
                meta: { activity: task.activity, label: task.label }
              });
            }
            saveTodayTasks(tasks);
            renderTasks();
            renderTotals();
          });

          endButton.addEventListener("click", function () {
            var beforeEndSeconds = elapsedTaskSeconds(tasks[index]);
            tasks[index].timerSeconds = beforeEndSeconds;
            tasks[index].timerStartedAt = null;
            tasks[index].hours = hoursFromSeconds(tasks[index].timerSeconds);
            tasks[index].done = true;
            saveTodayTasks(tasks);
            logActivity({
              action: "task_timer_ended",
              entityType: "task",
              entityId: task.id,
              dateKey: todayKey,
              before: beforeEndSeconds,
              after: tasks[index].timerSeconds,
              meta: { activity: task.activity, label: task.label, done: true }
            });
            renderTasks();
            renderTotals();
          });

          deleteButton.addEventListener("click", function () {
            var deletedTask = Object.assign({}, tasks[index]);
            tasks.splice(index, 1);
            if (editingTaskId === task.id) {
              editingTaskId = null;
            }
            saveTodayTasks(tasks);
            logActivity({
              action: "task_deleted",
              entityType: "task",
              entityId: task.id,
              dateKey: todayKey,
              before: deletedTask,
              after: null,
              meta: { activity: task.activity, label: task.label }
            });
            renderTasks();
            renderTotals();
          });

          if (tracksTime) {
            hoursWrap.appendChild(hoursLabel);
            hoursWrap.appendChild(hoursInput);
            hoursWrap.appendChild(timerReadout);
            timerControls.appendChild(startPauseButton);
            timerControls.appendChild(endButton);
            hoursWrap.appendChild(timerControls);
          } else {
            hoursWrap.appendChild(document.createElement("span")).textContent = "Other task";
          }
          card.appendChild(checkbox);
          card.appendChild(content);
          card.appendChild(hoursWrap);
          card.appendChild(deleteButton);
          item.appendChild(card);
          list.appendChild(item);
        });

        elements.tasksMount.appendChild(list);
        elements.progressText.textContent = doneCount + " / " + tasks.length + " tasks done today";
        renderDashboardInsight();
      }

      function renderTaskEditor(content, tasks, index) {
        var task = tasks[index];
        var editor = document.createElement("div");
        editor.className = "task-editor";
        var hasCommitted = false;

        var titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "task-title-input";
        titleInput.maxLength = 90;
        titleInput.value = task.label;
        titleInput.placeholder = "Task title";

        var categorySelect = document.createElement("select");
        categorySelect.className = "task-category-select task-editor-activity";
        activities.forEach(function (activity) {
          var option = document.createElement("option");
          option.value = activity.id;
          option.textContent = activity.label;
          option.selected = activity.id === task.activity;
          categorySelect.appendChild(option);
        });

        var timeInput = document.createElement("input");
        timeInput.type = "text";
        timeInput.className = "task-category-select task-editor-time";
        timeInput.inputMode = "numeric";
        timeInput.maxLength = 17;
        timeInput.placeholder = "09:30";
        timeInput.value = normalizeScheduledTime(task.scheduledTime);

        var reminderSelect = document.createElement("select");
        reminderSelect.className = "task-category-select task-editor-reminder";
        [
          { value: "0", label: "No reminder" },
          { value: "5", label: "Remind me 5 min before" },
          { value: "10", label: "Remind me 10 min before" },
          { value: "15", label: "Remind me 15 min before" },
          { value: "30", label: "Remind me 30 min before" }
        ].forEach(function (config) {
          var option = document.createElement("option");
          option.value = config.value;
          option.textContent = config.label;
          option.selected = normalizeReminderMinutes(task.reminderMinutes) === Number(config.value);
          reminderSelect.appendChild(option);
        });

        function saveTaskEdit(keepEditing) {
          if (hasCommitted) {
            return;
          }
          hasCommitted = true;
          var nextLabel = titleInput.value.trim() || task.label;
          var nextActivity = categorySelect.value || task.activity;
          var nextScheduledTime = normalizeScheduledTime(timeInput.value);
          var nextReminderMinutes = normalizeReminderMinutes(reminderSelect.value);
          var beforeTask = Object.assign({}, tasks[index]);
          tasks[index].label = nextLabel;
          tasks[index].activity = nextActivity;
          tasks[index].scheduledTime = nextScheduledTime;
          tasks[index].reminderMinutes = nextReminderMinutes;
          if (tasks[index].sourceEventId && (beforeTask.scheduledTime !== nextScheduledTime || Number(beforeTask.reminderMinutes || 0) !== nextReminderMinutes)) {
            tasks[index].useSourceEventReminder = false;
          }
          tasks[index].reminderSentAt = "";
          tasks[index].reminderSentFor = "";
          if (!taskActivityTracksTime(nextActivity)) {
            tasks[index].timerStartedAt = null;
          }
          saveTodayTasks(tasks);
          logTaskFieldChange(task.id, formatDate(today), "label", beforeTask.label, tasks[index].label, {
            activity: tasks[index].activity
          });
          logTaskFieldChange(task.id, formatDate(today), "activity", beforeTask.activity, tasks[index].activity, {
            label: tasks[index].label
          });
          logTaskFieldChange(task.id, formatDate(today), "scheduledTime", beforeTask.scheduledTime || "", tasks[index].scheduledTime || "", {
            label: tasks[index].label
          });
          logTaskFieldChange(task.id, formatDate(today), "reminderMinutes", beforeTask.reminderMinutes || 0, tasks[index].reminderMinutes || 0, {
            label: tasks[index].label
          });
          editingTaskId = keepEditing ? task.id : null;
          renderTasks();
          renderTotals();
        }

        function cancelTaskEdit() {
          if (hasCommitted) {
            return;
          }
          hasCommitted = true;
          editingTaskId = null;
          renderTasks();
        }

        titleInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            saveTaskEdit(false);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTaskEdit();
          }
        });
        titleInput.addEventListener("blur", function () {
          window.setTimeout(function () {
            if (hasCommitted) {
              return;
            }
            if (!editor.contains(document.activeElement)) {
              saveTaskEdit(false);
            }
          }, 0);
        });
        categorySelect.addEventListener("change", function () {
          saveTaskEdit(true);
        });
        timeInput.addEventListener("change", function () {
          saveTaskEdit(true);
        });
        reminderSelect.addEventListener("change", function () {
          saveTaskEdit(true);
        });
        categorySelect.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTaskEdit();
          }
        });
        timeInput.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTaskEdit();
          }
        });
        reminderSelect.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTaskEdit();
          }
        });
        categorySelect.addEventListener("blur", function () {
          window.setTimeout(function () {
            if (hasCommitted) {
              return;
            }
            if (!editor.contains(document.activeElement)) {
              saveTaskEdit(false);
            }
          }, 0);
        });
        timeInput.addEventListener("blur", function () {
          window.setTimeout(function () {
            if (hasCommitted) {
              return;
            }
            if (!editor.contains(document.activeElement)) {
              saveTaskEdit(false);
            }
          }, 0);
        });
        reminderSelect.addEventListener("blur", function () {
          window.setTimeout(function () {
            if (hasCommitted) {
              return;
            }
            if (!editor.contains(document.activeElement)) {
              saveTaskEdit(false);
            }
          }, 0);
        });

        editor.appendChild(titleInput);
        editor.appendChild(categorySelect);
        editor.appendChild(timeInput);
        editor.appendChild(reminderSelect);
        content.appendChild(editor);

        window.setTimeout(function () {
          titleInput.focus();
          titleInput.select();
        }, 0);
      }

      function sumHours(hours, group) {
        return activities.filter(function (activity) {
          return !group || activity.group === group;
        }).reduce(function (sum, activity) {
          return sum + (Number(hours[activity.id]) || 0);
        }, 0);
      }

      function addDays(date, amount) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
      }

      function weekRange(date) {
        var day = date.getDay();
        var mondayOffset = day === 0 ? -6 : 1 - day;
        var start = addDays(date, mondayOffset);
        var end = addDays(start, 6);
        return { start: start, end: end };
      }

      function dateInRange(date, start, end) {
        var key = formatDate(date);
        return key >= formatDate(start) && key <= formatDate(end);
      }

      function addPhysicalTimeToTotals(totals, start, end) {
        getPhysicalLogs().forEach(function (log) {
          var logDate = parseDate(log.date);
          if ((start && end && !dateInRange(logDate, start, end)) || !countsAsDone(log.status)) {
            return;
          }
          if (workoutKind(log.name) === "skate") {
            totals.skate += log.minutes / 60;
          } else if (workoutKind(log.name) !== "rest") {
            totals.p90x3 += log.minutes / 60;
          }
        });

        totals.skate += YuanMindCore.sessionHours(getSkateSessions(), start && formatDate(start), end && formatDate(end));
        totals.guitar += YuanMindCore.sessionHours(getGuitarSessions(), start && formatDate(start), end && formatDate(end));
        totals.meditation = YuanMindCore.sessionHours(readJson(STORAGE.meditation, {}).sessions, start && formatDate(start), end && formatDate(end));
        totals.journal = getJournalEntries().reduce(function (sum, entry) {
          return (!start || entry.date >= formatDate(start)) && (!end || entry.date <= formatDate(end))
            ? sum + YuanMindCore.minutes(entry.durationMinutes) / 60 : sum;
        }, 0);
      }

      function totalHoursForRange(start, end) {
        var totals = {};
        activities.forEach(function (activity) {
          totals[activity.id] = 0;
        });

        Object.keys(memoryStore).forEach(function (key) {
          if (key.indexOf(STORAGE.dailyTasksPrefix) !== 0) {
            return;
          }
          var dateKey = key.slice(STORAGE.dailyTasksPrefix.length);
          var date = parseDate(dateKey);
          if (!dateInRange(date, start, end)) {
            return;
          }
          var tasks = normalizeTasks(readJson(key, []));
          tasks.forEach(function (task) {
            if (totals[task.activity] !== undefined) {
              totals[task.activity] += effectiveTaskHoursForDate(dateKey, task);
            }
          });
        });

        addPhysicalTimeToTotals(totals, start, end);
        return totals;
      }

      function totalHoursAllTime() {
        var totals = {};
        activities.forEach(function (activity) {
          totals[activity.id] = 0;
        });

        Object.keys(memoryStore).forEach(function (key) {
          if (key.indexOf(STORAGE.dailyTasksPrefix) !== 0) {
            return;
          }
          var dateKey = key.slice(STORAGE.dailyTasksPrefix.length);
          normalizeTasks(readJson(key, [])).forEach(function (task) {
            if (totals[task.activity] !== undefined) {
              totals[task.activity] += effectiveTaskHoursForDate(dateKey, task);
            }
          });
        });

        addPhysicalTimeToTotals(totals, null, null);
        return totals;
      }

      function totalsForStatsPeriod(period) {
        var week = weekRange(today);
        if (period === "day") {
          return totalHoursForRange(today, today);
        }
        if (period === "week") {
          return totalHoursForRange(week.start, week.end);
        }
        if (period === "month") {
          return totalHoursForRange(new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0));
        }
        return totalHoursAllTime();
      }

      function percent(part, total) {
        if (!total) {
          return 0;
        }
        return Math.round((part / total) * 100);
      }

      function renderTotals() {
        runUiSafely("weekly goals", renderWeeklyGoals);
        runUiSafely("dashboard summaries", renderLiveSummaryPanels);
        runUiSafely("weekly planner", renderWeeklyPlannerSection);
        runUiSafely("goal planner", renderGoalPlanner);
        runUiSafely("money dashboard", renderMoneyDashboard);
        runUiSafely("skate page", renderSkatePage);
      }

      function renderLiveSummaryPanels() {
        runUiSafely("life pie", renderLifePie);
        runUiSafely("planned versus actual", renderPlannedActual);
        runUiSafely("dashboard insight", renderDashboardInsight);
        runUiSafely("study overview", renderStudyOverview);
      }

      function renderWeeklyGoals() {
        if (!elements.weeklyGoals || elements.weeklyGoals.dataset.reactOwned === "true") {
          return;
        }
        elements.weeklyGoals.innerHTML = "";
        getWeeklyGoals().forEach(function (goal) {
          var card = document.createElement("div");
          card.className = "weekly-goal-card";

          var track = document.createElement("div");
          track.className = "weekly-goal-track";
          track.innerHTML = "<span class=\"weekly-goal-dot " + goal.id + "\"></span><span>" + goal.label + "</span>";
          card.appendChild(track);

          var input = document.createElement("input");
          input.className = "weekly-goal-input";
          input.type = "text";
          input.maxLength = 120;
          input.placeholder = goal.placeholder;
          input.value = goal.text;
          input.setAttribute("aria-label", goal.label + " weekly goal");
          input.addEventListener("change", function () {
            var latest = getWeeklyGoals().map(function (item) {
              return item.id === goal.id ? Object.assign({}, item, { text: input.value.trim() }) : item;
            });
            saveWeeklyGoals(latest);
            renderWeeklyGoals();
          });
          card.appendChild(input);

          elements.weeklyGoals.appendChild(card);
        });
      }

      function renderLifePie() {
        if (!elements.lifeDonut || !elements.lifeSummary || !elements.lifeBreakdown ||
            (elements.lifeCard && elements.lifeCard.dataset.reactOwned === "true")) return;
        var totals = totalsForStatsPeriod(statsPeriod);
        var groups = [
          { label: "Study", color: "#cbdcf3", ids: ["lc", "cpp", "python"] },
          { label: "Body", color: "#dbe8c7", ids: ["skate", "p90x3"] },
          { label: "Mind", color: "#e4d9f3", ids: ["guitar", "meditation", "journal"] }
        ];
        var total = 0;
        groups.forEach(function (group) {
          group.hours = group.ids.reduce(function (sum, id) { return sum + (totals[id] || 0); }, 0);
          total += group.hours;
        });
        var degrees = 0;
        var stops = groups.map(function (group) {
          var from = degrees;
          degrees += total ? group.hours / total * 360 : 0;
          return group.color + " " + from + "deg " + degrees + "deg";
        });
        elements.lifeDonut.style.background = total ? "conic-gradient(" + stops.join(",") + ")" : "#efedf2";
        elements.lifeDonutLabel.textContent = formatHours(total);
        elements.lifeDonut.setAttribute("aria-label", groups.map(function (g) { return g.label + " " + formatHours(g.hours); }).join(", "));
        elements.lifeSummary.innerHTML = "";
        elements.lifeBreakdown.innerHTML = "";
        groups.forEach(function (group) {
          var item = document.createElement("div");
          item.className = "pie-summary-row";
          item.innerHTML = '<strong><i class="life-dot" style="background:' + group.color + '"></i>' + group.label + '</strong><span>' + percent(group.hours, total) + '% · ' + formatHours(group.hours) + '</span>';
          elements.lifeSummary.appendChild(item);
          group.ids.forEach(function (id) {
            var activity = activities.find(function (a) { return a.id === id; });
            var label = activity ? activity.label : id === "meditation" ? "Meditation" : "Journal";
            var row = document.createElement("div");
            row.className = "breakdown-row";
            row.innerHTML = '<strong><i class="life-dot" style="background:' + group.color + '"></i>' + label + '</strong><span>' + percent(totals[id] || 0, total) + '% · ' + formatHours(totals[id] || 0) + '</span>';
            elements.lifeBreakdown.appendChild(row);
          });
        });
        renderStatsPeriodTabs();
      }

      function renderMeditation() {
        var meditationCard = document.querySelector(".meditation-card");
        if (meditationCard && meditationCard.dataset.reactOwned === "true") {
          return;
        }
        var state = readJson(STORAGE.meditation, { active: null, sessions: [] });
        var next = YuanMindCore.finishMeditation(state, Date.now());
        if (next !== state) {
          writeJson(STORAGE.meditation, next);
          renderLifePie();
        }
        var active = next.active;
        document.getElementById("meditationMinutes").disabled = Boolean(active);
        document.getElementById("startMeditation").disabled = Boolean(active);
        document.getElementById("cancelMeditation").hidden = !active;
        document.getElementById("meditationCountdown").textContent = active
          ? formatTimer(Math.max(0, Math.ceil((active.endsAt - Date.now()) / 1000))) : "Ready";
        var savedMinutes = Math.round(YuanMindCore.sessionHours(next.sessions, selectedJournalDate, selectedJournalDate) * 60);
        document.getElementById("meditationStatus").textContent = next !== state
          ? "Meditation complete. Saved to Mind." : savedMinutes + " min saved for " + humanDate(selectedJournalDate) + ".";
      }

      function renderStatsPeriodTabs() {
        if (!elements.statsPeriodTabs) {
          return;
        }
        var periods = [
          { id: "day", label: "Day" },
          { id: "week", label: "Week" },
          { id: "month", label: "Month" },
          { id: "all", label: "All" }
        ];
        elements.statsPeriodTabs.innerHTML = "";
        periods.forEach(function (period) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "period-button";
          button.classList.toggle("active", statsPeriod === period.id);
          button.textContent = period.label;
          button.addEventListener("click", function () {
            statsPeriod = period.id;
            renderLifePie();
          });
          elements.statsPeriodTabs.appendChild(button);
        });
      }

      function renderPlannedActual() {
        if (!elements.plannedWeekLabel || !elements.plannedMount
          || (elements.plannedCard && elements.plannedCard.dataset.reactOwned === "true")) {
          return;
        }
        var week = weekRange(today);
        var planned = readJson(plannedStorageKey(today), {});
        var actual = totalHoursForRange(week.start, week.end);
        elements.plannedWeekLabel.textContent = isoWeekKey(today);
        elements.plannedMount.innerHTML = "";
        elements.plannedMount.appendChild(renderPlannedGroup("Study", "study", planned, actual));
        elements.plannedMount.appendChild(renderPlannedGroup("Leisure", "leisure", planned, actual));
      }

      function renderPlannedGroup(title, group, planned, actual) {
        var wrapper = document.createElement("div");
        wrapper.className = "planned-group";

        var groupActivities = activities.filter(function (activity) {
          return activity.group === group;
        });
        var plannedTotal = groupActivities.reduce(function (sum, activity) {
          return sum + (Number(planned[activity.id]) || 0);
        }, 0);
        var actualTotal = sumHours(actual, group);

        var titleRow = document.createElement("div");
        titleRow.className = "planned-title";
        titleRow.innerHTML = "<strong>" + title + "</strong><span>Planned " + formatHours(plannedTotal) + " · Actual " + formatHours(actualTotal) + "</span>";
        wrapper.appendChild(titleRow);
        wrapper.appendChild(createProgress(title + " progress", Math.round(actualTotal * 10) / 10, plannedTotal || 0));

        groupActivities.forEach(function (activity) {
          var row = document.createElement("label");
          row.className = "planned-row " + activity.className;
          var input = document.createElement("input");
          input.id = "planned-" + activity.id;
          input.name = "planned-" + activity.id;
          input.type = "number";
          input.min = "0";
          input.max = "168";
          input.step = "0.25";
          input.inputMode = "decimal";
          input.value = planned[activity.id] || "";
          input.placeholder = "0";
          input.addEventListener("input", function () {
            var beforePlanned = Number(planned[activity.id]) || 0;
            planned[activity.id] = Math.max(0, Number(input.value) || 0);
            writeJson(plannedStorageKey(today), planned);
            logActivity({
              action: "planned_hours_updated",
              entityType: "planned_hours",
              entityId: activity.id,
              dateKey: isoWeekKey(today),
              field: activity.id,
              before: beforePlanned,
              after: planned[activity.id],
              meta: {
                group: group,
                activity: activity.id
              }
            });
          });
          input.addEventListener("change", renderPlannedActual);
          row.appendChild(document.createElement("strong")).textContent = activity.short;
          row.appendChild(input);
          row.appendChild(document.createElement("span")).textContent = formatHours(actual[activity.id] || 0);
          wrapper.appendChild(row);
        });

        return wrapper;
      }

      function createProgress(label, done, target) {
        var safeTarget = Math.max(0, Number(target) || 0);
        var safeDone = Math.max(0, Number(done) || 0);
        var percentDone = safeTarget ? Math.min(100, Math.round((safeDone / safeTarget) * 100)) : 0;
        var wrapper = document.createElement("div");
        wrapper.className = "soft-progress";
        wrapper.innerHTML = [
          "<div class=\"soft-progress-title\"><strong>", label, "</strong><span>", safeDone, " / ", safeTarget || "soft", "</span></div>",
          "<div class=\"soft-progress-track\"><span style=\"width:", percentDone, "%\"></span></div>"
        ].join("");
        return wrapper;
      }

      function renderStudyOverview() {
        if (!elements.studyOverviewWeek || !elements.studyOverview) {
          return;
        }
        var dates = weekDates(today);
        var studyOverview = getWeekOverview(STORAGE.studyOverviewPrefix, today);
        var skateBodyOverview = getWeekOverview(STORAGE.skateBodyOverviewPrefix, today);
        elements.studyOverviewWeek.textContent = isoWeekKey(today);
        elements.studyOverview.innerHTML = "";
        elements.studyOverview.appendChild(createCombinedWeekOverview(dates, studyOverview, skateBodyOverview));
      }

      function defaultStudyPlanText(date) {
        var tasks = readJson(dailyTaskStorageKey(date), []);
        if (!Array.isArray(tasks) || !tasks.length) {
          return studyOverviewPlaceholders[date.getDay() % studyOverviewPlaceholders.length];
        }
        return tasks.slice(0, 3).map(function (task) {
          return task.label;
        }).join(" · ");
      }

      function defaultBodyPlanText(dayIndex) {
        var plan = getPhysicalPlan(today);
        var items = plan.days[dayIndex] || [];
        if (!items.length) {
          return skateBodyOverviewPlaceholders[dayIndex % skateBodyOverviewPlaceholders.length];
        }
        return items.slice(0, 3).map(function (item) {
          return item.name;
        }).join(" + ");
      }

      function createCombinedWeekOverview(dates, studyOverview, skateBodyOverview) {
        var wrapper = document.createElement("section");
        wrapper.className = "planned-group overview-section";
        var list = document.createElement("div");
        list.className = "week-overview-list";

        dates.forEach(function (date, index) {
          var row = document.createElement("div");
          row.className = "week-overview-item";
          if (formatDate(date) === formatDate(today)) {
            row.classList.add("is-today");
          }

          var dayLabel = document.createElement("span");
          dayLabel.className = "week-overview-day";
          dayLabel.textContent = weekdays[date.getDay()];
          row.appendChild(dayLabel);

          var body = document.createElement("div");
          body.className = "week-overview-body";

          var display = document.createElement("button");
          display.type = "button";
          display.className = "week-overview-display";
          body.appendChild(display);

          var editor = document.createElement("div");
          editor.className = "week-overview-editor";
          editor.hidden = true;

          var studyInput = document.createElement("input");
          studyInput.type = "text";
          studyInput.className = "week-overview-input";
          studyInput.maxLength = 120;

          var bodyInput = document.createElement("input");
          bodyInput.type = "text";
          bodyInput.className = "week-overview-input";
          bodyInput.maxLength = 120;

          var actions = document.createElement("div");
          actions.className = "week-overview-actions";

          var saveButton = document.createElement("button");
          saveButton.type = "button";
          saveButton.className = "week-overview-action is-save";
          saveButton.textContent = "Save";

          var cancelButton = document.createElement("button");
          cancelButton.type = "button";
          cancelButton.className = "week-overview-action";
          cancelButton.textContent = "Cancel";

          actions.appendChild(saveButton);
          actions.appendChild(cancelButton);
          editor.appendChild(createWeekOverviewEditorLine("Study", studyInput));
          editor.appendChild(createWeekOverviewEditorLine("Body", bodyInput));
          editor.appendChild(actions);
          body.appendChild(editor);
          row.appendChild(body);

          function currentStudyText() {
            return (studyOverview.days[index] || "").trim() || defaultStudyPlanText(date);
          }

          function currentBodyText() {
            return (skateBodyOverview.days[index] || "").trim() || defaultBodyPlanText(index);
          }

          function renderDisplay() {
            display.innerHTML = [
              '<span class="week-overview-line"><strong>Study</strong><span>' + escapeHtml(currentStudyText()) + "</span></span>",
              '<span class="week-overview-line"><strong>Body</strong><span>' + escapeHtml(currentBodyText()) + "</span></span>"
            ].join("");
          }

          function startEditing() {
            studyInput.value = studyOverview.days[index] || "";
            bodyInput.value = skateBodyOverview.days[index] || "";
            studyInput.placeholder = defaultStudyPlanText(date);
            bodyInput.placeholder = defaultBodyPlanText(index);
            display.hidden = true;
            editor.hidden = false;
            studyInput.focus();
            studyInput.select();
          }

          function finishEditing(shouldSave) {
            if (shouldSave) {
              studyOverview.days[index] = studyInput.value.trim();
              skateBodyOverview.days[index] = bodyInput.value.trim();
              saveWeekOverview(STORAGE.studyOverviewPrefix, today, studyOverview);
              saveWeekOverview(STORAGE.skateBodyOverviewPrefix, today, skateBodyOverview);
            }
            editor.hidden = true;
            display.hidden = false;
            renderDisplay();
          }

          display.addEventListener("click", startEditing);
          saveButton.addEventListener("click", function () {
            finishEditing(true);
          });
          cancelButton.addEventListener("click", function () {
            finishEditing(false);
          });
          [studyInput, bodyInput].forEach(function (input) {
            input.addEventListener("keydown", function (event) {
              if (event.key === "Enter") {
                event.preventDefault();
                finishEditing(true);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                finishEditing(false);
              }
            });
          });

          renderDisplay();
          list.appendChild(row);
        });

        wrapper.appendChild(list);
        return wrapper;
      }

      function createWeekOverviewEditorLine(label, input) {
        var line = document.createElement("label");
        line.className = "week-overview-edit-line";
        var title = document.createElement("span");
        title.textContent = label;
        line.appendChild(title);
        line.appendChild(input);
        return line;
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;");
      }

      function createTrendChart(title, rows) {
        var chart = document.createElement("div");
        chart.className = "mini-chart trend-chart";
        chart.innerHTML = "<div class=\"chart-title\">" + title + "</div>";
        rows.forEach(function (row) {
          var dots = document.createElement("div");
          dots.className = "trend-row " + (row.className || "");
          dots.appendChild(document.createElement("strong")).textContent = row.label;
          var dotWrap = document.createElement("div");
          dotWrap.className = "trend-dots";
          dotWrap.style.gridTemplateColumns = "repeat(" + Math.max(row.values.length, 1) + ", minmax(5px, 1fr))";
          row.values.forEach(function (value) {
            var dot = document.createElement("span");
            dot.style.height = Math.max(6, Math.round((Number(value) || 0) * 8)) + "px";
            dot.title = row.label + ": " + (value ? Math.round(value * 10) / 10 : 0);
            dotWrap.appendChild(dot);
          });
          dots.appendChild(dotWrap);
          dots.appendChild(document.createElement("em")).textContent = row.summary;
          chart.appendChild(dots);
        });
        return chart;
      }

      function createFrequencyChart(title, rows, emptyMessage) {
        var chart = document.createElement("div");
        chart.className = "mini-chart trend-chart";
        chart.innerHTML = "<div class=\"chart-title\">" + title + "</div>";

        if (!rows.length) {
          var empty = document.createElement("p");
          empty.className = "trend-empty";
          empty.textContent = emptyMessage;
          chart.appendChild(empty);
          return chart;
        }

        var maxCount = rows.reduce(function (highest, row) {
          return Math.max(highest, row.count);
        }, 0) || 1;

        rows.forEach(function (row) {
          var item = document.createElement("div");
          item.className = "frequency-row " + (row.className || "");

          var label = document.createElement("strong");
          label.textContent = row.label;

          var bar = document.createElement("span");
          bar.className = "frequency-bar";

          var fill = document.createElement("span");
          fill.className = "frequency-fill";
          fill.style.width = Math.max(row.count ? 20 : 0, Math.round((row.count / maxCount) * 100)) + "%";
          bar.appendChild(fill);

          var summary = document.createElement("em");
          summary.textContent = row.count + (row.count === 1 ? " session" : " sessions");

          item.appendChild(label);
          item.appendChild(bar);
          item.appendChild(summary);
          chart.appendChild(item);
        });

        return chart;
      }

      function openEventComposer(dateKey, part, message) {
        var date = parseDate(dateKey);
        var summary = plannerDaySummary(dateKey);
        editingEventId = null;
        draftEventDayPart = part || "";
        selectedDate = dateKey;
        weeklyPlannerUiState.activityPickerOpen = false;
        calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
        elements.eventDate.value = dateKey;
        elements.eventStartTime.value = summary.recommendedMaxMinutes === 30 ? "18:00" : "10:00";
        elements.eventEndTime.value = summary.recommendedMaxMinutes === 30 ? "18:10" : "11:00";
        if (elements.eventTitle) {
          elements.eventTitle.value = "";
        }
        if (elements.eventReminderOnly) {
          elements.eventReminderOnly.checked = false;
        }
        if (elements.eventReminder) {
          elements.eventReminder.value = "0";
        }
        elements.eventNote.value = "";
        elements.eventCategory.value = weeklyPlannerUiState.selectedActivityCategory || "Study/school";
        if (!editingEventId && elements.eventEffort && weeklyPlannerCore) {
          elements.eventEffort.value = weeklyPlannerCore.defaultEffortForCategory(elements.eventCategory.value);
        }
        elements.eventSaveButton.textContent = "Save activity";
        elements.formHint.textContent = message || ("Selected: " + dateKey);
        renderCalendar();
        renderSelectedDate();
        if (elements.eventTitle) {
          elements.eventTitle.focus();
        } else if (elements.eventStartTime) {
          elements.eventStartTime.focus();
        }
      }

      function groupedEventsForDate(dateKey) {
        return calendarCore.groupEventsByPart(eventsForDate(dateKey));
      }

      function plannerCategoryMeta(category) {
        if (weeklyPlannerCore && typeof weeklyPlannerCore.categoryMeta === "function") {
          return weeklyPlannerCore.categoryMeta(category);
        }
        return {
          label: normalizeEventCategory(category),
          shortLabel: normalizeEventCategory(category),
          className: categoryClass(category)
        };
      }

      function eventTimeFallback(title) {
        var range = calendarCore.parseEventTimeRange(title);
        if (!range) {
          return { startTime: "", endTime: "" };
        }
        return {
          startTime: pad(Math.floor(range.start / 60)) + ":" + pad(range.start % 60),
          endTime: pad(Math.floor(range.end / 60)) + ":" + pad(range.end % 60)
        };
      }

      function plannerEventsForDate(dateKey) {
        return eventsForDate(dateKey).map(function (event) {
          var category = normalizeEventCategory(event.category);
          var meta = plannerCategoryMeta(category);
          var fallback = eventTimeFallback(event.title);
          var startTime = normalizeClockValue(event.startTime || fallback.startTime);
          var endTime = normalizeClockValue(event.endTime || fallback.endTime);
          var cleanTitle = String(event.title || "").trim();
          var legacyTitle = eventTitleWithoutLeadingTime(cleanTitle);
          var reminderOnly = Boolean(event.reminderOnly);
          return Object.assign({}, event, {
            category: category,
            title: legacyTitle || cleanTitle || meta.shortLabel,
            startTime: startTime,
            endTime: endTime,
            reminderOnly: reminderOnly,
            reminderMinutes: normalizeReminderMinutes(event.reminderMinutes)
          });
        });
      }

      function skateStreakActiveForDate(dateKey) {
        if (skateCore && typeof skateCore.seasonState === "function") {
          return Boolean(skateCore.seasonState(parseDate(dateKey)).streakActive);
        }
        return false;
      }

      function plannerDaySummary(dateKey) {
        var day = weeklyPlannerDayForDate(parseDate(dateKey)).day;
        if (weeklyPlannerCore && typeof weeklyPlannerCore.daySummary === "function") {
          return weeklyPlannerCore.daySummary(day.type, plannerEventsForDate(dateKey), {
            skateStreakActive: skateStreakActiveForDate(dateKey)
          });
        }
        return {
          dayType: dayTypeById(day.type),
          activities: plannerEventsForDate(dateKey),
          status: "Space left",
          remainingPoints: 0,
          usedPoints: 0,
          capacityPoints: 0,
          recommendedMaxMinutes: null,
          canAddActivity: true
        };
      }

      function plannerGuidanceHint(summary, dateKey) {
        var type = summary && summary.dayType ? summary.dayType : dayTypeById("normal");
        if (type.id === "recovery") {
          return "Recovery Day: a quieter stay-home day still has room for study, chores, guitar, and personal care. Keep skate or gym to 30 minutes or less.";
        }
        if (type.id === "high") {
          if (summary.remainingPoints <= 0) {
            return "High-Intensity Day: this is for your biggest blocks. Today is full, so only move, shorten, or remove something.";
          }
          if (summary.remainingPoints <= 2) {
            return "High-Intensity Day: use it for big work, training, or school. You still have room, but only for a smaller extra block.";
          }
          return "High-Intensity Day: use this for your biggest work, skate, gym, or school blocks.";
        }
        if (summary.remainingLoad <= 0) {
          return "Normal Day: one real main block plus smaller supporting things. This plan is already at capacity.";
        }
        if (summary.remainingLoad <= 1) {
          return "Normal Day: one main block is enough. The rest of today should stay light.";
        }
        return "Normal Day: aim for one real main block and one or two smaller supporting blocks.";
      }

      function formatPlannerPoints(value) {
        var amount = Math.max(0, Number(value) || 0);
        return Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
      }

      function formatPlannerLoad(value) {
        var amount = Math.abs(Number(value) || 0);
        return Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
      }

      function renderPlannerLoadPreview() {
        if (!elements.plannerLoadPreview || !weeklyPlannerCore || !elements.eventCategory) {
          return;
        }
        var category = normalizeEventCategory(elements.eventCategory.value);
        var effort = weeklyPlannerCore.normalizeEffort(
          elements.eventEffort && elements.eventEffort.value,
          category
        );
        var title = String((elements.eventTitle && elements.eventTitle.value) || "").trim() || plannerCategoryMeta(category).shortLabel;
        var reminderOnly = Boolean(elements.eventReminderOnly && elements.eventReminderOnly.checked);
        var startTime = normalizeClockValue(elements.eventStartTime && elements.eventStartTime.value);
        var endTime = normalizeClockValue(elements.eventEndTime && elements.eventEndTime.value);
        var eventDate = (elements.eventDate && elements.eventDate.value) || selectedDate;
        var type = weeklyPlannerDayForDate(parseDate(eventDate)).day.type;
        var existing = plannerEventsForDate(eventDate).filter(function (item) {
          return item.id !== editingEventId;
        });
        var preview = weeklyPlannerCore.previewActivityLoad(type, existing, {
          category: category,
          effort: effort,
          title: title,
          startTime: startTime,
          endTime: endTime,
          reminderOnly: reminderOnly
        });
        var className = "planner-load-preview";
        if (reminderOnly) {
          elements.plannerLoadPreview.textContent = "Reminder-only item = 0 load hours. It does not use your day budget.";
        } else if (!preview.candidate.minutes) {
          elements.plannerLoadPreview.textContent = "Add a valid start and end time to see this activity's load.";
        } else {
          var effortLabel = weeklyPlannerCore.effortMeta(effort, category).label;
          elements.plannerLoadPreview.textContent = preview.candidate.minutes + " min " + plannerCategoryMeta(category).shortLabel + " · " + effortLabel + " = " + formatPlannerLoad(preview.candidate.load) + " load hours. Would become " + formatPlannerLoad(preview.projected.usedLoad) + " / " + formatPlannerLoad(preview.projected.capacityLoad) + ".";
          if (!preview.allowed) {
            className += " is-over";
            elements.plannerLoadPreview.textContent += " " + preview.reason;
          } else {
            elements.plannerLoadPreview.textContent += " " + formatPlannerLoad(preview.projected.remainingLoad) + " left.";
          }
        }
        elements.plannerLoadPreview.className = className;
      }

      function formatPlannerRange(event) {
        return calendarCore.eventTimeLabel(event);
      }

      function timeBoundaryForPart(part) {
        if (part === "morning") {
          return { start: 0, end: MORNING_END };
        }
        if (part === "afternoon") {
          return { start: MORNING_END, end: EVENING_START };
        }
        return { start: EVENING_START, end: 24 * 60 };
      }

      function formatEventClock(totalMinutes) {
        var minutes = Math.max(0, Math.min(24 * 60, Number(totalMinutes) || 0));
        if (minutes === 24 * 60) {
          return "24";
        }
        var hours = Math.floor(minutes / 60);
        var remainder = minutes % 60;
        if (!remainder) {
          return String(hours);
        }
        return String(hours) + ":" + String(remainder).padStart(2, "0");
      }

      function eventTitleWithoutLeadingTime(title) {
        if (title && typeof title === "object") {
          return String(title.title || "");
        }
        return String(title || "")
          .replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?)?\s*/, "")
          .trim();
      }

      function renderTodayIntention() {
        if (!elements.todayThemeBadge) {
          return;
        }
        var dashboardDate = document.getElementById("dashboardDate");
        var todayKey = formatDate(today);
        var type = dayTypeById(weeklyPlannerDayForDate(today).day.type);

        elements.todaySubtitle.textContent = "A soft little map for the shape of your day.";
        elements.weekKeyLabel.textContent = isoWeekKey(today) + " · " + plannerDaySummary(todayKey).status;
        if (dashboardDate) {
          dashboardDate.textContent = humanDate(todayKey);
        }
        elements.todayThemeBadge.textContent = type.label;
        elements.todayThemeBadge.className = "progress-pill day-type-pill " + type.className;
      }

      function renderWeeklyPlanner() {
        if (!elements.weeklyPlannerMount) {
          return;
        }
        var referenceDate = parseDate(selectedDate);
        var dates = weekDates(referenceDate);
        var routine = getWeeklyPlannerWeek(referenceDate);
        var validation = weeklyPlannerCore && typeof weeklyPlannerCore.validateWeekPlan === "function"
          ? weeklyPlannerCore.validateWeekPlan(routine)
          : { errors: [] };

        if (elements.weeklyPlannerLabel) {
          elements.weeklyPlannerLabel.textContent = validation.errors.length
            ? validation.errors[0]
            : "Every week needs at least one Recovery Day and no more than two High-Intensity Days.";
        }

        elements.weeklyPlannerMount.innerHTML = "";
        if (elements.eventEditorCard) {
          elements.eventEditorCard.hidden = true;
          elements.eventEditorCard.classList.remove("inline-day-editor");
        }
        if (weeklyPlannerUiState.weekSetupOpen) {
          renderWeekSetup(referenceDate, routine);
          return;
        }

        dates.forEach(function (date, index) {
          var dateKey = formatDate(date);
          var type = dayTypeById(routine.days[index].type);
          var summary = plannerDaySummary(dateKey);
          var card = document.createElement("section");
          card.className = "week-day-panel " + type.className;
          var isExpanded = weeklyPlannerUiState.expandedDateKey === dateKey;
          if (dateKey === selectedDate) {
            card.classList.add("selected-day");
          }
          card.addEventListener("click", function (event) {
            if (event.target && typeof event.target.closest === "function" && event.target.closest("button, input, select, textarea, label, form")) {
              return;
            }
            event.stopPropagation();
            selectedDate = dateKey;
            calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
            weeklyPlannerUiState.expandedDateKey = isExpanded ? "" : dateKey;
            if (!weeklyPlannerUiState.expandedDateKey) {
              weeklyPlannerUiState.activityPickerOpen = false;
            }
            renderWeeklyPlannerSection();
            renderCalendar();
            renderSelectedDate();
          });

          var header = document.createElement("div");
          header.className = "week-day-header";
          header.innerHTML = "<div><strong>" + weekLabels[index] + "</strong><span>" + humanDate(dateKey) + "</span></div>";

          var badge = document.createElement("span");
          badge.className = "progress-pill day-type-pill " + type.className;
          badge.textContent = type.shortLabel || type.label;
          header.appendChild(badge);

          if (isExpanded) {
            var collapseButton = document.createElement("button");
            collapseButton.type = "button";
            collapseButton.className = "planner-collapse-button";
            collapseButton.setAttribute("aria-label", "Collapse " + weekLabels[index]);
            collapseButton.textContent = "Minimize";
            collapseButton.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              weeklyPlannerUiState.expandedDateKey = "";
              weeklyPlannerUiState.activityPickerOpen = false;
              renderWeeklyPlannerSection();
            });
            header.appendChild(collapseButton);
          }
          card.appendChild(header);

          var statusRow = document.createElement("div");
          statusRow.className = "week-day-status";
          statusRow.innerHTML = "<strong>" + summary.status + "</strong><span>" + plannerCapacityHint(summary, dateKey) + "</span>";
          card.appendChild(statusRow);

          var summaryRow = document.createElement("div");
          summaryRow.className = "week-day-summary";
          if (!summary.activities.length) {
            var empty = document.createElement("span");
            empty.className = "week-day-part-empty";
            empty.textContent = summary.status === "Rest protected" ? "Rest protected." : "No activities yet.";
            summaryRow.appendChild(empty);
          } else {
            summary.activities.forEach(function (activity) {
              var pill = document.createElement("span");
              pill.className = "week-event-button " + categoryClass(activity.category);
              pill.textContent = plannerCategoryMeta(activity.category).shortLabel;
              summaryRow.appendChild(pill);
            });
          }
          card.appendChild(summaryRow);

          if (isExpanded && elements.eventEditorCard) {
            elements.eventEditorCard.hidden = false;
            elements.eventEditorCard.classList.add("inline-day-editor");
            card.appendChild(elements.eventEditorCard);
          }

          elements.weeklyPlannerMount.appendChild(card);
        });
      }

      function plannerCapacityHint(summary, dateKey) {
        var used = formatPlannerLoad(summary.usedLoad);
        var budget = formatPlannerLoad(summary.capacityLoad);
        var switchNote = summary.contextSwitchLoad ? " + " + formatPlannerLoad(summary.contextSwitchLoad) + " switching" : "";
        if (summary.remainingLoad < 0) {
          return used + " / " + budget + " load hours planned" + switchNote + " · over by " + formatPlannerLoad(summary.remainingLoad) + ".";
        }
        return used + " / " + budget + " load hours planned" + switchNote + " · " + formatPlannerLoad(summary.remainingLoad) + " left.";
      }

      function renderWeekSetup(referenceDate, routine) {
        var draft = weeklyPlannerUiState.weekSetupDraft || (weeklyPlannerCore && weeklyPlannerCore.normalizeWeekPlan
          ? weeklyPlannerCore.normalizeWeekPlan(routine, isoWeekKey(referenceDate))
          : routine);
        var validation = weeklyPlannerCore.validateWeekPlan(draft);
        var wrap = document.createElement("section");
        wrap.className = "week-setup-card";

        var intro = document.createElement("div");
        intro.className = "week-setup-header";
        intro.innerHTML = "<strong>Plan the week first</strong><span>Choose Recovery, Normal, or High-Intensity for each day.</span>";
        wrap.appendChild(intro);

        var dates = weekDates(referenceDate);
        dates.forEach(function (date, index) {
          var dateKey = formatDate(date);
          var row = document.createElement("div");
          row.className = "week-setup-row";
          row.innerHTML = "<strong>" + weekLabels[index] + "</strong><span>" + humanDate(dateKey) + "</span>";
          var options = document.createElement("div");
          options.className = "week-setup-options";
          dayTypes.forEach(function (type) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "day-state-chip";
            if (draft.days[index].type === type.id) {
              button.classList.add("is-active");
            }
            button.textContent = type.shortLabel || type.label;
            button.addEventListener("click", function () {
              var nextDraft = JSON.parse(JSON.stringify(draft));
              var allowed = weeklyPlannerCore.dayTypeChangeAllowed(nextDraft, index, type.id, plannerEventsForDate(dateKey), {
                skateStreakActive: skateStreakActiveForDate(dateKey)
              });
              if (!allowed.allowed) {
                elements.weeklyPlannerLabel.textContent = allowed.reason;
                return;
              }
              nextDraft.days[index].type = type.id;
              weeklyPlannerUiState.weekSetupDraft = nextDraft;
              renderWeeklyPlanner();
            });
            options.appendChild(button);
          });
          row.appendChild(options);
          wrap.appendChild(row);
        });

        var footer = document.createElement("div");
        footer.className = "week-setup-footer";
        var save = document.createElement("button");
        save.type = "button";
        save.className = "primary-button";
        save.textContent = "Save week";
        save.disabled = !validation.valid;
        save.addEventListener("click", function () {
          saveWeeklyPlannerWeek(referenceDate, Object.assign({}, draft, { isConfigured: true }));
          weeklyPlannerUiState.weekSetupOpen = false;
          weeklyPlannerUiState.weekSetupDraft = null;
          renderWeeklyPlannerSection();
        });
        footer.appendChild(save);

        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "secondary-button";
        cancel.textContent = "Cancel";
        cancel.addEventListener("click", function () {
          weeklyPlannerUiState.weekSetupOpen = false;
          weeklyPlannerUiState.weekSetupDraft = null;
          renderWeeklyPlanner();
        });
        footer.appendChild(cancel);

        wrap.appendChild(footer);
        elements.weeklyPlannerMount.appendChild(wrap);
      }

      function renderWeeklyPlannerSection() {
        renderTodayIntention();
        renderWeeklyPlanner();
        renderSelectedDate();
      }

      function renderGoalPlanner() {
        if (!elements.goalPlannerMount) {
          return;
        }
        var referenceDate = parseDate(selectedDate);
        var routine = getWeeklyPlannerWeek(referenceDate);
        var studyOptions = weekDates(referenceDate).reduce(function (all, date, index) {
          if (routine.days[index].type === "recovery") {
            return all;
          }
          dayParts.forEach(function (part) {
            all.push({
              value: formatDate(date) + "|" + part,
              label: weekLabels[index] + " · " + partLabels[part]
            });
          });
          return all;
        }, []);
        var minuteOptions = [15, 30, 45, 60, 90];
        var items = getGoalPlannerItems();
        if (!items.length) {
          items = [emptyGoalItem()];
          saveGoalPlannerItems(items);
        }

        if (!expandedGoalId || !items.some(function (goal) { return goal.id === expandedGoalId; })) {
          expandedGoalId = "";
        }
        if (!expandedGoalId && items.length === 1 && !items[0].title.trim() && items[0].steps.length === 1 && !items[0].steps[0].text.trim()) {
          expandedGoalId = items[0].id;
        }

        elements.goalPlannerIntro.innerHTML = "";

        elements.goalPlannerMount.innerHTML = "";
        items.forEach(function (goal) {
          var card = document.createElement("section");
          card.className = "goal-plan-card goal-card";
          var isExpanded = expandedGoalId === goal.id;
          if (isExpanded) {
            card.classList.add("is-expanded");
          }

          var doneCount = goal.steps.filter(function (step) {
            return step.done;
          }).length;
          var totalCount = goal.steps.length;
          var header = document.createElement("div");
          header.className = "goal-plan-header goal-card-header";

          var titleWrap = document.createElement("div");
          titleWrap.className = "goal-card-title-wrap";

          var toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "goal-card-toggle";
          toggle.addEventListener("click", function () {
            expandedGoalId = isExpanded ? "" : goal.id;
            renderGoalPlanner();
          });

          var title = document.createElement("strong");
          title.className = "goal-card-title";
          title.textContent = goal.title.trim() || "Untitled goal";
          toggle.appendChild(title);

          var summary = document.createElement("span");
          summary.className = "goal-card-summary";
          summary.textContent = doneCount + " / " + totalCount + " actions";
          toggle.appendChild(summary);
          titleWrap.appendChild(toggle);
          header.appendChild(titleWrap);

          var headerActions = document.createElement("div");
          headerActions.className = "goal-card-actions";

          var expandButton = document.createElement("button");
          expandButton.type = "button";
          expandButton.className = "week-overview-action goal-quiet-button";
          expandButton.textContent = isExpanded ? "Collapse" : "Expand";
          expandButton.addEventListener("click", function () {
            expandedGoalId = isExpanded ? "" : goal.id;
            renderGoalPlanner();
          });
          headerActions.appendChild(expandButton);

          var removeGoal = document.createElement("button");
          removeGoal.type = "button";
          removeGoal.className = "week-overview-action goal-delete-button";
          removeGoal.textContent = "Delete";
          removeGoal.addEventListener("click", function () {
            updateGoalPlanner(function (latest) {
              var goalIndex = latest.findIndex(function (entry) {
                return entry.id === goal.id;
              });
              if (goalIndex === -1) {
                return;
              }
              latest[goalIndex].steps.forEach(function (step) {
                removeGoalStepEvent(step.eventId);
              });
              if (latest.length > 1) {
                latest.splice(goalIndex, 1);
              } else {
                latest[0] = emptyGoalItem();
              }
            });
            renderCalendar();
            renderSelectedDate();
          });
          headerActions.appendChild(removeGoal);
          header.appendChild(headerActions);
          card.appendChild(header);

          if (!isExpanded) {
            elements.goalPlannerMount.appendChild(card);
            return;
          }

          var body = document.createElement("div");
          body.className = "goal-card-body";

          var titleField = document.createElement("input");
          titleField.type = "text";
          titleField.className = "task-title-input goal-card-title-input";
          titleField.value = goal.title;
          titleField.placeholder = "Goal title";

          function saveGoalTitle() {
            var nextTitle = titleField.value.trim();
            updateGoalPlanner(function (latest) {
              var target = latest.find(function (entry) {
                return entry.id === goal.id;
              });
              if (target) {
                target.title = nextTitle;
              }
            }, false);
            title.textContent = nextTitle || "Untitled goal";
          }

          titleField.addEventListener("blur", saveGoalTitle);
          titleField.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
              event.preventDefault();
              titleField.blur();
            }
          });
          body.appendChild(titleField);

          var steps = document.createElement("div");
          steps.className = "goal-step-list";
          goal.steps.forEach(function (step) {
            var row = document.createElement("div");
            row.className = "goal-step-row goal-action-row";

            var check = document.createElement("input");
            check.type = "checkbox";
            check.checked = step.done;
            check.addEventListener("change", function () {
              updateGoalPlanner(function (latest) {
                var target = latest.find(function (entry) { return entry.id === goal.id; });
                var targetStep = target.steps.find(function (entry) { return entry.id === step.id; });
                targetStep.done = check.checked;
              });
            });
            row.appendChild(check);

            var stepInput = document.createElement("input");
            stepInput.type = "text";
            stepInput.className = "goal-step-input";
            stepInput.maxLength = 120;
            stepInput.value = step.text;
            stepInput.placeholder = "Small action";

            function saveStepText() {
              var nextText = stepInput.value.trim();
              updateGoalPlanner(function (latest) {
                var target = latest.find(function (entry) { return entry.id === goal.id; });
                var targetStep = target.steps.find(function (entry) { return entry.id === step.id; });
                if (targetStep) {
                  targetStep.text = nextText;
                }
              }, false);
            }

            stepInput.addEventListener("blur", saveStepText);
            stepInput.addEventListener("keydown", function (event) {
              if (event.key === "Enter") {
                event.preventDefault();
                stepInput.blur();
              }
            });
            row.appendChild(stepInput);

            var minutesSelect = document.createElement("select");
            minutesSelect.className = "task-category-select goal-time-select";
            minuteOptions.forEach(function (value) {
              var option = document.createElement("option");
              option.value = String(value);
              option.textContent = value + " min";
              option.selected = value === step.minutes;
              minutesSelect.appendChild(option);
            });
            minutesSelect.addEventListener("change", function () {
              updateGoalPlanner(function (latest) {
                var target = latest.find(function (entry) { return entry.id === goal.id; });
                var targetStep = target.steps.find(function (entry) { return entry.id === step.id; });
                targetStep.minutes = Number(minutesSelect.value) || 45;
              }, false);
            });
            row.appendChild(minutesSelect);

            var scheduleSelect = document.createElement("select");
            scheduleSelect.className = "task-category-select goal-schedule-select";
            var blankOption = document.createElement("option");
            blankOption.value = "";
            blankOption.textContent = studyOptions.length ? "Day block" : "Add a non-recovery day first";
            scheduleSelect.appendChild(blankOption);
            studyOptions.forEach(function (optionData) {
              var option = document.createElement("option");
              option.value = optionData.value;
              option.textContent = optionData.label;
              option.selected = optionData.value === step.scheduledDay;
              scheduleSelect.appendChild(option);
            });
            scheduleSelect.addEventListener("change", function () {
              updateGoalPlanner(function (latest) {
                var target = latest.find(function (entry) { return entry.id === goal.id; });
                var targetStep = target.steps.find(function (entry) { return entry.id === step.id; });
                targetStep.scheduledDay = scheduleSelect.value;
              }, false);
            });
            row.appendChild(scheduleSelect);

            var placeButton = document.createElement("button");
            placeButton.type = "button";
            placeButton.className = "week-overview-action is-save goal-place-button";
            placeButton.textContent = "Place";
            placeButton.addEventListener("click", function () {
              saveStepText();
              scheduleGoalStep(goal.id, step.id);
            });
            row.appendChild(placeButton);

            var remove = document.createElement("button");
            remove.type = "button";
            remove.className = "week-overview-action goal-row-delete";
            remove.textContent = "Delete";
            remove.addEventListener("click", function () {
              updateGoalPlanner(function (latest) {
                var target = latest.find(function (entry) { return entry.id === goal.id; });
                var targetStep = target.steps.find(function (entry) { return entry.id === step.id; });
                removeGoalStepEvent(targetStep.eventId);
                if (target.steps.length > 1) {
                  target.steps = target.steps.filter(function (entry) {
                    return entry.id !== step.id;
                  });
                } else {
                  target.steps[0] = emptyGoalStep();
                }
              });
              renderCalendar();
              renderSelectedDate();
            });
            row.appendChild(remove);

            if (step.eventId) {
              var placed = getEvents().find(function (event) {
                return event.id === step.eventId;
              });
              if (placed) {
                var status = document.createElement("span");
                status.className = "goal-step-status";
                status.textContent = "Placed: " + humanDate(placed.date) + " · " + partLabels[calendarCore.eventDayPart(placed)];
                row.appendChild(status);
              }
            }

            steps.appendChild(row);
          });
          body.appendChild(steps);

          var footer = document.createElement("div");
          footer.className = "goal-card-footer";
          var addStep = document.createElement("button");
          addStep.type = "button";
          addStep.className = "secondary-button goal-add-action";
          addStep.textContent = "Add action";
          addStep.addEventListener("click", function () {
            updateGoalPlanner(function (latest) {
              var target = latest.find(function (entry) {
                return entry.id === goal.id;
              });
              target.steps.push(emptyGoalStep());
            });
            expandedGoalId = goal.id;
          });
          footer.appendChild(addStep);
          body.appendChild(footer);
          card.appendChild(body);

          elements.goalPlannerMount.appendChild(card);
        });
      }

      function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }

      function defaultSkateCoachTemplateClone() {
        return deepClone(defaultSkateCoachTemplate);
      }

      function normalizeWarmupGroup(group, fallback) {
        var items = Array.isArray(group && group.items) ? group.items : fallback.items;
        return {
          title: typeof (group && group.title) === "string" && group.title.trim() ? group.title.trim() : fallback.title,
          items: items.map(function (item, index) {
            var fallbackItem = fallback.items[index] || { id: "warmup-" + fallback.title.toLowerCase() + "-" + index, name: "Warm-up", target: "" };
            return {
              id: typeof item.id === "string" && item.id ? item.id : fallbackItem.id,
              name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : fallbackItem.name,
              target: typeof item.target === "string" ? item.target.trim() : fallbackItem.target
            };
          }).filter(function (item) {
            return item.name;
          })
        };
      }

      function normalizeSkateCoachTemplate(value) {
        var fallback = defaultSkateCoachTemplateClone();
        var warmupGroups = Array.isArray(value && value.warmupGroups) ? value.warmupGroups : fallback.warmupGroups;
        var normalized = {
          warmupGroups: warmupGroups.map(function (group, index) {
            return normalizeWarmupGroup(group, fallback.warmupGroups[index] || fallback.warmupGroups[0]);
          }).filter(function (group) {
            return group.items.length;
          }),
          focusSuggestions: {
            flat: Array.isArray(value && value.focusSuggestions && value.focusSuggestions.flat) && value.focusSuggestions.flat.length
              ? value.focusSuggestions.flat.map(function (name) { return String(name || "").trim(); }).filter(Boolean)
              : fallback.focusSuggestions.flat.slice(),
            transition: Array.isArray(value && value.focusSuggestions && value.focusSuggestions.transition) && value.focusSuggestions.transition.length
              ? value.focusSuggestions.transition.map(function (name) { return String(name || "").trim(); }).filter(Boolean)
              : fallback.focusSuggestions.transition.slice()
          },
          skillBuilder: {
            switchItems: Array.isArray(value && value.skillBuilder && value.skillBuilder.switchItems) && value.skillBuilder.switchItems.length
              ? value.skillBuilder.switchItems.map(function (name) { return String(name || "").trim(); }).filter(Boolean)
              : fallback.skillBuilder.switchItems.slice(),
            reminder: typeof (value && value.skillBuilder && value.skillBuilder.reminder) === "string" && value.skillBuilder.reminder.trim()
              ? value.skillBuilder.reminder.trim()
              : fallback.skillBuilder.reminder,
            wallRide: typeof (value && value.skillBuilder && value.skillBuilder.wallRide) === "string" && value.skillBuilder.wallRide.trim()
              ? value.skillBuilder.wallRide.trim()
              : fallback.skillBuilder.wallRide
          },
          roadmapChains: Array.isArray(value && value.roadmapChains) && value.roadmapChains.length
            ? value.roadmapChains.map(function (chain, chainIndex) {
              var fallbackChain = fallback.roadmapChains[chainIndex] || fallback.roadmapChains[0];
              return (Array.isArray(chain) ? chain : fallbackChain).map(function (step, stepIndex) {
                var fallbackStep = fallbackChain[stepIndex] || "";
                return String(step || fallbackStep).trim();
              }).filter(Boolean);
            }).filter(function (chain) {
              return chain.length;
            })
            : fallback.roadmapChains
        };
        if (!normalized.warmupGroups.length) {
          normalized.warmupGroups = fallback.warmupGroups;
        }
        if (!normalized.roadmapChains.length) {
          normalized.roadmapChains = fallback.roadmapChains;
        }
        return normalized;
      }

      function getSkateCoachTemplate() {
        return normalizeSkateCoachTemplate(readJson(STORAGE.skateCoachTemplate, defaultSkateCoachTemplate));
      }

      function saveSkateCoachTemplate(template) {
        writeJson(STORAGE.skateCoachTemplate, normalizeSkateCoachTemplate(template));
      }

      function updateSkateCoachTemplate(mutator, shouldRerender) {
        var template = getSkateCoachTemplate();
        mutator(template);
        saveSkateCoachTemplate(template);
        if (shouldRerender !== false) {
          renderSkatePage();
        }
      }

      function flattenWarmupItems(template) {
        return template.warmupGroups.reduce(function (all, group) {
          return all.concat(group.items);
        }, []);
      }

      function defaultFocusCardState() {
        return {
          status: "not-started",
          goals: [false, false, false],
          note: ""
        };
      }

      function defaultSkateSession() {
        var template = getSkateCoachTemplate();
        var warmupItems = flattenWarmupItems(template);
        return {
          warmupChecks: warmupItems.reduce(function (checks, item) {
            checks[item.id] = false;
            return checks;
          }, {}),
          warmupDone: false,
          selectedFlat: template.focusSuggestions.flat[0] || "",
          selectedTransition: template.focusSuggestions.transition[0] || "",
          focusCards: {
            flat: defaultFocusCardState(),
            transition: defaultFocusCardState()
          },
          focusDone: false,
          skillChecks: template.skillBuilder.switchItems.map(function () {
            return false;
          }),
          skillDone: false,
          plannedIntensity: "yellow",
          expandedStage: "warmup",
          startedAt: null
        };
      }

      function normalizeFocusCard(card) {
        return {
          status: ["not-started", "learning", "almost-there", "consistent"].indexOf(card && card.status) !== -1 ? card.status : "not-started",
          goals: Array.from({ length: 3 }, function (_, index) {
            return Boolean(card && Array.isArray(card.goals) && card.goals[index]);
          }),
          note: typeof (card && card.note) === "string" ? card.note : ""
        };
      }

      function getCurrentSkateSession() {
        var template = getSkateCoachTemplate();
        var warmupItems = flattenWarmupItems(template);
        var session = readJson(STORAGE.skateCurrentSession, null);
        if (!session) {
          return defaultSkateSession();
        }
        return {
          warmupChecks: warmupItems.reduce(function (checks, item) {
            checks[item.id] = Boolean(session.warmupChecks && session.warmupChecks[item.id]);
            return checks;
          }, {}),
          warmupDone: Boolean(session.warmupDone),
          selectedFlat: typeof session.selectedFlat === "string" && session.selectedFlat.trim() ? session.selectedFlat.trim() : (template.focusSuggestions.flat[0] || ""),
          selectedTransition: typeof session.selectedTransition === "string" && session.selectedTransition.trim() ? session.selectedTransition.trim() : (template.focusSuggestions.transition[0] || ""),
          focusCards: {
            flat: normalizeFocusCard(session.focusCards && session.focusCards.flat),
            transition: normalizeFocusCard(session.focusCards && session.focusCards.transition)
          },
          focusDone: Boolean(session.focusDone),
          skillChecks: Array.from({ length: template.skillBuilder.switchItems.length }, function (_, index) {
            return Boolean(session.skillChecks && session.skillChecks[index]);
          }),
          skillDone: Boolean(session.skillDone),
          plannedIntensity: ["blue", "yellow", "green"].indexOf(session.plannedIntensity) !== -1 ? session.plannedIntensity : "yellow",
          expandedStage: ["warmup", "focus", "skill", ""].indexOf(session.expandedStage) !== -1 ? session.expandedStage : "warmup",
          startedAt: transientSessionStarts.skate
        };
      }

      function saveCurrentSkateSession(session) {
        transientSessionStarts.skate = typeof (session && session.startedAt) === "string" ? session.startedAt : null;
        var persistentSession = Object.assign({}, session);
        delete persistentSession.startedAt;
        writeJson(STORAGE.skateCurrentSession, persistentSession);
      }

      function getSkateSessions() {
        var sessions = readJson(STORAGE.skateSessions, []);
        if (!Array.isArray(sessions)) {
          return [];
        }
        return sessions.map(function (session) {
          if (!session || typeof session !== "object") {
            return null;
          }
          return Object.assign({}, session, {
            intensity: ["blue", "yellow", "green"].indexOf(session.intensity) !== -1 ? session.intensity : "yellow",
            benchmarkDone: Boolean(session.benchmarkDone)
          });
        }).filter(Boolean);
      }

      function saveSkateSessions(sessions) {
        writeJson(STORAGE.skateSessions, sessions);
      }

      function getCurrentGuitarSession() {
        return {
          startedAt: transientSessionStarts.guitar
        };
      }

      function saveCurrentGuitarSession(session) {
        transientSessionStarts.guitar = typeof (session && session.startedAt) === "string" ? session.startedAt : null;
      }

      function getGuitarSessions() {
        var sessions = readJson(STORAGE.guitarSessions, []);
        return Array.isArray(sessions) ? sessions : [];
      }

      function saveGuitarSessions(sessions) {
        writeJson(STORAGE.guitarSessions, sessions);
      }

      function renderWorkoutOptions() {
        if (elements.bodyWorkoutName && !elements.bodyWorkoutName.value) {
          elements.bodyWorkoutName.value = "";
        }
      }

      function boardHoursTotal() {
        var week = weekRange(today);
        var totals = totalHoursForRange(week.start, week.end);
        return Math.max(0, Number(totals.skate) || 0);
      }

      function formatSkateHours(value) {
        var number = Number(value) || 0;
        if (!number) {
          return "0h";
        }
        if (number < 0.1) {
          return Math.max(1, Math.round(number * 60)) + "m";
        }
        var rounded = Math.round(number * 10) / 10;
        return String(rounded).replace(/\.0$/, "") + "h";
      }

      function currentSkateHero() {
        if (!skateCore) {
          return null;
        }
        var calendarState = typeof skateCore.seasonState === "function" ? skateCore.seasonState(today) : null;
        var settings = getSkateSettings();
        var programDayNumber = currentSkateProgramDay();
        var programWeekNumber = programWeekNumberFromDay(programDayNumber);
        var programWeek = typeof skateCore.weekPlanForNumber === "function" ? skateCore.weekPlanForNumber(programWeekNumber) : null;
        var sessionDaysThisWeek = countSkateSessionDaysForWeek(today);
        var completedThisWeek = countSkateLogsForWeek(today);
        var restDayName = skateRestDaysLabel(settings);
        var restDayToday = settings.restDayOfWeek === today.getDay() || settings.extraRestDayOfWeek === today.getDay();

        if (calendarState && calendarState.dayNumber <= 0 && typeof skateCore.heroContent === "function") {
          return skateCore.heroContent(today, completedThisWeek);
        }

        if (programDayNumber <= skateCore.STREAK_DAYS && typeof skateCore.dayPlanByNumber === "function") {
          var planDay = skateCore.dayPlanByNumber(programDayNumber);
          if (!planDay || !programWeek) {
            return null;
          }
          return {
            state: calendarState,
            weekPlan: programWeek,
            programDayNumber: programDayNumber,
            programWeekNumber: programWeekNumber,
            title: restDayToday ? "Rest day" : "Today",
            subtitle: restDayToday
              ? restDayName + " is your off-board day. SkateIQ stays on Day " + programDayNumber + " until you change it."
              : programWeek.summary + " Rest days this week: " + restDayName + ".",
            phaseWeekLabel: programWeek.phase + " · Week " + programWeekNumber,
            blockLabel: "Day " + planDay.dayNumber,
            skateiq: planDay.skateiq,
            mainFocus: planDay.mainFocus,
            flow: planDay.flow,
            benchmark: planDay.benchmark,
            benchmarkLabel: planDay.benchmarkLabel,
            defaultIntensity: planDay.intensity,
            note: planDay.note || "",
            sessionDaysThisWeek: sessionDaysThisWeek,
            restDayName: restDayName,
            restDayToday: restDayToday
          };
        }

        if (typeof skateCore.heroContent === "function") {
          var weeklyHero = skateCore.heroContent(today, completedThisWeek);
          if (weeklyHero) {
            weeklyHero.sessionDaysThisWeek = sessionDaysThisWeek;
            weeklyHero.restDayName = restDayName;
            weeklyHero.restDayToday = restDayToday;
            if (restDayToday) {
              weeklyHero.subtitle = restDayName + " is your off-board day. " + weeklyHero.subtitle;
            }
          }
          return weeklyHero;
        }
        return null;
      }

      function skateIntensityForToday(hero, session) {
        var settings = getSkateSettings();
        var saved = settings.intensityByDate[formatDate(today)];
        if (["blue", "yellow", "green"].indexOf(saved) !== -1) {
          return saved;
        }
        return hero && hero.defaultIntensity ? hero.defaultIntensity : "yellow";
      }

      function skateHeroDayLabel(state) {
        var hero = currentSkateHero();
        if (hero && hero.programDayNumber) {
          return hero.programDayNumber + " / " + skateCore.STREAK_DAYS;
        }
        if (state.streakActive) {
          return state.streakDay + " / " + skateCore.STREAK_DAYS;
        }
        if (state.dayNumber > 0) {
          return humanDate(formatDate(today)).replace(",", "");
        }
        return "Starts Aug 29";
      }

      function applySkateIntensityButtons(activeIntensityId) {
        Array.prototype.forEach.call(elements.skateIntensityToggle.querySelectorAll("[data-intensity]"), function (button) {
          var active = button.dataset.intensity === activeIntensityId;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
      }

      function renderSkateHero(session) {
        var hero = currentSkateHero();
        if (!hero || !elements.skatePhaseBadge) {
          return;
        }
        var state = hero.state;
        var intensityId = skateIntensityForToday(hero, session);
        var intensity = skateCore.intensityMeta(intensityId);
        var dayLabel = skateHeroDayLabel(state);

        elements.skateHeroSubtitle.textContent = hero.subtitle;
        elements.skatePhaseBadge.textContent = hero.phaseWeekLabel;
        elements.skateWeekCount.textContent = state.weekNumber + " / " + skateCore.TOTAL_WEEKS;
        elements.skateDayCount.textContent = dayLabel;
        if (elements.skateSessionDaysCount) {
          elements.skateSessionDaysCount.textContent = (hero.sessionDaysThisWeek || 0) + " / " + (getSkateSettings().extraRestDayOfWeek === null ? 6 : 5);
        }
        elements.skateBoardHours.textContent = formatSkateHours(boardHoursTotal());
        if (elements.skateRestDay) {
          elements.skateRestDay.value = String(getSkateSettings().restDayOfWeek);
        }
        if (elements.skateExtraRestDay) {
          elements.skateExtraRestDay.value = getSkateSettings().extraRestDayOfWeek === null ? "" : String(getSkateSettings().extraRestDayOfWeek);
        }
        if (elements.skateCurrentDay) {
          elements.skateCurrentDay.value = String(currentSkateProgramDay());
        }
        if (elements.skateSettingsNote) {
          elements.skateSettingsNote.textContent = hero.restDayToday
            ? hero.restDayName + " is off. The plan will stay on Day " + currentSkateProgramDay() + " until you move it."
            : "Rest days: " + (hero.restDayName || skateRestDaysLabel(getSkateSettings())) + ". SkateIQ only moves when you change the day here.";
        }
        elements.skateBlockLabel.textContent = hero.blockLabel;
        elements.skateMainFocus.textContent = hero.mainFocus;
        elements.skateSkateiqBlock.textContent = hero.skateiq;
        elements.skateMainFocusShort.textContent = hero.mainFocus;
        elements.skateFlowFocus.textContent = hero.flow;
        elements.skateBenchmarkChip.hidden = !hero.benchmark;
        elements.skateBenchmarkLabel.textContent = hero.benchmarkLabel || "Benchmark";
        elements.skateIntensityDescription.textContent = intensity.tone + " · " + intensity.description;
        elements.skateIntensityEffort.textContent = intensity.effort;
        elements.skateAttemptBudget.textContent = intensity.attempts;
        applySkateIntensityButtons(intensity.id);
      }

      function renderSkateWeeklyMetrics() {
        var counts = {};
        getPhysicalLogs().forEach(function (log) {
          var logDate = parseDate(log.date);
          if (!countsAsDone(log.status) || !dateInRange(logDate, weekRange(today).start, weekRange(today).end)) {
            return;
          }
          var label = bodySupportTypeLabel(log.kind);
          if (!counts[label]) {
            counts[label] = {
              count: 0,
              minutes: 0,
              note: ""
            };
          }
          counts[label].count += 1;
          counts[label].minutes += Math.max(0, Number(log.minutes) || 0);
          if (!counts[label].note && log.note) {
            counts[label].note = log.note;
          }
        });

        elements.skateWeeklyMetrics.innerHTML = "";

        Object.keys(counts).sort(function (left, right) {
          if (counts[right].count !== counts[left].count) {
            return counts[right].count - counts[left].count;
          }
          return left.localeCompare(right);
        }).forEach(function (label) {
          var chip = document.createElement("span");
          chip.className = "body-support-chip";
          chip.innerHTML = "<strong>" + label + "</strong><em>" + counts[label].count + "x</em><span>" + (counts[label].minutes ? counts[label].minutes + " min" : "Logged") + "</span>";
          if (counts[label].note) {
            chip.title = counts[label].note;
          }
          elements.skateWeeklyMetrics.appendChild(chip);
        });

        if (!elements.skateWeeklyMetrics.children.length) {
          var empty = document.createElement("p");
          empty.className = "body-support-empty";
          empty.textContent = "Saved body support from this week will appear here.";
          elements.skateWeeklyMetrics.appendChild(empty);
        }
      }

      function normalizedSessionIntensity(session) {
        if (session && ["blue", "yellow", "green"].indexOf(session.intensity) !== -1) {
          return session.intensity;
        }
        return "yellow";
      }

      function appendRoadmapMonthLabel(container, cursor, leadingBlanks, dayOffset) {
        var label = document.createElement("span");
        label.className = "skate-roadmap-month";
        label.textContent = monthNames[cursor.getMonth()].slice(0, 3);
        label.style.gridColumn = String(Math.floor((leadingBlanks + dayOffset) / 7) + 1);
        container.appendChild(label);
      }

      function createRoadmapDayButton(dateKey, sessions) {
        var button = document.createElement("button");
        var latest = sessions.length ? sessions[sessions.length - 1] : null;
        button.type = "button";
        button.className = "skate-roadmap-day";
        button.classList.add("intensity-" + (latest ? normalizedSessionIntensity(latest) : "empty"));
        button.setAttribute("aria-label", humanDate(dateKey) + (sessions.length ? " · " + sessions.length + " skate session" + (sessions.length === 1 ? "" : "s") : " · no logged session"));
        button.textContent = "";
        if (latest) {
          button.title = [
            humanDate(dateKey),
            normalizedSessionIntensity(latest).toUpperCase(),
            latest.mainFocus || latest.focus || "Saved session"
          ].join(" · ");
        } else {
          button.title = humanDate(dateKey);
        }
        button.addEventListener("click", function () {
          openSkateFeedbackDialog({
            dateKey: dateKey,
            intensity: latest ? normalizedSessionIntensity(latest) : null,
            durationMinutes: latest ? Math.max(1, Math.round((Number(latest.durationHours) || 0) * 60)) : 45,
            hint: "Logging for " + humanDate(dateKey) + "."
          });
        });
        return button;
      }

      function roadmapRange() {
        var seasonStart = skateCore ? parseDate(skateCore.SEASON_START) : new Date(today.getFullYear(), 0, 1);
        if (today < seasonStart) {
          return null;
        }
        return {
          start: seasonStart,
          end: today
        };
      }

      function sessionsByDateKey(range) {
        return getSkateSessions().reduce(function (map, session) {
          if (!session || !session.finishedAt) {
            return map;
          }
          var key = skateSessionCore.sessionDateKey(session);
          var date = parseDate(key);
          if (!dateInRange(date, range.start, range.end)) {
            return map;
          }
          if (!map[key]) {
            map[key] = [];
          }
          map[key].push(session);
          return map;
        }, {});
      }

      function renderSkateTrendCharts() {
        elements.skateTrendCharts.innerHTML = "";
        var range = roadmapRange();
        if (!range) {
          var empty = document.createElement("p");
          empty.className = "body-support-empty";
          empty.textContent = "Roadmap starts on Saturday, August 29, 2026. Dots appear after the season begins and stay visible as the history grows.";
          elements.skateTrendCharts.appendChild(empty);
          return;
        }

        var sessionsByDate = sessionsByDateKey(range);
        var monthLabels = document.createElement("div");
        monthLabels.className = "skate-roadmap-months";
        var grid = document.createElement("div");
        grid.className = "skate-roadmap-grid";
        var leadingBlanks = range.start.getDay();
        var totalDays = Math.max(1, Math.round((new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate()) - new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate())) / (24 * 60 * 60 * 1000)) + 1);
        var columnCount = Math.ceil((leadingBlanks + totalDays) / 7);
        grid.style.setProperty("--roadmap-columns", String(columnCount));
        for (var blank = 0; blank < leadingBlanks; blank += 1) {
          var spacer = document.createElement("span");
          spacer.className = "skate-roadmap-spacer";
          spacer.setAttribute("aria-hidden", "true");
          grid.appendChild(spacer);
        }

        var cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
        var lastMonthKey = "";
        var dayOffset = 0;
        while (cursor <= range.end) {
          var key = formatDate(cursor);
          var sessions = sessionsByDate[key] || [];
          var monthKey = cursor.getFullYear() + "-" + cursor.getMonth();
          if (monthKey !== lastMonthKey) {
            appendRoadmapMonthLabel(monthLabels, cursor, leadingBlanks, dayOffset);
            lastMonthKey = monthKey;
          }
          grid.appendChild(createRoadmapDayButton(key, sessions));
          cursor = addDays(cursor, 1);
          dayOffset += 1;
        }
        elements.skateTrendCharts.appendChild(monthLabels);
        elements.skateTrendCharts.appendChild(grid);
      }

      function warmupComplete(session, template) {
        return flattenWarmupItems(template).every(function (item) {
          return session.warmupChecks[item.id];
        });
      }

      function stageSummaryForFocus(session) {
        var labels = [];
        if (session.selectedFlat) {
          labels.push(session.selectedFlat);
        }
        if (session.selectedTransition) {
          labels.push(session.selectedTransition);
        }
        return labels.join(" · ") || "Focus block";
      }

      function stageSummaryForSkill(template) {
        return template.skillBuilder.switchItems.slice(0, 2).join(" · ");
      }

      function setExpandedCoachStage(stage) {
        var session = getCurrentSkateSession();
        session.expandedStage = stage;
        saveCurrentSkateSession(session);
        renderSkatePage();
      }

      function updateSkateSession(mutator) {
        var session = getCurrentSkateSession();
        mutator(session);
        saveCurrentSkateSession(session);
        renderSkatePage();
      }

      function renderSkatePage() {
        if (!elements.skatePhaseBadge) {
          return;
        }
        var session = getCurrentSkateSession();
        elements.skateWeekLabel.textContent = isoWeekKey(today);
        elements.skateSessionHint.textContent = session.startedAt
          ? "Skate session running · " + formatTimer(startedSessionSeconds(session.startedAt))
          : "Hit start when the session begins. Or use \"Log past session\" / the roadmap if you forgot to save yesterday.";
        if (elements.startSkateSession) {
          elements.startSkateSession.disabled = Boolean(session.startedAt);
        }
        if (elements.finishSkateSession) {
          elements.finishSkateSession.disabled = !session.startedAt;
        }
        elements.skateCoachFlow.innerHTML = "";
        renderSkateHero(session);
        renderSkateWeeklyMetrics();
        renderSkateTrendCharts();
        elements.skateCoachFlow.appendChild(renderSkateTrainingPlan());
      }

      function renderSkateTrainingPlan() {
        var hero = currentSkateHero();
        var state = hero && hero.state ? hero.state : (skateCore ? skateCore.seasonState(today) : null);
        var wrapper = document.createElement("div");
        wrapper.className = "skate-plan-stack";

        if (!hero || !state || !skateCore) {
          var empty = document.createElement("p");
          empty.className = "body-support-empty";
          empty.textContent = "The training plan is not available right now.";
          wrapper.appendChild(empty);
          return wrapper;
        }

        var todayCard = document.createElement("section");
        todayCard.className = "skate-plan-card skate-plan-today";
        var todayHead = document.createElement("div");
        todayHead.className = "skate-plan-head";
        todayHead.innerHTML = "<div><span class=\"skate-plan-kicker\">" + hero.blockLabel + "</span><h3>" + hero.mainFocus + "</h3><p>" + hero.phaseWeekLabel + "</p></div>";
        todayCard.appendChild(todayHead);

        var todayGrid = document.createElement("div");
        todayGrid.className = "skate-plan-grid";
        [
          { label: "30-min SkateIQ", value: hero.skateiq },
          { label: "Flow / fun", value: hero.flow },
          { label: "Default intensity", value: skateCore.intensityMeta(hero.defaultIntensity).label + " · " + skateCore.intensityMeta(hero.defaultIntensity).attempts }
        ].forEach(function (item) {
          var block = document.createElement("article");
          block.className = "skate-plan-block";
          block.innerHTML = "<span>" + item.label + "</span><strong>" + item.value + "</strong>";
          todayGrid.appendChild(block);
        });
        todayCard.appendChild(todayGrid);
        if (hero.benchmark || hero.note) {
          var note = document.createElement("p");
          note.className = "skate-plan-note";
          note.textContent = [hero.benchmarkLabel, hero.note].filter(Boolean).join(" · ");
          todayCard.appendChild(note);
        }
        wrapper.appendChild(todayCard);

        var weekCard = document.createElement("section");
        weekCard.className = "skate-plan-card";
        var weekHead = document.createElement("div");
        weekHead.className = "skate-plan-head";
        var programWeekNumber = hero.programWeekNumber || state.weekNumber;
        var dateLabel = state.dayNumber <= 0
          ? "Previewing the program before Saturday, August 29, 2026."
          : "Current training week from your checked-in plan. Rest days: " + skateRestDaysLabel(getSkateSettings()) + ".";
        weekHead.innerHTML = "<div><span class=\"skate-plan-kicker\">Week " + programWeekNumber + " / " + skateCore.TOTAL_WEEKS + "</span><h3>" + hero.weekPlan.summary + "</h3><p>" + dateLabel + "</p></div>";
        weekCard.appendChild(weekHead);

        var list = document.createElement("div");
        list.className = "skate-plan-list";
        var useDailyWeekList = Array.isArray(hero.weekPlan.days)
          && hero.weekPlan.days.length
          && Boolean(hero.programDayNumber);
        var items = useDailyWeekList
          ? hero.weekPlan.days.map(function (entry) {
            return {
              label: "Day " + entry.dayNumber,
              title: entry.mainFocus,
              subtitle: entry.skateiq,
              detail: entry.flow,
              intensity: entry.intensity,
              isCurrent: hero.programDayNumber === entry.dayNumber,
              isPreview: state.dayNumber <= 0 && entry.dayNumber === 1,
              benchmark: entry.benchmark ? (entry.benchmarkLabel || "Benchmark") : ""
            };
          })
          : skateCore.weeklySessionsForDate(today).map(function (entry, index) {
            var entryDates = Array.isArray(entry.dateKeys) ? entry.dateKeys : [];
            var currentByDate = entryDates.indexOf(formatDate(today)) !== -1;
            var currentByHero = hero.blockLabel === (entry.label || ("Session " + (index + 1)));
            return {
              label: entry.label || ("Session " + (index + 1)),
              title: entry.mainFocus,
              subtitle: entry.skateiq,
              detail: entry.flow,
              intensity: entry.intensity,
              isCurrent: currentByDate || currentByHero,
              isPreview: false,
              benchmark: entry.benchmark ? "Benchmark / review" : ""
            };
          });

        items.forEach(function (item) {
          var row = document.createElement("article");
          row.className = "skate-plan-row intensity-" + item.intensity;
          if (item.isCurrent) {
            row.classList.add("is-current");
          }
          if (item.isPreview) {
            row.classList.add("is-preview");
          }

          var top = document.createElement("div");
          top.className = "skate-plan-row-top";
          top.innerHTML = "<span>" + item.label + "</span><strong>" + item.title + "</strong><em>" + skateCore.intensityMeta(item.intensity).label + "</em>";
          row.appendChild(top);

          var subtitle = document.createElement("p");
          subtitle.className = "skate-plan-row-copy";
          subtitle.textContent = item.subtitle;
          row.appendChild(subtitle);

          var detail = document.createElement("p");
          detail.className = "skate-plan-row-detail";
          detail.textContent = item.detail;
          row.appendChild(detail);

          if (item.benchmark) {
            var benchmark = document.createElement("span");
            benchmark.className = "skate-plan-pill";
            benchmark.textContent = item.benchmark;
            row.appendChild(benchmark);
          }

          list.appendChild(row);
        });

        weekCard.appendChild(list);
        wrapper.appendChild(weekCard);
        return wrapper;
      }

      function countGuitarSessionsForWeek(date) {
        var range = weekRange(date);
        return getGuitarSessions().filter(function (session) {
          return session && session.finishedAt && dateInRange(parseDate(session.finishedAt.slice(0, 10)), range.start, range.end);
        }).length;
      }

      function guitarSessionsForWeek(date) {
        var range = weekRange(date);
        return getGuitarSessions().filter(function (session) {
          return session && session.finishedAt && dateInRange(parseDate(session.finishedAt.slice(0, 10)), range.start, range.end);
        });
      }

      function renderGuitarPage() {
        if (!elements.guitarFocusInput) {
          return;
        }
        var session = getCurrentGuitarSession();
        var target = Math.max(1, Number(readText(STORAGE.guitarTarget, "4")) || 4);
        var focus = readText(STORAGE.guitarFocus, "");
        var nextStep = readText(STORAGE.guitarNextStep, "");
        var sessions = getGuitarSessions().slice().sort(function (left, right) {
          return String(right.finishedAt || "").localeCompare(String(left.finishedAt || ""));
        });
        var weekSessions = guitarSessionsForWeek(today);
        var weekCount = weekSessions.length;
        var weekMinutes = weekSessions.reduce(function (sum, entry) {
          return sum + Math.round((Number(entry.durationHours) || 0) * 60);
        }, 0);
        var targetMinutes = target * 30;
        var remainingSessions = Math.max(0, target - weekCount);
        var remainingMinutes = Math.max(0, targetMinutes - weekMinutes);
        var averageMinutes = weekCount ? Math.round(weekMinutes / weekCount) : 0;

        elements.guitarFocusInput.value = focus;
        elements.guitarNextStepInput.value = nextStep;
        elements.guitarSessionStatus.textContent = sessionStatusText("Guitar", session.startedAt);
        elements.guitarSessionHint.textContent = session.startedAt
          ? "Finish when you stop. If a Guitar task exists today, the time can land there."
          : "If a Guitar task is on today’s dashboard, the finished time can land there too.";
        elements.startGuitarSession.disabled = Boolean(session.startedAt);
        elements.finishGuitarSession.disabled = !session.startedAt;
        elements.guitarSessionSummary.innerHTML = "";
        elements.guitarRecentSessions.innerHTML = "";

        [
          {
            label: "This week",
            value: weekCount + " / " + target
          },
          {
            label: "Weekly target",
            value: String(target)
          },
          {
            label: "Minutes played",
            value: weekMinutes + " min"
          },
          {
            label: "Average session",
            value: averageMinutes ? averageMinutes + " min" : "Not yet"
          }
        ].forEach(function (item) {
          var card = document.createElement("div");
          card.className = "guitar-summary-card";
          card.innerHTML = "<span>" + item.label + "</span><strong>" + item.value + "</strong>";
          elements.guitarSessionSummary.appendChild(card);
        });

        if (session.startedAt) {
          elements.guitarSessionPlan.textContent = "Session is live. Stay with " + (focus || "the thing you came here to practise") + " and save the real result after.";
        } else if (remainingSessions > 0) {
          elements.guitarSessionPlan.textContent = "This week: " + weekMinutes + " / " + targetMinutes + " min. " + remainingSessions + " more session" + (remainingSessions === 1 ? "" : "s") + " and about " + remainingMinutes + " min to hit the target."
            + (nextStep ? " Practice next: " + nextStep + "." : "")
            + (focus ? " Current focus: " + focus + "." : "");
        } else {
          elements.guitarSessionPlan.textContent = "Weekly target reached. Keep the good part going."
            + (focus ? " Current focus: " + focus + "." : "")
            + (nextStep ? " Small practice: " + nextStep + "." : "");
        }

        sessions.slice(0, 4).forEach(function (entry) {
          var row = document.createElement("article");
          row.className = "guitar-history-item";
          var noteText = entry.note || entry.focus || entry.nextStep || "Saved session";
          row.innerHTML = "<div><strong>" + humanDate(entry.finishedAt.slice(0, 10)) + "</strong><p>" + noteText + "</p></div><em>" + Math.round((Number(entry.durationHours) || 0) * 60) + " min</em>";
          if (entry.focus || entry.nextStep) {
            row.title = [entry.focus, entry.nextStep].filter(Boolean).join(" · ");
          }
          elements.guitarRecentSessions.appendChild(row);
        });

        if (!elements.guitarRecentSessions.children.length) {
          var empty = document.createElement("p");
          empty.className = "body-support-empty";
          empty.textContent = "Finish one session and this space will start showing what you practised and how long you stayed with it.";
          elements.guitarRecentSessions.appendChild(empty);
        }
      }

      function renderCoachStageShell(options) {
        var section = document.createElement("section");
        section.className = "coach-stage " + (options.tone || "");

        var head = document.createElement("div");
        head.className = "coach-stage-head";
        head.innerHTML = "<h3>" + options.title + "</h3><p>" + options.description + "</p>";
        section.appendChild(head);

        section.appendChild(options.body);
        return section;
      }

      function renderCoachWarmupStage(session, template) {
        var body = document.createElement("div");
        body.className = "coach-stage-body";
        template.warmupGroups.forEach(function (group, groupIndex) {
          var groupBlock = document.createElement("div");
          groupBlock.className = "coach-group";
          var groupHead = document.createElement("div");
          groupHead.className = "coach-group-head";
          groupHead.appendChild(document.createElement("h4")).textContent = group.title;
          var addButton = document.createElement("button");
          addButton.type = "button";
          addButton.className = "coach-mini-action";
          addButton.textContent = "Add";
          addButton.addEventListener("click", function () {
            updateSkateCoachTemplate(function (latestTemplate) {
              latestTemplate.warmupGroups[groupIndex].items.push({
                id: makeId("warmup"),
                name: "New trick",
                target: "x5"
              });
            });
          });
          groupHead.appendChild(addButton);
          groupBlock.appendChild(groupHead);
          group.items.forEach(function (item, itemIndex) {
            var row = document.createElement("label");
            row.className = "coach-check-row";
            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = Boolean(session.warmupChecks[item.id]);
            checkbox.addEventListener("change", function () {
              updateSkateSession(function (latest) {
                latest.warmupChecks[item.id] = checkbox.checked;
                latest.warmupDone = false;
                latest.expandedStage = "warmup";
              });
            });
            var text = document.createElement("span");
            text.className = "coach-row-fields has-target";
            var nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "coach-inline-input";
            nameInput.value = item.name;
            nameInput.maxLength = 80;
            nameInput.addEventListener("input", function () {
              updateSkateCoachTemplate(function (latestTemplate) {
                latestTemplate.warmupGroups[groupIndex].items[itemIndex].name = nameInput.value.trim() || item.name;
              }, false);
            });
            text.appendChild(nameInput);
            var targetInput = document.createElement("input");
            targetInput.type = "text";
            targetInput.className = "coach-inline-target";
            targetInput.value = item.target;
            targetInput.maxLength = 20;
            targetInput.placeholder = "x5";
            targetInput.addEventListener("input", function () {
              updateSkateCoachTemplate(function (latestTemplate) {
                latestTemplate.warmupGroups[groupIndex].items[itemIndex].target = targetInput.value.trim();
              }, false);
            });
            text.appendChild(targetInput);
            row.appendChild(checkbox);
            row.appendChild(text);
            var removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "coach-mini-action quiet-danger";
            removeButton.textContent = "Delete";
            removeButton.addEventListener("click", function (event) {
              event.preventDefault();
              updateSkateCoachTemplate(function (latestTemplate) {
                if (latestTemplate.warmupGroups[groupIndex].items.length > 1) {
                  latestTemplate.warmupGroups[groupIndex].items.splice(itemIndex, 1);
                }
              });
            });
            row.appendChild(removeButton);
            groupBlock.appendChild(row);
          });
          body.appendChild(groupBlock);
        });

        var footer = document.createElement("div");
        footer.className = "coach-stage-footer";
        var doneButton = document.createElement("button");
        doneButton.type = "button";
        doneButton.className = "secondary-button coach-done-button";
        doneButton.textContent = "Done for today";
        doneButton.disabled = !warmupComplete(session, template);
        doneButton.addEventListener("click", function () {
          if (!warmupComplete(session, template)) {
            return;
          }
          updateSkateSession(function (latest) {
            latest.warmupDone = true;
            latest.expandedStage = "focus";
          });
        });
        footer.appendChild(doneButton);
        body.appendChild(footer);

        return renderCoachStageShell({
          key: "warmup",
          stageLabel: "Stage 1",
          title: "Warm Up & Maintain",
          description: "Start with the tricks you already own so the session feels confident before it feels hard.",
          summary: "Warm-up complete",
          completeLabel: "✅ Warm-up Complete",
          complete: warmupComplete(session, template) && session.warmupDone,
          expanded: session.expandedStage === "warmup",
          active: session.expandedStage === "warmup",
          tone: "tone-warmup",
          body: body
        });
      }

      function renderCoachFocusStage(session, template) {
        var body = document.createElement("div");
        body.className = "coach-stage-body coach-focus-body";

        var chooser = document.createElement("div");
        chooser.className = "coach-focus-chooser";
        chooser.appendChild(createFocusPicker("Flat focus", session.selectedFlat, function (value) {
          updateSkateSession(function (latest) {
            latest.selectedFlat = value;
            latest.focusDone = false;
            latest.expandedStage = "focus";
          });
          updateSkateCoachTemplate(function (latestTemplate) {
            latestTemplate.focusSuggestions.flat[0] = value || "Flat trick";
          }, false);
        }));
        chooser.appendChild(createFocusPicker("Transition focus", session.selectedTransition, function (value) {
          updateSkateSession(function (latest) {
            latest.selectedTransition = value;
            latest.focusDone = false;
            latest.expandedStage = "focus";
          });
          updateSkateCoachTemplate(function (latestTemplate) {
            latestTemplate.focusSuggestions.transition[0] = value || "Transition trick";
          }, false);
        }));
        body.appendChild(chooser);

        body.appendChild(renderPracticeCard("Flat", session.selectedFlat, session.focusCards.flat, "flat"));
        body.appendChild(renderPracticeCard("Transition", session.selectedTransition, session.focusCards.transition, "transition"));

        var footer = document.createElement("div");
        footer.className = "coach-stage-footer";
        var doneButton = document.createElement("button");
        doneButton.type = "button";
        doneButton.className = "secondary-button coach-done-button";
        doneButton.textContent = "Done for today";
        doneButton.addEventListener("click", function () {
          updateSkateSession(function (latest) {
            latest.focusDone = true;
            latest.expandedStage = "skill";
          });
        });
        footer.appendChild(doneButton);
        body.appendChild(footer);

        return renderCoachStageShell({
          key: "focus",
          title: "Today's Focus",
          description: "Pick two useful targets so the session has shape before you start throwing attempts around.",
          tone: "tone-focus",
          body: body
        });
      }

      function createFocusPicker(label, selectedValue, onChange) {
        var wrapper = document.createElement("label");
        wrapper.className = "coach-picker";
        wrapper.appendChild(document.createElement("span")).textContent = label;
        var input = document.createElement("input");
        input.type = "text";
        input.value = selectedValue;
        input.maxLength = 80;
        input.placeholder = "Choose one trick";
        function commitValue() {
          onChange(input.value.trim());
        }
        input.addEventListener("change", commitValue);
        input.addEventListener("blur", commitValue);
        input.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            input.blur();
          }
        });
        wrapper.appendChild(input);
        return wrapper;
      }

      function practiceGoalLabels(kind) {
        return kind === "transition"
          ? ["Commit one", "Ride away once", "Land three clean"]
          : ["Land one", "Land three", "Land five clean"];
      }

      function renderPracticeCard(kindLabel, trickName, cardState, kind) {
        var card = document.createElement("article");
        card.className = "practice-card";

        var head = document.createElement("div");
        head.className = "practice-head";
        head.innerHTML = "<span>" + kindLabel + "</span><h4>" + trickName + "</h4>";
        card.appendChild(head);

        var statuses = [
          { id: "not-started", label: "Not Started" },
          { id: "learning", label: "Learning" },
          { id: "almost-there", label: "Almost There" },
          { id: "consistent", label: "Consistent" }
        ];
        var statusRow = document.createElement("div");
        statusRow.className = "practice-status-row";
        statuses.forEach(function (status) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "status-pill";
          button.classList.toggle("active", cardState.status === status.id);
          button.textContent = status.label;
          button.addEventListener("click", function () {
            updateSkateSession(function (latest) {
              latest.focusCards[kind].status = status.id;
              latest.focusDone = false;
              latest.expandedStage = "focus";
            });
          });
          statusRow.appendChild(button);
        });
        card.appendChild(statusRow);

        var goalsWrap = document.createElement("div");
        goalsWrap.className = "practice-goals";
        goalsWrap.appendChild(document.createElement("span")).textContent = "Today's goal";
        practiceGoalLabels(kind).forEach(function (goalLabel, index) {
          var row = document.createElement("label");
          row.className = "coach-check-row compact";
          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = Boolean(cardState.goals[index]);
          checkbox.addEventListener("change", function () {
            updateSkateSession(function (latest) {
              latest.focusCards[kind].goals[index] = checkbox.checked;
              latest.focusDone = false;
              latest.expandedStage = "focus";
            });
          });
          var text = document.createElement("span");
          text.className = "coach-goal-label";
          text.textContent = goalLabel;
          row.appendChild(checkbox);
          row.appendChild(text);
          goalsWrap.appendChild(row);
        });
        card.appendChild(goalsWrap);

        var note = document.createElement("label");
        note.className = "coach-note-field";
        note.appendChild(document.createElement("span")).textContent = "Coach notes";
        var textarea = document.createElement("textarea");
        textarea.rows = 2;
        textarea.maxLength = 220;
        textarea.placeholder = "What should I remember while practicing this trick?";
        textarea.value = cardState.note;
        textarea.addEventListener("input", function () {
          updateSkateSession(function (latest) {
            latest.focusCards[kind].note = textarea.value;
          });
        });
        note.appendChild(textarea);
        card.appendChild(note);
        return card;
      }

      function renderCoachSkillStage(session, template) {
        var body = document.createElement("div");
        body.className = "coach-stage-body";

        var switchCard = document.createElement("div");
        switchCard.className = "coach-support-card";
        switchCard.innerHTML = "<h4>Switch</h4><p>Keep this light. It is here to build future tricks, not steal the whole session.</p>";
        template.skillBuilder.switchItems.forEach(function (item, index) {
          var row = document.createElement("label");
          row.className = "coach-check-row compact";
          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = Boolean(session.skillChecks[index]);
          checkbox.addEventListener("change", function () {
            updateSkateSession(function (latest) {
              latest.skillChecks[index] = checkbox.checked;
              latest.skillDone = false;
              latest.expandedStage = "skill";
            });
          });
          var text = document.createElement("span");
          text.className = "coach-row-fields";
          var nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.className = "coach-inline-input";
          nameInput.value = item;
          nameInput.maxLength = 80;
          nameInput.addEventListener("input", function () {
            updateSkateCoachTemplate(function (latestTemplate) {
              latestTemplate.skillBuilder.switchItems[index] = nameInput.value.trim() || item;
            }, false);
          });
          text.appendChild(nameInput);
          row.appendChild(checkbox);
          row.appendChild(text);
          var removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "coach-mini-action quiet-danger";
          removeButton.textContent = "Delete";
          removeButton.addEventListener("click", function (event) {
            event.preventDefault();
            updateSkateCoachTemplate(function (latestTemplate) {
              if (latestTemplate.skillBuilder.switchItems.length > 1) {
                latestTemplate.skillBuilder.switchItems.splice(index, 1);
              }
            });
          });
          row.appendChild(removeButton);
          switchCard.appendChild(row);
        });
        var addSwitch = document.createElement("button");
        addSwitch.type = "button";
        addSwitch.className = "coach-mini-action";
        addSwitch.textContent = "Add";
        addSwitch.addEventListener("click", function () {
          updateSkateCoachTemplate(function (latestTemplate) {
            latestTemplate.skillBuilder.switchItems.push("New switch skill");
          });
        });
        switchCard.appendChild(addSwitch);
        body.appendChild(switchCard);

        var reminderCard = document.createElement("div");
        reminderCard.className = "coach-support-card";
        reminderCard.appendChild(document.createElement("h4")).textContent = "Reminder";
        var reminderField = document.createElement("label");
        reminderField.className = "coach-note-field";
        var reminderText = document.createElement("textarea");
        reminderText.rows = 2;
        reminderText.maxLength = 220;
        reminderText.value = template.skillBuilder.reminder;
        reminderText.addEventListener("input", function () {
          updateSkateCoachTemplate(function (latestTemplate) {
            latestTemplate.skillBuilder.reminder = reminderText.value;
          }, false);
        });
        reminderField.appendChild(reminderText);
        reminderCard.appendChild(reminderField);
        reminderCard.appendChild(document.createElement("h4")).textContent = "Wall Ride";
        var wallRideField = document.createElement("label");
        wallRideField.className = "coach-note-field";
        var wallRideText = document.createElement("textarea");
        wallRideText.rows = 3;
        wallRideText.maxLength = 260;
        wallRideText.value = template.skillBuilder.wallRide;
        wallRideText.addEventListener("input", function () {
          updateSkateCoachTemplate(function (latestTemplate) {
            latestTemplate.skillBuilder.wallRide = wallRideText.value;
          }, false);
        });
        wallRideField.appendChild(wallRideText);
        reminderCard.appendChild(wallRideField);
        body.appendChild(reminderCard);

        var footer = document.createElement("div");
        footer.className = "coach-stage-footer";
        var doneButton = document.createElement("button");
        doneButton.type = "button";
        doneButton.className = "secondary-button coach-done-button";
        doneButton.textContent = "Done for today";
        doneButton.addEventListener("click", function () {
          updateSkateSession(function (latest) {
            latest.skillDone = true;
            latest.expandedStage = "";
          });
        });
        footer.appendChild(doneButton);
        body.appendChild(footer);

        return renderCoachStageShell({
          key: "skill",
          title: "Skill Builder",
          description: "Use this part for the quiet reps that make tomorrow's skating less chaotic.",
          tone: "tone-skill",
          body: body
        });
      }

      function resetSkateSessionState(message) {
        saveCurrentSkateSession(defaultSkateSession());
        pendingSkateLogDateKey = "";
        renderSkatePage();
        elements.skateSessionHint.textContent = message || "Fresh session checklist ready.";
      }

      function selectFeedbackIntensity(intensity) {
        document.querySelectorAll("#skateFeedbackIntensity [data-intensity]").forEach(function (button) {
          var active = button.dataset.intensity === intensity;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }

      function feedbackIntensityForDate(dateKey) {
        var saved = getSkateSettings().intensityByDate[dateKey];
        var sessions = getSkateSessions().filter(function (session) {
          return skateSessionCore.sessionDateKey(session) === dateKey;
        });
        return skateSessionCore.sessionIntensity(saved, sessions.length
          ? normalizedSessionIntensity(sessions[sessions.length - 1])
          : dateKey === formatDate(today) ? skateIntensityForToday(currentSkateHero(), getCurrentSkateSession()) : "yellow");
      }

      function openSkateFeedbackDialog(options) {
        var config = options && typeof options === "object" ? options : {};
        var dateKey = config.dateKey || formatDate(today);
        var durationMinutes = Math.max(1, Math.round(Number(config.durationMinutes) || 45));
        pendingSkateLogDateKey = dateKey;
        selectFeedbackIntensity(skateSessionCore.sessionIntensity(config.intensity, feedbackIntensityForDate(dateKey)));
        if (elements.skateDurationMinutes) {
          elements.skateDurationMinutes.value = String(durationMinutes);
        }
        if (elements.skateSessionDate) {
          elements.skateSessionDate.value = dateKey;
        }
        if (elements.skateImprovedNote) {
          elements.skateImprovedNote.value = "";
        }
        if (elements.skateNextFocusNote) {
          elements.skateNextFocusNote.value = "";
        }
        renderFeedbackScales();
        if (elements.skateSessionHint && config.hint) {
          elements.skateSessionHint.textContent = config.hint;
        }
        if (elements.skateFeedbackDialog && typeof elements.skateFeedbackDialog.showModal === "function") {
          elements.skateFeedbackDialog.showModal();
          return;
        }
        saveFinishedSkateSession({
          confidence: 3,
          intensity: skateSessionCore.sessionIntensity(config.intensity, feedbackIntensityForDate(dateKey)),
          progressToday: 3,
          durationMinutes: durationMinutes,
          improvedNote: "",
          nextFocusNote: "",
          dateKey: dateKey
        });
      }

      function startSkateSession() {
        updateSkateSession(function (latest) {
          latest.startedAt = new Date().toISOString();
        });
        elements.skateSessionHint.textContent = "Skate session started. Go get the reps.";
      }

      function finishSkateSession() {
        var session = getCurrentSkateSession();
        if (!session.startedAt) {
          elements.skateSessionHint.textContent = "No session is running yet. Use \"Log past session\" if you just want to save missed skate time.";
          return;
        }
        openSkateFeedbackDialog({
          dateKey: formatDate(today),
          durationMinutes: sessionDurationMinutes(session.startedAt, 45),
          hint: "Session ready to save for today."
        });
      }

      function finishedSkateDurationHours(feedback, startedAt) {
        return Math.max(0, (Math.max(1, Number(feedback.durationMinutes) || sessionDurationMinutes(startedAt, 45))) / 60);
      }

      function selectedWarmupNames(session, warmupItems) {
        return warmupItems.filter(function (item) {
          return session.warmupChecks[item.id];
        }).map(function (item) {
          return item.name;
        }).join(", ");
      }

      function learningItemsForSavedSession(session) {
        return [
          { kind: "flat", name: session.selectedFlat, status: session.focusCards.flat.status, goals: session.focusCards.flat.goals, note: session.focusCards.flat.note },
          { kind: "transition", name: session.selectedTransition, status: session.focusCards.transition.status, goals: session.focusCards.transition.goals, note: session.focusCards.transition.note }
        ];
      }

      function savedSkateSessionPayload(session, feedback, template, hero, intensity, durationHours, linkedTask, sessionWindow) {
        var focus = [session.selectedFlat, session.selectedTransition].filter(Boolean).join(" · ");
        var warmupItems = flattenWarmupItems(template);
        return {
          id: makeId("skate"),
          focus: focus,
          mainFocus: hero ? hero.mainFocus : focus,
          flowFocus: hero ? hero.flow : "",
          blockLabel: hero ? hero.blockLabel : "",
          warmups: selectedWarmupNames(session, warmupItems),
          warmupItems: template.warmupGroups,
          learningItems: learningItemsForSavedSession(session),
          checked: warmupItems.map(function (item) {
            return Boolean(session.warmupChecks[item.id]);
          }),
          note: [session.focusCards.flat.note, session.focusCards.transition.note].filter(Boolean).join(" | "),
          feedbackNote: [feedback.improvedNote, feedback.nextFocusNote].filter(Boolean).join(" | "),
          legSoreness: 3,
          skateQuality: Math.max(1, Math.min(5, Number(feedback.progressToday) || 3)),
          confidence: Math.max(1, Math.min(5, Number(feedback.confidence) || 3)),
          progressToday: Math.max(1, Math.min(5, Number(feedback.progressToday) || 3)),
          intensity: intensity,
          attemptBudget: skateCore ? skateCore.intensityMeta(intensity).attempts : "",
          benchmarkDone: Boolean(hero && hero.benchmark),
          benchmarkLabel: hero && hero.benchmarkLabel ? hero.benchmarkLabel : "",
          improvedNote: feedback.improvedNote || "",
          nextFocusNote: feedback.nextFocusNote || "",
          sessionPlan: {
            selectedFlat: session.selectedFlat,
            selectedTransition: session.selectedTransition,
            focusCards: session.focusCards,
            skillChecks: session.skillChecks,
            plannedIntensity: intensity
          },
          durationHours: durationHours,
          trackedInTask: Boolean(linkedTask),
          dateKey: sessionWindow.dateKey,
          startedAt: sessionWindow.startedAt,
          finishedAt: sessionWindow.finishedAt
        };
      }

      function savedSessionWindow(session, feedback) {
        var dateKey = skateSessionCore && typeof skateSessionCore.normalizeSessionDateKey === "function"
          ? skateSessionCore.normalizeSessionDateKey(feedback.dateKey || pendingSkateLogDateKey || formatDate(today))
          : (feedback.dateKey || pendingSkateLogDateKey || formatDate(today));
        var durationMinutes = Math.max(1, Number(feedback.durationMinutes) || sessionDurationMinutes(session.startedAt, 45));
        if (session.startedAt && dateKey === formatDate(today)) {
          return {
            startedAt: session.startedAt,
            finishedAt: new Date().toISOString(),
            dateKey: dateKey
          };
        }
        if (skateSessionCore && typeof skateSessionCore.datedSessionWindow === "function") {
          var window = skateSessionCore.datedSessionWindow(dateKey, durationMinutes);
          return {
            startedAt: window.startedAt,
            finishedAt: window.finishedAt,
            dateKey: dateKey
          };
        }
        return {
          startedAt: session.startedAt,
          finishedAt: new Date().toISOString(),
          dateKey: dateKey
        };
      }

      function saveFinishedSkateSession(feedback) {
        var session = getCurrentSkateSession();
        var sessions = getSkateSessions();
        var template = getSkateCoachTemplate();
        var hero = currentSkateHero();
        var durationHours = finishedSkateDurationHours(feedback, session.startedAt);
        var sessionWindow = savedSessionWindow(session, feedback || {});
        var linkedTask = sessionWindow.dateKey === formatDate(today)
          ? syncSessionTimeToTodayTask("skate", durationHours)
          : null;
        var intensity = skateSessionCore.sessionIntensity(feedback.intensity, feedbackIntensityForDate(sessionWindow.dateKey));
        sessions.push(savedSkateSessionPayload(session, feedback, template, hero, intensity, durationHours, linkedTask, sessionWindow));
        saveSkateSessions(sessions);
        updateSkateSettings(function (settings) {
          settings.intensityByDate[sessionWindow.dateKey] = intensity;
        });
        resetSkateSessionState(linkedTask
          ? "Session saved and added to \"" + linkedTask + "\"."
          : (sessionWindow.dateKey === formatDate(today)
            ? "Session saved. No matching skate task was found today."
            : "Session saved for " + humanDate(sessionWindow.dateKey) + "."));
        renderTotals();
      }

      function startGuitarSession() {
        saveCurrentGuitarSession({ startedAt: new Date().toISOString() });
        renderGuitarPage();
      }

      function finishGuitarSession() {
        var session = getCurrentGuitarSession();
        if (!session.startedAt) {
          renderGuitarPage();
          return;
        }
        if (elements.guitarSessionDialog && typeof elements.guitarSessionDialog.showModal === "function") {
          elements.guitarDurationMinutes.value = String(sessionDurationMinutes(session.startedAt, 30));
          elements.guitarSessionNote.value = "";
          elements.guitarSessionDialog.showModal();
          return;
        }
        saveFinishedGuitarSession({
          durationMinutes: sessionDurationMinutes(session.startedAt, 30),
          note: ""
        });
      }

      function saveFinishedGuitarSession(feedback) {
        var session = getCurrentGuitarSession();
        var sessions = getGuitarSessions();
        var durationHours = Math.max(0, (Math.max(1, Number(feedback.durationMinutes) || sessionDurationMinutes(session.startedAt, 30))) / 60);
        var linkedTask = syncSessionTimeToTodayTask("guitar", durationHours);

        sessions.push({
          id: makeId("guitar"),
          focus: readText(STORAGE.guitarFocus, ""),
          nextStep: readText(STORAGE.guitarNextStep, ""),
          note: feedback.note || "",
          durationHours: durationHours,
          trackedInTask: Boolean(linkedTask),
          startedAt: session.startedAt,
          finishedAt: new Date().toISOString()
        });
        saveGuitarSessions(sessions);
        saveCurrentGuitarSession({ startedAt: null });
        renderGuitarPage();
        renderTotals();
        elements.guitarSessionHint.textContent = linkedTask
          ? "Session saved and added to \"" + linkedTask + "\"."
          : "Session saved. No matching Guitar task was found today.";
      }

      function addBodyLog(event) {
        event.preventDefault();
        var type = normalizeBodySupportType(elements.bodyWorkoutType.value);
        var note = elements.bodyWorkoutName.value.trim();
        var minutes = Math.max(0, Number(elements.bodyWorkoutMinutes.value) || 0);
        var logs = getPhysicalLogs();

        logs.push({
          id: makeId("body"),
          date: formatDate(today),
          kind: type,
          name: bodySupportTypeLabel(type),
          status: "done",
          minutes: minutes,
          score: 0,
          note: note,
          createdAt: new Date().toISOString()
        });
        savePhysicalLogs(logs);
        elements.bodyWorkoutType.value = "gym";
        elements.bodyWorkoutName.value = "";
        elements.bodyWorkoutMinutes.value = "";
        renderSkatePage();
        renderTotals();
      }

      function renderScaleOptions(mount, name, labels, selectedValue) {
        mount.innerHTML = "";
        labels.forEach(function (label, index) {
          var value = index + 1;
          var option = document.createElement("label");
          option.className = "scale-option";
          var input = document.createElement("input");
          input.type = "radio";
          input.name = name;
          input.value = String(value);
          input.checked = value === selectedValue;
          var text = document.createElement("span");
          text.textContent = value + " " + label;
          option.appendChild(input);
          option.appendChild(text);
          mount.appendChild(option);
        });
      }

      function renderFeedbackScales() {
        if (!elements.progressTodayScale) {
          return;
        }
        renderScaleOptions(elements.confidenceScale, "confidence", feedbackScales.confidence, 3);
        renderScaleOptions(elements.progressTodayScale, "progressToday", feedbackScales.progressToday, 3);
      }

      function selectedScaleValue(name) {
        var selected = document.querySelector('input[name="' + name + '"]:checked');
        return selected ? Number(selected.value) : 3;
      }

      function submitSkateFeedback(event) {
        event.preventDefault();
        saveFinishedSkateSession({
          intensity: document.querySelector("#skateFeedbackIntensity [aria-pressed=\"true\"]").dataset.intensity,
          confidence: selectedScaleValue("confidence"),
          progressToday: selectedScaleValue("progressToday"),
          durationMinutes: Number(elements.skateDurationMinutes.value) || 45,
          dateKey: elements.skateSessionDate.value || pendingSkateLogDateKey || formatDate(today),
          improvedNote: elements.skateImprovedNote.value.trim(),
          nextFocusNote: elements.skateNextFocusNote.value.trim()
        });
        elements.skateFeedbackDialog.close();
      }

      function submitGuitarSession(event) {
        event.preventDefault();
        saveFinishedGuitarSession({
          durationMinutes: Number(elements.guitarDurationMinutes.value) || 30,
          note: elements.guitarSessionNote.value.trim()
        });
        elements.guitarSessionDialog.close();
      }

      function setMascotBubble(text) {
        if (!elements.mascotBubble) {
          return;
        }
        elements.mascotBubble.textContent = text;
      }

      function randomMascotLine() {
        var current = elements.mascotBubble ? elements.mascotBubble.textContent : "";
        var next = current;
        var attempts = 0;
        while (next === current && attempts < 8) {
          next = mascotLines[Math.floor(Math.random() * mascotLines.length)];
          attempts += 1;
        }
        return next;
      }

      // The mascot follows the mouse lightly and can be dragged to a new spot.
      function bindSoftMascot() {
        if (!elements.softMascot || !elements.mascotCard) {
          return;
        }

        var savedPosition = readJson(STORAGE.mascotPosition, { x: 0, y: 0 });
        var dragPosition = {
          x: Number(savedPosition.x) || 0,
          y: Number(savedPosition.y) || 0
        };
        var dragStart = null;
        var ignoreNextClick = false;

        syncMascotBubble();
        elements.mascotCard.style.setProperty("--mascot-drag-x", dragPosition.x.toFixed(2) + "px");
        elements.mascotCard.style.setProperty("--mascot-drag-y", dragPosition.y.toFixed(2) + "px");

        function saveMascotPosition() {
          writeJson(STORAGE.mascotPosition, dragPosition);
        }

        function moveMascot(event) {
          if (dragStart) {
            return;
          }
          var rect = elements.softMascot.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2;
          var centerY = rect.top + rect.height / 2;
          var dx = Math.max(-1, Math.min(1, (event.clientX - centerX) / Math.max(rect.width * 1.7, 1)));
          var dy = Math.max(-1, Math.min(1, (event.clientY - centerY) / Math.max(rect.height * 1.7, 1)));
          elements.softMascot.style.setProperty("--look-x", (dx * 3).toFixed(2) + "px");
          elements.softMascot.style.setProperty("--look-y", (dy * 2).toFixed(2) + "px");
          elements.softMascot.style.setProperty("--tilt", (dx * 4).toFixed(2) + "deg");
          elements.mascotCard.style.setProperty("--mascot-drift-x", (dx * 7).toFixed(2) + "px");
          elements.mascotCard.style.setProperty("--mascot-drift-y", (dy * 5).toFixed(2) + "px");
          elements.mascotCard.classList.add("is-near");
        }

        function scrollMascot() {
          var y = Math.sin(window.scrollY / 180) * 8;
          elements.mascotCard.style.setProperty("--mascot-drift-y", y.toFixed(2) + "px");
        }

        window.addEventListener("pointermove", moveMascot, { passive: true });
        window.addEventListener("scroll", scrollMascot, { passive: true });

        elements.softMascot.addEventListener("pointerdown", function (event) {
          dragStart = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: dragPosition.x,
            startY: dragPosition.y,
            moved: false
          };
          try {
            elements.softMascot.setPointerCapture(event.pointerId);
          } catch (error) {
            // Synthetic tests may not create an active pointer; real drags still work.
          }
          elements.mascotCard.classList.add("is-dragging");
        });

        elements.softMascot.addEventListener("pointermove", function (event) {
          if (!dragStart || event.pointerId !== dragStart.pointerId) {
            return;
          }
          var nextX = dragStart.startX + event.clientX - dragStart.x;
          var nextY = dragStart.startY + event.clientY - dragStart.y;
          dragStart.moved = dragStart.moved || Math.abs(nextX - dragStart.startX) + Math.abs(nextY - dragStart.startY) > 5;
          dragPosition.x = nextX;
          dragPosition.y = nextY;
          elements.mascotCard.style.setProperty("--mascot-drag-x", dragPosition.x.toFixed(2) + "px");
          elements.mascotCard.style.setProperty("--mascot-drag-y", dragPosition.y.toFixed(2) + "px");
        });

        elements.softMascot.addEventListener("pointerup", function (event) {
          if (!dragStart || event.pointerId !== dragStart.pointerId) {
            return;
          }
          ignoreNextClick = dragStart.moved;
          dragStart = null;
          elements.mascotCard.classList.remove("is-dragging");
          saveMascotPosition();
        });

        window.addEventListener("pointerleave", function () {
          elements.softMascot.style.setProperty("--look-x", "0px");
          elements.softMascot.style.setProperty("--look-y", "0px");
          elements.softMascot.style.setProperty("--tilt", "0deg");
          elements.mascotCard.style.setProperty("--mascot-drift-x", "0px");
          scrollMascot();
          elements.mascotCard.classList.remove("is-near");
        });

        scrollMascot();

        elements.softMascot.addEventListener("click", function () {
          if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
          }
          setMascotChatOpen(!mascotState.chatOpen);
          elements.softMascot.classList.remove("is-excited");
          window.requestAnimationFrame(function () {
            elements.softMascot.classList.add("is-excited");
          });
          window.setTimeout(function () {
            elements.softMascot.classList.remove("is-excited");
          }, 1600);
        });

        window.setInterval(function () {
          if (!document.hidden) {
            syncMascotBubble();
          }
        }, 45000);
      }

      function updateLiveTimers() {
        renderMeditation();
        var tasks = getTodayTasks();
        var hasRunningTimer = false;
        tasks.forEach(function (task) {
          var readout = document.querySelector('[data-timer-id="' + task.id + '"]');
          if (readout) {
            readout.textContent = formatTimer(elapsedTaskSeconds(task));
          }
          if (task.timerStartedAt) {
            hasRunningTimer = true;
          }
        });
        if (hasRunningTimer) {
          renderLiveSummaryPanels();
        }
        if (elements.skateSessionHint) {
          var skateSession = getCurrentSkateSession();
          if (skateSession.startedAt) {
            elements.skateSessionHint.textContent = "Skate session running · " + formatTimer(startedSessionSeconds(skateSession.startedAt));
          }
        }
        if (elements.guitarSessionStatus) {
          var guitarSession = getCurrentGuitarSession();
          elements.guitarSessionStatus.textContent = sessionStatusText("Guitar", guitarSession.startedAt);
        }
      }

      // Calendar events are simple date pills saved with the rest of the planner data.
      function renderCalendar() {
        var year = calendarCursor.getFullYear();
        var month = calendarCursor.getMonth();
        var firstOfMonth = new Date(year, month, 1);
        var start = new Date(year, month, 1 - firstOfMonth.getDay());
        var events = getEvents();
        var todayKey = formatDate(today);

        if (elements.currentMonthLabel) {
          elements.currentMonthLabel.textContent = monthNames[month] + " " + year;
        }
        elements.calendarGrid.innerHTML = "";

        weekdays.forEach(function (name) {
          var cell = document.createElement("div");
          cell.className = "weekday";
          cell.textContent = name;
          elements.calendarGrid.appendChild(cell);
        });

        for (var i = 0; i < 42; i += 1) {
          var cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          var dateKey = formatDate(cellDate);
          var routineInfo = weeklyPlannerDayForDate(cellDate);
          var routineType = dayTypeById(routineInfo.day.type);
          var dayEvents = events
            .filter(function (event) {
              return event.date === dateKey;
            })
            .sort(calendarCore.compareEventsChronologically);
          var monthEvents = visibleMonthlyEvents(dayEvents);

          var button = document.createElement("button");
          button.type = "button";
          button.className = "day-cell";
          if (cellDate.getMonth() !== month) {
            button.classList.add("outside");
          }
          if (dateKey === todayKey) {
          button.classList.add("today");
        }
          if (dateKey === selectedDate) {
            button.classList.add("selected");
          }
          button.classList.add(routineType.className);
          button.setAttribute("aria-label", "Select " + humanDate(dateKey));
          button.addEventListener("click", function (key) {
            return function (event) {
              event.stopPropagation();
              selectedDate = key;
              weeklyPlannerUiState.expandedDateKey = key;
              weeklyPlannerUiState.activityPickerOpen = false;
              renderWeeklyPlannerSection();
              renderCalendar();
              if (elements.eventStartTime) {
                elements.eventStartTime.focus();
              }
            };
          }(dateKey));

          var number = document.createElement("div");
          number.className = "day-number";
          number.appendChild(document.createTextNode(String(cellDate.getDate())));
          if (dateKey === todayKey) {
            var todayMark = document.createElement("span");
            todayMark.className = "today-mark";
            todayMark.setAttribute("aria-label", "Today");
            number.appendChild(todayMark);
          }
          button.appendChild(number);

          var pills = document.createElement("div");
          pills.className = "event-pills";
          monthEvents.slice(0, 4).forEach(function (event) {
            var pill = document.createElement("button");
            pill.type = "button";
            pill.className = "event-pill " + categoryClass(event.category);
            var startMinutes = calendarCore.parseEventTimeMinutes(event.startTime || event.title);
            if (startMinutes !== null) {
              var startLabel = document.createElement("span");
              startLabel.className = "event-pill-start";
              startLabel.textContent = pad(Math.floor(startMinutes / 60)) + ":" + pad(startMinutes % 60);
              pill.appendChild(startLabel);
            }
            var label = document.createElement("span");
            label.className = "event-pill-name";
            label.textContent = monthEventChipLabel(event.title);
            pill.appendChild(label);
            var timing = calendarCore.eventTimeLabel(event);
            pill.title = [event.title, timing, event.category, event.note].filter(Boolean).join(" · ");
            pill.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              startEditEvent(event.id);
            });
            pills.appendChild(pill);
          });
          if (monthEvents.length > 4) {
            var more = document.createElement("span");
            more.className = "event-pill more-pill";
            more.textContent = "+" + (monthEvents.length - 4) + " more";
            pills.appendChild(more);
          }
          button.appendChild(pills);
          elements.calendarGrid.appendChild(button);
        }
      }

      function renderSelectedDate() {
        if (!elements.eventEditorCard) {
          return;
        }
        var events = plannerEventsForDate(selectedDate);
        var summary = plannerDaySummary(selectedDate);
        var type = summary.dayType;

        elements.selectedDateHeading.textContent = humanDate(selectedDate);
        if (elements.selectedDateHint) {
          elements.selectedDateHint.textContent = plannerGuidanceHint(summary, selectedDate);
        }
        elements.formHint.textContent = editingEventId ? "Edit this block to move, shorten, or change it." : "Selected: " + selectedDate;
        elements.eventDate.value = selectedDate;
        if (elements.eventEffort && weeklyPlannerCore) {
          elements.eventEffort.value = weeklyPlannerCore.defaultEffortForCategory(elements.eventCategory.value);
        }
        if (elements.plannerDayStatusHint) {
          elements.plannerDayStatusHint.textContent = plannerCapacityHint(summary, selectedDate);
        }
        if (elements.plannerAddActivityButton) {
          elements.plannerAddActivityButton.disabled = false;
        }
        elements.selectedDateEvents.innerHTML = "";

        if (events.length === 0) {
          var empty = document.createElement("li");
          empty.className = "selected-event empty";
          empty.textContent = type.id === "recovery" ? "Rest protected." : "No activities on this day yet.";
          elements.selectedDateEvents.appendChild(empty);
        } else {
          events.forEach(function (event) {
            var item = document.createElement("li");
            item.className = "selected-event " + categoryClass(event.category);
            item.addEventListener("click", function (clickEvent) {
              if (clickEvent.target && typeof clickEvent.target.closest === "function" && clickEvent.target.closest("button")) {
                return;
              }
              clickEvent.stopPropagation();
              startEditEvent(event.id);
            });

            var title = document.createElement("div");
            title.className = "selected-event-title";
            title.textContent = [formatPlannerRange(event), event.title || plannerCategoryMeta(event.category).shortLabel]
              .filter(Boolean)
              .join("  ");

            var tag = document.createElement("span");
            tag.className = "tag " + categoryClass(event.category);
            tag.textContent = plannerCategoryMeta(event.category).label;

            item.appendChild(title);
            item.appendChild(tag);

            if (event.note) {
              var note = document.createElement("p");
              note.className = "selected-event-note";
              note.textContent = event.note;
              item.appendChild(note);
            }

            var actions = document.createElement("div");
            actions.className = "selected-event-actions";

            var editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "secondary-button";
            editButton.textContent = "Move or shorten";
            editButton.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              startEditEvent(event.id);
            });
            actions.appendChild(editButton);

            var deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "secondary-button quiet-danger";
            deleteButton.textContent = "Remove";
            deleteButton.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              deleteEvent(event.id);
            });
            actions.appendChild(deleteButton);
            item.appendChild(actions);

            elements.selectedDateEvents.appendChild(item);
          });
        }
        renderPlannerActivityPicker();
        renderPlannerLoadPreview();
      }

      function renderPlannerActivityPicker() {
        if (!elements.plannerActivityPicker || !elements.plannerActivityOptions) {
          return;
        }
        var summary = plannerDaySummary(selectedDate);
        var options = weeklyPlannerCore.categoryOptions(summary.dayType.id, plannerEventsForDate(selectedDate), {
          skateStreakActive: skateStreakActiveForDate(selectedDate)
        });
        elements.plannerActivityPicker.hidden = !weeklyPlannerUiState.activityPickerOpen;
        if (!weeklyPlannerUiState.activityPickerOpen) {
          elements.plannerActivityOptions.innerHTML = "";
          return;
        }
        if (elements.plannerActivityPickerHint) {
          elements.plannerActivityPickerHint.textContent = "Choose a category, then set its time and effort. Your exact load shows before you save.";
        }
        elements.plannerActivityOptions.innerHTML = "";
        options.forEach(function (option) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "planner-activity-option " + option.className;
          button.disabled = option.disabled;
          button.textContent = option.label;
          if (option.reason) {
            button.title = option.reason;
          }
          button.addEventListener("click", function () {
            weeklyPlannerUiState.selectedActivityCategory = option.category;
            openEventComposer(selectedDate, "", option.reason || "Add a time block for " + option.label + ".");
          });
          elements.plannerActivityOptions.appendChild(button);
        });
      }

      function resetEventForm(message) {
        editingEventId = null;
        draftEventDayPart = "";
        elements.eventNote.value = "";
        elements.eventDate.value = selectedDate;
        if (elements.eventTitle) {
          elements.eventTitle.value = "";
        }
        if (elements.eventStartTime) {
          elements.eventStartTime.value = "";
        }
        if (elements.eventEndTime) {
          elements.eventEndTime.value = "";
        }
        if (elements.eventReminderOnly) {
          elements.eventReminderOnly.checked = false;
        }
        if (elements.eventReminder) {
          elements.eventReminder.value = "0";
        }
        weeklyPlannerUiState.selectedActivityCategory = "";
        if (elements.eventEffort && weeklyPlannerCore) {
          elements.eventEffort.value = weeklyPlannerCore.defaultEffortForCategory(elements.eventCategory.value);
        }
        elements.eventSaveButton.textContent = "Save activity";
        elements.formHint.textContent = message || "Selected: " + selectedDate;
        renderPlannerLoadPreview();
      }

      function startEditEvent(id) {
        var event = getEvents().find(function (item) {
          return item.id === id;
        });
        if (!event) {
          return;
        }
        editingEventId = id;
        draftEventDayPart = event.dayPart || "";
        selectedDate = event.date;
        calendarCursor = parseDate(event.date);
        weeklyPlannerUiState.expandedDateKey = event.date;
        weeklyPlannerUiState.activityPickerOpen = false;
        weeklyPlannerUiState.selectedActivityCategory = normalizeEventCategory(event.category);
        var fallback = eventTimeFallback(event.title);
        var cleanTitle = eventTitleWithoutLeadingTime(event.title);
        elements.eventDate.value = event.date || selectedDate;
        if (elements.eventTitle) {
          elements.eventTitle.value = cleanTitle || event.title || "";
        }
        if (elements.eventStartTime) {
          elements.eventStartTime.value = normalizeClockValue(event.startTime || fallback.startTime);
        }
        if (elements.eventEndTime) {
          elements.eventEndTime.value = normalizeClockValue(event.endTime || fallback.endTime);
        }
        if (elements.eventReminderOnly) {
          elements.eventReminderOnly.checked = Boolean(event.reminderOnly);
        }
        if (elements.eventReminder) {
          elements.eventReminder.value = String(normalizeReminderMinutes(event.reminderMinutes));
        }
        elements.eventNote.value = event.note || "";
        elements.eventCategory.value = normalizeEventCategory(event.category);
        if (elements.eventEffort && weeklyPlannerCore) {
          elements.eventEffort.value = weeklyPlannerCore.normalizeEffort(event.effort, event.category);
        }
        elements.eventSaveButton.textContent = "Update activity";
        renderWeeklyPlannerSection();
        renderCalendar();
        if (elements.eventTitle) {
          elements.eventTitle.focus();
        } else if (elements.eventStartTime) {
          elements.eventStartTime.focus();
        }
      }

      function deleteEvent(id) {
        var events = getEvents();
        var event = events.find(function (item) {
          return item.id === id;
        });
        if (!event) {
          return;
        }
        if (!window.confirm("Delete \"" + event.title + "\"?")) {
          return;
        }
        clearGoalStepReferenceByEventId(id);
        saveEvents(events.filter(function (item) {
          return item.id !== id;
        }));
        if (editingEventId === id) {
          resetEventForm("Event deleted.");
        }
        renderCalendar();
        renderGoalPlanner();
        renderWeeklyPlannerSection();
        renderSelectedDate();
        renderTasks();
        renderTotals();
      }

      function addEvent(event) {
        event.preventDefault();
        var category = normalizeEventCategory(elements.eventCategory.value);
        var effort = weeklyPlannerCore && elements.eventEffort
          ? weeklyPlannerCore.normalizeEffort(elements.eventEffort.value, category)
          : "standard";
        var customTitle = String((elements.eventTitle && elements.eventTitle.value) || "").trim();
        var reminderOnly = Boolean(elements.eventReminderOnly && elements.eventReminderOnly.checked);
        var reminderMinutes = normalizeReminderMinutes(elements.eventReminder && elements.eventReminder.value);
        var title = customTitle || plannerCategoryMeta(category).shortLabel;
        var note = elements.eventNote.value.trim();
        var startTime = normalizeClockValue(elements.eventStartTime && elements.eventStartTime.value);
        var endTime = normalizeClockValue(elements.eventEndTime && elements.eventEndTime.value);
        var eventDate = elements.eventDate.value || selectedDate;
        if (!title) {
          elements.formHint.textContent = "Add a name so you can find this again.";
          if (elements.eventTitle) {
            elements.eventTitle.focus();
          }
          return;
        }
        if (reminderMinutes > 0 && !startTime) {
          elements.formHint.textContent = "Pick a start time to send a Telegram reminder.";
          if (elements.eventStartTime) {
            elements.eventStartTime.focus();
          }
          return;
        }
        var routineInfo = weeklyPlannerDayForDate(parseDate(eventDate));
        var fitResult = weeklyPlannerCore.canAddActivity(routineInfo.day.type, plannerEventsForDate(eventDate).filter(function (item) {
          return item.id !== editingEventId;
        }), {
          category: category,
          effort: effort,
          title: title,
          startTime: startTime,
          endTime: endTime,
          reminderOnly: reminderOnly
        }, {
          skateStreakActive: skateStreakActiveForDate(eventDate)
        });

        if (!fitResult.allowed) {
          elements.formHint.textContent = fitResult.reason;
          if (elements.eventStartTime) {
            elements.eventStartTime.focus();
          }
          return;
        }

        var events = getEvents();
        var savedEvent = null;
        if (editingEventId) {
          events = events.map(function (item) {
            if (item.id !== editingEventId) {
              return item;
            }
            savedEvent = Object.assign({}, item, {
              date: eventDate,
              title: title,
              note: note,
              category: category,
              effort: effort,
              dayPart: draftEventDayPart || item.dayPart || "",
              startTime: startTime,
              endTime: endTime,
              reminderOnly: reminderOnly,
              reminderMinutes: reminderMinutes,
              updatedAt: new Date().toISOString()
            });
            delete savedEvent.reminderSentAt;
            delete savedEvent.reminderSentFor;
            return savedEvent;
          });
        } else {
          savedEvent = {
            id: makeId("event"),
            date: eventDate,
            title: title,
            note: note,
            category: category,
            effort: effort,
            dayPart: draftEventDayPart || "",
            startTime: startTime,
            endTime: endTime,
            reminderOnly: reminderOnly,
            reminderMinutes: reminderMinutes,
            createdAt: new Date().toISOString()
          };
          events.push(savedEvent);
        }
        saveEvents(events);
        if (savedEvent) {
          syncGoalStepReferenceFromEvent(savedEvent);
        }

        selectedDate = eventDate;
        calendarCursor = new Date(parseDate(selectedDate).getFullYear(), parseDate(selectedDate).getMonth(), 1);
        weeklyPlannerUiState.expandedDateKey = selectedDate;
        weeklyPlannerUiState.activityPickerOpen = false;
        resetEventForm((editingEventId ? "Updated " : "Saved for ") + humanDate(selectedDate) + ".");
        renderGoalPlanner();
        renderWeeklyPlannerSection();
        renderCalendar();
        renderSelectedDate();
        renderTasks();
        renderTotals();
      }

      function addTask(event) {
        event.preventDefault();
        var label = elements.taskTitle.value.trim();
        var scheduledTime = normalizeScheduledTime(elements.taskTime && elements.taskTime.value);
        var reminderMinutes = normalizeReminderMinutes(elements.taskReminder && elements.taskReminder.value);
        if (!label) {
          elements.taskTitle.focus();
          return;
        }
        var tasks = getTodayTasks();
        var nextTask = {
          id: makeId("task"),
          label: label,
          activity: elements.taskActivity.value,
          hours: 0,
          timerSeconds: 0,
          timerStartedAt: null,
          done: false,
          createdAt: new Date().toISOString(),
          scheduledTime: scheduledTime,
          reminderMinutes: reminderMinutes,
          reminderSentAt: "",
          reminderSentFor: ""
        };
        tasks.push(nextTask);
        saveTodayTasks(tasks);
        logActivity({
          action: "task_created",
          entityType: "task",
          entityId: nextTask.id,
          dateKey: formatDate(today),
          before: null,
          after: nextTask,
          meta: {
            activity: nextTask.activity,
            label: nextTask.label
          }
        });
        elements.taskTitle.value = "";
        if (elements.taskTime) {
          elements.taskTime.value = "";
        }
        if (elements.taskReminder) {
          elements.taskReminder.value = "0";
        }
        renderTasks();
      }

      function plannerDataSnapshot() {
        const data = storageCore.selectBackupData(memoryStore, [STORAGE.guitarCurrentSession]);
        return {
          app: "Yuan's Planner",
          version: 2,
          exportedAt: new Date().toISOString(),
          storage: serverStorageAvailable ? "sqlite" : "browser-fallback",
          data: data
        };
      }

      function exportBackup() {
        var payload = JSON.stringify(plannerDataSnapshot(), null, 2);
        var blob = new Blob([payload], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "yuan-planner-backup-" + formatDate(today) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        elements.backupStatus.textContent = "Backup exported.";
      }

      function importBackup(event) {
        var file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var payload = JSON.parse(String(reader.result || "{}"));
            var data = payload.data || payload;
            var imported = 0;
            Object.keys(data).forEach(function (key) {
              if (isPlannerKey(key) && key !== STORAGE.guitarCurrentSession && typeof data[key] === "string") {
                persistRaw(key, data[key]);
                imported += 1;
              }
            });
            sanitizeTransientSessionData();
            if (serverStorageAvailable) {
              fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: data })
              }).catch(function () {});
            }
            elements.backupStatus.textContent = "Imported " + imported + " saved items.";
            renderTasks();
            renderTotals();
            renderMoney();
            renderCalendar();
            renderSkatePage();
            renderGuitarPage();
            renderSelectedDate();
            renderJournalPage();
            renderDashboardInsight();
          } catch (error) {
            elements.backupStatus.textContent = "That backup file could not be read.";
          }
          elements.importData.value = "";
        };
        reader.readAsText(file);
      }

      function bindEvents() {
        bindEvent(elements.prevMonth, "click", function () {
          calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
          renderCalendar();
        });

        bindEvent(elements.nextMonth, "click", function () {
          calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
          renderCalendar();
        });

        if (elements.prevWeek) {
          elements.prevWeek.addEventListener("click", function () {
            shiftSelectedWeek(-1);
          });
        }

        if (elements.nextWeek) {
          elements.nextWeek.addEventListener("click", function () {
            shiftSelectedWeek(1);
          });
        }
        if (elements.setWeekButton) {
          elements.setWeekButton.addEventListener("click", function () {
            weeklyPlannerUiState.weekSetupOpen = true;
            weeklyPlannerUiState.weekSetupDraft = getWeeklyPlannerWeek(parseDate(selectedDate));
            renderWeeklyPlanner();
          });
        }

        bindEvent(elements.eventForm, "submit", addEvent);
        [elements.eventCategory, elements.eventEffort, elements.eventStartTime, elements.eventEndTime, elements.eventDate, elements.eventReminderOnly].filter(Boolean).forEach(function (field) {
          field.addEventListener("input", function () {
            renderPlannerLoadPreview();
          });
          field.addEventListener("change", function () {
            if (field === elements.eventCategory && elements.eventEffort && weeklyPlannerCore) {
              elements.eventEffort.value = weeklyPlannerCore.defaultEffortForCategory(elements.eventCategory.value);
            }
            renderPlannerLoadPreview();
          });
        });
        bindEvent(elements.eventDate, "change", function () {
          if (elements.eventDate.value) {
            selectedDate = elements.eventDate.value;
            calendarCursor = new Date(parseDate(selectedDate).getFullYear(), parseDate(selectedDate).getMonth(), 1);
            weeklyPlannerUiState.expandedDateKey = selectedDate;
            weeklyPlannerUiState.activityPickerOpen = false;
            renderWeeklyPlannerSection();
            renderCalendar();
          }
        });
        if (elements.plannerAddActivityButton) {
          elements.plannerAddActivityButton.addEventListener("click", function () {
            weeklyPlannerUiState.activityPickerOpen = !weeklyPlannerUiState.activityPickerOpen;
            renderPlannerActivityPicker();
          });
        }
        if (elements.taskForm) {
          elements.taskForm.addEventListener("submit", addTask);
        }
        if (elements.dayStateOptions) {
          Array.prototype.forEach.call(elements.dayStateOptions.querySelectorAll("[data-day-state]"), function (button) {
            button.addEventListener("click", function () {
              saveDayState(formatDate(today), button.dataset.dayState);
              renderDayStateOptions();
              renderMascotQuickAsks();
              renderDashboardInsight();
              syncMascotBubble();
            });
          });
        }
        if (elements.moneyQuickForm) {
          elements.moneyQuickForm.addEventListener("submit", addMoneyTransaction);
        }
        if (elements.moneyQuickVendor) {
          elements.moneyQuickVendor.addEventListener("blur", applyMoneyVendorCategorySuggestion);
        }
        if (elements.moneyTransferForm) {
          elements.moneyTransferForm.addEventListener("submit", addMoneyTransfer);
        }
        bindEvent(elements.exportData, "click", exportBackup);
        bindEvent(elements.importData, "change", importBackup);
        if (elements.addGoalPlannerItem) {
          elements.addGoalPlannerItem.addEventListener("click", function () {
            var newGoalId = makeId("goal");
            updateGoalPlanner(function (latest) {
              var goal = emptyGoalItem();
              goal.id = newGoalId;
              latest.push(goal);
            });
            expandedGoalId = newGoalId;
            renderGoalPlanner();
          });
        }

        if (elements.journalDate) {
          elements.journalDate.addEventListener("change", function () {
            selectJournalDate(elements.journalDate.value || formatDate(today));
          });
        }

        if (elements.journalTodayButton) {
          elements.journalTodayButton.addEventListener("click", function () {
            selectJournalDate(formatDate(today));
          });
        }

        document.getElementById("journalMinutes").addEventListener("change", saveJournalDraft);
        document.getElementById("meditationForm").addEventListener("submit", function (event) {
          event.preventDefault();
          var state = readJson(STORAGE.meditation, { active: null, sessions: [] });
          if (state.active) return;
          var minutes = Number(document.getElementById("meditationMinutes").value);
          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
          var now = Date.now();
          state.active = { id: makeId("meditation"), minutes: minutes, dateKey: formatDate(new Date(now)), startedAt: now, endsAt: now + minutes * 60000 };
          writeJson(STORAGE.meditation, state);
          renderMeditation();
        });
        document.getElementById("cancelMeditation").addEventListener("click", function () {
          var state = readJson(STORAGE.meditation, { sessions: [] });
          state.active = null;
          writeJson(STORAGE.meditation, state);
          renderMeditation();
        });
        if (elements.journalTitle) {
          elements.journalTitle.addEventListener("input", saveJournalDraft);
        }

        if (elements.journalContent) {
          elements.journalContent.addEventListener("input", saveJournalDraft);
        }

        if (elements.journalStateContext) {
          elements.journalStateContext.addEventListener("input", saveJournalDraft);
        }

        if (elements.journalEnergyOptions) {
          Array.prototype.forEach.call(elements.journalEnergyOptions.querySelectorAll("[data-energy-state]"), function (button) {
            button.addEventListener("click", function () {
              setActiveTrackerButtons(elements.journalEnergyOptions, "data-energy-state", button.dataset.energyState);
              saveJournalDraft();
            });
          });
        }

        if (elements.journalFocusOptions) {
          Array.prototype.forEach.call(elements.journalFocusOptions.querySelectorAll("[data-focus-state]"), function (button) {
            button.addEventListener("click", function () {
              setActiveTrackerButtons(elements.journalFocusOptions, "data-focus-state", button.dataset.focusState);
              saveJournalDraft();
            });
          });
        }

        if (elements.journalSearch) {
          elements.journalSearch.addEventListener("input", renderJournalArchive);
        }

        bindEvent(elements.startSkateSession, "click", startSkateSession);
        bindEvent(elements.finishSkateSession, "click", finishSkateSession);
        if (elements.logSkateSession) {
          elements.logSkateSession.addEventListener("click", function () {
            openSkateFeedbackDialog({
              dateKey: formatDate(today),
              durationMinutes: 45,
              hint: "Logging a skate session without the timer is okay too."
            });
          });
        }
        if (elements.skateRestDay) {
          elements.skateRestDay.addEventListener("change", function () {
            updateSkateSettings(function (settings) {
              settings.restDayOfWeek = normalizeSkateRestDay(elements.skateRestDay.value);
              settings.extraRestDayOfWeek = normalizeOptionalSkateRestDay(settings.extraRestDayOfWeek, settings.restDayOfWeek);
            });
          });
        }
        if (elements.skateExtraRestDay) {
          elements.skateExtraRestDay.addEventListener("change", function () {
            updateSkateSettings(function (settings) {
              settings.extraRestDayOfWeek = normalizeOptionalSkateRestDay(elements.skateExtraRestDay.value, settings.restDayOfWeek);
            });
          });
        }
        if (elements.skateCurrentDay) {
          elements.skateCurrentDay.addEventListener("change", function () {
            updateSkateSettings(function (settings) {
              settings.currentProgramDay = clampSkateProgramDay(elements.skateCurrentDay.value);
            });
          });
        }
        bindEvent(elements.bodyLogForm, "submit", addBodyLog);
        if (elements.skateIntensityToggle) {
          Array.prototype.forEach.call(elements.skateIntensityToggle.querySelectorAll("[data-intensity]"), function (button) {
            button.addEventListener("click", function () {
              updateSkateSettings(function (settings) {
                settings.intensityByDate[formatDate(today)] = button.dataset.intensity;
              });
              updateSkateSession(function (latest) {
                latest.plannedIntensity = button.dataset.intensity;
              });
            });
          });
        }
        document.querySelectorAll("#skateFeedbackIntensity [data-intensity]").forEach(function (button) {
          button.addEventListener("click", function () { selectFeedbackIntensity(button.dataset.intensity); });
        });
        bindEvent(elements.skateSessionDate, "change", function () {
          selectFeedbackIntensity(feedbackIntensityForDate(elements.skateSessionDate.value));
        });
        bindEvent(elements.skateFeedbackForm, "submit", submitSkateFeedback);
        bindEvent(elements.cancelSkateFeedback, "click", function () {
          pendingSkateLogDateKey = "";
          if (elements.skateFeedbackDialog && typeof elements.skateFeedbackDialog.close === "function") {
            elements.skateFeedbackDialog.close();
          }
        });

        bindEvent(elements.guitarFocusInput, "input", function () {
          writeText(STORAGE.guitarFocus, elements.guitarFocusInput.value);
        });
        bindEvent(elements.guitarNextStepInput, "input", function () {
          writeText(STORAGE.guitarNextStep, elements.guitarNextStepInput.value);
        });
        bindEvent(elements.startGuitarSession, "click", startGuitarSession);
        bindEvent(elements.finishGuitarSession, "click", finishGuitarSession);
        bindEvent(elements.guitarSessionForm, "submit", submitGuitarSession);
        bindEvent(elements.cancelGuitarSession, "click", function () {
          if (elements.guitarSessionDialog && typeof elements.guitarSessionDialog.close === "function") {
            elements.guitarSessionDialog.close();
          }
        });

        if (elements.toggleMascotChat) {
          elements.toggleMascotChat.addEventListener("click", function () {
            setMascotChatOpen(!mascotState.chatOpen);
          });
        }

        if (elements.openAiAssist) {
          elements.openAiAssist.addEventListener("click", function () {
            setMascotChatOpen(true);
            if (window.innerWidth <= 1120) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          });
        }

        window.addEventListener("resize", syncMascotMobileVisibility);

        if (elements.openPatternHistory) {
          elements.openPatternHistory.addEventListener("click", function () {
            openPatternHistoryDialog();
          });
        }

        if (elements.mascotChatForm) {
          elements.mascotChatForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var question = elements.mascotQuestion ? elements.mascotQuestion.value : "";
            if (!String(question || "").trim()) {
              return;
            }
            setMascotChatOpen(true);
            askMascot(question);
            elements.mascotQuestion.value = "";
          });
        }
      }

      async function init() {
        await hydrateStore();
        window.addEventListener("storage", syncExternalPlannerStorage);
        bindNavigation();
        runUiSafely("activity choices", renderActivities);
        runUiSafely("workout options", renderWorkoutOptions);
        runUiSafely("feedback scales", renderFeedbackScales);
        runUiSafely("today's tasks", renderTasks);
        runUiSafely("dashboard", renderTotals);
        runUiSafely("money", renderMoney);
        runUiSafely("journal", renderJournalPage);
        runUiSafely("skate", renderSkatePage);
        runUiSafely("guitar", renderGuitarPage);
        runUiSafely("selected day", renderSelectedDate);
        runUiSafely("calendar", renderCalendar);
        runUiSafely("dashboard insight", renderDashboardInsight);
        runUiSafely("Telegram status", refreshTelegramStatus);
        runUiSafely("mascot prompts", renderMascotQuickAsks);
        runUiSafely("mascot", syncMascotBubble);
        runUiSafely("page controls", bindEvents);
        runUiSafely("mascot controls", bindSoftMascot);
        runUiSafely("initial page", function () {
          setActiveView(initialViewFromUrl());
        });
        window.setInterval(updateLiveTimers, 1000);
      }

      exposeDashboardInsightBridge();
      init();
    }());
