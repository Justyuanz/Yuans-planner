(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanSkateSessionCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function elapsedTaskSeconds(task, nowMs) {
    var seconds = Math.max(0, Number(task && task.timerSeconds) || 0);
    if (task && task.timerStartedAt) {
      seconds += Math.max(0, Math.floor((nowMs - Date.parse(task.timerStartedAt)) / 1000));
    }
    return seconds;
  }

  function hoursFromSeconds(seconds) {
    return Math.round((seconds / 3600) * 100) / 100;
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
    var safeHours = Math.max(0, Number(durationHours) || 0);
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
        label: activityId === "skate" ? "Skate session" : "Saved session",
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
        linkedTaskLabel: activityId === "skate" ? "Skate session" : "Saved session"
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
      return sum + Math.max(0, Number(session && session.durationHours) || 0);
    }, 0);
  }

  return {
    applySessionDurationToTasks: applySessionDurationToTasks,
    boardHoursTotalFromSessions: boardHoursTotalFromSessions,
    elapsedTaskSeconds: elapsedTaskSeconds,
    findMatchingTaskIndex: findMatchingTaskIndex,
    hoursFromSeconds: hoursFromSeconds
  };
}));
