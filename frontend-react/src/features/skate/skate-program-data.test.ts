import { describe, expect, it } from "vitest";

import { SKATE_PROGRAM } from "./skate-program-data";

function programDay(dayNumber: number) {
  return SKATE_PROGRAM.days.find((day) => day.dayNumber === dayNumber);
}

describe("Skate program data", () => {
  it("contains every numbered day in the 60-day streak with its matching week", () => {
    expect(SKATE_PROGRAM.days).toHaveLength(60);

    SKATE_PROGRAM.days.forEach((day, index) => {
      expect(day.dayNumber).toBe(index + 1);
      expect(day.weekNumber).toBe(Math.floor(index / 7) + 1);
    });
  });

  it("pins benchmarks to Days 1, 15, 30, 45, and 60", () => {
    const benchmarkDays = SKATE_PROGRAM.days
      .filter((day) => day.benchmark)
      .map((day) => day.dayNumber);

    expect(benchmarkDays).toEqual([1, 15, 30, 45, 60]);
  });

  it("preserves the documented phase boundaries and representative plan content", () => {
    const dayOne = programDay(1);
    const dayTwo = programDay(2);
    const dayFifteen = programDay(15);

    expect(dayOne).toMatchObject({
      intensity: "blue",
      phase: "Balance Blueprint",
      weekNumber: 1
    });
    expect(dayOne?.mainFocus).toMatch(/baseline video/i);
    expect(dayTwo).toMatchObject({
      intensity: "blue",
      phase: "Balance Blueprint",
      weekNumber: 1
    });
    expect(dayTwo?.mainFocus).toMatch(/bowl|cruising/i);
    expect(dayFifteen).toMatchObject({
      phase: "Balance Blueprint",
      weekNumber: 3
    });
    expect(dayFifteen?.summary).toMatch(/Dynamic balance/i);
    expect(programDay(36)).toMatchObject({
      phase: "Essentials",
      weekNumber: 6
    });
    expect(programDay(60)).toMatchObject({
      benchmark: true,
      benchmarkLabel: "Day 60 benchmark",
      phase: "Essentials",
      weekNumber: 9
    });
  });
});
