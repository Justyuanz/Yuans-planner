import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import {
  CALENDAR_GOAL_PLANNER_KEY,
  calendarEditorEvents,
  calendarEventDraft,
  deleteCalendarEvent,
  emptyCalendarEventDraft,
  saveCalendarEvent
} from "./calendar-event-editor";
import { CALENDAR_EVENTS_STORAGE_KEY } from "./calendar-event-store";
import { previewCalendarActivity } from "./calendar-week";

const DATE = "2026-09-14";
const WEEK_KEY = "hivePlanner.routine.week.2026-W38";

function store(events: unknown, goals?: unknown): PlannerStore {
  return {
    [CALENDAR_EVENTS_STORAGE_KEY]: JSON.stringify(events),
    [WEEK_KEY]: JSON.stringify({ days: [{ type: "normal" }, { type: "recovery" }] }),
    ...(goals === undefined ? {} : { [CALENDAR_GOAL_PLANNER_KEY]: JSON.stringify(goals) })
  };
}

function parseArray(value: string): unknown[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? parsed as unknown[] : [];
}

describe("Calendar event editor compatibility", () => {
  it("starts a new form with legacy defaults", () => {
    expect(emptyCalendarEventDraft(DATE)).toEqual({
      category: "Study/school",
      date: DATE,
      dayPart: "",
      effort: "standard",
      endTime: "",
      note: "",
      reminderMinutes: 0,
      reminderOnly: false,
      startTime: "",
      title: ""
    });
  });

  it("loads legacy aliases and leading title times into an editable draft", () => {
    const draft = calendarEventDraft(store([{
      id: "legacy",
      date: DATE,
      title: "09:00-10:30 Deep work",
      category: "Coding",
      reminderMinutes: "15",
      note: " Keep exact spacing "
    }]), "legacy", DATE);
    expect(draft).toEqual({
      category: "Transcendence",
      date: DATE,
      dayPart: "",
      effort: "standard",
      endTime: "10:30",
      note: " Keep exact spacing ",
      reminderMinutes: 15,
      reminderOnly: false,
      startTime: "09:00",
      title: "Deep work"
    });
  });

  it("sorts selected events and preserves exact labels, times, notes, and aliases", () => {
    expect(calendarEditorEvents(store([
      { id: "late", date: DATE, title: "Late", category: "Python", startTime: "18:00", endTime: "19:00", note: "Bring notes" },
      { id: "early", date: DATE, title: "09:00-10:30 Deep work", category: "Coding" },
      { id: "routine", date: DATE, title: "Hidden", category: "Gym", routineManaged: true }
    ]), DATE)).toEqual([
      {
        categoryClass: "transcendence-block",
        categoryLabel: "Transcendence",
        id: "early",
        note: "",
        title: "09:00–10:30 · 1h 30m  Deep work"
      },
      {
        categoryClass: "mobile-development-block",
        categoryLabel: "Mobile Development",
        id: "late",
        note: "Bring notes",
        title: "18:00–19:00 · 1h  Late"
      }
    ]);
  });

  it("previews reminder, time-order, recovery, and capacity validation", () => {
    const plannerStore = store([]);
    expect(previewCalendarActivity(plannerStore, DATE, {
      category: "Study/school", effort: "standard", endTime: "", reminderOnly: false, startTime: "09:00", title: "Study"
    }).reason).toBe("Pick a valid start and end time.");
    expect(previewCalendarActivity(plannerStore, DATE, {
      category: "Study/school", effort: "standard", endTime: "09:00", reminderOnly: false, startTime: "10:00", title: "Study"
    }).reason).toBe("End time needs to be after start time.");
    expect(previewCalendarActivity(plannerStore, "2026-09-15", {
      category: "Gym", effort: "demanding", endTime: "11:00", reminderOnly: false, startTime: "10:00", title: "Gym"
    }).reason).toBe("Recovery Day keeps skate and gym to 30 minutes or less.");
    expect(previewCalendarActivity(plannerStore, DATE, {
      category: "Study/school", effort: "standard", endTime: "", reminderOnly: true, startTime: "", title: "Remember"
    }).allowed).toBe(true);
  });

  it("creates a normalized event while preserving malformed and unknown records", () => {
    const writes = saveCalendarEvent(store(["unknown", { id: "keep", custom: true }]), {
      ...emptyCalendarEventDraft(DATE),
      category: "Chore",
      endTime: "2 PM",
      note: " note ",
      reminderMinutes: 10,
      startTime: "1 PM"
    }, "", "2026-09-14T10:00:00.000Z", "event-new");
    expect(parseArray(writes[0]!.value)).toEqual([
      "unknown",
      { id: "keep", custom: true },
      {
        category: "Chores/groceries",
        createdAt: "2026-09-14T10:00:00.000Z",
        date: DATE,
        dayPart: "",
        effort: "standard",
        endTime: "14:00",
        id: "event-new",
        note: "note",
        reminderMinutes: 10,
        reminderOnly: false,
        startTime: "13:00",
        title: "Chores"
      }
    ]);
  });

  it("updates in place, clears sent reminder markers, and synchronizes a linked goal step", () => {
    const plannerStore = store([{
      id: "linked",
      date: DATE,
      title: "Old",
      goalId: "goal-1",
      goalStepId: "step-1",
      unknown: "keep",
      reminderSentAt: "sent",
      reminderSentFor: "old"
    }], [{ id: "goal-1", extra: true, steps: [{ id: "step-1", eventId: "linked", scheduledDay: "old" }] }]);
    const writes = saveCalendarEvent(plannerStore, {
      ...emptyCalendarEventDraft("2026-09-16"),
      startTime: "20:00",
      endTime: "21:00",
      title: "New"
    }, "linked", "2026-09-14T11:00:00.000Z", "unused");
    const event = parseArray(writes[0]!.value)[0];
    expect(event).toMatchObject({
      date: "2026-09-16",
      goalId: "goal-1",
      goalStepId: "step-1",
      id: "linked",
      title: "New",
      unknown: "keep",
      updatedAt: "2026-09-14T11:00:00.000Z"
    });
    expect(event).not.toHaveProperty("reminderSentAt");
    expect(parseArray(writes[1]!.value)).toMatchObject([{
      steps: [{ eventId: "linked", scheduledDay: "2026-09-16|evening" }]
    }]);
  });

  it("deletes an event and clears matching goal references", () => {
    const writes = deleteCalendarEvent(store([
      { id: "remove", title: "Remove" }, { id: "keep", title: "Keep" }
    ], [{ id: "goal", steps: [{ id: "step", eventId: "remove", scheduledDay: `${DATE}|morning` }] }]), "remove");
    expect(parseArray(writes[0]!.value)).toEqual([{ id: "keep", title: "Keep" }]);
    expect(parseArray(writes[1]!.value)).toMatchObject([{
      steps: [{ eventId: "", scheduledDay: "" }]
    }]);
  });
});
