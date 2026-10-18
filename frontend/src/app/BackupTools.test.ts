import { describe, expect, it } from "vitest";

import { decodeImportedPlannerData, selectBackupData } from "./backup-data";

describe("selectBackupData", () => {
  it("preserves planner compatibility keys and removes transient or unrelated values", () => {
    expect(selectBackupData({
      "hivePlanner.future.unknown": "keep",
      "hivePlanner.guitar.currentSession": "remove",
      unrelated: "remove"
    })).toEqual({
      "hivePlanner.future.unknown": "keep"
    });
  });
});

// The live database still holds these seven key families from features that are
// inactive in the shipped app, and were already inactive in the legacy one. A
// backup has to carry them even though nothing reads them, so this pins the
// real key names rather than a synthetic one.
const LEGACY_ONLY_KEYS = [
  "hivePlanner.skate.focus",
  "hivePlanner.skate.learningItems",
  "hivePlanner.skate.warmupItems",
  "hivePlanner.skate.weeklyTarget",
  "hivePlanner.study.sessions",
  "hivePlanner.weekOverview.skateBody.2026-W38",
  "hivePlanner.weekOverview.study.2026-W38"
];

describe("legacy-only keys", () => {
  it("survives an export and import round trip", () => {
    const stored = Object.fromEntries(LEGACY_ONLY_KEYS.map((key) => [key, `stored ${key}`]));

    const exported = selectBackupData(stored);
    expect(exported).toEqual(stored);

    const imported = decodeImportedPlannerData({ data: exported });
    expect(imported).toEqual(stored);
  });
});

describe("decodeImportedPlannerData", () => {
  it("accepts versioned and raw planner key maps", () => {
    expect(decodeImportedPlannerData({
      data: {
        "hivePlanner.money.settings": "settings",
        ignored: "value"
      }
    })).toEqual({ "hivePlanner.money.settings": "settings" });
    expect(decodeImportedPlannerData({
      "hivePlanner.money.transactions": "transactions"
    })).toEqual({ "hivePlanner.money.transactions": "transactions" });
  });

  it("rejects malformed values and transient session state", () => {
    expect(decodeImportedPlannerData({
      data: {
        "hivePlanner.guitar.currentSession": "transient",
        "hivePlanner.valid": 42
      }
    })).toEqual({});
    expect(decodeImportedPlannerData({ data: [] })).toEqual({});
    expect(decodeImportedPlannerData(null)).toEqual({});
  });
});
