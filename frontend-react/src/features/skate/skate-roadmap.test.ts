import { describe, expect, it } from "vitest";

import { buildSkateRoadmapModel, SKATE_SESSIONS_STORAGE_KEY } from "./skate-roadmap";

describe("Skate roadmap model", () => {
  it("shows the exact pre-season message without roadmap dots", () => {
    expect(buildSkateRoadmapModel({}, new Date(2026, 7, 28))).toEqual({
      columnCount: 0,
      days: [],
      emptyMessage: "Roadmap starts on Saturday, August 29, 2026. Dots appear after the season begins and stay visible as the history grows.",
      leadingBlanks: 0,
      months: []
    });
  });

  it("builds every season day and uses the last saved session for its dot", () => {
    const model = buildSkateRoadmapModel({
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([
        {
          dateKey: "2026-08-29",
          durationHours: 0.5,
          finishedAt: "2026-08-28T12:00:00.000Z",
          intensity: "blue",
          mainFocus: "Baseline"
        },
        {
          dateKey: "2026-09-01",
          durationHours: 0.25,
          finishedAt: "2026-09-01T10:00:00.000Z",
          focus: "First session",
          intensity: "red"
        },
        {
          dateKey: "2026-09-01",
          durationHours: 0.75,
          finishedAt: "2026-09-01T12:00:00.000Z",
          intensity: "green",
          mainFocus: "Latest session"
        },
        { dateKey: "2026-09-02", intensity: "blue" },
        { dateKey: "2026-09-99", finishedAt: "invalid", intensity: "blue" }
      ])
    }, new Date(2026, 8, 2));

    expect(model.leadingBlanks).toBe(6);
    expect(model.columnCount).toBe(2);
    expect(model.months).toEqual([
      { column: 1, label: "Aug" },
      { column: 2, label: "Sep" }
    ]);
    expect(model.days).toHaveLength(5);
    expect(model.days[0]).toEqual({
      ariaLabel: "Sat Aug 29 · 1 skate session",
      dateKey: "2026-08-29",
      durationMinutes: 30,
      intensity: "blue",
      selectedIntensity: "blue",
      sessionCount: 1,
      title: "Sat Aug 29 · BLUE · Baseline"
    });
    expect(model.days[3]).toEqual({
      ariaLabel: "Tue Sep 1 · 2 skate sessions",
      dateKey: "2026-09-01",
      durationMinutes: 45,
      intensity: "green",
      selectedIntensity: "green",
      sessionCount: 2,
      title: "Tue Sep 1 · GREEN · Latest session"
    });
    expect(model.days[4]).toMatchObject({
      ariaLabel: "Wed Sep 2 · no logged session",
      durationMinutes: 45,
      intensity: "empty",
      selectedIntensity: null,
      title: "Wed Sep 2"
    });
  });

  it("uses a finished timestamp when the explicit date is missing and survives malformed storage", () => {
    const date = new Date(2026, 7, 30, 12);
    const finishedAt = date.toISOString();
    const model = buildSkateRoadmapModel({
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([
        { durationHours: "bad", finishedAt, intensity: "invalid" }
      ])
    }, date);

    expect(model.days[1]).toMatchObject({
      dateKey: "2026-08-30",
      durationMinutes: 1,
      intensity: "yellow",
      sessionCount: 1,
      title: "Sun Aug 30 · YELLOW · Saved session"
    });
    expect(buildSkateRoadmapModel({
      [SKATE_SESSIONS_STORAGE_KEY]: "not json"
    }, date).days.every((day) => day.intensity === "empty")).toBe(true);
  });

  it("keeps growing after the 60-day streak instead of truncating the history", () => {
    const model = buildSkateRoadmapModel({}, new Date(2026, 9, 31));

    expect(model.days).toHaveLength(64);
    expect(model.days.at(-1)?.dateKey).toBe("2026-10-31");
    expect(model.columnCount).toBe(10);
    expect(model.months).toEqual([
      { column: 1, label: "Aug" },
      { column: 2, label: "Sep" },
      { column: 6, label: "Oct" }
    ]);
  });
});
