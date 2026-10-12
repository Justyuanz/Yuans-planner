import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import {
  buildLifePie,
  type ActivityPeriod
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
  it.each<[ActivityPeriod, string, string[]]>([
    ["day", "4.5h", ["67% · 3h", "22% · 1h", "11% · 0.5h"]],
    ["week", "7.5h", ["53% · 4h", "40% · 3h", "7% · 0.5h"]],
    ["month", "7.5h", ["53% · 4h", "40% · 3h", "7% · 0.5h"]],
    ["all", "10.5h", ["67% · 7h", "29% · 3h", "5% · 0.5h"]]
  ])("matches legacy task totals for the %s period", (period, total, summaries) => {
    const model = buildLifePie(taskStore(), period, TODAY, NOW_MS);

    expect(model.formattedTotal).toBe(total);
    expect(model.groups.map((group) => group.summary)).toEqual(summaries);
  });

  it("aggregates physical and standalone Skate/Guitar sessions once", () => {
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
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T11:00:00Z", durationHours: 0.75, trackedInTask: true },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T12:00:00Z", durationHours: "not-a-number" },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T13:00:00Z", durationHours: -1 },
        null
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

    expect(model.formattedTotal).toBe("4.25h");
    expect(model.groups.map(({ label, hours }) => ({ label, hours }))).toEqual([
      { label: "Work", hours: 0 },
      { label: "Body", hours: 3 },
      { label: "Guitar", hours: 1.25 }
    ]);
  });

  it("filters standalone sessions across day, week, and all-time ranges", () => {
    const store: PlannerStore = {
      "hivePlanner.guitar.sessions": JSON.stringify([
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T12:00:00Z", durationHours: 0.5 },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T13:00:00Z", durationHours: 1, trackedInTask: true },
        { dateKey: "2026-09-12", finishedAt: "2026-09-12T12:00:00Z", durationHours: 2 },
        { dateKey: "2026-09-06", finishedAt: "2026-09-06T12:00:00Z", durationHours: 1.5 },
        { finishedAt: "2026-09-13T14:00:00Z", durationHours: -1 },
        { dateKey: "2026-09-13", durationHours: 4 }
      ])
    };
    const guitarHours = (period: ActivityPeriod) => (
      buildLifePie(store, period, TODAY, NOW_MS).activities
        .find(({ id }) => id === "guitar")?.hours
    );

    expect(guitarHours("day")).toBe(0.5);
    expect(guitarHours("week")).toBe(2.5);
    expect(guitarHours("all")).toBe(4);
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
      { id: "transcendence", hours: 1.5 },
      { id: "mobileDevelopment", hours: 24 },
      { id: "portfolioJobPrep", hours: 0 },
      { id: "skate", hours: 0 },
      { id: "gym", hours: 0 },
      { id: "guitar", hours: 0.25 }
    ]);
  });

  it("keeps the complete zero-state model for missing and malformed data", () => {
    const model = buildLifePie({
      "hivePlanner.dailyTasks.2026-09-13": "not-json",
      "hivePlanner.meditation": "[]"
    }, "week", TODAY, NOW_MS);

    expect(model.formattedTotal).toBe("0h");
    expect(model.ariaLabel).toBe("Work 0h, Body 0h, Guitar 0h");
    expect(model.background).toBe("#efedf2");
    expect(model.groups.map((group) => group.summary)).toEqual([
      "0% · 0h",
      "0% · 0h",
      "0% · 0h"
    ]);
    expect(model.activities).toHaveLength(6);
  });
});
