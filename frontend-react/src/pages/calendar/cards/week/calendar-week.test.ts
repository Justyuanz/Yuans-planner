import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { CALENDAR_EVENTS_STORAGE_KEY } from "../../../../shared/calendar-event-store";
import {
  buildCalendarWeek,
  previewCalendarActivity,
  recoveryTypeChangeReason
} from "./calendar-week";
import {
  CALENDAR_DAY_TYPES,
  calendarWeekStorageKey,
  calendarWeekTypeChangeReason,
  calendarWeekWrite,
  decodeCalendarWeek,
  updateCalendarWeekType,
  validateCalendarWeek
} from "./calendar-week-store";

const MONDAY = new Date(2026, 8, 14);
const WEEK_KEY = "hivePlanner.routine.week.2026-W38";

function store(week: unknown, events: unknown = []): PlannerStore {
  return {
    [WEEK_KEY]: JSON.stringify(week),
    [CALENDAR_EVENTS_STORAGE_KEY]: JSON.stringify(events)
  };
}

describe("Calendar weekly planner compatibility", () => {
  it("keeps the legacy capacity budgets for every day type", () => {
    expect(CALENDAR_DAY_TYPES.map(({ capacityLoad, id }) => ({ capacityLoad, id }))).toEqual([
      { capacityLoad: 4.5, id: "recovery" },
      { capacityLoad: 7, id: "normal" },
      { capacityLoad: 9, id: "high" }
    ]);
  });

  it("uses the ISO week key and normal defaults for missing or malformed data", () => {
    expect(calendarWeekStorageKey(MONDAY)).toBe(WEEK_KEY);
    const stores: PlannerStore[] = [{}, { [WEEK_KEY]: "bad-json" }, { [WEEK_KEY]: "[]" }];
    stores.forEach((plannerStore) => {
      expect(decodeCalendarWeek(plannerStore, MONDAY)).toEqual({
        days: Array.from({ length: 7 }, () => ({ type: "normal" })),
        isConfigured: false,
        week: "2026-W38"
      });
    });
  });

  it("normalizes legacy day aliases and validates recovery/high limits", () => {
    const plan = decodeCalendarWeek(store({
      days: [
        { type: "rest" }, { type: "skate" }, { type: "high" }, { type: "study" },
        { type: "personal" }, { type: "unknown" }, null
      ]
    }), MONDAY);
    expect(plan.days.map((day) => day.type)).toEqual([
      "recovery", "high", "high", "normal", "recovery", "normal", "normal"
    ]);
    expect(validateCalendarWeek(plan)).toEqual({ errors: [], valid: true });
    expect(validateCalendarWeek({
      ...plan,
      days: Array.from({ length: 7 }, () => ({ type: "normal" as const }))
    })).toEqual({ errors: ["At least one Recovery Day is required."], valid: false });
  });

  it("protects the final recovery day and two-high-day maximum", () => {
    const plan = decodeCalendarWeek(store({
      days: [
        { type: "recovery" }, { type: "high" }, { type: "high" }, { type: "normal" },
        { type: "normal" }, { type: "normal" }, { type: "normal" }
      ]
    }), MONDAY);
    expect(calendarWeekTypeChangeReason(plan, 0, "normal"))
      .toBe("Keep one Recovery Day protected before changing this one.");
    expect(calendarWeekTypeChangeReason(plan, 3, "high"))
      .toBe("Two High-Intensity Days is the weekly maximum.");
    expect(updateCalendarWeekType(plan, 3, "recovery").days[3]?.type).toBe("recovery");
  });

  it("builds exact day cards, legacy aliases, load totals, and context switching", () => {
    const events = [
      { id: "one", date: "2026-09-14", title: "09:00-10:00 Work", category: "Coding" },
      { id: "two", date: "2026-09-14", title: "Gym", category: "Gym", effort: "easy", startTime: "10:00", endTime: "11:00" },
      { id: "three", date: "2026-09-14", title: "Cook", category: "Cooking", startTime: "12:00", endTime: "13:00" },
      { id: "four", date: "2026-09-14", title: "Call", category: "Social", startTime: "2 PM", endTime: "3 PM" },
      { id: "reminder", date: "2026-09-14", title: "Remember", category: "Chore", reminderOnly: true },
      { id: "invalid", date: "2026-09-14", title: "Untimed", category: "Personal" },
      { id: "routine", date: "2026-09-14", title: "Routine", category: "Gym", routineManaged: true }
    ];
    const model = buildCalendarWeek(store({
      days: [{ type: "normal" }, { type: "recovery" }, { type: "normal" }, { type: "high" }]
    }, events), "2026-09-14", "2026-09-14");
    expect(model.label).toBe("Every week needs at least one Recovery Day and no more than two High-Intensity Days.");
    expect(model.days).toHaveLength(7);
    expect(model.days[0]).toMatchObject({
      capacityHint: "3.7 / 7 load hours planned + 0.3 switching · 3.3 left.",
      className: "week-day-panel normal-day selected-day",
      date: "2026-09-14",
      dayLabel: "Mon",
      expanded: true,
      humanDate: "Mon Sep 14",
      status: "Space left"
    });
    expect(model.days[0]?.activities.map((activity) => [activity.shortLabel, activity.categoryClass]))
      .toEqual([
        ["Transcendence", "transcendence-block"],
        ["Gym", "gym-block"],
        ["Cooking", "cooking-block"],
        ["Social", "social-block"],
        ["Chores", "chores-block"]
      ]);
  });

  it("calculates continuous duration and user-selected effort loads", () => {
    const candidateLoad = (category: string, endTime: string, effort = "standard") => (
      previewCalendarActivity({}, "2026-09-14", {
        category,
        effort,
        endTime,
        reminderOnly: false,
        startTime: "09:00",
        title: "Candidate"
      }).candidateLoad
    );

    expect(candidateLoad("Study/school", "10:00")).toBe(1);
    expect(candidateLoad("Study/school", "10:15")).toBe(1.25);
    expect(candidateLoad("Study/school", "14:00")).toBe(5);
    expect(candidateLoad("Skate", "10:30", "easy")).toBe(1.35);
    expect(candidateLoad("Skate", "10:30", "standard")).toBe(1.8);
    expect(candidateLoad("Skate", "10:30", "demanding")).toBe(2.25);
    expect(candidateLoad("Skate", "10:30", "")).toBe(2.25);
    expect(candidateLoad("Gym", "10:00", "")).toBe(1.63);
    expect(candidateLoad("Transcendence", "10:00", "")).toBe(1);
  });

  it("keeps the established normal-day supporting mix within capacity", () => {
    const events = [
      { category: "Study/school", date: "2026-09-14", endTime: "13:30", id: "study", startTime: "09:00", title: "Study" },
      { category: "Skate", date: "2026-09-14", effort: "demanding", endTime: "15:30", id: "skate", startTime: "15:00", title: "Skate" },
      { category: "Guitar", date: "2026-09-14", endTime: "18:30", id: "guitar", startTime: "18:00", title: "Guitar" },
      { category: "Chores/groceries", date: "2026-09-14", endTime: "19:30", id: "chores", startTime: "19:00", title: "Chores" }
    ];
    const model = buildCalendarWeek(
      store({ days: [{ type: "normal" }] }, events),
      "2026-09-14",
      "2026-09-14"
    );

    expect(model.days[0]).toMatchObject({
      capacityHint: "6.3 / 7 load hours planned + 0.3 switching · 0.8 left.",
      remainingLoad: 0.75,
      status: "Space left"
    });
  });

  it("preserves recovery-day and over-budget preview rules", () => {
    const recoveryStore = store({ days: [{ type: "recovery" }] }, [{
      category: "Study/school",
      date: "2026-09-14",
      endTime: "12:30",
      id: "study",
      startTime: "09:00",
      title: "Study"
    }]);
    expect(previewCalendarActivity(recoveryStore, "2026-09-14", {
      category: "Chores/groceries",
      effort: "standard",
      endTime: "14:00",
      reminderOnly: false,
      startTime: "13:00",
      title: "Chores"
    })).toMatchObject({ allowed: true, projectedLoad: 4.25, remainingLoad: 0.25 });
    expect(previewCalendarActivity(store({ days: [{ type: "recovery" }] }), "2026-09-14", {
      category: "Skate",
      effort: "easy",
      endTime: "14:45",
      reminderOnly: false,
      startTime: "14:00",
      title: "Skate"
    })).toMatchObject({
      allowed: false,
      reason: "Recovery Day keeps skate and gym to 30 minutes or less."
    });

    const normalStore = store({ days: [{ type: "normal" }] }, [{
      category: "Study/school",
      date: "2026-09-14",
      endTime: "14:00",
      id: "study",
      startTime: "09:00",
      title: "Study"
    }]);
    const overBudget = previewCalendarActivity(normalStore, "2026-09-14", {
      category: "Gym",
      effort: "demanding",
      endTime: "18:00",
      reminderOnly: false,
      startTime: "16:00",
      title: "Gym"
    });
    expect(overBudget).toMatchObject({
      allowed: false,
      candidateLoad: 3.25,
      projectedLoad: 8.25,
      remainingLoad: -1.25
    });
    expect(overBudget.reason).toContain("over the 7 load-hour budget");
  });

  it("keeps Finnish distinct while using the study load multiplier", () => {
    const finnish = previewCalendarActivity({}, "2026-09-14", {
      category: "Finnish",
      effort: "standard",
      endTime: "12:15",
      reminderOnly: false,
      startTime: "09:00",
      title: "Finnish class"
    });
    const study = previewCalendarActivity({}, "2026-09-14", {
      category: "Study/school",
      effort: "standard",
      endTime: "12:15",
      reminderOnly: false,
      startTime: "09:00",
      title: "Study"
    });
    expect(finnish.candidateLoad).toBe(study.candidateLoad);

    const model = buildCalendarWeek(store({}, [{
      category: "Finnish",
      date: "2026-09-14",
      endTime: "12:15",
      id: "finnish",
      startTime: "09:00",
      title: "Finnish class"
    }]), "2026-09-14", "2026-09-14");
    expect(model.days[0]?.activities[0]).toMatchObject({
      categoryClass: "finnish-block",
      shortLabel: "Finnish"
    });
  });

  it("blocks Recovery Day when skate or gym exceeds 30 minutes", () => {
    expect(recoveryTypeChangeReason(store({}, [
      { id: "gym", date: "2026-09-14", category: "Gym", startTime: "18:00", endTime: "18:31" }
    ]), "2026-09-14")).toBe("Shorten skate or gym to 30 minutes before making this a Recovery Day.");
    expect(recoveryTypeChangeReason(store({}, [
      { id: "gym", date: "2026-09-14", category: "Gym", startTime: "18:00", endTime: "18:30" }
    ]), "2026-09-14")).toBe("");
  });

  it("writes the normalized configured plan without mutating the draft", () => {
    const plan = decodeCalendarWeek(store({ days: [{ type: "recovery" }] }), MONDAY);
    const write = calendarWeekWrite(plan, MONDAY);
    expect(write.key).toBe(WEEK_KEY);
    expect(JSON.parse(write.value)).toEqual({ ...plan, isConfigured: true });
    expect(plan.isConfigured).toBe(true);
  });
});
