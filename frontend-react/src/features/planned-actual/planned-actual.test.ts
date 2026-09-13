import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import {
  applyPlannedInput,
  appendPlannedActivityLog,
  buildPlannedActual,
  isoWeekKey,
  plannedStorageKey
} from "./planned-actual";

const TODAY = new Date(2026, 8, 13);
const NOW_MS = new Date(2026, 8, 13, 12).getTime();

function populatedStore(): PlannerStore {
  return {
    "hivePlanner.planned.2026-W37": JSON.stringify({
      lc: 1,
      cpp: 3.5,
      python: "2",
      skate: 2,
      p90x3: 1.25,
      guitar: 0.75,
      futureActivity: { preserve: true }
    }),
    "hivePlanner.dailyTasks.2026-09-12": JSON.stringify([
      { label: "Python block", activity: "python", hours: 1 },
      { label: "Gym block", activity: "p90x3", hours: 2 }
    ]),
    "hivePlanner.dailyTasks.2026-09-13": JSON.stringify([
      { label: "Coding block", activity: "cpp", hours: 2, done: false },
      { label: "Skate block", activity: "skate", hours: 1 },
      { label: "Guitar block", activity: "guitar", hours: 0.5 },
      { label: "Excluded block", activity: "other", hours: 10 }
    ])
  };
}

describe("Planned vs actual model", () => {
  it("uses the legacy ISO week key across year boundaries", () => {
    expect(isoWeekKey(new Date(2021, 0, 1))).toBe("2020-W53");
    expect(isoWeekKey(TODAY)).toBe("2026-W37");
    expect(plannedStorageKey(TODAY)).toBe("hivePlanner.planned.2026-W37");
  });

  it("matches legacy group order, totals, rows, and progress rounding", () => {
    const model = buildPlannedActual(populatedStore(), TODAY, NOW_MS);

    expect(model.weekKey).toBe("2026-W37");
    expect(model.groups.map((group) => ({
      label: group.label,
      planned: group.formattedPlanned,
      actual: group.formattedActual,
      done: group.progressDone,
      target: group.progressTarget,
      width: group.progressWidth
    }))).toEqual([
      { label: "Study", planned: "6.5h", actual: "3h", done: 3, target: 6.5, width: 46 },
      { label: "Leisure", planned: "4h", actual: "3.5h", done: 3.5, target: 4, width: 88 }
    ]);
    expect(model.groups.flatMap((group) => group.rows.map((row) => [
      row.id, row.shortLabel, row.className, row.inputValue, row.formattedActual
    ]))).toEqual([
      ["lc", "lc", "lc", "1", "0h"],
      ["cpp", "Coding", "cpp", "3.5", "2h"],
      ["python", "Python", "python", "2", "1h"],
      ["skate", "Skate", "skate", "2", "1h"],
      ["p90x3", "Gym / Judo", "gym", "1.25", "2h"],
      ["guitar", "Guitar", "guitar", "0.75", "0.5h"]
    ]);
  });

  it("renders the soft zero state for missing and malformed planned data", () => {
    const models = [
      buildPlannedActual({}, TODAY, NOW_MS),
      buildPlannedActual({ "hivePlanner.planned.2026-W37": "not-json" }, TODAY, NOW_MS),
      buildPlannedActual({ "hivePlanner.planned.2026-W37": "[]" }, TODAY, NOW_MS)
    ];

    models.forEach((model) => {
      expect(model.groups.map((group) => [
        group.formattedPlanned,
        group.formattedActual,
        group.progressDone,
        group.progressTarget,
        group.progressWidth
      ])).toEqual([
        ["0h", "0h", 0, 0, 0],
        ["0h", "0h", 0, 0, 0]
      ]);
      expect(model.groups.flatMap((group) => group.rows.map((row) => row.inputValue)))
        .toEqual(["", "", "", "", "", ""]);
    });
  });
});

describe("Planned vs actual persistence", () => {
  it("clamps edits while preserving unknown planned fields", () => {
    const current = JSON.parse(populatedStore()[plannedStorageKey(TODAY)] ?? "{}") as Record<string, unknown>;

    const first = applyPlannedInput(current, "cpp", "5.25");
    const second = applyPlannedInput(first.values, "cpp", "not-a-number");
    const third = applyPlannedInput(second.values, "cpp", "-4");

    expect(first.before).toBe(3.5);
    expect(first.after).toBe(5.25);
    expect(first.values.futureActivity).toEqual({ preserve: true });
    expect(second).toMatchObject({ before: 5.25, after: 0 });
    expect(third).toMatchObject({ before: 0, after: 0 });
  });

  it("appends the exact normalized legacy activity-log shape", () => {
    const existing = JSON.stringify([
      { nonsense: true },
      {
        id: "old",
        timestamp: "2026-09-13T08:00:00.000Z",
        action: "task_created",
        entityType: "task",
        entityId: "task-1",
        dateKey: "2026-09-13",
        field: "",
        before: null,
        after: { label: "Keep" },
        meta: {},
        unknown: "discard like legacy normalization"
      }
    ]);

    const encoded = appendPlannedActivityLog(existing, {
      activityId: "cpp",
      after: 5.25,
      before: 3.5,
      groupId: "study",
      id: "activity-fixed",
      timestamp: "2026-09-13T09:00:00.000Z",
      weekKey: "2026-W37"
    });

    expect(JSON.parse(encoded)).toEqual([
      {
        id: "old",
        timestamp: "2026-09-13T08:00:00.000Z",
        action: "task_created",
        entityType: "task",
        entityId: "task-1",
        dateKey: "2026-09-13",
        field: "",
        before: null,
        after: { label: "Keep" },
        meta: {}
      },
      {
        id: "activity-fixed",
        timestamp: "2026-09-13T09:00:00.000Z",
        action: "planned_hours_updated",
        entityType: "planned_hours",
        entityId: "cpp",
        dateKey: "2026-W37",
        field: "cpp",
        before: 3.5,
        after: 5.25,
        meta: { group: "study", activity: "cpp" }
      }
    ]);
  });
});
