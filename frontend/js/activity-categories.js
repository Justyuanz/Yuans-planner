(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanActivityCategories = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVITIES = [
    { id: "transcendence", label: "Transcendence", short: "Transcendence", className: "transcendence", group: "study" },
    { id: "mobileDevelopment", label: "Mobile Development", short: "Mobile Dev", className: "mobile-development", group: "study" },
    { id: "portfolioJobPrep", label: "Portfolio / Job Prep", short: "Portfolio", className: "portfolio-job-prep", group: "study" },
    { id: "skate", label: "Skate", short: "Skate", className: "skate", group: "leisure" },
    { id: "gym", label: "Gym", short: "Gym", className: "gym", group: "leisure" },
    { id: "guitar", label: "Guitar", short: "Guitar", className: "guitar", group: "leisure" },
    { id: "other", label: "Other", short: "Other", className: "other", group: "other", showInStats: false }
  ];

  const LEGACY_ACTIVITY_IDS = {
    lc: "portfolioJobPrep",
    cpp: "transcendence",
    python: "mobileDevelopment",
    p90x3: "gym",
    fso: "transcendence"
  };

  const LEGACY_EVENT_CATEGORIES = {
    Coding: "Transcendence",
    Python: "Mobile Development",
    Leetcode: "Portfolio / Job Prep",
    LeetCode: "Portfolio / Job Prep"
  };

  function activityIds() {
    return ACTIVITIES.map(function (activity) { return activity.id; });
  }

  function normalizeActivityId(id) {
    const value = String(id || "").trim();
    if (LEGACY_ACTIVITY_IDS[value]) return LEGACY_ACTIVITY_IDS[value];
    return activityIds().indexOf(value) !== -1 ? value : "other";
  }

  function migrateTask(task) {
    if (!task || typeof task !== "object") return task;
    const current = task.activity || task.track;
    const next = normalizeActivityId(current);
    if (next === current && !task.track) return task;
    const copy = Object.assign({}, task, { activity: next });
    delete copy.track;
    return copy;
  }

  function migrateTasks(tasks) {
    return Array.isArray(tasks) ? tasks.map(migrateTask) : tasks;
  }

  function migratePlannedHours(planned) {
    if (!planned || typeof planned !== "object" || Array.isArray(planned)) return planned;
    const migrated = {};
    Object.keys(planned).forEach(function (id) {
      const knownId = LEGACY_ACTIVITY_IDS[id] || activityIds().indexOf(id) !== -1;
      if (!knownId || id === "other") {
        migrated[id] = planned[id];
        return;
      }
      const next = normalizeActivityId(id);
      const value = Number(planned[id]);
      if (!Number.isFinite(value)) return;
      migrated[next] = (migrated[next] || 0) + value;
    });
    return migrated;
  }

  function migrateEvents(events) {
    return Array.isArray(events) ? events.map(function (event) {
      if (!event || typeof event !== "object" || !LEGACY_EVENT_CATEGORIES[event.category]) return event;
      return Object.assign({}, event, { category: LEGACY_EVENT_CATEGORIES[event.category] });
    }) : events;
  }

  function migrateValue(value, key) {
    if (Array.isArray(value)) return value.map(function (item) { return migrateValue(item, ""); });
    if (!value || typeof value !== "object") {
      if (["activity", "track", "field", "entityId"].indexOf(key) !== -1 && LEGACY_ACTIVITY_IDS[String(value || "")]) {
        return LEGACY_ACTIVITY_IDS[String(value || "")];
      }
      return value;
    }
    const copy = {};
    Object.keys(value).forEach(function (childKey) {
      const nextKey = LEGACY_ACTIVITY_IDS[childKey] || childKey;
      const nextValue = migrateValue(value[childKey], childKey);
      if (Object.prototype.hasOwnProperty.call(copy, nextKey)
          && typeof copy[nextKey] === "number" && typeof nextValue === "number") {
        copy[nextKey] += nextValue;
      } else {
        copy[nextKey] = nextValue;
      }
    });
    return copy;
  }

  return {
    ACTIVITIES: ACTIVITIES,
    LEGACY_ACTIVITY_IDS: LEGACY_ACTIVITY_IDS,
    normalizeActivityId: normalizeActivityId,
    migrateTask: migrateTask,
    migrateTasks: migrateTasks,
    migratePlannedHours: migratePlannedHours,
    migrateEvents: migrateEvents,
    migrateValue: migrateValue
  };
}));
