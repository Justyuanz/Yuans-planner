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
