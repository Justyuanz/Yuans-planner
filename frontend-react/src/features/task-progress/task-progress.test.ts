import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { buildTaskProgressModel } from "./task-progress";

describe("buildTaskProgressModel", () => {
  it("counts only valid legacy tasks and uses legacy truthy completion semantics", () => {
    const model = buildTaskProgressModel({
      "hivePlanner.dailyTasks.2026-09-17": JSON.stringify([
        { label: "First", done: true },
        { label: " Second ", done: false },
        { label: "Third", done: "false" },
        { label: "   ", done: true },
        null
      ])
    }, "2026-09-17");

    expect(model).toEqual({
      message: "Tasks from your calendar and planner.",
      progress: "2 / 3 tasks done today"
    });
  });

  const malformedStores: PlannerStore[] = [
    {},
    { "hivePlanner.dailyTasks.2026-09-17": "not-json" },
    { "hivePlanner.dailyTasks.2026-09-17": "{}" },
    { "hivePlanner.dailyTasks.2026-09-17": JSON.stringify([42, { label: "" }]) }
  ];

  it.each(malformedStores)("returns the empty legacy progress for missing or malformed data", (store) => {
    expect(buildTaskProgressModel(store, "2026-09-17")).toEqual({
      message: "Tasks from your calendar and planner.",
      progress: "0 / 0 tasks done today"
    });
  });
});
