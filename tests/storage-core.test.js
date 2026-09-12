const test = require("node:test");
const assert = require("node:assert/strict");

const storageCore = require("../frontend/js/storage-core.js");

test("mergeHydrationSources keeps server values and backfills missing planner keys", function () {
  const serverValues = {
    "hivePlanner.events": "server-events",
    "server.metadata": "preserve"
  };
  const browserValues = {
    "hivePlanner.events": "browser-events",
    "hivePlanner.dailyTasks.2026-09-12": "browser-tasks",
    "other.application": "ignore"
  };

  const result = storageCore.mergeHydrationSources(serverValues, browserValues);

  assert.deepEqual(result.values, {
    "hivePlanner.events": "server-events",
    "server.metadata": "preserve",
    "hivePlanner.dailyTasks.2026-09-12": "browser-tasks"
  });
  assert.deepEqual(result.serverBackfills, [
    { key: "hivePlanner.dailyTasks.2026-09-12", value: "browser-tasks" }
  ]);
});

test("mergeHydrationSources ignores malformed sources and non-string browser values", function () {
  assert.deepEqual(storageCore.mergeHydrationSources([], null), {
    values: {},
    serverBackfills: []
  });

  const result = storageCore.mergeHydrationSources({}, {
    "hivePlanner.valid": "[]",
    "hivePlanner.invalid": [],
    "notPlanner.valid": "value"
  });

  assert.deepEqual(result.values, { "hivePlanner.valid": "[]" });
  assert.deepEqual(result.serverBackfills, [
    { key: "hivePlanner.valid", value: "[]" }
  ]);
});

test("selectBackupData preserves unknown planner keys and excludes transient keys", function () {
  const values = {
    "hivePlanner.events": "events",
    "hivePlanner.future.unknown": "future-value",
    "hivePlanner.guitar.currentSession": "transient",
    "other.application": "ignore"
  };

  assert.deepEqual(
    storageCore.selectBackupData(values, ["hivePlanner.guitar.currentSession"]),
    {
      "hivePlanner.events": "events",
      "hivePlanner.future.unknown": "future-value"
    }
  );
});
