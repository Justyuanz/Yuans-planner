import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { DAY_STATE_OPTIONS, decodeDayState } from "./day-state";

describe("DAY_STATE_OPTIONS", () => {
  it("preserves the legacy option order and labels", () => {
    expect(DAY_STATE_OPTIONS).toEqual([
      { id: "good", label: "Good" },
      { id: "okay", label: "Steady" },
      { id: "tired", label: "Tired" },
      { id: "overwhelmed", label: "Heavy" },
      { id: "low-focus", label: "Scattered" }
    ]);
  });
});

describe("decodeDayState", () => {
  it("normalizes a stored state like the legacy agent core", () => {
    expect(decodeDayState({
      "hivePlanner.dayState": JSON.stringify({
        "2026-09-16": "  LOW-FOCUS  "
      })
    }, "2026-09-16")).toBe("low-focus");
  });

  const malformedStores: PlannerStore[] = [
    {},
    { "hivePlanner.dayState": "not-json" },
    { "hivePlanner.dayState": "[]" },
    { "hivePlanner.dayState": JSON.stringify({ "2026-09-16": "future-state" }) }
  ];

  it.each(malformedStores)("falls back to the legacy steady state", (store) => {
    expect(decodeDayState(store, "2026-09-16")).toBe("okay");
  });
});
