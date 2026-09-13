import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import {
  buildLifePie,
  formatLifePieHours,
  plannerDateFromSearch,
  type LifePiePeriod
} from "./life-pie";

const TODAY = new Date(2026, 8, 13);
const NOW_MS = new Date(2026, 8, 13, 12).getTime();

function taskStore(): PlannerStore {
  return {
    "hivePlanner.dailyTasks.2026-08-20": JSON.stringify([
      { label: "Older study", activity: "lc", hours: 3, done: true }
    ]),
    "hivePlanner.dailyTasks.2026-09-12": JSON.stringify([
      { label: "Python block", activity: "python", hours: 1, done: true },
      { label: "Gym block", activity: "p90x3", hours: 2, done: true }
    ]),
    "hivePlanner.dailyTasks.2026-09-13": JSON.stringify([
      { label: "Leetcode block", activity: "lc", hours: 1, done: true },
      { label: "Coding block", activity: "cpp", hours: 2, done: false },
      { label: "Skate block", activity: "skate", hours: 1, done: true },
      { label: "Guitar block", activity: "guitar", hours: 0.5, done: true },
      { label: "Excluded block", activity: "other", hours: 10, done: true }
    ])
  };
}

describe("buildLifePie", () => {
  it.each<[LifePiePeriod, string, string[]]>([
    ["day", "4.5h", ["67% · 3h", "22% · 1h", "11% · 0.5h"]],
    ["week", "7.5h", ["53% · 4h", "40% · 3h", "7% · 0.5h"]],
    ["month", "7.5h", ["53% · 4h", "40% · 3h", "7% · 0.5h"]],
    ["all", "10.5h", ["67% · 7h", "29% · 3h", "5% · 0.5h"]]
  ])("matches legacy task totals for the %s period", (period, total, summaries) => {
    const model = buildLifePie(taskStore(), period, TODAY, NOW_MS);

    expect(model.formattedTotal).toBe(total);
    expect(model.groups.map((group) => group.summary)).toEqual(summaries);
  });

  it("aggregates physical, standalone session, meditation, and journal time once", () => {
    const store: PlannerStore = {
      "hivePlanner.dailyTasks.2026-09-13": JSON.stringify([
        { label: "Skate task", activity: "skate", hours: 1 },
        { label: "Guitar task", activity: "guitar", hours: 1 }
      ]),
      "hivePlanner.physical.logs": JSON.stringify([
        { date: "2026-09-13", name: "Skate", status: "done", minutes: 60 },
        { date: "2026-09-13", name: "Gym", status: "modified", minutes: 30 },
        { date: "2026-09-13", name: "Judo", status: "skipped", minutes: 60 },
        { date: "2026-09-13", name: "Rest", status: "done", minutes: 30 }
      ]),
      "hivePlanner.skate.sessions": JSON.stringify([
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T10:00:00Z", durationHours: 0.5 },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T11:00:00Z", durationHours: 0.75, trackedInTask: true }
      ]),
      "hivePlanner.guitar.sessions": JSON.stringify([
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T10:00:00Z", durationHours: 0.25 },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T11:00:00Z", durationHours: 0.5, trackedInTask: true }
      ]),
      "hivePlanner.meditation": JSON.stringify({
        sessions: [{ dateKey: "2026-09-13", finishedAt: "2026-09-13T10:00:00Z", durationHours: 0.25 }]
      }),
      "hivePlanner.journal.entries": JSON.stringify([
        { date: "2026-09-13", title: "Reflection", content: "", durationMinutes: 30 }
      ])
    };

    const model = buildLifePie(store, "day", TODAY, NOW_MS);

    expect(model.formattedTotal).toBe("5h");
    expect(model.groups.map(({ label, hours }) => ({ label, hours }))).toEqual([
      { label: "Study", hours: 0 },
      { label: "Body", hours: 3 },
      { label: "Mind", hours: 2 }
    ]);
  });

  it("uses current timers, caps legacy values, and ignores malformed collections", () => {
    const model = buildLifePie({
      "hivePlanner.dailyTasks.2026-09-13": JSON.stringify([
        {
          label: "Active timer",
          activity: "cpp",
          hours: 24,
          timerSeconds: 3600,
          timerStartedAt: new Date(NOW_MS - 1_800_000).toISOString()
        },
        { label: "Capped hours", activity: "python", hours: 99 },
        { label: "Legacy track", track: "guitar", hours: "0.25" },
        { label: "Unknown activity", activity: "future", hours: 1 },
        { label: "Invalid hours", activity: "skate", hours: "not-a-number" },
        { activity: "cpp", hours: 20 }
      ]),
      "hivePlanner.dailyTasks.2026-09-12": "not-json",
      "hivePlanner.physical.logs": "{}",
      "hivePlanner.skate.sessions": "null",
      "hivePlanner.journal.entries": "false"
    }, "week", TODAY, NOW_MS);

    expect(model.activities.map(({ id, hours }) => ({ id, hours }))).toEqual([
      { id: "lc", hours: 1 },
      { id: "cpp", hours: 1.5 },
      { id: "python", hours: 24 },
      { id: "skate", hours: 0 },
      { id: "p90x3", hours: 0 },
      { id: "guitar", hours: 0.25 },
      { id: "meditation", hours: 0 },
      { id: "journal", hours: 0 }
    ]);
  });

  it("keeps the complete zero-state model for missing and malformed data", () => {
    const model = buildLifePie({
      "hivePlanner.dailyTasks.2026-09-13": "not-json",
      "hivePlanner.meditation": "[]"
    }, "week", TODAY, NOW_MS);

    expect(model.formattedTotal).toBe("0h");
    expect(model.ariaLabel).toBe("Study 0h, Body 0h, Mind 0h");
    expect(model.background).toBe("#efedf2");
    expect(model.groups.map((group) => group.summary)).toEqual([
      "0% · 0h",
      "0% · 0h",
      "0% · 0h"
    ]);
    expect(model.activities).toHaveLength(8);
  });
});

describe("Life Pie formatting and planner date", () => {
  it.each([
    [0, "0h"],
    [1, "1h"],
    [1.236, "1.24h"],
    [Number.NaN, "0h"]
  ])("formats %s as %s", (hours, formatted) => {
    expect(formatLifePieHours(hours)).toBe(formatted);
  });

  it("uses a valid date query and falls back for invalid calendar dates", () => {
    const fallback = new Date(2026, 0, 2);

    expect(plannerDateFromSearch("?date=2026-09-13", fallback)).toEqual(TODAY);
    expect(plannerDateFromSearch("?date=2026-02-31", fallback)).toEqual(fallback);
    expect(plannerDateFromSearch("?date=not-a-date", fallback)).toEqual(fallback);
  });
});
