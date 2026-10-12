import { describe, expect, it } from "vitest";

import { buildSkateHeroState } from "./skate-hero";
import { SKATE_SESSIONS_STORAGE_KEY } from "../roadmap/skate-roadmap";
import { SKATE_SETTINGS_STORAGE_KEY } from "@/pages/skate/skate-settings";

const TODAY = new Date(2026, 8, 14, 12);

describe("Skate hero model", () => {
  it("derives the selected plan, weekly sessions, and board hours directly from storage", () => {
    const state = buildSkateHeroState({
      "hivePlanner.dailyTasks.2026-09-14": JSON.stringify([
        { activity: "skate", hours: 1, label: "Skate session" }
      ]),
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([
        {
          dateKey: "2026-09-14",
          durationHours: 0.75,
          finishedAt: "2026-09-14T10:00:00.000Z",
          trackedInTask: true
        },
        {
          dateKey: "2026-09-14",
          durationHours: 0.5,
          finishedAt: "2026-09-14T12:00:00.000Z"
        },
        {
          dateKey: "2026-09-16",
          durationHours: 0.25,
          finishedAt: "2026-09-16T12:00:00.000Z"
        }
      ]),
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 15,
        extraRestDayOfWeek: null,
        intensityByDate: { "2026-09-14": "yellow" },
        restDayOfWeek: 0
      })
    }, TODAY, TODAY.getTime());

    expect(state).toEqual(expect.objectContaining({
      attemptBudget: "10-20 focused attempts",
      benchmarkLabel: "Day 15 benchmark",
      benchmarkVisible: true,
      blockLabel: "Day 15",
      boardHours: "1.8h",
      currentDay: "15",
      dayCount: "15 / 60",
      finishDisabled: true,
      flowFocus: "Choose one direction today.",
      intensity: "yellow",
      intensityEffort: "4-6/10",
      mainFocus: "Benchmark first, then 180.",
      phaseBadge: "Balance Blueprint · Week 3",
      sessionDaysCount: "2 / 6",
      startDisabled: false,
      weekCount: "3 / 21"
    }));
    expect(state.heroSubtitle).toBe(
      "Dynamic balance with 180s and shove-it still moving. Rest days this week: Sunday."
    );
  });

  it("shows the exact off-board copy and uses five available days with an extra rest day", () => {
    const state = buildSkateHeroState({
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 30,
        extraRestDayOfWeek: 4,
        intensityByDate: {},
        restDayOfWeek: 1
      })
    }, TODAY);

    expect(state.heroSubtitle).toBe(
      "Monday and Thursday is your off-board day. SkateIQ stays on Day 30 until you change it."
    );
    expect(state.settingsNote).toBe(
      "Monday and Thursday is off. The plan will stay on Day 30 until you move it."
    );
    expect(state.sessionDaysCount).toBe("0 / 5");
  });

  it("previews Day 1 before the season and survives malformed storage", () => {
    const state = buildSkateHeroState({
      [SKATE_SESSIONS_STORAGE_KEY]: "bad",
      [SKATE_SETTINGS_STORAGE_KEY]: "[]"
    }, new Date(2026, 7, 28, 12));

    expect(state).toEqual(expect.objectContaining({
      blockLabel: "Day 1",
      currentDay: "1",
      dayCount: "Starts Aug 29",
      heroSubtitle: "Previewing Day 1 for Saturday, August 29, 2026.",
      intensity: "blue",
      phaseBadge: "Balance Blueprint · Week 1",
      sessionDaysCount: "0 / 6",
      weekCount: "1 / 21"
    }));
  });

  // The week is derived from the date and clamped to the 21-week season that
  // starts on 29 Aug 2026. The test above covers a date before the season; this
  // covers one past the end of it. The SkateIQ day is deliberately not clamped
  // alongside it: it is a stored setting the skater advances by hand, so it
  // stays where they left it however much time passes.
  it("holds at the last week past the end of the season, leaving the stored day alone", () => {
    const state = buildSkateHeroState({}, new Date(2027, 9, 3, 12));

    expect(state.weekCount).toBe("21 / 21");
    expect(state.dayCount).toBe("1 / 60");
  });
});
