import { describe, expect, it } from "vitest";

import {
  buildSkateTrainingPlanState,
  SKATE_SETTINGS_STORAGE_KEY
} from "./skate-training-plan";

describe("Skate training plan model", () => {
  it("builds the selected daily week directly from compatible settings", () => {
    const state = buildSkateTrainingPlanState({
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 15,
        extraRestDayOfWeek: null,
        restDayOfWeek: 0
      })
    }, new Date(2026, 8, 14, 12));

    expect(state.today).toEqual({
      blocks: [
        {
          label: "30-min SkateIQ",
          value: "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min."
        },
        { label: "Flow / fun", value: "Choose one direction today." },
        { label: "Default intensity", value: "Yellow · 10-20 focused attempts" }
      ],
      description: "Balance Blueprint · Week 3",
      kicker: "Day 15",
      note: "Day 15 benchmark",
      title: "Benchmark first, then 180."
    });
    expect(state.week.kicker).toBe("Week 3 / 21");
    expect(state.week.description).toBe(
      "Current training week from your checked-in plan. Rest days: Sunday."
    );
    expect(state.week.rows).toHaveLength(7);
    expect(state.week.rows[0]).toEqual(expect.objectContaining({
      benchmark: "Day 15 benchmark",
      current: true,
      intensity: "yellow",
      intensityLabel: "Yellow",
      label: "Day 15",
      preview: false,
      title: "Benchmark first, then 180."
    }));
  });

  it("previews Day 1 before the season without populating the week rows", () => {
    const state = buildSkateTrainingPlanState({
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({ currentProgramDay: 30 })
    }, new Date(2026, 7, 28, 12));

    expect(state.today.kicker).toBe("Day 1");
    expect(state.today.note).toBe("Day 1 benchmark");
    expect(state.week).toEqual(expect.objectContaining({
      description: "Previewing the program before Saturday, August 29, 2026.",
      kicker: "Week 1 / 21",
      rows: []
    }));
  });

  it("keeps the manual Day 1-60 selection after the streak ends", () => {
    const state = buildSkateTrainingPlanState({
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 60,
        extraRestDayOfWeek: 6,
        restDayOfWeek: 0
      })
    }, new Date(2026, 10, 16, 12));

    expect(state.today).toEqual(expect.objectContaining({
      kicker: "Day 60",
      note: "Day 60 benchmark",
      title: "Day 60 benchmark."
    }));
    expect(state.week.kicker).toBe("Week 9 / 21");
    expect(state.week.description).toContain("Rest days: Sunday and Saturday.");
    expect(state.week.rows).toHaveLength(4);
    expect(state.week.rows.at(-1)).toEqual(expect.objectContaining({
      current: true,
      label: "Day 60"
    }));
  });

  it("uses legacy defaults for malformed and boundary settings", () => {
    const malformed = buildSkateTrainingPlanState({
      [SKATE_SETTINGS_STORAGE_KEY]: "not json"
    }, new Date(2026, 8, 14, 12));
    const clamped = buildSkateTrainingPlanState({
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 999,
        extraRestDayOfWeek: 3,
        restDayOfWeek: 3
      })
    }, new Date(2026, 8, 14, 12));

    expect(malformed.today.kicker).toBe("Day 1");
    expect(malformed.week.description).toContain("Rest days: Sunday.");
    expect(clamped.today.kicker).toBe("Day 60");
    expect(clamped.week.description).toContain("Rest days: Wednesday.");
  });
});
