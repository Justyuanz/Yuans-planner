import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { CALENDAR_EVENTS_STORAGE_KEY } from "@/shared/calendar-event-store";
import { buildCalendarMonth } from "./calendar-month";

const TODAY = new Date(2026, 8, 14);
const CURSOR = new Date(2026, 8, 1);

function storeWithEvents(events: unknown, routine?: unknown): PlannerStore {
  return {
    [CALENDAR_EVENTS_STORAGE_KEY]: JSON.stringify(events),
    ...(routine === undefined
      ? {}
      : { "hivePlanner.routine.week.2026-W38": JSON.stringify(routine) })
  };
}

describe("Calendar month model", () => {
  it("renders a stable 6-week September grid for missing and malformed storage", () => {
    const stores: PlannerStore[] = [
      {},
      { [CALENDAR_EVENTS_STORAGE_KEY]: "not-json" },
      { [CALENDAR_EVENTS_STORAGE_KEY]: "{}" }
    ];
    stores.forEach((store) => {
        const model = buildCalendarMonth(store, CURSOR, "2026-09-14", TODAY);
        expect(model.label).toBe("September 2026");
        expect(model.weekdays).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
        expect(model.cells).toHaveLength(42);
        expect(model.cells[0]).toMatchObject({ date: "2026-08-30", dayNumber: 30 });
        expect(model.cells[41]).toMatchObject({ date: "2026-10-10", dayNumber: 10 });
        expect(model.cells.every((cell) => cell.pills.length === 0)).toBe(true);
      });
  });

  it("applies selected, today, outside-month, and saved day-type classes", () => {
    const model = buildCalendarMonth(storeWithEvents([], {
      days: [{ type: "recovery" }, { type: "high" }, { type: "normal" }]
    }), CURSOR, "2026-09-14", TODAY);
    expect(model.cells.find(({ date }) => date === "2026-08-30")?.className)
      .toContain("outside");
    expect(model.cells.find(({ date }) => date === "2026-09-14")?.className)
      .toBe("day-cell today selected recovery-day");
    expect(model.cells.find(({ date }) => date === "2026-09-15")?.className)
      .toBe("day-cell high-day");
  });

  it("normalizes legacy categories, sorts time first, hides routine events, and caps visible pills", () => {
    const events = [
      { id: "routine", date: "2026-09-14", title: "Hidden", routineManaged: true },
      { id: "untimed", date: "2026-09-14", title: "A very long personal appointment title", category: "unknown", createdAt: "2026-09-14T08:00:00Z" },
      { id: "late", date: "2026-09-14", title: "Late", startTime: "18:30", endTime: "19:00", category: "Python", note: "Bring notes" },
      { id: "early", date: "2026-09-14", title: "09:00-10:30 Deep work", category: "Coding" },
      { id: "middle", date: "2026-09-14", title: "Lunch", startTime: "12:00", category: "Chore", reminderOnly: true },
      { id: "extra", date: "2026-09-14", title: "Extra", startTime: "20:00", category: "LeetCode" }
    ];
    const cell = buildCalendarMonth(storeWithEvents(events), CURSOR, "2026-09-14", TODAY)
      .cells.find(({ date }) => date === "2026-09-14")!;
    expect(cell.moreCount).toBe(1);
    expect(cell.pills.map(({ eventId }) => eventId)).toEqual(["early", "middle", "late", "extra"]);
    expect(cell.pills[0]).toEqual({
      categoryClass: "transcendence-block",
      date: "2026-09-14",
      eventId: "early",
      label: "Deep work",
      startLabel: "09:00",
      title: "09:00-10:30 Deep work · 09:00–10:30 · 1h 30m · Coding"
    });
    expect(cell.pills[1]).toMatchObject({
      categoryClass: "chores-block",
      startLabel: "12:00",
      title: "Lunch · 12:00 · Reminder · Chore"
    });
    expect(cell.pills[2]?.title).toBe("Late · 18:30–19:00 · 30m · Python · Bring notes");
  });

  it("uses the legacy 20-character chip truncation and ignores malformed records", () => {
    const cell = buildCalendarMonth(storeWithEvents([
      null,
      "bad",
      { id: "long", date: "2026-09-14", title: "abcdefghijklmnopqrstu" }
    ]), CURSOR, "2026-09-14", TODAY).cells.find(({ date }) => date === "2026-09-14")!;
    expect(cell.pills).toHaveLength(1);
    expect(cell.pills[0]?.label).toBe("abcdefghijklmnopq...");
  });
});
