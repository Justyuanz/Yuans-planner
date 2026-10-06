import { describe, expect, it } from "vitest";

import {
  buildDashboardTaskMetrics,
  buildDailyTaskSummaries,
  parseTaskTimeMinutes,
  selectTaskSummaryWindow
} from "./dashboard-insight-task-metrics";

function task(label: string, hours: unknown, done: boolean, timerSeconds: unknown = 0) {
  return { done, hours, label, timerSeconds };
}

describe("task time and daily summary compatibility", () => {
  it("parses legacy time prefixes and rejects impossible clocks", () => {
    expect(parseTaskTimeMinutes("9 Deep work")).toBe(9 * 60);
    expect(parseTaskTimeMinutes("0930 Deep work")).toBe(9 * 60 + 30);
    expect(parseTaskTimeMinutes("18:45 - Review")).toBe(18 * 60 + 45);
    expect(parseTaskTimeMinutes("24:00 Invalid")).toBeNull();
    expect(parseTaskTimeMinutes("09:60 Invalid")).toBeNull();
    expect(parseTaskTimeMinutes("Unscheduled task")).toBeNull();
  });

  it("builds typed daily summaries with timers, schedule buckets, and study detection", () => {
    const summaries = buildDailyTaskSummaries({
      invalid: [task("09 Ignored", 1, true)],
      "2026-08-06": [
        task("09 Morning", 99, true, 7200),
        { ...task("19 Review notes", 1, false), activity: "transcendence" },
        task("Laundry", 0.5, false)
      ]
    });
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      allLabels: ["morning", "review notes", "laundry"],
      completedCount: 1,
      completedHours: 2,
      dateKey: "2026-08-06",
      eveningCount: 1,
      eveningHours: 1,
      lateStudyCount: 1,
      morningCompletedHours: 2,
      morningCount: 1,
      morningPlannedHours: 2,
      plannedCount: 3,
      plannedHours: 3.5,
      unfinishedLabels: ["review notes", "laundry"],
      unscheduledCount: 1
    });
    expect(summaries[0]?.tasks).toHaveLength(3);
  });

  it("selects only stored summaries inside the requested date window", () => {
    const summaries = buildDailyTaskSummaries({
      "2026-08-01": [task("09 A", 1, true)],
      "2026-08-03": [task("09 B", 1, true)],
      "2026-08-05": [task("09 C", 1, true)],
      "2026-08-06": [task("09 D", 1, true)]
    });

    expect(selectTaskSummaryWindow(summaries, "2026-08-06", 3, false)
      .map(({ dateKey }) => dateKey)).toEqual(["2026-08-05"]);
    expect(selectTaskSummaryWindow(summaries, "2026-08-06", 3, true)
      .map(({ dateKey }) => dateKey)).toEqual(["2026-08-05", "2026-08-06"]);
  });
});

describe("buildDashboardTaskMetrics", () => {
  it("returns stable zeroed metrics for empty and malformed data", () => {
    const metrics = buildDashboardTaskMetrics({
      activityLog: "invalid",
      currentDateKey: "2026-08-06",
      lookbackDays: 7,
      taskMap: null
    });

    expect(metrics.todaySummary.plannedCount).toBe(0);
    expect(metrics.dailyTaskAverages.plannedAverage).toBe(0);
    expect(metrics.hourGapAverages.averageGap).toBe(0);
    expect(metrics.morningOverrun.averageOverrun).toBe(0);
    expect(metrics.eveningLoad.averageEveningHours).toBe(0);
    expect(metrics.editFrequency.averageEditsPerDay).toBe(0);
    expect(metrics.carryoverIndicators.carryoverRate).toBe(0);
    expect(metrics.unscheduledTaskCounts.latestUnscheduledCount).toBe(0);
    expect(metrics.vagueTaskFriction.vagueOpenCount).toBe(0);
  });

  it("matches legacy task, hour, edit, evening, unscheduled, and vague metrics", () => {
    const metrics = buildDashboardTaskMetrics({
      currentDateKey: "2026-08-06",
      lookbackDays: 4,
      taskMap: {
        "2026-08-03": [
          task("09 Deep work", 1.5, true),
          task("19 Guitar", 0.5, false),
          task("Laundry", 0.25, false)
        ],
        "2026-08-04": [task("10 Study", 1, true), task("13 Admin", 1, false)],
        "2026-08-05": [task("08 Warmup", 0.5, true), task("18 Review", 1, true)],
        "2026-08-06": [
          task("09 C++ eval", 1.5, false),
          task("18 Review", 1, false),
          task("Read notes", 0.5, false)
        ]
      },
      activityLog: [
        { action: "task_updated", dateKey: "2026-08-05" },
        { action: "planned_hours_updated", dateKey: "2026-08-06" }
      ]
    });

    expect(metrics.todaySummary.plannedCount).toBe(3);
    expect(metrics.dailyTaskAverages).toEqual({
      completedAverage: 1.33,
      plannedAverage: 2.33,
      sampleSize: 3
    });
    expect(metrics.hourGapAverages).toEqual({
      averageGap: 0.58,
      completedAverage: 1.33,
      plannedAverage: 1.92,
      sampleSize: 3
    });
    expect(metrics.eveningLoad.latestEveningTaskCount).toBe(1);
    expect(metrics.unscheduledTaskCounts.latestUnscheduledCount).toBe(1);
    expect(metrics.editFrequency.latestEditCount).toBe(1);
    expect(metrics.vagueTaskFriction).toEqual({
      sampleSize: 4,
      specificCompletionRate: 0.4,
      vagueCompletionRate: 0.4,
      vagueOpenCount: 1
    });
  });

  it("uses first logged morning estimates and ignores evening hour changes", () => {
    const metrics = buildDashboardTaskMetrics({
      currentDateKey: "2026-08-06",
      lookbackDays: 3,
      taskMap: {
        "2026-08-04": [task("09 Shower + ready", 2.5, true), task("18 Review", 1, true)],
        "2026-08-05": [task("10 Commute + settle", 2, true)],
        "2026-08-06": [task("09 Focus", 1, false)]
      },
      activityLog: [
        { after: 1, dateKey: "2026-08-04", entityId: "m1", entityType: "task", field: "hours", meta: { label: "09 Shower + ready" } },
        { after: 0.75, dateKey: "2026-08-05", entityId: "m2", entityType: "task", field: "hours", meta: { label: "10 Commute + settle" } },
        { after: 1, dateKey: "2026-08-04", entityId: "e1", entityType: "task", field: "hours", meta: { label: "18 Review" } }
      ]
    });

    expect(metrics.morningOverrun).toEqual({
      actualAverage: 2.25,
      averageOverrun: 1.38,
      plannedAverage: 0.88,
      sampleSize: 2
    });
  });

  it("detects recurring unfinished labels without mutating the summaries", () => {
    const metrics = buildDashboardTaskMetrics({
      currentDateKey: "2026-08-06",
      lookbackDays: 4,
      taskMap: {
        "2026-08-03": [task("09 Study C++", 1, false), task("Laundry", 0.5, false)],
        "2026-08-04": [task("10 Study C++", 1, true), task("Walk", 0.25, false)],
        "2026-08-05": [task("11 Walk", 0.25, true)],
        "2026-08-06": [task("12 Focus", 1, false)]
      },
      activityLog: []
    });

    expect(metrics.carryoverIndicators).toEqual({
      carriedForwardTotal: 2,
      carryoverRate: 0.67,
      sampleSize: 3,
      unfinishedTotal: 3
    });
    expect(metrics.dailySummaries.every((summary) => !("_carriedForwardCount" in summary))).toBe(true);
  });
});
