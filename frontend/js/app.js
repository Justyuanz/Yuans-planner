    (function () {
      "use strict";

      // All saved data uses these keys in SQLite/localStorage.
      var STORAGE = {
        databaseName: "yuanPlannerDatabase",
        goals: "hivePlanner.weeklyGoals",
        events: "hivePlanner.events",
        dailyTasksPrefix: "hivePlanner.dailyTasks.",
        plannedPrefix: "hivePlanner.planned.",
        jobsPrefix: "hivePlanner.jobs.",
        skateFocus: "hivePlanner.skate.focus",
        skateTarget: "hivePlanner.skate.weeklyTarget",
        skateCurrentSession: "hivePlanner.skate.currentSession",
        skateSessions: "hivePlanner.skate.sessions",
        mascotPosition: "hivePlanner.mascot.position"
      };
      var memoryStore = {};
      var serverStorageAvailable = false;
      var statsPeriod = "month";

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
          id: "fso",
          label: "Full Stack Open",
          placeholder: "Keep the morning habit alive.",
          className: "fso"
        }
      ];

      var taskPlan = {
        0: {
          message: "Sunday: solid C++ focus, then a tidy Python wrap up.",
          tasks: [
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
            { id: "cpp-solid", label: "C++ solid block", activity: "cpp" },
            { id: "python-wrap", label: "Python wrap up", activity: "python" }
          ]
        },
        1: {
          message: "Monday: begin with the habit, then make the main C++ block count.",
          tasks: [
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
            { id: "cpp-main", label: "C++ main block", activity: "cpp" },
            { id: "python-project", label: "Python project", activity: "python" }
          ]
        },
        2: {
          message: "Tuesday: small clear wins across all three tracks.",
          tasks: [
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
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
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
            { id: "cpp-block-a", label: "C++ block one", activity: "cpp" },
            { id: "cpp-block-b", label: "C++ block two", activity: "cpp" },
            { id: "python-project", label: "Python project", activity: "python" }
          ]
        },
        5: {
          message: "Friday: land one C++ task, then give Python the afternoon.",
          tasks: [
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
            { id: "cpp-one", label: "C++", activity: "cpp" },
            { id: "python-afternoon", label: "Python project", activity: "python" }
          ]
        },
        6: {
          message: "Saturday: keep it light and keep the streak friendly.",
          tasks: [
            { id: "fso-morning", label: "Full Stack Open", activity: "fso" },
            { id: "python-light", label: "Python light", activity: "python" },
            { id: "skate-session", label: "Skate session", activity: "skate" }
          ]
        }
      };

      var activities = [
        { id: "fso", label: "Full Stack Open", short: "FSO", className: "fso", group: "study" },
        { id: "cpp", label: "C++ / ft_irc", short: "C++", className: "cpp", group: "study" },
        { id: "python", label: "Python", short: "Python", className: "python", group: "study" },
        { id: "skate", label: "Skate", short: "Skate", className: "skate", group: "leisure" },
        { id: "guitar", label: "Guitar", short: "Guitar", className: "guitar", group: "leisure" }
      ];

      var routineLabelRenames = {
        "Full Stack Open morning": "Full Stack Open",
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

      var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
        resetSkateSession: document.getElementById("resetSkateSession"),
        skateSessionHint: document.getElementById("skateSessionHint"),
        statsPeriodTabs: document.getElementById("statsPeriodTabs"),
        lifeDonut: document.getElementById("lifeDonut"),
        lifeDonutLabel: document.getElementById("lifeDonutLabel"),
        lifeSummary: document.getElementById("lifeSummary"),
        lifeBreakdown: document.getElementById("lifeBreakdown"),
        plannedWeekLabel: document.getElementById("plannedWeekLabel"),
        plannedMount: document.getElementById("plannedMount"),
        jobsToday: document.getElementById("jobsToday"),
        jobsSummary: document.getElementById("jobsSummary"),
        jobStats: document.getElementById("jobStats"),
        upcomingEvents: document.getElementById("upcomingEvents"),
        calendarHeading: document.getElementById("calendarHeading"),
        calendarGrid: document.getElementById("calendarGrid"),
        prevMonth: document.getElementById("prevMonth"),
        nextMonth: document.getElementById("nextMonth"),
        selectedDateHeading: document.getElementById("selectedDateHeading"),
        eventForm: document.getElementById("eventForm"),
        eventTitle: document.getElementById("eventTitle"),
        eventNote: document.getElementById("eventNote"),
        eventCategory: document.getElementById("eventCategory"),
        formHint: document.getElementById("formHint"),
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

      function jobsStorageKey(date) {
        return STORAGE.jobsPrefix + formatDate(date);
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

      function getEvents() {
        var events = readJson(STORAGE.events, []);
        return Array.isArray(events) ? events : [];
      }

      function saveEvents(events) {
        writeJson(STORAGE.events, events);
      }

      function categoryClass(category) {
        return category === "Personal" ? "personal" : "study";
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
              activity: task.activity || task.track || "fso",
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

        elements.todaySubtitle.textContent = humanDate(todayKey) + " · Graduation and job hunt are getting closer, one calm block at a time.";
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
          hoursInput.step = "0.25";
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

        return totals;
      }

      function totalsForStatsPeriod(period) {
        var week = weekRange(today);
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

        groupActivities.forEach(function (activity) {
          var row = document.createElement("label");
          row.className = "planned-row " + activity.className;
          var input = document.createElement("input");
          input.id = "planned-" + activity.id;
          input.name = "planned-" + activity.id;
          input.type = "number";
          input.min = "0";
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

      function totalJobsForRange(start, end) {
        return Object.keys(memoryStore).reduce(function (sum, key) {
          if (key.indexOf(STORAGE.jobsPrefix) !== 0) {
            return sum;
          }
          var date = parseDate(key.slice(STORAGE.jobsPrefix.length));
          if (!dateInRange(date, start, end)) {
            return sum;
          }
          return sum + (Number(readText(key, "0")) || 0);
        }, 0);
      }

      function totalJobsAllTime() {
        return Object.keys(memoryStore).reduce(function (sum, key) {
          if (key.indexOf(STORAGE.jobsPrefix) !== 0) {
            return sum;
          }
          return sum + (Number(readText(key, "0")) || 0);
        }, 0);
      }

      function renderJobs() {
        var todayValue = Number(readText(jobsStorageKey(today), "0")) || 0;
        var week = weekRange(today);
        var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        var monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        elements.jobsToday.value = todayValue || "";
        var weekTotal = totalJobsForRange(week.start, week.end);
        elements.jobsSummary.textContent = weekTotal + " this week";
        elements.jobStats.innerHTML = "";
        [
          ["This week", weekTotal],
          ["This month", totalJobsForRange(monthStart, monthEnd)],
          ["All time", totalJobsAllTime()]
        ].forEach(function (row) {
          var item = document.createElement("div");
          item.className = "job-row";
          item.innerHTML = "<strong>" + row[0] + "</strong><span>" + row[1] + "</span>";
          elements.jobStats.appendChild(item);
        });
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

      function skateSessionsThisWeek() {
        var week = weekRange(today);
        return getSkateSessions().filter(function (session) {
          if (!session || !session.finishedAt) {
            return false;
          }
          return dateInRange(parseDate(session.finishedAt.slice(0, 10)), week.start, week.end);
        }).length;
      }

      function renderSkatePage() {
        if (!elements.skateFocusInput) {
          return;
        }
        var session = getCurrentSkateSession();
        var target = Math.max(1, Number(readText(STORAGE.skateTarget, "4")) || 4);
        var finishedThisWeek = skateSessionsThisWeek();

        elements.skateFocusInput.value = readText(STORAGE.skateFocus, "");
        elements.skateTargetInput.value = target;
        elements.skateWeekLabel.textContent = isoWeekKey(today);
        elements.skateSessionCount.textContent = "Skate sessions this week: " + finishedThisWeek + " / " + target;
        elements.skateWarmups.value = session.warmups;
        elements.skateSessionNote.value = session.note;
        elements.skateChecklist.innerHTML = "";

        skateChecklistItems.forEach(function (label, index) {
          var row = document.createElement("label");
          row.className = "skate-check-row";

          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
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

      function resetSkateSession(message) {
        saveCurrentSkateSession(defaultSkateSession());
        renderSkatePage();
        elements.skateSessionHint.textContent = message || "Fresh session checklist ready.";
      }

      function finishSkateSession() {
        var session = getCurrentSkateSession();
        var sessions = getSkateSessions();
        var focus = readText(STORAGE.skateFocus, "").trim();

        sessions.push({
          id: makeId("skate"),
          focus: focus,
          warmups: session.warmups,
          checked: session.checked,
          note: session.note,
          startedAt: session.startedAt,
          finishedAt: new Date().toISOString()
        });
        saveSkateSessions(sessions);
        resetSkateSession("Session saved. New checklist is ready.");
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
              deleteEvent(event.id);
            });
            pills.appendChild(pill);
          });
          button.appendChild(pills);
          elements.calendarGrid.appendChild(button);
        }
      }

      function renderSelectedDate() {
        elements.selectedDateHeading.textContent = "Add event for " + humanDate(selectedDate);
        elements.formHint.textContent = "Selected: " + selectedDate;
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
        renderCalendar();
        renderUpcoming();
      }

      function addEvent(event) {
        event.preventDefault();
        var title = elements.eventTitle.value.trim();
        var note = elements.eventNote.value.trim();
        var category = elements.eventCategory.value;

        if (!title) {
          elements.formHint.textContent = "Add a title before saving.";
          elements.eventTitle.focus();
          return;
        }

        var events = getEvents();
        events.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          date: selectedDate,
          title: title,
          note: note,
          category: category,
          createdAt: new Date().toISOString()
        });
        saveEvents(events);

        elements.eventTitle.value = "";
        elements.eventNote.value = "";
        elements.formHint.textContent = "Saved for " + humanDate(selectedDate) + ".";
        renderCalendar();
        renderUpcoming();
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
            renderUpcoming();
            renderCalendar();
            renderSkatePage();
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
        elements.taskForm.addEventListener("submit", addTask);
        elements.exportData.addEventListener("click", exportBackup);
        elements.importData.addEventListener("change", importBackup);
        elements.jobsToday.addEventListener("input", function () {
          var value = Math.max(0, Math.floor(Number(elements.jobsToday.value) || 0));
          writeText(jobsStorageKey(today), String(value));
          renderJobs();
        });

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
        elements.resetSkateSession.addEventListener("click", function () {
          resetSkateSession("Checklist reset for this session.");
        });
      }

      async function init() {
        await hydrateStore();
        renderActivities();
        renderGoals();
        renderTasks();
        renderHours();
        renderJobs();
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
