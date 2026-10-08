import { describe, expect, it } from "vitest";

import { skateHeroStateFromEvent } from "./skate-hero-bridge";

const completeState = {
  attemptBudget: "10-20 focused attempts",
  benchmarkLabel: "Day 15 benchmark",
  benchmarkVisible: true,
  blockLabel: "Day 15",
  boardHours: "1.5h",
  currentDay: "15",
  dayCount: "15 / 60",
  extraRestDay: "",
  finishDisabled: true,
  flowFocus: "Choose one direction today.",
  heroSubtitle: "Dynamic balance.",
  intensity: "yellow",
  intensityDescription: "Normal technical day",
  intensityEffort: "4-6/10",
  mainFocus: "Benchmark first, then 180.",
  phaseBadge: "Balance Blueprint · Week 3",
  restDay: "0",
  sessionDaysCount: "1 / 6",
  sessionHint: "Hit start when the session begins.",
  skateiqBlock: "Walking Snakes 5 min.",
  settingsNote: "Rest days: Sunday.",
  startDisabled: false,
  weekCount: "3 / 21"
} as const;

describe("Skate hero bridge", () => {
  it("accepts a complete cross-realm state snapshot", () => {
    const event = new Event("state") as CustomEvent<unknown>;
    Object.defineProperty(event, "detail", { value: completeState });
    expect(skateHeroStateFromEvent(event)).toEqual(completeState);
  });

  it("rejects malformed snapshots and invalid intensity values", () => {
    for (const detail of [null, {}, { ...completeState, boardHours: 2 }, { ...completeState, intensity: "red" }]) {
      const event = new Event("state") as CustomEvent<unknown>;
      Object.defineProperty(event, "detail", { value: detail });
      expect(skateHeroStateFromEvent(event)).toBeNull();
    }
  });
});
