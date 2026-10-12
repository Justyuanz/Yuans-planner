import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import { dayTypeForDate, routineWeekKey } from "./routine-week";

// The weekly routine document is written by the Calendar's weekly planner and
// read by the Dashboard's Today intention card and the Calendar month grid.
// Both readers used to carry their own copy of this; these cases pin the
// shared contract directly rather than only through one of its callers.

function weekStore(date: Date, days: readonly unknown[]): PlannerStore {
  return {
    [routineWeekKey(date)]: JSON.stringify({ days, isConfigured: true })
  };
}

const MONDAY = new Date(2026, 8, 14);
const THURSDAY = new Date(2026, 8, 17);
const SUNDAY = new Date(2026, 8, 20);

describe("routineWeekKey", () => {
  it("keys the whole week on its ISO week, so every day of it agrees", () => {
    expect(routineWeekKey(MONDAY)).toBe("hivePlanner.routine.week.2026-W38");
    expect(routineWeekKey(SUNDAY)).toBe(routineWeekKey(MONDAY));
  });
});

describe("dayTypeForDate", () => {
  const week = [
    { type: "normal" }, { type: "recovery" }, { type: "normal" }, { type: "high" },
    { type: "normal" }, { type: "normal" }, { type: "recovery" }
  ];

  it("reads the day from a Monday-first week, not from getDay()", () => {
    expect(dayTypeForDate(weekStore(MONDAY, week), MONDAY).label).toBe("Normal Day");
    expect(dayTypeForDate(weekStore(THURSDAY, week), THURSDAY).label).toBe("High-Intensity Day");
    // Sunday is the last entry, which getDay() would call index 0.
    expect(dayTypeForDate(weekStore(SUNDAY, week), SUNDAY).label).toBe("Recovery Day");
  });

  it("maps the renamed day types that stored weeks still hold", () => {
    const cases: [string, string, string][] = [
      ["study", "Normal Day", "normal-day"],
      ["skate", "High-Intensity Day", "high-day"],
      ["rest", "Recovery Day", "recovery-day"],
      ["personal", "Recovery Day", "recovery-day"]
    ];
    cases.forEach(([stored, label, className]) => {
      expect(dayTypeForDate(weekStore(MONDAY, [{ type: stored }]), MONDAY))
        .toEqual({ className, label });
    });
  });

  it("falls back to a normal day for anything missing or unusable", () => {
    const stores: PlannerStore[] = [
      {},
      { [routineWeekKey(MONDAY)]: "not json" },
      { [routineWeekKey(MONDAY)]: "null" },
      { [routineWeekKey(MONDAY)]: JSON.stringify({ days: "not an array" }) },
      weekStore(MONDAY, []),
      weekStore(MONDAY, [null]),
      weekStore(MONDAY, [{ type: "  " }]),
      weekStore(MONDAY, [{ type: "unknown" }]),
      weekStore(MONDAY, [{ type: 7 }])
    ];
    stores.forEach((store) => {
      expect(dayTypeForDate(store, MONDAY)).toEqual({ className: "normal-day", label: "Normal Day" });
    });
  });

  it("trims a stored type that carries surrounding spaces", () => {
    expect(dayTypeForDate(weekStore(MONDAY, [{ type: " high " }]), MONDAY).label)
      .toBe("High-Intensity Day");
  });
});
