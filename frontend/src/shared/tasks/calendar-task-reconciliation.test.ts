import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import {
  buildCalendarTaskReconciliation,
  CALENDAR_EVENTS_KEY
} from "./calendar-task-reconciliation";
import type { PlannerTask } from "./tasks";

const DATE_KEY = "2026-10-05";
const TASK_KEY = `hivePlanner.dailyTasks.${DATE_KEY}`;

function task(overrides: Partial<PlannerTask>): PlannerTask {
  return {
    activity: "other",
    createdAt: "2026-10-05T07:00:00.000Z",
    done: false,
    hours: 0,
    id: "manual-task",
    label: "Manual task",
    scheduledTime: "",
    sourceEventId: "",
    timerSeconds: 0,
    timerStartedAt: null,
    ...overrides
  };
}

function identity(eventId: string) {
  return {
    createdAt: "2026-10-05T08:00:00.000Z",
    id: `calendar-task-${eventId}`
  };
}

describe("buildCalendarTaskReconciliation", () => {
  it("maps every production calendar category to its task activity", () => {
    const categories = [
      ["finnish", "Finnish"],
      ["guitar", "Guitar"],
      ["gym", "Gym"],
      ["mobile", "Mobile Development"],
      ["personal", "Personal"],
      ["portfolio", "Portfolio / Job Prep"],
      ["skate", "Skate"],
      ["study", "Study/school"],
      ["transcendence", "Transcendence"]
    ] as const;
    const store: PlannerStore = {
      [CALENDAR_EVENTS_KEY]: JSON.stringify(categories.map(([id, category]) => ({
        category,
        date: DATE_KEY,
        id,
        title: id
      })))
    };

    const tasks = buildCalendarTaskReconciliation(store, DATE_KEY, identity).tasks;
    expect(Object.fromEntries(tasks.map(({ activity, sourceEventId }) => (
      [sourceEventId, activity]
    )))).toEqual({
      finnish: "other",
      guitar: "guitar",
      gym: "gym",
      mobile: "mobileDevelopment",
      personal: "other",
      portfolio: "portfolioJobPrep",
      skate: "skate",
      study: "transcendence",
      transcendence: "transcendence"
    });
  });

  it("creates legacy-compatible tasks from structured and legacy calendar events", () => {
    const store: PlannerStore = {
      [CALENDAR_EVENTS_KEY]: JSON.stringify([
        {
          category: "Python",
          date: DATE_KEY,
          id: "event-structured",
          startTime: "9:30 am",
          title: " Build mobile screen "
        },
        {
          category: "LeetCode",
          createdAt: "2026-10-05T07:30:00.000Z",
          date: DATE_KEY,
          id: "event-legacy",
          title: "14:00-15:30 Solve graph problem"
        },
        { category: "Gym", date: "2026-10-06", id: "tomorrow", title: "Gym" },
        { category: "Skate", date: DATE_KEY, id: "routine", routineManaged: true, title: "Skate" }
      ])
    };

    const result = buildCalendarTaskReconciliation(store, DATE_KEY, identity);

    expect(result.changed).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.tasks).toEqual([
      task({
        activity: "mobileDevelopment",
        createdAt: "2026-10-05T08:00:00.000Z",
        id: "calendar-task-event-structured",
        label: "Build mobile screen",
        scheduledTime: "09:30",
        sourceEventId: "event-structured"
      }),
      task({
        activity: "portfolioJobPrep",
        createdAt: "2026-10-05T08:00:00.000Z",
        id: "calendar-task-event-legacy",
        label: "Solve graph problem",
        scheduledTime: "14:00",
        sourceEventId: "event-legacy"
      })
    ]);
    expect(result.write).toEqual({ key: TASK_KEY, value: JSON.stringify(result.tasks) });
  });

  it("preserves edited task state, removes stale links, and imports each missing event once", () => {
    const manual = task({});
    const editedLinked = task({
      activity: "guitar",
      done: true,
      id: "linked-current",
      label: "My edited title",
      sourceEventId: "event-current",
      timerSeconds: 120
    });
    const stale = task({ id: "linked-stale", label: "Old event", sourceEventId: "event-stale" });
    const store: PlannerStore = {
      [CALENDAR_EVENTS_KEY]: JSON.stringify([
        { category: "Guitar", date: DATE_KEY, id: "event-current", title: "Original title" },
        { category: "Gym", date: DATE_KEY, id: "event-new", title: "New event" },
        { category: "Gym", date: DATE_KEY, id: "event-new", title: "Duplicate event record" }
      ]),
      [TASK_KEY]: JSON.stringify([manual, editedLinked, stale])
    };

    const result = buildCalendarTaskReconciliation(store, DATE_KEY, identity);

    expect(result.changed).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.tasks).toEqual([
      editedLinked,
      manual,
      task({
        activity: "gym",
        createdAt: "2026-10-05T08:00:00.000Z",
        id: "calendar-task-event-new",
        label: "New event",
        sourceEventId: "event-new"
      })
    ]);

    const stableStore = { ...store, [TASK_KEY]: result.write?.value ?? "[]" };
    const stable = buildCalendarTaskReconciliation(stableStore, DATE_KEY, () => {
      throw new Error("A stable reconciliation must not create another task.");
    });
    expect(stable.changed).toBe(false);
    expect(stable.importedCount).toBe(0);
    expect(stable.write).toBeNull();
    expect(stable.tasks).toEqual(result.tasks);
  });

  it("recovers malformed storage, ignores invalid events, and removes retired routine tasks", () => {
    const routineTask = task({ createdAt: "routine", id: "routine-study" });
    const malformedStores: PlannerStore[] = [
      {},
      { [CALENDAR_EVENTS_KEY]: "not-json", [TASK_KEY]: "not-json" },
      { [CALENDAR_EVENTS_KEY]: JSON.stringify([null, { date: DATE_KEY, title: "No id" }]), [TASK_KEY]: "{}" },
      { [CALENDAR_EVENTS_KEY]: "[]", [TASK_KEY]: JSON.stringify([routineTask]) }
    ];

    malformedStores.forEach((store) => {
      const result = buildCalendarTaskReconciliation(store, DATE_KEY, identity);
      expect(result).toMatchObject({ changed: true, importedCount: 0, tasks: [] });
      expect(result.write).toEqual({ key: TASK_KEY, value: "[]" });
    });
  });
});
