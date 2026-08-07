(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanAgentCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY_STATES = ["good", "okay", "tired", "overwhelmed", "low-focus"];

  function cloneValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDayState(value) {
    var text = String(value || "").trim().toLowerCase();
    return DAY_STATES.indexOf(text) !== -1 ? text : "okay";
  }

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

  function formatClock(totalMinutes) {
    var safe = Math.max(0, Number(totalMinutes) || 0);
    var hours = Math.floor(safe / 60);
    var minutes = safe % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
  }

  function shiftTimedLabel(label, minutesDelta) {
    var text = String(label || "").trim();
    var match = text.match(/^(\d{1,2})(?::?(\d{2}))?/);
    if (!match) {
      return text;
    }
    var currentMinutes = parseTaskTimeMinutes(text);
    if (currentMinutes === null) {
      return text;
    }
    var shifted = Math.max(0, Math.min((23 * 60) + 59, currentMinutes + (Number(minutesDelta) || 0)));
    var suffix = text.replace(/^(\d{1,2})(?::?(\d{2}))?/, "").trimStart();
    return formatClock(shifted) + (suffix ? " " + suffix : "");
  }

  function broadTaskLabel(label) {
    return /\b(study|work|admin|project|journal|practice|plan|organize|clean|prep|review|research)\b/i.test(String(label || "").trim());
  }

  function taskSortScore(task) {
    var time = parseTaskTimeMinutes(task && task.label);
    var hours = Number(task && task.hours) || 0;
    return {
      timed: time !== null,
      time: time === null ? Number.MAX_SAFE_INTEGER : time,
      hours: hours
    };
  }

  function sortTasksForFocus(tasks) {
    return (Array.isArray(tasks) ? tasks : []).slice().sort(function (a, b) {
      var left = taskSortScore(a);
      var right = taskSortScore(b);
      if (left.timed !== right.timed) {
        return left.timed ? -1 : 1;
      }
      if (left.time !== right.time) {
        return left.time - right.time;
      }
      if (left.hours !== right.hours) {
        return left.hours - right.hours;
      }
      return String(a.label || "").localeCompare(String(b.label || ""));
    });
  }

  function unfinishedTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).filter(function (task) {
      return task && !task.done;
    });
  }

  function visibleTaskCountForState(dayState) {
    var normalized = normalizeDayState(dayState);
    if (normalized === "good") {
      return 4;
    }
    if (normalized === "overwhelmed") {
      return 1;
    }
    if (normalized === "tired" || normalized === "low-focus") {
      return 2;
    }
    return 3;
  }

  function pickTopTaskIds(tasks, count) {
    return sortTasksForFocus(unfinishedTasks(tasks)).slice(0, Math.max(1, Number(count) || 1)).map(function (task) {
      return task.id;
    });
  }

  function pickMoveCandidate(tasks) {
    var open = sortTasksForFocus(unfinishedTasks(tasks));
    if (!open.length) {
      return null;
    }
    var reversed = open.slice().reverse();
    return reversed.find(function (task) {
      var time = parseTaskTimeMinutes(task.label);
      return time === null || time >= 18 * 60;
    }) || reversed[0];
  }

  function pickMorningTask(tasks) {
    return sortTasksForFocus(unfinishedTasks(tasks)).find(function (task) {
      var time = parseTaskTimeMinutes(task.label);
      return time !== null && time < 12 * 60;
    }) || null;
  }

  function pickBroadTask(tasks) {
    return unfinishedTasks(tasks).find(function (task) {
      return broadTaskLabel(task.label);
    }) || unfinishedTasks(tasks)[0] || null;
  }

  function breakdownLabels(task) {
    var label = String(task && task.label || "").trim();
    var clean = label.replace(/^(\d{1,2})(?::?(\d{2}))?\s*/, "").trim();
    if (/c\+\+|leetcode|python|study/i.test(clean)) {
      return [
        "Open " + clean + " and choose one tiny target",
        "Do one 25-minute block for " + clean,
        "Write one note from " + clean
      ];
    }
    return [
      "Open what you need for " + clean,
      "Do the first visible piece of " + clean,
      "Leave one short note for the next step in " + clean
    ];
  }

  function recurringLabelFromHistory(context) {
    var recentTaskHistory = Array.isArray(context && context.recentTaskHistory) ? context.recentTaskHistory : [];
    var counts = {};
    recentTaskHistory.forEach(function (day) {
      (Array.isArray(day && day.unfinishedLabels) ? day.unfinishedLabels : []).forEach(function (label) {
        var key = String(label || "").trim();
        if (!key) {
          return;
        }
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    var bestLabel = "";
    var bestCount = 0;
    Object.keys(counts).forEach(function (label) {
      if (counts[label] > bestCount) {
        bestLabel = label;
        bestCount = counts[label];
      }
    });
    return bestCount >= 2 ? bestLabel : "";
  }

  function questionIntent(question) {
    var text = String(question || "").trim().toLowerCase();
    if (!text) {
      return "general";
    }
    if (/move|tomorrow|later/.test(text)) {
      return "move";
    }
    if (/break|smaller|concrete/.test(text)) {
      return "breakdown";
    }
    if (/morning|late|get ready|start/.test(text)) {
      return "morning";
    }
    if (/one thing|what next|next|only do one/.test(text)) {
      return "next";
    }
    if (/tired|overwhelm|overloaded|cut today|ignore/.test(text)) {
      return "simplify";
    }
    return "general";
  }

  function carryoverIsHigh(context) {
    var metrics = context && context.metrics ? context.metrics : {};
    return Number(metrics.carryoverIndicators && metrics.carryoverIndicators.carryoverRate) >= 0.15;
  }

  function availableActions(context) {
    var tasks = Array.isArray(context && context.todayTasks) ? context.todayTasks : [];
    var actionMap = {};
    if (
      unfinishedTasks(tasks).length > 3
      || normalizeDayState(context && context.dayState) === "tired"
      || normalizeDayState(context && context.dayState) === "overwhelmed"
      || carryoverIsHigh(context)
    ) {
      actionMap.simplify_today = {
        id: "simplify_today",
        label: actionLabel("simplify_today"),
        suggestion: suggestActionCopy("simplify_today", context)
      };
    }
    if (unfinishedTasks(tasks).length > 3) {
      actionMap.keep_top_three = {
        id: "keep_top_three",
        label: actionLabel("keep_top_three"),
        suggestion: suggestActionCopy("keep_top_three", context)
      };
    }
    if (pickMoveCandidate(tasks)) {
      actionMap.move_one_task = {
        id: "move_one_task",
        label: actionLabel("move_one_task"),
        suggestion: suggestActionCopy("move_one_task", context)
      };
    }
    if (pickMorningTask(tasks)) {
      actionMap.adjust_morning_block = {
        id: "adjust_morning_block",
        label: actionLabel("adjust_morning_block"),
        suggestion: suggestActionCopy("adjust_morning_block", context)
      };
    }
    if (pickBroadTask(tasks) || recurringLabelFromHistory(context)) {
      actionMap.break_task_down = {
        id: "break_task_down",
        label: actionLabel("break_task_down"),
        suggestion: suggestActionCopy("break_task_down", context)
      };
    }
    return actionMap;
  }

  function normalizeAgentState(agentState) {
    var state = agentState && typeof agentState === "object" ? cloneValue(agentState) : {};
    if (!state.dayStates || typeof state.dayStates !== "object") {
      state.dayStates = {};
    }
    if (!state.hiddenTaskIdsByDate || typeof state.hiddenTaskIdsByDate !== "object") {
      state.hiddenTaskIdsByDate = {};
    }
    return state;
  }

  function actionLabel(actionId) {
    var labels = {
      simplify_today: "Simplify today",
      keep_top_three: "Keep top three visible",
      move_one_task: "Move one task to tomorrow",
      adjust_morning_block: "Push one morning task later",
      break_task_down: "Break one task into smaller steps",
      undo_last_agent_action: "Undo last agent change"
    };
    return labels[actionId] || actionId;
  }

  function suggestActionCopy(actionId, context) {
    var tasks = unfinishedTasks(context && context.todayTasks);
    var dayState = normalizeDayState(context && context.dayState);
    if (actionId === "simplify_today") {
      return "cut today to a " + visibleTaskCountForState(dayState) + "-task version";
    }
    if (actionId === "keep_top_three") {
      return "keep only the three clearest tasks visible";
    }
    if (actionId === "move_one_task") {
      var moveCandidate = pickMoveCandidate(tasks);
      return moveCandidate ? "move \"" + moveCandidate.label + "\" to tomorrow" : "move one low-priority task to tomorrow";
    }
    if (actionId === "adjust_morning_block") {
      var morningTask = pickMorningTask(tasks);
      return morningTask ? "push \"" + morningTask.label + "\" later" : "push the first serious morning task later";
    }
    if (actionId === "break_task_down") {
      var broadTask = pickBroadTask(tasks);
      if (broadTask) {
        return "break \"" + broadTask.label + "\" into smaller steps";
      }
      var recurringLabel = recurringLabelFromHistory(context);
      return recurringLabel ? "turn \"" + recurringLabel + "\" into a smaller starter task" : "break one broad task into smaller steps";
    }
    return "take one smaller next step";
  }

  function proposeActions(context) {
    var tasks = Array.isArray(context && context.todayTasks) ? context.todayTasks : [];
    var actionMap = availableActions(context);
    var actionIds = Object.keys(actionMap);
    var prioritized = [];
    var intent = questionIntent(context && context.question);
    var dayState = normalizeDayState(context && context.dayState);

    function pushAction(actionId) {
      if (actionMap[actionId] && prioritized.indexOf(actionId) === -1) {
        prioritized.push(actionId);
      }
    }

    if (intent === "move") {
      ["move_one_task", "simplify_today", "keep_top_three"].forEach(pushAction);
    } else if (intent === "breakdown") {
      ["break_task_down", "simplify_today", "keep_top_three"].forEach(pushAction);
    } else if (intent === "morning") {
      ["adjust_morning_block", "simplify_today", "move_one_task"].forEach(pushAction);
    } else if (intent === "next") {
      if (unfinishedTasks(tasks).length > 1 || carryoverIsHigh(context)) {
        ["simplify_today", "keep_top_three", "break_task_down"].forEach(pushAction);
      } else {
        ["break_task_down", "move_one_task"].forEach(pushAction);
      }
    } else if (intent === "simplify" || dayState === "tired" || dayState === "overwhelmed" || dayState === "low-focus") {
      ["simplify_today", "keep_top_three", "move_one_task"].forEach(pushAction);
    }

    actionIds.forEach(pushAction);
    return prioritized.map(function (actionId) {
      return actionMap[actionId];
    });
  }

  function snapshot(context) {
    return {
      todayTasks: cloneValue(context.todayTasks || []),
      tomorrowTasks: cloneValue(context.tomorrowTasks || []),
      agentState: normalizeAgentState(context.agentState),
      plannedHours: cloneValue(context.plannedHours || {})
    };
  }

  function applyAction(actionId, context) {
    var todayTasks = cloneValue(context && context.todayTasks || []);
    var tomorrowTasks = cloneValue(context && context.tomorrowTasks || []);
    var agentState = normalizeAgentState(context && context.agentState);
    var todayDateKey = String(context && context.todayDateKey || "");
    var dayState = normalizeDayState(context && context.dayState);
    var before = snapshot({ todayTasks: todayTasks, tomorrowTasks: tomorrowTasks, agentState: agentState, plannedHours: context && context.plannedHours });
    var changed = false;
    var message = "";

    if (actionId === "simplify_today" || actionId === "keep_top_three") {
      var visibleCount = actionId === "keep_top_three" ? 3 : visibleTaskCountForState(dayState);
      var keepIds = pickTopTaskIds(todayTasks, visibleCount);
      var hideIds = unfinishedTasks(todayTasks).map(function (task) { return task.id; }).filter(function (id) {
        return keepIds.indexOf(id) === -1;
      });
      agentState.hiddenTaskIdsByDate[todayDateKey] = hideIds;
      changed = true;
      message = actionId === "keep_top_three"
        ? "Only the clearest three unfinished tasks are now visible."
        : "Today is now cut down to a smaller visible list.";
    }

    if (actionId === "move_one_task") {
      var moveCandidate = pickMoveCandidate(todayTasks);
      if (moveCandidate) {
        todayTasks = todayTasks.filter(function (task) {
          return task.id !== moveCandidate.id;
        });
        tomorrowTasks.push({
          id: String(context && context.idFactory ? context.idFactory("task") : ("task-" + Date.now())),
          label: moveCandidate.label,
          activity: moveCandidate.activity,
          hours: moveCandidate.hours,
          timerSeconds: moveCandidate.timerSeconds || 0,
          timerStartedAt: null,
          done: false,
          createdAt: moveCandidate.createdAt || new Date().toISOString()
        });
        changed = true;
        message = "\"" + moveCandidate.label + "\" was moved to tomorrow.";
      }
    }

    if (actionId === "adjust_morning_block") {
      var morningTask = pickMorningTask(todayTasks);
      if (morningTask) {
        todayTasks = todayTasks.map(function (task) {
          if (task.id !== morningTask.id) {
            return task;
          }
          var copy = cloneValue(task);
          copy.label = shiftTimedLabel(task.label, 60);
          return copy;
        });
        changed = true;
        message = "Your first unfinished morning task was pushed one hour later.";
      }
    }

    if (actionId === "break_task_down") {
      var broadTask = pickBroadTask(todayTasks);
      if (broadTask) {
        var targetIndex = todayTasks.findIndex(function (task) {
          return task.id === broadTask.id;
        });
        var newTasks = breakdownLabels(broadTask).map(function (label) {
          return {
            id: String(context && context.idFactory ? context.idFactory("task") : ("task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6))),
            label: label,
            activity: broadTask.activity,
            hours: 0.25,
            timerSeconds: 0,
            timerStartedAt: null,
            done: false,
            createdAt: new Date().toISOString()
          };
        });
        todayTasks.splice.apply(todayTasks, [targetIndex + 1, 0].concat(newTasks));
        changed = true;
        message = "\"" + broadTask.label + "\" now has smaller follow-up steps under it.";
      } else {
        var recurringLabel = recurringLabelFromHistory(context);
        if (recurringLabel) {
          var seedTask = {
            id: String(context && context.idFactory ? context.idFactory("task") : ("task-" + Date.now())),
            label: recurringLabel,
            activity: "lc",
            hours: 0.5,
            timerSeconds: 0,
            timerStartedAt: null,
            done: false,
            createdAt: new Date().toISOString()
          };
          var extraTasks = breakdownLabels(seedTask).map(function (label) {
            return {
              id: String(context && context.idFactory ? context.idFactory("task") : ("task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6))),
              label: label,
              activity: "lc",
              hours: 0.25,
              timerSeconds: 0,
              timerStartedAt: null,
              done: false,
              createdAt: new Date().toISOString()
            };
          });
          todayTasks.unshift(seedTask);
          todayTasks.splice.apply(todayTasks, [1, 0].concat(extraTasks));
          changed = true;
          message = "I turned \"" + recurringLabel + "\" into a smaller starter task for today.";
        }
      }
    }

    var after = snapshot({ todayTasks: todayTasks, tomorrowTasks: tomorrowTasks, agentState: agentState, plannedHours: context && context.plannedHours });
    return {
      changed: changed,
      actionId: actionId,
      actionLabel: actionLabel(actionId),
      message: message,
      todayTasks: todayTasks,
      tomorrowTasks: tomorrowTasks,
      agentState: agentState,
      undo: {
        actionId: actionId,
        before: before,
        after: after
      }
    };
  }

  function undoAction(undoEntry) {
    var before = undoEntry && undoEntry.before ? cloneValue(undoEntry.before) : null;
    if (!before) {
      return null;
    }
    return {
      todayTasks: before.todayTasks || [],
      tomorrowTasks: before.tomorrowTasks || [],
      agentState: normalizeAgentState(before.agentState),
      plannedHours: before.plannedHours || {}
    };
  }

  return {
    DAY_STATES: DAY_STATES.slice(),
    normalizeDayState: normalizeDayState,
    proposeActions: proposeActions,
    applyAction: applyAction,
    undoAction: undoAction,
    actionLabel: actionLabel,
    suggestActionCopy: suggestActionCopy
  };
}));
