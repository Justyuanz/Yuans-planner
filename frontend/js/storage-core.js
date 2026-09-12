(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanStorageCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PLANNER_KEY_PREFIX = "hivePlanner.";

  function isObjectRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isPlannerKey(key) {
    return typeof key === "string" && key.indexOf(PLANNER_KEY_PREFIX) === 0;
  }

  function mergeHydrationSources(serverValues, browserValues) {
    const values = isObjectRecord(serverValues) ? Object.assign({}, serverValues) : {};
    const browserEntries = isObjectRecord(browserValues) ? browserValues : {};
    const serverBackfills = [];

    Object.keys(browserEntries).forEach(function (key) {
      const value = browserEntries[key];
      if (!isPlannerKey(key) || typeof value !== "string" || values[key] !== undefined) {
        return;
      }
      values[key] = value;
      serverBackfills.push({ key: key, value: value });
    });

    return {
      values: values,
      serverBackfills: serverBackfills
    };
  }

  function selectBackupData(values, excludedKeys) {
    const source = isObjectRecord(values) ? values : {};
    const excluded = new Set(Array.isArray(excludedKeys) ? excludedKeys : []);
    const data = {};

    Object.keys(source).forEach(function (key) {
      if (isPlannerKey(key) && !excluded.has(key)) {
        data[key] = source[key];
      }
    });

    return data;
  }

  return {
    isPlannerKey: isPlannerKey,
    mergeHydrationSources: mergeHydrationSources,
    selectBackupData: selectBackupData
  };
}));
