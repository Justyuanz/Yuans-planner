(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanSkateSessionCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finiteNonNegative(value) {
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function elapsedTaskSeconds(task, nowMs) {
    var seconds = finiteNonNegative(task && task.timerSeconds);
    if (task && task.timerStartedAt) {
      var timestamp = Date.parse(task.timerStartedAt);
      var elapsed = Math.floor((nowMs - timestamp) / 1000);
      if (Number.isFinite(elapsed)) {
        seconds += Math.max(0, elapsed);
      }
    }
    return finiteNonNegative(seconds);
  }

  function hoursFromSeconds(seconds) {
    return Math.round((finiteNonNegative(seconds) / 3600) * 100) / 100;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeSessionDateKey(value) {
    var text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function datedSessionWindow(dateKey, durationMinutes) {
    var safeDateKey = normalizeSessionDateKey(dateKey);
    var safeMinutes = Math.max(1, Math.round(Number(durationMinutes) || 45));
    if (!safeDateKey) {
      return {
        startedAt: null,
        finishedAt: null
      };
    }

    var parts = safeDateKey.split("-").map(Number);
    var finishMs = Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    var startMs = finishMs - (safeMinutes * 60 * 1000);
    return {
      startedAt: new Date(startMs).toISOString(),
      finishedAt: new Date(finishMs).toISOString()
    };
  }

  function defaultSessionLabel(activityId) {
    return activityId === "skate" ? "Skate session" : "Saved session";
  }

  function findMatchingTaskIndex(tasks, activityId) {
    var list = Array.isArray(tasks) ? tasks : [];
    var matchIndex = list.findIndex(function (task) {
      return task && task.activity === activityId && !task.done && !task.timerStartedAt;
    });
    if (matchIndex === -1) {
      matchIndex = list.findIndex(function (task) {
        return task && task.activity === activityId && !task.done;
      });
    }
    if (matchIndex === -1) {
      matchIndex = list.findIndex(function (task) {
        return task && task.activity === activityId;
      });
    }
    return matchIndex;
  }

  function applySessionDurationToTasks(tasks, activityId, durationHours, nowMs) {
    var safeHours = finiteNonNegative(durationHours);
    var list = Array.isArray(tasks) ? tasks.map(function (task) {
      return task && typeof task === "object" ? Object.assign({}, task) : task;
    }) : [];
    var currentMs = Number(nowMs) || Date.now();
    if (!safeHours) {
      return {
        tasks: list,
        linkedTaskLabel: null
      };
    }

    var matchIndex = findMatchingTaskIndex(list, activityId);
    if (matchIndex === -1) {
      var seconds = Math.round(safeHours * 3600);
      list.push({
        id: "auto-" + activityId + "-" + String(currentMs),
        label: defaultSessionLabel(activityId),
        activity: activityId,
        hours: hoursFromSeconds(seconds),
        timerSeconds: seconds,
        timerStartedAt: null,
        done: true,
        createdAt: new Date(currentMs).toISOString(),
        sourceEventId: ""
      });
      return {
        tasks: list,
        linkedTaskLabel: defaultSessionLabel(activityId)
      };
    }

    var task = list[matchIndex];
    var existingSeconds = elapsedTaskSeconds(task, currentMs);
    task.timerStartedAt = null;
    task.timerSeconds = existingSeconds + Math.round(safeHours * 3600);
    task.hours = hoursFromSeconds(task.timerSeconds);
    task.done = true;

    return {
      tasks: list,
      linkedTaskLabel: task.label || null
    };
  }

  function boardHoursTotalFromSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).reduce(function (sum, session) {
      return sum + finiteNonNegative(session && session.durationHours);
    }, 0);
  }

  return {
    applySessionDurationToTasks: applySessionDurationToTasks,
    boardHoursTotalFromSessions: boardHoursTotalFromSessions,
    datedSessionWindow: datedSessionWindow,
    elapsedTaskSeconds: elapsedTaskSeconds,
    findMatchingTaskIndex: findMatchingTaskIndex,
    hoursFromSeconds: hoursFromSeconds,
    normalizeSessionDateKey: normalizeSessionDateKey
  };
}));
