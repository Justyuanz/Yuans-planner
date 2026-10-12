import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { buildTodayIntentionModel } from "./today-intention";
import { routineWeekKey } from "@/shared/routine-week";

function weekStore(date: Date, days: readonly unknown[]): PlannerStore {
  return {
    [routineWeekKey(date)]: JSON.stringify({
      days: days.map((type) => ({ type })),
      isConfigured: true
    })
  };
}

describe("buildTodayIntentionModel", () => {
  it("uses the Thursday entry from the legacy Monday-first week", () => {
    const date = new Date(2026, 8, 17);
    const model = buildTodayIntentionModel(weekStore(date, [
      "normal", "recovery", "normal", "high", "normal", "normal", "recovery"
    ]), date);

    expect(model).toEqual({
      className: "high-day",
      dayTypeLabel: "High-Intensity Day",
      label: "Today's intention"
    });
  });

  it.each([
    ["study", "Normal Day", "normal-day"],
    ["skate", "High-Intensity Day", "high-day"],
    ["rest", "Recovery Day", "recovery-day"],
    ["personal", "Recovery Day", "recovery-day"]
  ])("preserves the legacy %s alias", (type, dayTypeLabel, className) => {
    const date = new Date(2026, 8, 14);
    expect(buildTodayIntentionModel(weekStore(date, [type]), date)).toEqual({
      className,
      dayTypeLabel,
      label: "Today's intention"
    });
  });

  it.each<PlannerStore>([
    {},
    { "hivePlanner.routine.week.2026-W38": "not-json" },
    { "hivePlanner.routine.week.2026-W38": "null" },
    { "hivePlanner.routine.week.2026-W38": JSON.stringify({ days: "high" }) },
    { "hivePlanner.routine.week.2026-W38": JSON.stringify({ days: [{ type: "unknown" }] }) }
  ])("falls back to a normal day for missing or malformed legacy data", (store) => {
    expect(buildTodayIntentionModel(store, new Date(2026, 8, 14))).toEqual({
      className: "normal-day",
      dayTypeLabel: "Normal Day",
      label: "Today's intention"
    });
  });

  it("uses Sunday as the final entry in the legacy week", () => {
    const date = new Date(2026, 8, 20);
    expect(buildTodayIntentionModel(weekStore(date, [
      "normal", "normal", "normal", "normal", "normal", "normal", "recovery"
    ]), date).dayTypeLabel).toBe("Recovery Day");
  });

  it("uses the ISO week-year when a calendar year starts in the previous ISO week", () => {
    const date = new Date(2021, 0, 1);
    expect(routineWeekKey(date)).toBe("hivePlanner.routine.week.2020-W53");
    expect(buildTodayIntentionModel(weekStore(date, [
      "normal", "normal", "normal", "normal", "high", "normal", "normal"
    ]), date).dayTypeLabel).toBe("High-Intensity Day");
  });
});
