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
        { id: "guitar", label: "Guitar", short: "Guitar", className: "guitar", group: "leisure" }
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

      var skateChecklistItems = [
        "Warm up with my selected tricks",
        "Watch 5 minutes of tutorial or footage related to the current trick",
        "Try the current trick at least 30 times during this session",
        "Film at least one attempt or a short clip",
        "Spend a few minutes just skating for fun without pressure"
      ];

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
        legSoreness: ["fresh", "okay", "noticeable", "heavy", "too sore"],
        skateQuality: ["bad", "rough", "okay", "good", "amazing"],
        confidence: ["scared", "hesitant", "normal", "confident", "very free"]
      };

      var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
        skateFocusInput: document.getElementById("skateFocusInput"),
        skateWeekLabel: document.getElementById("skateWeekLabel"),
        skateSessionCount: document.getElementById("skateSessionCount"),
        skateTargetInput: document.getElementById("skateTargetInput"),
        skateWarmups: document.getElementById("skateWarmups"),
        skateChecklist: document.getElementById("skateChecklist"),
        skateSessionNote: document.getElementById("skateSessionNote"),
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
        upcomingEvents: document.getElementById("upcomingEvents"),
        calendarHeading: document.getElementById("calendarHeading"),
        calendarGrid: document.getElementById("calendarGrid"),
        prevMonth: document.getElementById("prevMonth"),
        nextMonth: document.getElementById("nextMonth"),
        selectedDateHeading: document.getElementById("selectedDateHeading"),
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
        legSorenessScale: document.getElementById("legSorenessScale"),
        skateQualityScale: document.getElementById("skateQualityScale"),
        confidenceScale: document.getElementById("confidenceScale"),
        skateFeedbackNote: document.getElementById("skateFeedbackNote"),
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

      function formatHours(value) {
        var number = Number(value) || 0;
        if (Math.abs(number - Math.round(number)) < 0.001) {
          return String(Math.round(number)) + "h";
        }
        return String(Math.round(number * 100) / 100).replace(/\.0$/, "") + "h";
      }

      function formatMinutes(minutes) {
        var safeMinutes = Math.max(0, Number(minutes) || 0);
        return formatHours(safeMinutes / 60);
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

      function weekDates(date) {
        var range = weekRange(date);
        var dates = [];
        for (var index = 0; index < 7; index += 1) {
          dates.push(addDays(range.start, index));
        }
        return dates;
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

      function savePhysicalPlan(date, plan) {
        writeJson(physicalPlanStorageKey(date), normalizePhysicalPlan(plan, date));
      }

      function splitPlanText(text) {
        return String(text || "")
          .split(/\s*(?:\+|,|\/|\n)\s*/)
          .map(function (name) {
            return name.trim();
          })
          .filter(Boolean);
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
          if (category === "Other") return "other-event";
          if (category === "Skate") return "skate-event";
          return "study";
      }

      function setActiveView(viewId) {
        elements.tabs.forEach(function (button) {
          button.classList.toggle("active", button.dataset.viewTarget === viewId);
        });
        elements.views.forEach(function (view) {
          view.classList.toggle("active", view.id === viewId);
        });
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
              activity: task.activity || task.track || "lc",
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

          var label = document.createElement("label");
          label.className = "task-title";
          label.setAttribute("for", checkbox.id);
          label.textContent = task.label;

          var badge = document.createElement("span");
          badge.className = "activity-badge " + activity.className;
          badge.textContent = activity.short;

          var hoursWrap = document.createElement("div");
          hoursWrap.className = "task-hours";

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

          var timerReadout = document.createElement("span");
          timerReadout.className = "timer-readout";
          timerReadout.dataset.timerId = task.id;
          timerReadout.textContent = formatTimer(elapsedTaskSeconds(task));

          var timerControls = document.createElement("div");
          timerControls.className = "timer-controls";

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
            saveTodayTasks(tasks);
            renderTasks();
            renderTotals();
          });

          content.appendChild(label);
          content.appendChild(badge);
          hoursWrap.appendChild(hoursLabel);
          hoursWrap.appendChild(hoursInput);
          hoursWrap.appendChild(timerReadout);
          timerControls.appendChild(startPauseButton);
          timerControls.appendChild(endButton);
          hoursWrap.appendChild(timerControls);
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
              totals[task.activity] += effectiveTaskHours(task);
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
          normalizeTasks(readJson(key, [])).forEach(function (task) {
            if (totals[task.activity] !== undefined) {
              totals[task.activity] += effectiveTaskHours(task);
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

      function renderHours() {
        renderTotals();
      }

      function renderTotals() {
        renderLifePie();
        renderPlannedActual();
        renderOverviewCards();
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
        activities.forEach(function (activity) {
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

      function plannedStudyHoursForWeek(date) {
        var planned = readJson(plannedStorageKey(date), {});
        return activities.filter(function (activity) {
          return activity.group === "study";
        }).reduce(function (sum, activity) {
          return sum + (Number(planned[activity.id]) || 0);
        }, 0);
      }

      function physicalPlanStats(date) {
        var week = weekRange(date);
        var stats = {
          skateTarget: Math.max(1, Number(readText(STORAGE.skateTarget, "4")) || 4),
          skateDone: 0,
          p90x3Target: 0,
          p90x3Done: 0,
          abTarget: 0,
          abDone: 0,
          physicalMinutes: 0,
          modified: 0,
          skipped: 0
        };

        getPhysicalPlan(date).days.forEach(function (items) {
          items.forEach(function (item) {
            var kind = workoutKind(item.name);
            if (kind === "p90x3") {
              stats.p90x3Target += 1;
            }
            if (kind === "abRipper") {
              stats.abTarget += 1;
            }
            if (item.status === "modified") {
              stats.modified += 1;
            }
            if (item.status === "skipped") {
              stats.skipped += 1;
            }
            if (countsAsDone(item.status)) {
              if (kind === "skate") {
                stats.skateDone += 1;
              } else if (kind === "p90x3") {
                stats.p90x3Done += 1;
              } else if (kind === "abRipper") {
                stats.abDone += 1;
              }
              stats.physicalMinutes += Number(item.minutes) || 0;
            }
          });
        });

        getPhysicalLogs().forEach(function (log) {
          var logDate = parseDate(log.date);
          if (!dateInRange(logDate, week.start, week.end)) {
            return;
          }
          if (log.status === "modified") {
            stats.modified += 1;
          }
          if (log.status === "skipped") {
            stats.skipped += 1;
          }
          if (!countsAsDone(log.status)) {
            return;
          }
          if (workoutKind(log.name) === "skate") {
            stats.skateDone += 1;
          } else if (workoutKind(log.name) === "abRipper") {
            stats.abDone += 1;
          } else if (workoutKind(log.name) === "p90x3") {
            stats.p90x3Done += 1;
          }
          stats.physicalMinutes += Number(log.minutes) || 0;
        });

        getSkateSessions().forEach(function (session) {
          if (!session || !session.finishedAt) {
            return;
          }
          if (dateInRange(parseDate(session.finishedAt.slice(0, 10)), week.start, week.end)) {
            stats.skateDone += 1;
            stats.physicalMinutes += Math.round((Number(session.durationHours) || 0) * 60);
          }
        });

        return stats;
      }

      function feedbackForRange(start, end) {
        return getSkateSessions().filter(function (session) {
          if (!session || !session.finishedAt) {
            return false;
          }
          return dateInRange(parseDate(session.finishedAt.slice(0, 10)), start, end);
        });
      }

      function createMetricRow(label, value, detail) {
        var row = document.createElement("div");
        row.className = "overview-row";
        row.innerHTML = "<strong>" + label + "</strong><span>" + value + (detail ? " · " + detail : "") + "</span>";
        return row;
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

      function renderOverviewCards() {
        renderStudyOverview();
      }

      // Skate sessions reset their checklist only after finishing a session.
      function defaultSkateSession() {
        return {
          warmups: "",
          note: "",
          checked: skateChecklistItems.map(function () {
            return false;
          }),
          startedAt: new Date().toISOString()
        };
      }

      function getCurrentSkateSession() {
        var session = readJson(STORAGE.skateCurrentSession, null);
        if (!session || !Array.isArray(session.checked)) {
          return defaultSkateSession();
        }
        return {
          warmups: typeof session.warmups === "string" ? session.warmups : "",
          note: typeof session.note === "string" ? session.note : "",
          checked: skateChecklistItems.map(function (_, index) {
            return Boolean(session.checked[index]);
          }),
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
        elements.skateTrendCharts.innerHTML = "";
        elements.skateTrendCharts.appendChild(createTrendChart("Skate quality over time", [
          { label: "Quality", values: series.quality, summary: scoreLabel(average(series.quality)), className: "skate" }
        ]));
        elements.skateTrendCharts.appendChild(createTrendChart("Leg soreness over time", [
          { label: "Soreness", values: series.soreness, summary: scoreLabel(average(series.soreness)), className: "p90x3" }
        ]));
        elements.skateTrendCharts.appendChild(createTrendChart("Skate / body hours", [
          { label: "Skate", values: series.skateHours, summary: totalLabel(series.skateHours), className: "skate" },
          { label: "Body", values: series.bodyHours, summary: totalLabel(series.bodyHours), className: "python" }
        ]));
        renderSkateTrendPeriodTabs();
      }

      function totalLabel(values) {
        var total = values.reduce(function (sum, value) {
          return sum + (Number(value) || 0);
        }, 0);
        return total ? formatHours(Math.round(total * 10) / 10) : "No hours yet";
      }

      function trendSeries(period) {
        var buckets = buildTrendBuckets(period);
        var series = {
          labels: [],
          quality: [],
          soreness: [],
          skateHours: [],
          bodyHours: []
        };

        buckets.forEach(function (bucket) {
          var sessions = getSkateSessions().filter(function (session) {
            return session && session.finishedAt && bucket.matchDate(parseDate(session.finishedAt.slice(0, 10)));
          });
          var bodyLogs = getPhysicalLogs().filter(function (log) {
            return countsAsDone(log.status) && bucket.matchDate(parseDate(log.date));
          });

          series.labels.push(bucket.label);
          series.quality.push(average(sessions.map(function (session) { return session.skateQuality; })));
          series.soreness.push(average(sessions.map(function (session) { return session.legSoreness; })));
          series.skateHours.push(Math.round(sessions.reduce(function (sum, session) {
            return sum + (Number(session.durationHours) || 0);
          }, 0) * 10) / 10);
          series.bodyHours.push(Math.round(bodyLogs.reduce(function (sum, log) {
            return sum + ((Number(log.minutes) || 0) / 60);
          }, 0) * 10) / 10);
        });

        return series;
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

      function renderSkatePage() {
        if (!elements.skateFocusInput) {
          return;
        }
        var session = getCurrentSkateSession();
        var target = Math.max(1, Number(readText(STORAGE.skateTarget, "4")) || 4);
        var skateSessionsThisWeek = countSkateSessionsForWeek(today);

        elements.skateFocusInput.value = readText(STORAGE.skateFocus, "");
        elements.skateTargetInput.value = target;
        elements.skateWeekLabel.textContent = isoWeekKey(today);
        elements.skateSessionCount.textContent = skateSessionsThisWeek + " / " + target;
        elements.skateWarmups.value = session.warmups;
        elements.skateSessionNote.value = session.note;
        elements.skateChecklist.innerHTML = "";
        renderSkateWeeklyMetrics();
        renderSkateTrendCharts();

        skateChecklistItems.forEach(function (label, index) {
          var row = document.createElement("label");
          row.className = "skate-check-row";

          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = "skate-check-" + index;
          checkbox.name = checkbox.id;
          checkbox.checked = Boolean(session.checked[index]);
          checkbox.addEventListener("change", function () {
            var latestSession = getCurrentSkateSession();
            latestSession.checked[index] = checkbox.checked;
            saveCurrentSkateSession(latestSession);
          });

          row.appendChild(checkbox);
          row.appendChild(document.createElement("span")).textContent = label;
          elements.skateChecklist.appendChild(row);
        });
      }

      function updateCurrentSkateSessionField(field, value) {
        var session = getCurrentSkateSession();
        session[field] = value;
        saveCurrentSkateSession(session);
      }

      function resetSkateSessionState(message) {
        saveCurrentSkateSession(defaultSkateSession());
        renderSkatePage();
        elements.skateSessionHint.textContent = message || "Fresh session checklist ready.";
      }

      function finishSkateSession() {
        if (elements.skateFeedbackDialog && typeof elements.skateFeedbackDialog.showModal === "function") {
          elements.skateFeedbackNote.value = "";
          elements.skateFeedbackDialog.showModal();
          return;
        }
        saveFinishedSkateSession({ legSoreness: 3, skateQuality: 3, confidence: 3, feedbackNote: "" });
      }

      function saveFinishedSkateSession(feedback) {
        var session = getCurrentSkateSession();
        var sessions = getSkateSessions();
        var focus = readText(STORAGE.skateFocus, "").trim();

        sessions.push({
          id: makeId("skate"),
          focus: focus,
          warmups: session.warmups,
          checked: session.checked,
          note: session.note,
          feedbackNote: feedback.feedbackNote || "",
          legSoreness: Math.max(1, Math.min(5, Number(feedback.legSoreness) || 3)),
          skateQuality: Math.max(1, Math.min(5, Number(feedback.skateQuality) || 3)),
          confidence: Math.max(1, Math.min(5, Number(feedback.confidence) || 3)),
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
        if (!elements.legSorenessScale) {
          return;
        }
        renderScaleOptions(elements.legSorenessScale, "legSoreness", feedbackScales.legSoreness, 3);
        renderScaleOptions(elements.skateQualityScale, "skateQuality", feedbackScales.skateQuality, 3);
        renderScaleOptions(elements.confidenceScale, "confidence", feedbackScales.confidence, 3);
      }

      function selectedScaleValue(name) {
        var selected = document.querySelector('input[name="' + name + '"]:checked');
        return selected ? Number(selected.value) : 3;
      }

      function submitSkateFeedback(event) {
        event.preventDefault();
        saveFinishedSkateSession({
          legSoreness: selectedScaleValue("legSoreness"),
          skateQuality: selectedScaleValue("skateQuality"),
          confidence: selectedScaleValue("confidence"),
          feedbackNote: elements.skateFeedbackNote.value.trim()
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

      function renderUpcoming() {
        var todayKey = formatDate(today);
        var upcoming = getEvents()
          .filter(function (event) {
            return event.date >= todayKey;
          })
          .sort(function (a, b) {
            return a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt));
          })
          .slice(0, 3);

        elements.upcomingEvents.innerHTML = "";

        if (upcoming.length === 0) {
          var empty = document.createElement("p");
          empty.className = "empty";
          empty.textContent = "No upcoming events yet. Add deadlines, appointments, or small future reminders in Calendar.";
          elements.upcomingEvents.appendChild(empty);
          return;
        }

        upcoming.forEach(function (event) {
          var item = document.createElement("li");
          item.className = "upcoming-item";

          var date = document.createElement("span");
          date.className = "event-date";
          date.textContent = humanDate(event.date);

          var text = document.createElement("div");
          text.className = "event-title-row";
          text.appendChild(document.createTextNode(event.title));

          var tag = document.createElement("span");
          tag.className = "tag " + categoryClass(event.category);
          tag.textContent = event.category;
          text.appendChild(tag);

          item.appendChild(date);
          item.appendChild(text);
          elements.upcomingEvents.appendChild(item);
        });
      }

      // Calendar events are simple date pills saved with the rest of the planner data.
      function renderCalendar() {
        var year = calendarCursor.getFullYear();
        var month = calendarCursor.getMonth();
        var firstOfMonth = new Date(year, month, 1);
        var start = new Date(year, month, 1 - firstOfMonth.getDay());
        var events = getEvents();
        var todayKey = formatDate(today);

        elements.calendarHeading.textContent = monthNames[month] + " " + year;
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
          var dayEvents = events
            .filter(function (event) {
              return event.date === dateKey;
            })
            .sort(function (a, b) {
              return String(a.createdAt).localeCompare(String(b.createdAt));
            });

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
          dayEvents.forEach(function (event) {
            var pill = document.createElement("button");
            pill.type = "button";
            pill.className = "event-pill " + categoryClass(event.category);
            pill.textContent = event.title;
            pill.title = event.note ? event.title + " - " + event.note : event.title;
            pill.addEventListener("click", function (clickEvent) {
              clickEvent.stopPropagation();
              startEditEvent(event.id);
            });
            pills.appendChild(pill);
          });
          button.appendChild(pills);
          elements.calendarGrid.appendChild(button);
        }
      }

      function renderSelectedDate() {
        var events = getEvents()
          .filter(function (event) {
            return event.date === selectedDate;
          })
          .sort(function (a, b) {
            return String(a.createdAt).localeCompare(String(b.createdAt));
          });

        elements.selectedDateHeading.textContent = "Add event for " + humanDate(selectedDate);
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
        saveEvents(events.filter(function (item) {
          return item.id !== id;
        }));
        if (editingEventId === id) {
          resetEventForm("Event deleted.");
        }
        renderCalendar();
        renderUpcoming();
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
        if (editingEventId) {
          events = events.map(function (item) {
            if (item.id !== editingEventId) {
              return item;
            }
            return Object.assign({}, item, {
              date: eventDate,
              title: title,
              note: note,
              category: category,
              startTime: "",
              endTime: "",
              updatedAt: new Date().toISOString()
            });
          });
        } else {
          events.push({
            id: makeId("event"),
            date: eventDate,
            title: title,
            note: note,
            category: category,
            startTime: "",
            endTime: "",
            createdAt: new Date().toISOString()
          });
        }
        saveEvents(events);

        selectedDate = eventDate;
        calendarCursor = new Date(parseDate(selectedDate).getFullYear(), parseDate(selectedDate).getMonth(), 1);
        resetEventForm((editingEventId ? "Updated " : "Saved for ") + humanDate(selectedDate) + ".");
        renderCalendar();
        renderUpcoming();
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
            renderHours();
            renderOverviewCards();
            renderCalendar();
            renderSkatePage();
            renderUpcoming();
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
        elements.taskForm.addEventListener("submit", addTask);
        elements.exportData.addEventListener("click", exportBackup);
        elements.importData.addEventListener("change", importBackup);

        elements.skateFocusInput.addEventListener("input", function () {
          writeText(STORAGE.skateFocus, elements.skateFocusInput.value);
        });

        elements.skateTargetInput.addEventListener("input", function () {
          var value = Math.max(1, Math.floor(Number(elements.skateTargetInput.value) || 1));
          writeText(STORAGE.skateTarget, String(value));
          renderSkatePage();
        });

        elements.skateWarmups.addEventListener("input", function () {
          updateCurrentSkateSessionField("warmups", elements.skateWarmups.value);
        });

        elements.skateSessionNote.addEventListener("input", function () {
          updateCurrentSkateSessionField("note", elements.skateSessionNote.value);
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
        renderHours();
        renderSkatePage();
        renderUpcoming();
        renderSelectedDate();
        renderCalendar();
        bindEvents();
        bindSoftMascot();
        setActiveView("todayView");
        window.setInterval(updateLiveTimers, 1000);
      }

      init();
    }());
