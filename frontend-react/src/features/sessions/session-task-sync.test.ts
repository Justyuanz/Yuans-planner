import { describe, expect, it } from "vitest";

import { linkSessionToTodayTask } from "./session-task-sync";

describe("linkSessionToTodayTask", () => {
  it("carries saved and running timer time into the completed task", () => {
    const result = linkSessionToTodayTask(JSON.stringify([
      {
        activity: "skate",
        done: false,
        hours: 0.17,
        id: "task-1",
        label: "Skate today",
        timerSeconds: 600,
        timerStartedAt: "2026-08-07T12:00:00Z"
      },
      {
        activity: "mobileDevelopment",
        done: false,
        hours: 0,
        id: "task-2",
        label: "Study block",
        timerSeconds: 0,
        timerStartedAt: null
      }
    ]), {
      activityId: "skate",
      defaultLabel: "Skate session",
      durationHours: 0.5,
      nowIso: "2026-08-07T12:30:00.000Z"
    });

    expect(result.label).toBe("Skate today");
    expect(result.tasks).toEqual([
      expect.objectContaining({
        done: true,
        hours: 1.17,
        id: "task-1",
        timerSeconds: 4200,
        timerStartedAt: null
      }),
      expect.objectContaining({
        done: false,
        hours: 0,
        id: "task-2",
        timerSeconds: 0,
        timerStartedAt: null
      })
    ]);
  });

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

  it("ignores malformed saved timer values", () => {
    const result = linkSessionToTodayTask(JSON.stringify([{
      activity: "skate",
      done: false,
      id: "task-1",
      label: "Skate today",
      timerSeconds: "not-a-number",
      timerStartedAt: "not-a-date"
    }]), {
      activityId: "skate",
      defaultLabel: "Skate session",
      durationHours: 0.5,
      nowIso: "2026-08-07T12:30:00.000Z"
    });

    expect(result.tasks).toEqual([expect.objectContaining({
      done: true,
      hours: 0.5,
      timerSeconds: 1800,
      timerStartedAt: null
    })]);
  });
});
