import { describe, expect, it } from "vitest";

import { decodeActivityLog } from "./activity-log";

describe("activity log compatibility", () => {
  it("keeps valid entries in chronological order and rejects malformed records", () => {
    const entries = decodeActivityLog(JSON.stringify([
      null,
      { action: "task_created" },
      { action: "not_real", timestamp: "2026-08-06T08:00:00.000Z", entityType: "task", entityId: "invalid" },
      {
        id: "b",
        timestamp: "2026-08-06T10:00:00.000Z",
        action: "task_created",
        entityType: " task ",
        entityId: " task-b "
      },
      {
        id: "a",
        timestamp: "2026-08-06T09:00:00.000Z",
        action: "task_updated",
        entityType: "task",
        entityId: "task-a",
        field: "hours",
        before: 1,
        after: 3,
        meta: { activity: "python", preserve: true }
      }
    ]));

    expect(entries.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(entries[0]?.meta).toEqual({ activity: "mobileDevelopment", preserve: true });
    expect(entries[1]).toMatchObject({ entityId: "task-b", entityType: "task", meta: {} });
    expect(decodeActivityLog("not-json")).toEqual([]);
    expect(decodeActivityLog(JSON.stringify({}))).toEqual([]);
  });

  it("accepts agent and day-state actions", () => {
    const entries = decodeActivityLog(JSON.stringify([
      {
        id: "activity-1",
        timestamp: "2026-08-06T10:00:00.000Z",
        action: "agent_action_applied",
        entityType: "agent_action",
        entityId: "simplify_today"
      },
      {
        id: "activity-2",
        timestamp: "2026-08-06T10:01:00.000Z",
        action: "day_state_updated",
        entityType: "day_state",
        entityId: "2026-08-06"
      }
    ]));

    expect(entries.map(({ action }) => action)).toEqual([
      "agent_action_applied",
      "day_state_updated"
    ]);
  });

  it("decodes before and after payloads as storage snapshots", () => {
    const before = { label: "Study", hours: 1 };
    const after = { label: "Study", hours: 3 };
    const rawValue = JSON.stringify([{
      id: "activity-1",
      timestamp: "2026-08-06T10:00:00.000Z",
      action: "task_updated",
      entityType: "task",
      entityId: "task-1",
      field: "hours",
      before,
      after
    }]);
    before.hours = 9;
    after.hours = 12;

    expect(decodeActivityLog(rawValue)[0]).toMatchObject({
      before: { label: "Study", hours: 1 },
      after: { label: "Study", hours: 3 }
    });
  });
});
