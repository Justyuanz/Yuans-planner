import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { buildDayStateWrites } from "./day-state-persistence";

const identity = {
  activityId: "activity-fixed",
  timestamp: "2026-09-14T10:30:00.000Z"
};

function writeValue(writes: ReturnType<typeof buildDayStateWrites>, key: string): unknown {
  const value = writes.find((write) => write.key === key)?.value;
  return JSON.parse(value ?? "null") as unknown;
}

describe("buildDayStateWrites", () => {
  it("preserves compatibility fields and appends the exact legacy audit entry", () => {
    const existingLog = {
      action: "task_created",
      after: { label: "Existing" },
      before: null,
      dateKey: "2026-09-13",
      entityId: "task-1",
      entityType: "task",
      field: "",
      id: "existing-entry",
      meta: { source: "test" },
      timestamp: "2026-09-13T09:00:00.000Z"
    };
    const store: PlannerStore = {
      "hivePlanner.activityLog": JSON.stringify([existingLog]),
      "hivePlanner.dayState": JSON.stringify({
        "2026-09-13": "overwhelmed",
        "2026-09-14": "tired",
        compatibilityField: { keep: true }
      })
    };

    const writes = buildDayStateWrites(store, "2026-09-14", "good", identity);

    expect(writeValue(writes, "hivePlanner.dayState")).toEqual({
      "2026-09-13": "overwhelmed",
      "2026-09-14": "good",
      compatibilityField: { keep: true }
    });
    expect(writeValue(writes, "hivePlanner.activityLog")).toEqual([
      existingLog,
      {
        action: "day_state_updated",
        after: "good",
        before: "tired",
        dateKey: "2026-09-14",
        entityId: "2026-09-14",
        entityType: "day_state",
        field: "",
        id: "activity-fixed",
        meta: {},
        timestamp: "2026-09-14T10:30:00.000Z"
      }
    ]);
  });

  it("recovers malformed documents and keeps the legacy steady fallback", () => {
    const malformedStores: PlannerStore[] = [
      {},
      { "hivePlanner.dayState": "not-json", "hivePlanner.activityLog": "{}" },
      { "hivePlanner.dayState": "[]", "hivePlanner.activityLog": "false" }
    ];

    malformedStores.forEach((store) => {
      const writes = buildDayStateWrites(store, "2026-09-14", "low-focus", identity);
      expect(writeValue(writes, "hivePlanner.dayState")).toEqual({
        "2026-09-14": "low-focus"
      });
      expect(writeValue(writes, "hivePlanner.activityLog")).toEqual([
        expect.objectContaining({ before: "okay", after: "low-focus" })
      ]);
    });
  });

  it("filters malformed audit records and preserves the raw truthy previous value", () => {
    const store: PlannerStore = {
      "hivePlanner.activityLog": JSON.stringify([
        null,
        { action: "future_action", timestamp: "2026-09-01", entityType: "x", entityId: "x" },
        { action: "task_updated", timestamp: "", entityType: "task", entityId: "task-1" }
      ]),
      "hivePlanner.dayState": JSON.stringify({ "2026-09-14": "future-state" })
    };

    const writes = buildDayStateWrites(store, "2026-09-14", "okay", identity);

    expect(writeValue(writes, "hivePlanner.activityLog")).toEqual([
      expect.objectContaining({ before: "future-state", after: "okay" })
    ]);
  });
});
