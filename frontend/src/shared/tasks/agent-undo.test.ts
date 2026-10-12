import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { buildAgentUndoWrites } from "./agent-undo";
import { ACTIVITY_LOG_KEY, type PlannerTask } from "./tasks";

const TODAY_KEY = "2026-10-05";
const TOMORROW_KEY = "2026-10-06";
const TODAY_TASKS_KEY = `hivePlanner.dailyTasks.${TODAY_KEY}`;
const TOMORROW_TASKS_KEY = `hivePlanner.dailyTasks.${TOMORROW_KEY}`;
const AGENT_UI_KEY = "hivePlanner.agent.uiState";
const AGENT_UNDO_KEY = "hivePlanner.agent.undo";

const identity = {
  activityId: "activity-undo-fixed",
  timestamp: "2026-10-05T12:00:00.000Z"
};

function task(id: string, label: string, done = false): PlannerTask {
  return {
    activity: "portfolioJobPrep",
    createdAt: "2026-10-05T08:00:00.000Z",
    done,
    hours: 1,
    id,
    label,
    reminderMinutes: 0,
    reminderSentAt: "",
    reminderSentFor: "",
    scheduledTime: "",
    sourceEventId: "",
    timerSeconds: 0,
    timerStartedAt: null,
    useSourceEventReminder: false
  };
}

function valueFor(result: ReturnType<typeof buildAgentUndoWrites>, key: string): unknown {
  const value = result.writes.find((write) => write.key === key)?.value;
  return JSON.parse(value ?? "null") as unknown;
}

describe("buildAgentUndoWrites", () => {
  it("pops the stack, restores both days and UI state, and appends the exact undo audit", () => {
    const before = {
      agentState: {
        dayStates: { [TODAY_KEY]: "tired" },
        hiddenTaskIdsByDate: { [TODAY_KEY]: [] },
        unknownAgentField: { keep: true }
      },
      plannedHours: { portfolioJobPrep: 2 },
      todayTasks: [task("today-a", "Original today")],
      tomorrowTasks: [task("tomorrow-a", "Original tomorrow")]
    };
    const after = {
      agentState: {
        dayStates: { [TODAY_KEY]: "tired" },
        hiddenTaskIdsByDate: { [TODAY_KEY]: ["today-b"] }
      },
      plannedHours: { portfolioJobPrep: 2 },
      todayTasks: [task("today-a", "Changed today"), task("today-b", "Hidden task")],
      tomorrowTasks: []
    };
    const olderEntry = { compatibilityField: "preserve" };
    const store: PlannerStore = {
      [ACTIVITY_LOG_KEY]: JSON.stringify([
        null,
        {
          action: "task_created",
          after: task("old", "Old task"),
          before: null,
          dateKey: TODAY_KEY,
          entityId: "old",
          entityType: "task",
          field: "",
          id: "activity-old",
          meta: {},
          timestamp: "2026-10-05T09:00:00.000Z"
        }
      ]),
      [AGENT_UNDO_KEY]: JSON.stringify([
        olderEntry,
        {
          actionId: "simplify_today",
          actionLabel: "Simplify today",
          snapshot: { actionId: "simplify_today", after, before },
          todayKey: TODAY_KEY,
          tomorrowKey: TOMORROW_KEY
        }
      ])
    };

    const result = buildAgentUndoWrites(store, identity);

    expect(result.undone).toBe(true);
    expect(result.actionLabel).toBe("Simplify today");
    expect(result.writes.map(({ key }) => key)).toEqual([
      AGENT_UNDO_KEY,
      TODAY_TASKS_KEY,
      TOMORROW_TASKS_KEY,
      AGENT_UI_KEY,
      ACTIVITY_LOG_KEY
    ]);
    expect(valueFor(result, AGENT_UNDO_KEY)).toEqual([olderEntry]);
    expect(valueFor(result, TODAY_TASKS_KEY)).toEqual(before.todayTasks);
    expect(valueFor(result, TOMORROW_TASKS_KEY)).toEqual(before.tomorrowTasks);
    expect(valueFor(result, AGENT_UI_KEY)).toEqual(before.agentState);
    expect(valueFor(result, ACTIVITY_LOG_KEY)).toEqual([
      expect.objectContaining({ id: "activity-old", action: "task_created" }),
      {
        action: "agent_action_undone",
        after: before,
        before: after,
        dateKey: TODAY_KEY,
        entityId: "simplify_today",
        entityType: "agent_action",
        field: "",
        id: "activity-undo-fixed",
        meta: { label: "Simplify today" },
        timestamp: "2026-10-05T12:00:00.000Z"
      }
    ]);
  });

  it("normalizes restored legacy task and agent fields", () => {
    const store: PlannerStore = {
      [AGENT_UNDO_KEY]: JSON.stringify([{
        actionId: "move_one_task",
        actionLabel: "Move one task to tomorrow",
        snapshot: {
          after: {},
          before: {
            agentState: { compatibilityField: true },
            todayTasks: [{ id: "legacy", label: " Legacy task ", activity: "cpp", hours: 30 }],
            tomorrowTasks: "invalid"
          }
        },
        todayKey: TODAY_KEY,
        tomorrowKey: TOMORROW_KEY
      }])
    };

    const result = buildAgentUndoWrites(store, identity);

    expect(valueFor(result, TODAY_TASKS_KEY)).toEqual([
      expect.objectContaining({
        activity: "transcendence",
        hours: 24,
        id: "legacy",
        label: "Legacy task"
      })
    ]);
    expect(valueFor(result, TOMORROW_TASKS_KEY)).toEqual([]);
    expect(valueFor(result, AGENT_UI_KEY)).toEqual({
      compatibilityField: true,
      dayStates: {},
      hiddenTaskIdsByDate: {}
    });
  });

  it("consumes invalid entries safely and keeps only the newest ten remaining records", () => {
    const olderEntries = Array.from({ length: 12 }, (_, index) => ({ id: `undo-${index}` }));
    const invalidTop = { actionId: "broken", snapshot: null };
    const emptyResult = buildAgentUndoWrites({}, identity);
    const malformedResult = buildAgentUndoWrites({ [AGENT_UNDO_KEY]: "not-json" }, identity);
    const cappedResult = buildAgentUndoWrites({
      [AGENT_UNDO_KEY]: JSON.stringify([...olderEntries, invalidTop])
    }, identity);

    expect(emptyResult).toEqual({
      actionLabel: null,
      undone: false,
      writes: [{ key: AGENT_UNDO_KEY, value: "[]" }]
    });
    expect(malformedResult).toEqual(emptyResult);
    expect(cappedResult.undone).toBe(false);
    expect(cappedResult.writes).toHaveLength(1);
    expect(valueFor(cappedResult, AGENT_UNDO_KEY)).toEqual(olderEntries.slice(-10));
  });
});
