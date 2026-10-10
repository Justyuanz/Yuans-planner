import { describe, expect, it } from "vitest";

import {
  buildTaskWrites,
  decodeHiddenTaskIds,
  decodeTasks,
  displayTaskLabel,
  elapsedTaskSeconds,
  normalizeScheduledTime,
  type PlannerTask
} from "./tasks";

const DATE_KEY = "2026-10-05";

function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: "task-1",
    label: "Build the next boundary",
    activity: "transcendence",
    hours: 0,
    timerSeconds: 0,
    timerStartedAt: null,
    done: false,
    createdAt: "2026-10-05T08:00:00.000Z",
    sourceEventId: "",
    useSourceEventReminder: false,
    scheduledTime: "",
    reminderMinutes: 0,
    reminderSentAt: "",
    reminderSentFor: "",
    ...overrides
  };
}

describe("task compatibility", () => {
  it("normalizes malformed fields, retired activities, caps, and chronological order", () => {
    const tasks = decodeTasks(JSON.stringify([
      { id: "late", label: " Late ", activity: "cpp", hours: 40, scheduledTime: "2pm" },
      { id: "early", label: "Early", track: "python", hours: 1, timerSeconds: 40_000, scheduledTime: "930" },
      { id: "passive", label: "Other", activity: "missing", done: "yes" },
      { label: "  " },
      null
    ]), "2026-10-05T07:00:00.000Z");

    expect(tasks.map(({ id }) => id)).toEqual(["early", "late", "passive"]);
    expect(tasks[0]).toMatchObject({
      activity: "mobileDevelopment",
      hours: 1,
      scheduledTime: "09:30",
      timerSeconds: 28_800
    });
    expect(tasks[0]).not.toHaveProperty("track");
    expect(tasks[1]).toMatchObject({ activity: "transcendence", hours: 24, scheduledTime: "14:00" });
    expect(tasks[2]).toMatchObject({ activity: "other", done: true });
  });

  it.each([
    ["9", "09:00"],
    ["930", "09:30"],
    ["9:30 am", "09:30"],
    ["2pm–3:15pm", "14:00-15:15"],
    ["09:30 to 11", "09:30-11:00"],
    ["25:00", ""],
    ["later", ""]
  ])("normalizes scheduled time %s", (input, expected) => {
    expect(normalizeScheduledTime(input)).toBe(expected);
  });

  it("prefixes an untimed label with its normalized schedule", () => {
    expect(displayTaskLabel(task({ scheduledTime: "09:30" }))).toBe("09:30 Build the next boundary");
    expect(displayTaskLabel(task({ label: "10:00 Existing time", scheduledTime: "09:30" })))
      .toBe("10:00 Existing time");
  });

  it("caps a running timer at eight hours and ignores invalid starts", () => {
    expect(elapsedTaskSeconds(task({ timerSeconds: 60, timerStartedAt: "2026-10-05T08:00:00.000Z" }),
      Date.parse("2026-10-05T08:01:00.000Z"))).toBe(120);
    expect(elapsedTaskSeconds(task({ timerStartedAt: "2026-10-04T08:00:00.000Z" }),
      Date.parse("2026-10-05T08:01:00.000Z"))).toBe(28_800);
    expect(elapsedTaskSeconds(task({ timerStartedAt: "invalid" }), Date.now())).toBe(0);
  });

  it("writes normalized tasks and appends a compatible activity record", () => {
    const writes = buildTaskWrites({
      action: "task_created",
      after: task(),
      before: null,
      dateKey: DATE_KEY,
      existingLog: JSON.stringify([{ invalid: true }]),
      field: "",
      logId: "activity-1",
      taskId: "task-1",
      tasks: [task()],
      timestamp: "2026-10-05T08:00:00.000Z"
    });

    expect(writes.map(({ key }) => key)).toEqual([
      `hivePlanner.dailyTasks.${DATE_KEY}`,
      "hivePlanner.activityLog"
    ]);
    expect(JSON.parse(writes[0]!.value)).toEqual([task()]);
    expect(JSON.parse(writes[1]!.value)).toEqual([expect.objectContaining({
      action: "task_created",
      entityId: "task-1",
      entityType: "task",
      dateKey: DATE_KEY,
      after: task()
    })]);
  });

  it("reads date-specific hidden task IDs without trusting malformed agent state", () => {
    expect(decodeHiddenTaskIds(JSON.stringify({
      hiddenTaskIdsByDate: { [DATE_KEY]: ["task-1", 7, ""] }
    }), DATE_KEY)).toEqual(["task-1"]);
    expect(decodeHiddenTaskIds("not-json", DATE_KEY)).toEqual([]);
  });
});
