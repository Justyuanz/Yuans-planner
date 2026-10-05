(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanCalendarTaskSync = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVITY_BY_CATEGORY = {
    "Study/school": "transcendence",
    Transcendence: "transcendence",
    "Mobile Development": "mobileDevelopment",
    "Portfolio / Job Prep": "portfolioJobPrep",
    Skate: "skate",
    Gym: "gym",
    Guitar: "guitar"
  };

  function activityIdForCategory(category) {
    return ACTIVITY_BY_CATEGORY[category] || "other";
  }

  function createTaskFromEvent(event, metadata) {
    const source = event && typeof event === "object" ? event : {};
    const details = metadata && typeof metadata === "object" ? metadata : {};

    return {
      id: details.id || "",
      label: source.title || "",
      activity: activityIdForCategory(source.category),
      hours: 0,
      timerSeconds: 0,
      timerStartedAt: null,
      done: false,
      createdAt: details.createdAt || "",
      sourceEventId: source.id || "",
      useSourceEventReminder: true,
      scheduledTime: details.scheduledTime || "",
      reminderMinutes: Number(details.reminderMinutes) || 0
    };
  }

  function mergeLinkedTasks(existingTasks, currentEvents, createTask) {
    const tasks = Array.isArray(existingTasks) ? existingTasks.slice() : [];
    const events = Array.isArray(currentEvents) ? currentEvents : [];
    const eventIds = events.map(function (event) {
      return event && event.id;
    });
    const keptTasks = tasks.filter(function (task) {
      return !task.sourceEventId || eventIds.indexOf(task.sourceEventId) !== -1;
    });
    const existingSourceIds = keptTasks.map(function (task) {
      return task.sourceEventId;
    }).filter(Boolean);
    const taskFactory = typeof createTask === "function" ? createTask : function () {
      return null;
    };
    const importedTasks = events.filter(function (event) {
      return existingSourceIds.indexOf(event && event.id) === -1;
    }).map(taskFactory).filter(Boolean);

    return {
      tasks: keptTasks.concat(importedTasks),
      changed: keptTasks.length !== tasks.length || importedTasks.length > 0,
      importedCount: importedTasks.length
    };
  }

  return {
    activityIdForCategory: activityIdForCategory,
    createTaskFromEvent: createTaskFromEvent,
    mergeLinkedTasks: mergeLinkedTasks
  };
}));
