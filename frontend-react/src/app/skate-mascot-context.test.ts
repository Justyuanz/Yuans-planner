import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import { SKATE_PROGRAM } from "../features/skate/skate-program-data";
import { buildSkateMascotContext } from "./skate-mascot-context";

const TODAY = new Date(2026, 8, 14, 12);
const TODAY_KEY = "2026-09-14";

describe("buildSkateMascotContext", () => {
  it("normalizes the pinned plan, intensity, recent sessions, and weekly support", () => {
    const store: PlannerStore = {
      "hivePlanner.physical.logs": JSON.stringify([
        { date: TODAY_KEY, kind: "gym", minutes: 30, name: "Gym", note: "Legs", status: "modified" },
        { date: "2026-09-15", kind: "yoga", minutes: 20, name: "Yoga", status: "done" },
        { date: "2026-09-16", kind: "walk", minutes: 10, name: "Walk", status: "skipped" },
        { date: "2026-09-13", kind: "stretch", minutes: 15, name: "Stretch", status: "done" }
      ]),
      "hivePlanner.skate.sessions": JSON.stringify([
        { finishedAt: "2026-09-12T18:00:00.000Z", focus: "Shove-it", intensity: "invalid" },
        { durationHours: 1.25, finishedAt: "2026-09-13T18:00:00.000Z", improvedNote: "Cleaner", intensity: "green", mainFocus: "FS 180" }
      ]),
      "hivePlanner.skate.settings": JSON.stringify({
        currentProgramDay: 17,
        intensityByDate: { [TODAY_KEY]: "green" },
        restDayOfWeek: 0
      })
    };

    const skate = buildSkateMascotContext(store, TODAY);

    expect(skate.todayPlan).toEqual(expect.objectContaining({
      blockLabel: "Day 17",
      defaultIntensity: "yellow",
      mainFocus: "Bowl flow / free skate.",
      phaseWeekLabel: "Balance Blueprint · Week 3"
    }));
    expect(skate.todayState.selectedIntensity).toBe("green");
    expect(skate.recentSessions).toEqual([
      expect.objectContaining({ date: "2026-09-13", durationHours: 1.25, intensity: "green", mainFocus: "FS 180" }),
      expect.objectContaining({ date: "2026-09-12", intensity: "yellow", mainFocus: "Shove-it" })
    ]);
    expect(skate.supportThisWeek).toEqual([
      { date: TODAY_KEY, minutes: 30, note: "Legs", type: "Gym" },
      { date: "2026-09-15", minutes: 20, note: "", type: "Yoga" }
    ]);
    expect(skate.priorities).toHaveLength(6);
  });

  it("uses compatible defaults for malformed records and previews Day 1 before the season", () => {
    const skate = buildSkateMascotContext({
      "hivePlanner.physical.logs": "{}",
      "hivePlanner.skate.sessions": "bad",
      "hivePlanner.skate.settings": "[]"
    }, new Date(2026, 7, 28, 12));

    expect(skate.todayPlan).toEqual(expect.objectContaining({
      blockLabel: "Day 1",
      defaultIntensity: "blue",
      title: "Program starts tomorrow"
    }));
    expect(skate.todayState.selectedIntensity).toBe("blue");
    expect(skate.recentSessions).toEqual([]);
    expect(skate.supportThisWeek).toEqual([]);
  });

  it("preserves every pinned daily plan and benchmark boundary", () => {
    expect(SKATE_PROGRAM.days.map(({ dayNumber }) => dayNumber)).toEqual(
      Array.from({ length: 60 }, (_, index) => index + 1)
    );
    expect(SKATE_PROGRAM.days.filter(({ benchmark }) => benchmark).map(({ dayNumber }) => dayNumber))
      .toEqual([1, 15, 30, 45, 60]);
  });
});
