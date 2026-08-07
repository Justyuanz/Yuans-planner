(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanActivityLog = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VALID_ACTIONS = {
    task_created: true,
    task_updated: true,
    task_deleted: true,
    task_done_changed: true,
    task_timer_started: true,
    task_timer_paused: true,
    task_timer_ended: true,
    planned_hours_updated: true,
    money_transaction_created: true,
    money_transaction_updated: true,
    money_transaction_deleted: true,
    journal_entry_created: true,
    journal_entry_updated: true,
    journal_entry_deleted: true,
    day_state_updated: true,
    agent_action_applied: true,
    agent_action_undone: true
  };

  function cloneValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(cloneValue);
    }
    if (typeof value === "object") {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        copy[key] = cloneValue(value[key]);
      });
      return copy;
    }
    return value;
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    var action = typeof entry.action === "string" ? entry.action.trim() : "";
    if (!VALID_ACTIONS[action]) {
      return null;
    }
    var timestamp = typeof entry.timestamp === "string" && entry.timestamp ? entry.timestamp : "";
    var entityType = typeof entry.entityType === "string" ? entry.entityType.trim() : "";
    var entityId = typeof entry.entityId === "string" ? entry.entityId.trim() : "";
    if (!timestamp || !entityType || !entityId) {
      return null;
    }
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : "",
      timestamp: timestamp,
      action: action,
      entityType: entityType,
      entityId: entityId,
      dateKey: typeof entry.dateKey === "string" ? entry.dateKey : "",
      field: typeof entry.field === "string" ? entry.field : "",
      before: cloneValue(entry.before),
      after: cloneValue(entry.after),
      meta: entry.meta && typeof entry.meta === "object" && !Array.isArray(entry.meta) ? cloneValue(entry.meta) : {}
    };
  }

  function normalizeEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map(normalizeEntry)
      .filter(Boolean)
      .sort(function (a, b) {
        return String(a.timestamp).localeCompare(String(b.timestamp))
          || String(a.id).localeCompare(String(b.id));
      });
  }

  function createEntry(input) {
    if (!input || typeof input !== "object") {
      return null;
    }
    var entry = normalizeEntry({
      id: input.id,
      timestamp: input.timestamp,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      dateKey: input.dateKey,
      field: input.field,
      before: input.before,
      after: input.after,
      meta: input.meta
    });
    return entry;
  }

  return {
    createEntry: createEntry,
    normalizeEntries: normalizeEntries
  };
}));
