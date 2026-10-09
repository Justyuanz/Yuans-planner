import { describe, expect, it } from "vitest";

import { linkSessionToTodayTask } from "./session-task-sync";

describe("linkSessionToTodayTask", () => {
  it("prefers a ready task and retains every untouched compatibility entry", () => {
    const result = linkSessionToTodayTask(JSON.stringify([
      { activity: "guitar", done: false, id: "running", label: "Running", timerStartedAt: "2026-09-14T17:00:00Z" },
      { activity: "guitar", done: false, id: "ready", label: "Ready", unknown: "keep" },
      "legacy-task"
    ]), {
      activityId: "guitar",
      defaultLabel: "Saved session",
      durationHours: 0.5,
      nowIso: "2026-09-14T18:00:00.000Z"
    });

    expect(result.label).toBe("Ready");
    expect(result.tasks).toEqual([
      expect.objectContaining({ id: "running", done: false }),
      expect.objectContaining({
        id: "ready",
        done: true,
        hours: 0.5,
        timerSeconds: 1800,
        unknown: "keep"
      }),
      "legacy-task"
    ]);
  });
});
