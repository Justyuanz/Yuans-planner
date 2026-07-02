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
        weeklyRoutinePrefix: "hivePlanner.routine.week.",
        goalPlanner: "hivePlanner.goalPlanner.items",
        studyOverviewPrefix: "hivePlanner.weekOverview.study.",
        skateBodyOverviewPrefix: "hivePlanner.weekOverview.skateBody.",
        physicalPlanPrefix: "hivePlanner.physical.week.",
        physicalLogs: "hivePlanner.physical.logs",
        mascotPosition: "hivePlanner.mascot.position"
      };
      var memoryStore = {};
      var serverStorageAvailable = false;
      var statsPeriod = "month";
      var skateTrendPeriod = "month";
      var editingEventId = null;
      var editingTaskId = null;
      var draftEventDayPart = "";
      var expandedGoalId = "";
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
      }());

      var tracks = [
        {
          id: "cpp",
          label: "C++ / ft_irc",
          placeholder: "Ship one strong ft_irc step.",
          className: "cpp"
        },
        {
          id: "python",
          label: "Python project",
          placeholder: "Move the side project forward gently.",
          className: "python"
        },
        {
          id: "lc",
          label: "Leetcode",
          placeholder: "Keep the morning habit alive.",
          className: "lc"
        }
      ];

      var taskPlan = {
        0: {
          message: "Sunday: solid C++ focus, then a tidy Python wrap up.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "cpp-solid", label: "C++ solid block", activity: "cpp" },
            { id: "python-wrap", label: "Python wrap up", activity: "python" }
          ]
        },
        1: {
          message: "Monday: begin with the habit, then make the main C++ block count.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "cpp-main", label: "C++ main block", activity: "cpp" },
            { id: "python-project", label: "Python project", activity: "python" }
          ]
        },
        2: {
          message: "Tuesday: small clear wins across all three tracks.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "cpp-one", label: "C++", activity: "cpp" },
            { id: "python-one", label: "Python one task", activity: "python" }
          ]
        },
        3: {
          message: "Wednesday is skate day. Fresh air counts. Enjoy the bright green reset.",
          tasks: [
            { id: "skate-day", label: "Skate day", activity: "skate" }
          ]
        },
        4: {
          message: "Thursday: two C++ blocks with the morning habit as your warm-up.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "cpp-block-a", label: "C++ block one", activity: "cpp" },
            { id: "cpp-block-b", label: "C++ block two", activity: "cpp" },
            { id: "python-project", label: "Python project", activity: "python" }
          ]
        },
        5: {
          message: "Friday: land one C++ task, then give Python the afternoon.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "cpp-one", label: "C++", activity: "cpp" },
            { id: "python-afternoon", label: "Python project", activity: "python" }
          ]
        },
        6: {
          message: "Saturday: keep it light and keep the streak friendly.",
          tasks: [
            { id: "lc-morning", label: "Leetcode", activity: "lc" },
            { id: "python-light", label: "Python light", activity: "python" },
            { id: "skate-session", label: "Skate session", activity: "skate" }
          ]
        }
      };

      var activities = [
        { id: "lc", label: "Leetcode", short: "lc", className: "lc", group: "study" },
        { id: "cpp", label: "C++ / ft_irc", short: "C++", className: "cpp", group: "study" },
        { id: "python", label: "Python", short: "Python", className: "python", group: "study" },
        { id: "skate", label: "Skate", short: "Skate", className: "skate", group: "leisure" },
        { id: "p90x3", label: "P90X3", short: "P90X3", className: "p90x3", group: "leisure" },
        { id: "guitar", label: "Guitar", short: "Guitar", className: "guitar", group: "leisure" },
        { id: "other", label: "Other", short: "Other", className: "other", group: "other", showInStats: false }
      ];

      var routineLabelRenames = {
        "Leetcode morning": "Leetcode",
        "C++ one task": "C++",
        "Python afternoon": "Python project"
      };

      var mascotLines = [
        "tiny steps still count",
        "one gentle task, then snacks",
        "C++ will blink first",
        "ship a small piece today",
        "future Yuan says thanks",
        "ten minutes is a real start",
        "hydrate, then compile",
        "soft focus, sharp progress",
        "you are allowed to begin messy",
        "the bug is just being dramatic",
        "skate brain, study heart",
        "one tab, one task, go"
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
      var dayTypes = [
        { id: "study", label: "Study Day", className: "study-day" },
        { id: "skate", label: "Skate Day", className: "skate-day" },
        { id: "rest", label: "Rest Day", className: "rest-day" }
      ];
      var partLabels = {
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening"
      };
      var studyOverviewPlaceholders = ["IRC 5h · C++ eval 2h", "Rest", "Optional review"];
      var skateBodyOverviewPlaceholders = ["Total Synergistics", "Skate + Ab Ripper", "X3 Yoga"];
      var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      var today = new Date();
      var calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
      var selectedDate = formatDate(today);

      var elements = {
        tabs: document.querySelectorAll("[data-view-target]"),
        views: document.querySelectorAll(".view"),
        todaySubtitle: document.getElementById("todaySubtitle"),
        weeklyGoals: document.getElementById("weeklyGoals"),
        weekKeyLabel: document.getElementById("weekKeyLabel"),
        dayMessage: document.getElementById("dayMessage"),
        progressText: document.getElementById("progressText"),
        tasksMount: document.getElementById("tasksMount"),
        taskForm: document.getElementById("taskForm"),
        taskTitle: document.getElementById("taskTitle"),
        taskActivity: document.getElementById("taskActivity"),
        todayThemeLine: document.getElementById("todayThemeLine"),
        todayThemeBadge: document.getElementById("todayThemeBadge"),
        todayIntentionMount: document.getElementById("todayIntentionMount"),
        weeklyPlannerLabel: document.getElementById("weeklyPlannerLabel"),
        weeklyPlannerMount: document.getElementById("weeklyPlannerMount"),
        goalPlannerIntro: document.getElementById("goalPlannerIntro"),
        goalPlannerMount: document.getElementById("goalPlannerMount"),
        addGoalPlannerItem: document.getElementById("addGoalPlannerItem"),
        skateFocusInput: document.getElementById("skateFocusInput"),
        skateWeekLabel: document.getElementById("skateWeekLabel"),
        skateSessionCount: document.getElementById("skateSessionCount"),
        skateTargetInput: document.getElementById("skateTargetInput"),
        skateCoachFlow: document.getElementById("skateCoachFlow"),
        finishSkateSession: document.getElementById("finishSkateSession"),
        skateSessionHint: document.getElementById("skateSessionHint"),
        statsPeriodTabs: document.getElementById("statsPeriodTabs"),
        lifeDonut: document.getElementById("lifeDonut"),
        lifeDonutLabel: document.getElementById("lifeDonutLabel"),
        lifeSummary: document.getElementById("lifeSummary"),
        lifeBreakdown: document.getElementById("lifeBreakdown"),
        plannedWeekLabel: document.getElementById("plannedWeekLabel"),
        plannedMount: document.getElementById("plannedMount"),
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
        eventTitle: document.getElementById("eventTitle"),
        eventDate: document.getElementById("eventDate"),
        eventNote: document.getElementById("eventNote"),
        eventCategory: document.getElementById("eventCategory"),
        eventSaveButton: document.getElementById("eventSaveButton"),
        formHint: document.getElementById("formHint"),
        skateWeeklyMetrics: document.getElementById("skateWeeklyMetrics"),
        bodyLogForm: document.getElementById("bodyLogForm"),
        bodyWorkoutName: document.getElementById("bodyWorkoutName"),
        bodyWorkoutScore: document.getElementById("bodyWorkoutScore"),
        skateTrendPeriodTabs: document.getElementById("skateTrendPeriodTabs"),
        skateTrendCharts: document.getElementById("skateTrendCharts"),
        skateFeedbackDialog: document.getElementById("skateFeedbackDialog"),
        skateFeedbackForm: document.getElementById("skateFeedbackForm"),
        confidenceScale: document.getElementById("confidenceScale"),
        progressTodayScale: document.getElementById("progressTodayScale"),
        skateImprovedNote: document.getElementById("skateImprovedNote"),
        skateNextFocusNote: document.getElementById("skateNextFocusNote"),
        cancelSkateFeedback: document.getElementById("cancelSkateFeedback"),
        exportData: document.getElementById("exportData"),
        importData: document.getElementById("importData"),
        backupStatus: document.getElementById("backupStatus"),
        mascotCard: document.querySelector(".mascot-card"),
        softMascot: document.getElementById("softMascot"),
        mascotBubble: document.getElementById("mascotBubble")
      };

      function isPlannerKey(key) {
        return key.indexOf("hivePlanner.") === 0;
      }

      async function hydrateStore() {
        memoryStore = {};
        try {
          var response = await fetch("/api/kv", { cache: "no-store" });
          if (response.ok) {
            var payload = await response.json();
            memoryStore = payload.data || {};
            serverStorageAvailable = true;
          }
        } catch (error) {
          serverStorageAvailable = false;
        }

        for (var i = 0; i < localStorage.length; i += 1) {
          var key = localStorage.key(i);
          if (key && isPlannerKey(key) && memoryStore[key] === undefined) {
            memoryStore[key] = localStorage.getItem(key);
            persistRaw(key, memoryStore[key]);
          }
        }
      }

      function persistRaw(key, value) {
        memoryStore[key] = value;
        localStorage.setItem(key, value);
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
        var number = Number(value) || 0;
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

      function parseEventTimeMinutes(title) {
        return calendarCore.parseEventTimeMinutes(title);
      }

      function compareEventsChronologically(a, b) {
        return calendarCore.compareEventsChronologically(a, b);
      }

      function sortedEvents(events) {
        return calendarCore.sortedEvents(events);
      }

      function eventsForDate(dateKey) {
        return sortedEvents(getEvents().filter(function (event) {
          return event.date === dateKey;
        }));
      }

      function eventDayPart(event) {
        return calendarCore.eventDayPart(event);
      }

      function weekDates(date) {
        var range = weekRange(date);
        var dates = [];
        for (var index = 0; index < 7; index += 1) {
          dates.push(addDays(range.start, index));
        }
        return dates;
      }

      function routineStorageKey(date) {
        return STORAGE.weeklyRoutinePrefix + isoWeekKey(date);
      }

      function dayTypeById(id) {
        if (id === "personal") {
          id = "rest";
        }
        return dayTypes.find(function (type) {
          return type.id === id;
        }) || dayTypes[0];
      }

      function defaultRoutineItem(title, kind) {
        return {
          id: makeId("routine"),
          title: title,
          kind: kind || "flexible"
        };
      }

      function defaultWeeklyRoutine(date) {
        var defaults = [
          {
            type: "study",
            morning: [defaultRoutineItem("Leetcode warm-up", "flexible")],
            afternoon: [defaultRoutineItem("IRC main block", "flexible")],
            evening: []
          },
          {
            type: "study",
            morning: [defaultRoutineItem("Review priorities", "flexible")],
            afternoon: [defaultRoutineItem("Python project", "flexible")],
            evening: []
          },
          {
            type: "skate",
            morning: [],
            afternoon: [defaultRoutineItem("Skate session", "fixed")],
            evening: []
          },
          {
            type: "study",
            morning: [defaultRoutineItem("Leetcode warm-up", "flexible")],
            afternoon: [defaultRoutineItem("IRC deep work", "flexible")],
            evening: []
          },
          {
            type: "study",
            morning: [],
            afternoon: [defaultRoutineItem("Applications or portfolio", "flexible")],
            evening: []
          },
          {
            type: "rest",
            morning: [defaultRoutineItem("Errands or life admin", "flexible")],
            afternoon: [],
            evening: []
          },
          {
            type: "rest",
            morning: [],
            afternoon: [],
            evening: [defaultRoutineItem("Gentle reset for the week", "flexible")]
          }
        ];
        return {
          week: isoWeekKey(date),
          days: weekDates(date).map(function (_, index) {
            var source = defaults[index] || defaults[0];
            return {
              type: source.type,
              allowFullDay: false,
              morning: source.morning.slice(),
              afternoon: source.afternoon.slice(),
              evening: source.evening.slice()
            };
          })
        };
      }

      function normalizeRoutineItem(item) {
        var title = typeof (item && item.title) === "string" ? item.title.trim() : "";
        return {
          id: item && item.id ? item.id : makeId("routine"),
          title: title || "Untitled block",
          kind: item && item.kind === "fixed" ? "fixed" : "flexible"
        };
      }

      function normalizeRoutineDay(day, fallback) {
        var source = day || fallback;
        var normalized = {
          type: dayTypeById(source.type).id,
          allowFullDay: Boolean(source.allowFullDay)
        };
        dayParts.forEach(function (part) {
          var items = Array.isArray(source[part]) ? source[part] : fallback[part];
          normalized[part] = items.map(normalizeRoutineItem).filter(function (item) {
            return item.title;
          });
        });
        return normalized;
      }

      function getWeeklyRoutine(date) {
        var fallback = defaultWeeklyRoutine(date);
        var stored = readJson(routineStorageKey(date), null);
        if (!stored || !Array.isArray(stored.days)) {
          return fallback;
        }
        return {
          week: isoWeekKey(date),
          days: weekDates(date).map(function (_, index) {
            return normalizeRoutineDay(stored.days[index], fallback.days[index]);
          })
        };
      }

      function saveWeeklyRoutine(date, routine) {
        var fallback = defaultWeeklyRoutine(date);
        writeJson(routineStorageKey(date), {
          week: isoWeekKey(date),
          days: weekDates(date).map(function (_, index) {
            return normalizeRoutineDay(routine.days[index], fallback.days[index]);
          })
        });
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

      function routineDayIndex(date) {
        return weekDates(date).findIndex(function (entry) {
          return formatDate(entry) === formatDate(date);
        });
      }

      function routineDayForDate(date) {
        var routine = getWeeklyRoutine(date);
        var index = routineDayIndex(date);
        return {
          routine: routine,
          index: index,
          day: routine.days[index]
        };
      }

      function updateWeeklyRoutine(mutator) {
        var referenceDate = parseDate(selectedDate);
        var routine = getWeeklyRoutine(referenceDate);
        mutator(routine);
        saveWeeklyRoutine(referenceDate, routine);
        renderRoutinePlanner();
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
              step.scheduledDay = event.date + "|" + eventDayPart(event);
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
          category: "Study deadline",
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
        renderRoutinePlanner();
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
          return {
            id: log.id || makeId("body"),
            date: log.date,
            name: String(log.name || "Other"),
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

      function categoryClass(category) {
          if (category === "Personal") return "personal";
          if (category === "Routine") return "routine-event";
          if (category === "Other") return "other-event";
          if (category === "Skate") return "skate-event";
          return "study";
      }

      function isRoutineCategory(category) {
        return category === "Routine";
      }

      function visibleMonthlyEvents(events) {
        return (Array.isArray(events) ? events : []).filter(function (event) {
          return !isRoutineCategory(event.category);
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
          renderRoutinePlanner();
          renderCalendar();
          renderSelectedDate();
        }
        var activeView = document.getElementById(viewId);
        if (activeView && typeof activeView.scrollIntoView === "function") {
          activeView.scrollIntoView({ block: "start", behavior: "auto" });
        } else {
          window.scrollTo(0, 0);
        }
      }

      // Weekly goals stay until Yuan manually changes them.
      function renderGoals() {
        var stored = readJson(STORAGE.goals, {});
        elements.weeklyGoals.innerHTML = "";

        tracks.forEach(function (track) {
          var wrapper = document.createElement("div");
          wrapper.className = "goal " + track.className;

          var label = document.createElement("label");
          label.setAttribute("for", "goal-" + track.id);
          var dot = document.createElement("span");
          dot.className = "dot";
          label.appendChild(dot);
          label.appendChild(document.createTextNode(track.label));

          var input = document.createElement("input");
          input.id = "goal-" + track.id;
          input.value = stored[track.id] || "";
          input.placeholder = track.placeholder;
          input.addEventListener("input", function () {
            stored[track.id] = input.value;
            writeJson(STORAGE.goals, stored);
          });

          wrapper.appendChild(label);
          wrapper.appendChild(input);
          elements.weeklyGoals.appendChild(wrapper);
        });
      }

      function getDefaultTasksForToday() {
        return taskPlan[today.getDay()].tasks.map(function (task) {
          return {
              id: "routine-" + task.id,
              label: task.label,
              activity: task.activity,
              hours: 0,
              done: false,
              createdAt: "routine"
          };
        });
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
              hours: Math.max(0, Number(task.hours) || 0),
              timerSeconds: Math.max(0, Number(task.timerSeconds) || 0),
              timerStartedAt: typeof task.timerStartedAt === "string" ? task.timerStartedAt : null,
              done: Boolean(task.done),
              createdAt: task.createdAt || new Date().toISOString()
            };
          });
      }

      function elapsedTaskSeconds(task) {
        var seconds = Math.max(0, Number(task.timerSeconds) || 0);
        if (task.timerStartedAt) {
          seconds += Math.max(0, Math.floor((Date.now() - Date.parse(task.timerStartedAt)) / 1000));
        }
        return seconds;
      }

      function hoursFromSeconds(seconds) {
        return Math.round((seconds / 3600) * 100) / 100;
      }

      function effectiveTaskHours(task) {
        if (task.timerStartedAt || Number(task.timerSeconds) > 0) {
          return hoursFromSeconds(elapsedTaskSeconds(task));
        }
        return Math.max(0, Number(task.hours) || 0);
      }

      function effectiveTaskHoursForDate(dateKey, task) {
        if (dateKey === formatDate(today)) {
          return effectiveTaskHours(task);
        }
        if (Number(task.timerSeconds) > 0) {
          return hoursFromSeconds(task.timerSeconds);
        }
        return Math.max(0, Number(task.hours) || 0);
      }

      function formatTimer(seconds) {
        var safeSeconds = Math.max(0, Math.floor(seconds));
        var hours = Math.floor(safeSeconds / 3600);
        var minutes = Math.floor((safeSeconds % 3600) / 60);
        var secs = safeSeconds % 60;
        if (hours > 0) {
          return hours + ":" + pad(minutes) + ":" + pad(secs);
        }
        return minutes + ":" + pad(secs);
      }

      function getTodayTasks() {
        var key = dailyTaskStorageKey(today);
        var stored = readJson(key, null);
        if (stored === null) {
          var seeded = getDefaultTasksForToday();
          writeJson(key, seeded);
          return seeded;
        }
        return normalizeTasks(stored);
      }

      function saveTodayTasks(tasks) {
        writeJson(dailyTaskStorageKey(today), normalizeTasks(tasks));
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
      }

      // Today's tasks are editable and saved by exact date.
      function renderTasks() {
        var todayKey = formatDate(today);
        var todayPlan = taskPlan[today.getDay()];
        var tasks = getTodayTasks();
        var doneCount = 0;
        var dashboardDate = document.getElementById("dashboardDate");

        elements.todaySubtitle.textContent = "Graduation and job hunt are getting closer, one calm block at a time.";
        if (dashboardDate) {
          dashboardDate.textContent = humanDate(todayKey);
        }
        elements.weekKeyLabel.textContent = "Saved for " + todayKey;
        elements.dayMessage.textContent = todayPlan.message;
        elements.tasksMount.innerHTML = "";

        if (tasks.length === 0) {
          elements.tasksMount.innerHTML = [
            '<p class="empty">',
            "Clear day. Add only what actually matters today.",
            "</p>"
          ].join("");
          elements.progressText.textContent = "0 / 0 tasks done today";
          return;
        }

        var list = document.createElement("ul");
        list.className = "task-list";

        tasks.forEach(function (task, index) {
          var activity = getActivity(task.activity);
          var tracksTime = taskActivityTracksTime(task.activity);
          var item = document.createElement("li");
          item.className = "task";

          var card = document.createElement("div");
          card.className = "task-card " + activity.className;
          if (task.done) {
            card.classList.add("done");
          }

          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "task-check";
          checkbox.id = "task-" + task.id;
          checkbox.checked = Boolean(task.done);
          if (checkbox.checked) {
            doneCount += 1;
          }

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
            label.textContent = task.label;

            var badge = document.createElement("span");
            badge.className = "activity-badge " + activity.className;
            badge.textContent = activity.short;

            titleButton.appendChild(label);
            titleButton.appendChild(badge);
            content.appendChild(titleButton);
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
            tasks[index].done = checkbox.checked;
            saveTodayTasks(tasks);
            renderTasks();
          });

          hoursInput.addEventListener("input", function () {
            tasks[index].hours = Math.max(0, Number(hoursInput.value) || 0);
            tasks[index].timerSeconds = Math.round(tasks[index].hours * 3600);
            tasks[index].timerStartedAt = null;
            saveTodayTasks(tasks);
            renderTotals();
          });

          startPauseButton.addEventListener("click", function () {
            if (tasks[index].timerStartedAt) {
              tasks[index].timerSeconds = elapsedTaskSeconds(tasks[index]);
              tasks[index].timerStartedAt = null;
              tasks[index].hours = hoursFromSeconds(tasks[index].timerSeconds);
            } else {
              tasks[index].timerSeconds = elapsedTaskSeconds(tasks[index]);
              tasks[index].timerStartedAt = new Date().toISOString();
            }
            saveTodayTasks(tasks);
            renderTasks();
            renderTotals();
          });

          endButton.addEventListener("click", function () {
            tasks[index].timerSeconds = elapsedTaskSeconds(tasks[index]);
            tasks[index].timerStartedAt = null;
            tasks[index].hours = hoursFromSeconds(tasks[index].timerSeconds);
            tasks[index].done = true;
            saveTodayTasks(tasks);
            renderTasks();
            renderTotals();
          });

          deleteButton.addEventListener("click", function () {
            tasks.splice(index, 1);
            if (editingTaskId === task.id) {
              editingTaskId = null;
            }
            saveTodayTasks(tasks);
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
        categorySelect.className = "task-category-select";
        activities.forEach(function (activity) {
          var option = document.createElement("option");
          option.value = activity.id;
          option.textContent = activity.label;
          option.selected = activity.id === task.activity;
          categorySelect.appendChild(option);
        });

        function saveTaskEdit(keepEditing) {
          if (hasCommitted) {
            return;
          }
          hasCommitted = true;
          var nextLabel = titleInput.value.trim() || task.label;
          var nextActivity = categorySelect.value || task.activity;
          tasks[index].label = nextLabel;
          tasks[index].activity = nextActivity;
          if (!taskActivityTracksTime(nextActivity)) {
            tasks[index].timerStartedAt = null;
          }
          saveTodayTasks(tasks);
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
        categorySelect.addEventListener("keydown", function (event) {
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

        editor.appendChild(titleInput);
        editor.appendChild(categorySelect);
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
          if (!dateInRange(logDate, start, end) || !countsAsDone(log.status)) {
            return;
          }
          if (workoutKind(log.name) === "skate") {
            totals.skate += log.minutes / 60;
          } else if (workoutKind(log.name) !== "rest") {
            totals.p90x3 += log.minutes / 60;
          }
        });

        getSkateSessions().forEach(function (session) {
          if (!session || !session.finishedAt) {
            return;
          }
          var sessionDate = parseDate(session.finishedAt.slice(0, 10));
          if (dateInRange(sessionDate, start, end)) {
            totals.skate += Math.max(0, Number(session.durationHours) || 0);
          }
        });
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

        addPhysicalTimeToTotals(totals, new Date(2000, 0, 1), new Date(2099, 11, 31));
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
        renderLifePie();
        renderPlannedActual();
        renderStudyOverview();
        renderRoutinePlanner();
        renderGoalPlanner();
      }

      // Study/leisure stats are calculated from saved task hours.
      function renderLifePie() {
        var totals = totalsForStatsPeriod(statsPeriod);
        var study = sumHours(totals, "study");
        var leisure = sumHours(totals, "leisure");
        var total = study + leisure;
        var studyPercent = percent(study, total);
        var leisurePercent = total ? 100 - studyPercent : 0;
        var studyDegrees = total ? (study / total) * 360 : 0;

        elements.lifeDonut.style.background = "conic-gradient(var(--green) 0deg " + studyDegrees + "deg, var(--teal) " + studyDegrees + "deg 360deg)";
        elements.lifeDonutLabel.textContent = formatHours(total);
        elements.lifeSummary.innerHTML = "";
        [
          ["Study", studyPercent + "%", formatHours(study)],
          ["Leisure", leisurePercent + "%", formatHours(leisure)]
        ].forEach(function (row) {
          var item = document.createElement("div");
          item.className = "pie-summary-row";
          item.innerHTML = "<strong>" + row[0] + "</strong><span>" + row[1] + " · " + row[2] + "</span>";
          elements.lifeSummary.appendChild(item);
        });

        elements.lifeBreakdown.innerHTML = "";
        activities.filter(activityShowsInStats).forEach(function (activity) {
          var value = totals[activity.id] || 0;
          var row = document.createElement("div");
          row.className = "breakdown-row " + activity.className;
          row.innerHTML = "<strong>" + activity.short + "</strong><span>" + percent(value, total) + "% · " + formatHours(value) + "</span>";
          elements.lifeBreakdown.appendChild(row);
        });

        renderStatsPeriodTabs();
      }

      function renderStatsPeriodTabs() {
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
            planned[activity.id] = Math.max(0, Number(input.value) || 0);
            writeJson(plannedStorageKey(today), planned);
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
        draftEventDayPart = part || "";
        editingEventId = null;
        selectedDate = dateKey;
        calendarCursor = new Date(parseDate(dateKey).getFullYear(), parseDate(dateKey).getMonth(), 1);
        elements.eventDate.value = dateKey;
        elements.eventTitle.value = "";
        elements.eventNote.value = "";
        elements.eventCategory.value = "Study deadline";
        elements.eventSaveButton.textContent = "Save event";
        elements.formHint.textContent = message || ("Selected: " + dateKey);
        renderCalendar();
        renderSelectedDate();
        elements.eventTitle.focus();
      }

      function groupedEventsForDate(dateKey) {
        return calendarCore.groupEventsByPart(eventsForDate(dateKey));
      }

      function todayFocusText(eventsByPart, part, fallback) {
        var items = eventsByPart[part] || [];
        return items.length ? items[0].title : fallback;
      }

      function renderTodayIntention() {
        if (!elements.todayIntentionMount || !elements.todayThemeBadge || !elements.todayThemeLine) {
          return;
        }
        var dashboardDate = document.getElementById("dashboardDate");
        var todayKey = formatDate(today);
        var type = dayTypeById(routineDayForDate(today).day.type);
        var grouped = groupedEventsForDate(todayKey);
        var allTodayEvents = eventsForDate(todayKey);

        elements.todaySubtitle.textContent = "A bright little morning map for Hive study days.";
        elements.weekKeyLabel.textContent = isoWeekKey(today);
        if (dashboardDate) {
          dashboardDate.textContent = humanDate(todayKey);
        }
        elements.todayThemeBadge.textContent = type.label;
        elements.todayThemeBadge.className = "progress-pill day-type-pill " + type.className;
        elements.todayThemeLine.textContent = humanDate(todayKey) + " is a " + type.label.toLowerCase() + ".";

        elements.todayIntentionMount.innerHTML = "";
        [
          {
            label: "Morning",
            text: todayFocusText(grouped, "morning", "Keep the start gentle.")
          },
          {
            label: "Afternoon",
            text: todayFocusText(grouped, "afternoon", "Pick one main block that matters.")
          },
          {
            label: "Evening",
            text: todayFocusText(grouped, "evening", "Leave room to wind down.")
          }
        ].forEach(function (entry) {
          var row = document.createElement("div");
          row.className = "overview-row";
          row.innerHTML = "<strong>" + entry.label + "</strong><span>" + entry.text + "</span>";
          elements.todayIntentionMount.appendChild(row);
        });

        if (!allTodayEvents.length) {
          var note = document.createElement("p");
          note.className = "balance-note";
          note.textContent = "Nothing fixed yet. A light plan is still a real plan.";
          elements.todayIntentionMount.appendChild(note);
        }
      }

      function renderWeeklyPlanner() {
        if (!elements.weeklyPlannerMount) {
          return;
        }
        var referenceDate = parseDate(selectedDate);
        var dates = weekDates(referenceDate);
        var routine = getWeeklyRoutine(referenceDate);

        if (elements.weeklyPlannerLabel) {
          elements.weeklyPlannerLabel.textContent = isoWeekKey(referenceDate) + " · Morning · Afternoon · Evening";
        }

        elements.weeklyPlannerMount.innerHTML = "";
        dates.forEach(function (date, index) {
          var dateKey = formatDate(date);
          var type = dayTypeById(routine.days[index].type);
          var groups = groupedEventsForDate(dateKey);
          var card = document.createElement("section");
          card.className = "week-day-panel " + type.className;

          var header = document.createElement("div");
          header.className = "week-day-header";
          header.innerHTML = "<div><strong>" + weekLabels[index] + "</strong><span>" + humanDate(dateKey) + "</span></div>";

          var typeSelect = document.createElement("select");
          typeSelect.className = "routine-day-select";
          dayTypes.forEach(function (optionType) {
            var option = document.createElement("option");
            option.value = optionType.id;
            option.textContent = optionType.label;
            option.selected = optionType.id === type.id;
            typeSelect.appendChild(option);
          });
          typeSelect.addEventListener("change", function () {
            updateWeeklyRoutine(function (latest) {
              latest.days[index].type = typeSelect.value;
            });
            renderTodayIntention();
          });
          header.appendChild(typeSelect);
          card.appendChild(header);

          dayParts.forEach(function (part) {
            var row = document.createElement("div");
            row.className = "week-day-part";

            var label = document.createElement("span");
            label.className = "week-day-part-label";
            label.textContent = partLabels[part];
            row.appendChild(label);

            var content = document.createElement("div");
            content.className = "week-day-part-content";

            if (!groups[part].length) {
              var empty = document.createElement("span");
              empty.className = "week-day-part-empty";
              empty.textContent = part === "evening" ? "Keep it light." : "Open";
              content.appendChild(empty);
            } else {
              groups[part].forEach(function (event) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "week-event-button " + categoryClass(event.category);
                button.textContent = event.title;
                button.title = event.note ? event.title + " - " + event.note : event.title;
                button.addEventListener("click", function () {
                  startEditEvent(event.id);
                });
                content.appendChild(button);
              });
            }

            var addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "week-add-button";
            addButton.textContent = "Add";
            addButton.addEventListener("click", function () {
              openEventComposer(dateKey, part, "Adding to " + weekLabels[index] + " " + partLabels[part].toLowerCase() + ".");
            });
            content.appendChild(addButton);

            row.appendChild(content);
            card.appendChild(row);
          });

          elements.weeklyPlannerMount.appendChild(card);
        });
      }

      function renderRoutinePlanner() {
        renderTodayIntention();
        renderWeeklyPlanner();
      }

      function renderGoalPlanner() {
        if (!elements.goalPlannerMount) {
          return;
        }
        var referenceDate = parseDate(selectedDate);
        var routine = getWeeklyRoutine(referenceDate);
        var studyOptions = weekDates(referenceDate).reduce(function (all, date, index) {
          if (routine.days[index].type !== "study") {
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
            blankOption.textContent = studyOptions.length ? "Study block" : "Add a study day first";
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
                status.textContent = "Placed: " + humanDate(placed.date) + " · " + partLabels[eventDayPart(placed)];
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
          expandedStage: "warmup",
          startedAt: new Date().toISOString()
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
          expandedStage: ["warmup", "focus", "skill", ""].indexOf(session.expandedStage) !== -1 ? session.expandedStage : "warmup",
          startedAt: session.startedAt || new Date().toISOString()
        };
      }

      function saveCurrentSkateSession(session) {
        writeJson(STORAGE.skateCurrentSession, session);
      }

      function getSkateSessions() {
        var sessions = readJson(STORAGE.skateSessions, []);
        return Array.isArray(sessions) ? sessions : [];
      }

      function saveSkateSessions(sessions) {
        writeJson(STORAGE.skateSessions, sessions);
      }

      function renderWorkoutOptions() {
        if (elements.bodyWorkoutName && !elements.bodyWorkoutName.value) {
          elements.bodyWorkoutName.value = "";
        }
      }

      function renderSkateWeeklyMetrics() {
        var counts = {};
        getPhysicalLogs().forEach(function (log) {
          var label = (log.note || log.name || "").trim();
          if (!label || !countsAsDone(log.status)) {
            return;
          }
          counts[label] = (counts[label] || 0) + 1;
        });

        elements.skateWeeklyMetrics.innerHTML = "";

        Object.keys(counts).sort(function (left, right) {
          if (counts[right] !== counts[left]) {
            return counts[right] - counts[left];
          }
          return left.localeCompare(right);
        }).forEach(function (label) {
          var chip = document.createElement("span");
          chip.className = "body-support-chip";
          chip.innerHTML = "<strong>" + label + "</strong><em>" + counts[label] + "</em>";
          elements.skateWeeklyMetrics.appendChild(chip);
        });

        if (!elements.skateWeeklyMetrics.children.length) {
          var empty = document.createElement("p");
          empty.className = "body-support-empty";
          empty.textContent = "Saved body support will appear here.";
          elements.skateWeeklyMetrics.appendChild(empty);
        }
      }

      function renderSkateTrendCharts() {
        var series = trendSeries(skateTrendPeriod);
        var frequency = sessionFrequency(skateTrendPeriod);
        elements.skateTrendCharts.innerHTML = "";
        elements.skateTrendCharts.appendChild(createTrendChart("Skate quality over time", [
          { label: "Quality", values: series.quality, summary: scoreLabel(average(series.quality)), className: "skate" }
        ]));
        elements.skateTrendCharts.appendChild(createTrendChart("Leg soreness over time", [
          { label: "Soreness", values: series.soreness, summary: scoreLabel(average(series.soreness)), className: "p90x3" }
        ]));
        elements.skateTrendCharts.appendChild(createFrequencyChart("Session frequency", frequency.rows, "No sessions in this range yet."));
        renderSkateTrendPeriodTabs();
      }

      function trendSeries(period) {
        var buckets = buildTrendBuckets(period);
        var series = {
          labels: [],
          quality: [],
          soreness: []
        };

        buckets.forEach(function (bucket) {
          var sessions = getSkateSessions().filter(function (session) {
            return session && session.finishedAt && bucket.matchDate(parseDate(session.finishedAt.slice(0, 10)));
          });

          series.labels.push(bucket.label);
          series.quality.push(average(sessions.map(function (session) { return session.skateQuality; })));
          series.soreness.push(average(sessions.map(function (session) { return session.legSoreness; })));
        });

        return series;
      }

      function selectedTrendRange(period) {
        if (period === "day") {
          return { start: today, end: today };
        }
        if (period === "week") {
          return weekRange(today);
        }
        if (period === "month") {
          return {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
          };
        }
        return {
          start: new Date(2000, 0, 1),
          end: new Date(2099, 11, 31)
        };
      }

      function sessionFrequency(period) {
        var range = selectedTrendRange(period);
        var skateCount = getSkateSessions().filter(function (session) {
          return session && session.finishedAt && dateInRange(parseDate(session.finishedAt.slice(0, 10)), range.start, range.end);
        }).length;
        var bodyCount = getPhysicalLogs().filter(function (log) {
          return countsAsDone(log.status) && bucketlessBodySession(log) && dateInRange(parseDate(log.date), range.start, range.end);
        }).length;
        var totalCount = skateCount + bodyCount;
        return {
          rows: totalCount ? [
            { label: "Skate", count: skateCount, className: "skate" },
            { label: "Body", count: bodyCount, className: "python" },
            { label: "Total", count: totalCount, className: "lc" }
          ] : []
        };
      }

      function bucketlessBodySession(log) {
        return log && (log.note || log.name);
      }

      function buildTrendBuckets(period) {
        var now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (period === "day") {
          return Array.from({ length: 7 }, function (_, index) {
            var date = addDays(now, index - 6);
            var key = formatDate(date);
            return {
              label: weekdays[date.getDay()],
              matchDate: function (target) {
                return formatDate(target) === key;
              }
            };
          });
        }
        if (period === "week") {
          return Array.from({ length: 8 }, function (_, index) {
            var anchor = addDays(now, (index - 7) * 7);
            var range = weekRange(anchor);
            var label = monthNames[range.start.getMonth()].slice(0, 3) + " " + range.start.getDate();
            return {
              label: label,
              matchDate: function (target) {
                return dateInRange(target, range.start, range.end);
              }
            };
          });
        }
        if (period === "month" || period === "all") {
          var sourceDates = getSkateSessions().filter(function (session) {
            return session && session.finishedAt;
          }).map(function (session) {
            return parseDate(session.finishedAt.slice(0, 10));
          }).concat(getPhysicalLogs().map(function (log) {
            return parseDate(log.date);
          }));
          var firstDate = sourceDates.length ? sourceDates.sort(function (a, b) { return a - b; })[0] : now;
          var monthCount = period === "month" ? 6 : Math.max(1, ((now.getFullYear() - firstDate.getFullYear()) * 12) + now.getMonth() - firstDate.getMonth() + 1);
          return Array.from({ length: monthCount }, function (_, index) {
            var date = new Date(
              now.getFullYear(),
              now.getMonth() - monthCount + index + 1,
              1
            );
            var year = date.getFullYear();
            var month = date.getMonth();
            return {
              label: monthNames[month].slice(0, 3),
              matchDate: function (target) {
                return target.getFullYear() === year && target.getMonth() === month;
              }
            };
          });
        }
        return [];
      }

      function renderSkateTrendPeriodTabs() {
        var periods = [
          { id: "day", label: "Day" },
          { id: "week", label: "Week" },
          { id: "month", label: "Month" },
          { id: "all", label: "All" }
        ];
        elements.skateTrendPeriodTabs.innerHTML = "";
        periods.forEach(function (period) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "period-button";
          button.classList.toggle("active", skateTrendPeriod === period.id);
          button.textContent = period.label;
          button.addEventListener("click", function () {
            skateTrendPeriod = period.id;
            renderSkateTrendCharts();
          });
          elements.skateTrendPeriodTabs.appendChild(button);
        });
      }

      function countSkateSessionsForWeek(date) {
        var range = weekRange(date);
        return getSkateSessions().filter(function (session) {
          return session && session.finishedAt && dateInRange(parseDate(session.finishedAt.slice(0, 10)), range.start, range.end);
        }).length;
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
        if (!elements.skateFocusInput) {
          return;
        }
        var session = getCurrentSkateSession();
        var template = getSkateCoachTemplate();
        var target = Math.max(1, Number(readText(STORAGE.skateTarget, "4")) || 4);
        var skateSessionsThisWeek = countSkateSessionsForWeek(today);

        elements.skateFocusInput.value = readText(STORAGE.skateFocus, "");
        elements.skateTargetInput.value = target;
        elements.skateWeekLabel.textContent = isoWeekKey(today);
        elements.skateSessionCount.textContent = skateSessionsThisWeek + " / " + target;
        elements.skateCoachFlow.innerHTML = "";
        renderSkateWeeklyMetrics();
        renderSkateTrendCharts();
        elements.skateCoachFlow.appendChild(renderCoachWarmupStage(session, template));
        elements.skateCoachFlow.appendChild(renderCoachFocusStage(session, template));
        elements.skateCoachFlow.appendChild(renderCoachSkillStage(session, template));
      }

      function renderCoachStageShell(options) {
        var section = document.createElement("section");
        section.className = "coach-stage " + (options.tone || "");
        if (options.active) {
          section.classList.add("is-active");
        }
        if (options.complete && !options.expanded) {
          section.classList.add("is-collapsed");
        }

        var head = document.createElement("div");
        head.className = "coach-stage-head";
        head.innerHTML = "<span class=\"coach-stage-chip\">" + options.stageLabel + "</span><h3>" + options.title + "</h3><p>" + options.description + "</p>";
        section.appendChild(head);

        if (options.complete && !options.expanded) {
          var collapsed = document.createElement("button");
          collapsed.type = "button";
          collapsed.className = "coach-collapsed";
          collapsed.innerHTML = "<strong>" + options.completeLabel + "</strong><span>" + options.summary + "</span>";
          collapsed.addEventListener("click", function () {
            setExpandedCoachStage(options.key);
          });
          section.appendChild(collapsed);
          return section;
        }

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
          stageLabel: "Stage 2",
          title: "Today's Focus",
          description: "Work on one flat trick and one transition trick so the session stays clear and calm.",
          summary: stageSummaryForFocus(session),
          completeLabel: "✅ Focus block complete",
          complete: session.focusDone,
          expanded: session.expandedStage === "focus",
          active: session.expandedStage === "focus",
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
          stageLabel: "Stage 3",
          title: "Skill Builder",
          description: "Use a few supporting reps here so future tricks feel easier later.",
          summary: stageSummaryForSkill(template),
          completeLabel: "✅ Skill builder complete",
          complete: session.skillDone,
          expanded: session.expandedStage === "skill",
          active: session.expandedStage === "skill",
          tone: "tone-skill",
          body: body
        });
      }

      function resetSkateSessionState(message) {
        saveCurrentSkateSession(defaultSkateSession());
        renderSkatePage();
        elements.skateSessionHint.textContent = message || "Fresh session checklist ready.";
      }

      function finishSkateSession() {
        if (elements.skateFeedbackDialog && typeof elements.skateFeedbackDialog.showModal === "function") {
          elements.skateImprovedNote.value = "";
          elements.skateNextFocusNote.value = "";
          elements.skateFeedbackDialog.showModal();
          return;
        }
        saveFinishedSkateSession({ progressToday: 3, confidence: 3, improvedNote: "", nextFocusNote: "" });
      }

      function saveFinishedSkateSession(feedback) {
        var session = getCurrentSkateSession();
        var sessions = getSkateSessions();
        var template = getSkateCoachTemplate();
        var focus = [session.selectedFlat, session.selectedTransition].filter(Boolean).join(" · ");
        var warmupItems = flattenWarmupItems(template);

        sessions.push({
          id: makeId("skate"),
          focus: focus,
          warmups: warmupItems.filter(function (item) {
            return session.warmupChecks[item.id];
          }).map(function (item) {
            return item.name;
          }).join(", "),
          warmupItems: template.warmupGroups,
          learningItems: [
            { kind: "flat", name: session.selectedFlat, status: session.focusCards.flat.status, goals: session.focusCards.flat.goals, note: session.focusCards.flat.note },
            { kind: "transition", name: session.selectedTransition, status: session.focusCards.transition.status, goals: session.focusCards.transition.goals, note: session.focusCards.transition.note }
          ],
          checked: warmupItems.map(function (item) {
            return Boolean(session.warmupChecks[item.id]);
          }),
          note: [session.focusCards.flat.note, session.focusCards.transition.note].filter(Boolean).join(" | "),
          feedbackNote: [feedback.improvedNote, feedback.nextFocusNote].filter(Boolean).join(" | "),
          legSoreness: 3,
          skateQuality: Math.max(1, Math.min(5, Number(feedback.progressToday) || 3)),
          confidence: Math.max(1, Math.min(5, Number(feedback.confidence) || 3)),
          progressToday: Math.max(1, Math.min(5, Number(feedback.progressToday) || 3)),
          improvedNote: feedback.improvedNote || "",
          nextFocusNote: feedback.nextFocusNote || "",
          sessionPlan: {
            selectedFlat: session.selectedFlat,
            selectedTransition: session.selectedTransition,
            focusCards: session.focusCards,
            skillChecks: session.skillChecks
          },
          // Session check-ins should not silently add tracked hours.
          durationHours: 0,
          startedAt: session.startedAt,
          finishedAt: new Date().toISOString()
        });
        saveSkateSessions(sessions);
        resetSkateSessionState("Session saved with a small check-in.");
        renderTotals();
      }

      function addBodyLog(event) {
        event.preventDefault();
        var name = elements.bodyWorkoutName.value.trim() || "Body support";
        var score = Math.max(1, Math.min(5, Number(elements.bodyWorkoutScore.value) || 3));
        var logs = getPhysicalLogs();

        logs.push({
          id: makeId("body"),
          date: formatDate(today),
          name: "P90X3",
          status: "done",
          minutes: 0,
          score: score,
          note: name,
          createdAt: new Date().toISOString()
        });
        savePhysicalLogs(logs);
        elements.bodyWorkoutName.value = "";
        elements.bodyWorkoutScore.value = "";
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
          confidence: selectedScaleValue("confidence"),
          progressToday: selectedScaleValue("progressToday"),
          improvedNote: elements.skateImprovedNote.value.trim(),
          nextFocusNote: elements.skateNextFocusNote.value.trim()
        });
        elements.skateFeedbackDialog.close();
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

        setMascotBubble(randomMascotLine());
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
          setMascotBubble(randomMascotLine());
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
            setMascotBubble(randomMascotLine());
          }
        }, 45000);
      }

      function updateLiveTimers() {
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
          renderTotals();
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
          var routineInfo = routineDayForDate(cellDate);
          var routineType = dayTypeById(routineInfo.day.type);
          var dayEvents = events
            .filter(function (event) {
              return event.date === dateKey;
            })
            .sort(compareEventsChronologically);
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
            return function () {
              selectedDate = key;
              renderCalendar();
              renderSelectedDate();
              elements.eventTitle.focus();
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
          monthEvents.slice(0, 3).forEach(function (event) {
            var pill = document.createElement("button");
            pill.type = "button";
            pill.className = "event-pill " + categoryClass(event.category);
            pill.textContent = monthEventChipLabel(event.title);
            pill.title = event.note ? event.title + " - " + event.note : event.title;
            pill.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              startEditEvent(event.id);
            });
            pills.appendChild(pill);
          });
          if (monthEvents.length > 3) {
            var more = document.createElement("span");
            more.className = "event-pill more-pill";
            more.textContent = "+" + (monthEvents.length - 3) + " more";
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
        var events = getEvents()
          .filter(function (event) {
            return event.date === selectedDate;
          })
          .sort(compareEventsChronologically);

        elements.selectedDateHeading.textContent = "Selected day";
        if (elements.selectedDateHint) {
          elements.selectedDateHint.textContent = humanDate(selectedDate) + (editingEventId ? " · Edit event" : " · Add event");
        }
        elements.formHint.textContent = editingEventId ? "Editing selected event." : "Selected: " + selectedDate;
        elements.eventDate.value = selectedDate;
        elements.selectedDateEvents.innerHTML = "";

        if (events.length === 0) {
          var empty = document.createElement("li");
          empty.className = "selected-event empty";
          empty.textContent = "No events on this date yet.";
          elements.selectedDateEvents.appendChild(empty);
          return;
        }

        events.forEach(function (event) {
          var item = document.createElement("li");
          item.className = "selected-event";
          item.tabIndex = 0;
          item.setAttribute("role", "button");

          var title = document.createElement("div");
          title.className = "selected-event-title";
          title.textContent = event.title;

          var tag = document.createElement("span");
          tag.className = "tag " + categoryClass(event.category);
          tag.textContent = event.category;

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
          var deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "secondary-button quiet-danger";
          deleteButton.textContent = "Delete";
          deleteButton.addEventListener("click", function () {
            deleteEvent(event.id);
          });
          actions.appendChild(deleteButton);
          item.appendChild(actions);
          item.addEventListener("click", function () {
            startEditEvent(event.id);
          });
          item.addEventListener("keydown", function (keyboardEvent) {
            if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
              keyboardEvent.preventDefault();
              startEditEvent(event.id);
            }
          });
          deleteButton.addEventListener("click", function (clickEvent) {
            clickEvent.stopPropagation();
          });

          elements.selectedDateEvents.appendChild(item);
        });
      }

      function resetEventForm(message) {
        editingEventId = null;
        draftEventDayPart = "";
        elements.eventTitle.value = "";
        elements.eventNote.value = "";
        elements.eventDate.value = selectedDate;
        elements.eventSaveButton.textContent = "Save event";
        elements.formHint.textContent = message || "Selected: " + selectedDate;
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
        elements.eventTitle.value = event.title || "";
        elements.eventDate.value = event.date || selectedDate;
        elements.eventNote.value = event.note || "";
        elements.eventCategory.value = event.category || "Study deadline";
        elements.eventSaveButton.textContent = "Update event";
        renderCalendar();
        renderSelectedDate();
        elements.eventTitle.focus();
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
        renderRoutinePlanner();
        renderSelectedDate();
      }

      function addEvent(event) {
        event.preventDefault();
        var title = elements.eventTitle.value.trim();
        var note = elements.eventNote.value.trim();
        var category = elements.eventCategory.value;
        var eventDate = elements.eventDate.value || selectedDate;

        if (!title) {
          elements.formHint.textContent = "Add a title before saving.";
          elements.eventTitle.focus();
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
              dayPart: draftEventDayPart || item.dayPart || "",
              startTime: "",
              endTime: "",
              updatedAt: new Date().toISOString()
            });
            return savedEvent;
          });
        } else {
          savedEvent = {
            id: makeId("event"),
            date: eventDate,
            title: title,
            note: note,
            category: category,
            dayPart: draftEventDayPart || "",
            startTime: "",
            endTime: "",
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
        resetEventForm((editingEventId ? "Updated " : "Saved for ") + humanDate(selectedDate) + ".");
        renderGoalPlanner();
        renderRoutinePlanner();
        renderCalendar();
        renderSelectedDate();
      }

      function addTask(event) {
        event.preventDefault();
        var label = elements.taskTitle.value.trim();
        if (!label) {
          elements.taskTitle.focus();
          return;
        }
        var tasks = getTodayTasks();
        tasks.push({
          id: makeId("task"),
          label: label,
          activity: elements.taskActivity.value,
          hours: 0,
          timerSeconds: 0,
          timerStartedAt: null,
          done: false,
          createdAt: new Date().toISOString()
        });
        saveTodayTasks(tasks);
        elements.taskTitle.value = "";
        renderTasks();
      }

      function plannerDataSnapshot() {
        var data = {};
        Object.keys(memoryStore).forEach(function (key) {
          if (isPlannerKey(key)) {
            data[key] = memoryStore[key];
          }
        });
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
              if (isPlannerKey(key) && typeof data[key] === "string") {
                persistRaw(key, data[key]);
                imported += 1;
              }
            });
            if (serverStorageAvailable) {
              fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: data })
              }).catch(function () {});
            }
            elements.backupStatus.textContent = "Imported " + imported + " saved items.";
            renderGoals();
            renderTasks();
            renderTotals();
            renderCalendar();
            renderSkatePage();
            renderSelectedDate();
          } catch (error) {
            elements.backupStatus.textContent = "That backup file could not be read.";
          }
          elements.importData.value = "";
        };
        reader.readAsText(file);
      }

      function bindEvents() {
        elements.tabs.forEach(function (button) {
          button.addEventListener("click", function () {
            setActiveView(button.dataset.viewTarget);
          });
        });

        elements.prevMonth.addEventListener("click", function () {
          calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
          renderCalendar();
        });

        elements.nextMonth.addEventListener("click", function () {
          calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
          renderCalendar();
        });

        elements.eventForm.addEventListener("submit", addEvent);
        elements.eventDate.addEventListener("change", function () {
          if (elements.eventDate.value) {
            selectedDate = elements.eventDate.value;
            calendarCursor = new Date(parseDate(selectedDate).getFullYear(), parseDate(selectedDate).getMonth(), 1);
            renderCalendar();
            renderSelectedDate();
          }
        });
        if (elements.taskForm) {
          elements.taskForm.addEventListener("submit", addTask);
        }
        elements.exportData.addEventListener("click", exportBackup);
        elements.importData.addEventListener("change", importBackup);
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

        elements.skateFocusInput.addEventListener("input", function () {
          writeText(STORAGE.skateFocus, elements.skateFocusInput.value);
        });

        elements.skateTargetInput.addEventListener("input", function () {
          var value = Math.max(1, Math.floor(Number(elements.skateTargetInput.value) || 1));
          writeText(STORAGE.skateTarget, String(value));
          renderSkatePage();
        });

        elements.finishSkateSession.addEventListener("click", finishSkateSession);
        elements.bodyLogForm.addEventListener("submit", addBodyLog);
        elements.skateFeedbackForm.addEventListener("submit", submitSkateFeedback);
        elements.cancelSkateFeedback.addEventListener("click", function () {
          elements.skateFeedbackDialog.close();
        });
      }

      async function init() {
        await hydrateStore();
        renderActivities();
        renderWorkoutOptions();
        renderFeedbackScales();
        renderGoals();
        renderTasks();
        renderTotals();
        renderSkatePage();
        renderSelectedDate();
        renderCalendar();
        bindEvents();
        bindSoftMascot();
        setActiveView("todayView");
        window.setInterval(updateLiveTimers, 1000);
      }

      init();
    }());
