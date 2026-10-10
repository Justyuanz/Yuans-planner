import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import {
  CALENDAR_EVENTS_STORAGE_KEY,
  calendarCategoryMeta,
  calendarEvents,
  normalizeCalendarCategory,
  type CalendarEvent
} from "./calendar-event-store";
import { calendarActivityDuration, normalizeCalendarClock } from "./calendar-week";

export const CALENDAR_GOAL_PLANNER_KEY = "hivePlanner.goalPlanner.items";

export interface CalendarEventDraft {
  category: string;
  date: string;
  dayPart: string;
  effort: string;
  endTime: string;
  note: string;
  reminderMinutes: number;
  reminderOnly: boolean;
  startTime: string;
  title: string;
}

export interface CalendarEditorEvent {
  categoryClass: string;
  categoryLabel: string;
  id: string;
  note: string;
  title: string;
}

function parsedRecords(rawValue: string | undefined): Record<string, unknown>[] {
  try {
    const parsed: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizedReminder(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
}

function normalizedEffort(value: unknown, category: string): string {
  const effort = text(value).trim().toLowerCase();
  if (["easy", "standard", "demanding"].includes(effort)) return effort;
  return ["Skate", "Gym"].includes(category) ? "demanding" : "standard";
}

function fallbackRange(title: string): { endTime: string; startTime: string } {
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?(?=\s|$)/.exec(title.trim());
  if (match === null) return { endTime: "", startTime: "" };
  return {
    endTime: normalizeCalendarClock(`${match[3]}:${match[4] ?? "00"}`),
    startTime: normalizeCalendarClock(`${match[1]}:${match[2] ?? "00"}`)
  };
}

export function calendarEventDayPart(
  event: Readonly<{ dayPart?: unknown; startTime?: unknown; title?: unknown }>
): "afternoon" | "evening" | "morning" {
  const titleMatch = /^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/.exec(text(event.title).trim());
  const titleTime = titleMatch === null
    ? ""
    : normalizeCalendarClock(`${titleMatch[1]}:${titleMatch[2] ?? "00"}`);
  const startTime = normalizeCalendarClock(text(event.startTime)) || titleTime;
  if (startTime) {
    const hour = Number(startTime.slice(0, 2));
    return hour < 12 ? "morning" : hour < 19 ? "afternoon" : "evening";
  }
  const storedPart = text(event.dayPart);
  return storedPart === "morning" || storedPart === "afternoon" || storedPart === "evening"
    ? storedPart
    : "afternoon";
}

export function calendarTitleWithoutTime(title: string): string {
  return title.replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?)?\s*/, "").trim();
}

function eventTimeLabel(event: CalendarEvent): string {
  const fallback = fallbackRange(event.title);
  const startTime = normalizeCalendarClock(event.startTime || fallback.startTime);
  const endTime = normalizeCalendarClock(event.endTime || fallback.endTime);
  const duration = calendarActivityDuration(startTime, endTime);
  if (duration > 0 && !event.reminderOnly) {
    const durationLabel = [
      Math.floor(duration / 60) ? `${Math.floor(duration / 60)}h` : "",
      duration % 60 ? `${duration % 60}m` : ""
    ].filter(Boolean).join(" ");
    return `${startTime}–${endTime} · ${durationLabel}`;
  }
  return [startTime, event.reminderOnly ? "Reminder" : ""].filter(Boolean).join(" · ");
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  const leftStart = normalizeCalendarClock(left.startTime || fallbackRange(left.title).startTime);
  const rightStart = normalizeCalendarClock(right.startTime || fallbackRange(right.title).startTime);
  if (leftStart && rightStart && leftStart !== rightStart) return leftStart.localeCompare(rightStart);
  if (leftStart) return -1;
  if (rightStart) return 1;
  return (left.createdAt || left.updatedAt).localeCompare(right.createdAt || right.updatedAt)
    || left.id.localeCompare(right.id);
}

export function emptyCalendarEventDraft(date: string): CalendarEventDraft {
  return {
    category: "Study/school",
    date,
    dayPart: "",
    effort: "standard",
    endTime: "",
    note: "",
    reminderMinutes: 0,
    reminderOnly: false,
    startTime: "",
    title: ""
  };
}

export function calendarEventDraft(
  store: PlannerStore,
  eventId: string,
  fallbackDate: string
): CalendarEventDraft | null {
  const event = parsedRecords(store[CALENDAR_EVENTS_STORAGE_KEY])
    .find((candidate) => candidate.id === eventId);
  if (event === undefined) return null;
  const category = normalizeCalendarCategory(event.category);
  const title = text(event.title).trim();
  const fallback = fallbackRange(title);
  return {
    category,
    date: text(event.date) || fallbackDate,
    dayPart: text(event.dayPart),
    effort: normalizedEffort(event.effort, category),
    endTime: normalizeCalendarClock(text(event.endTime) || fallback.endTime),
    note: text(event.note),
    reminderMinutes: normalizedReminder(event.reminderMinutes),
    reminderOnly: Boolean(event.reminderOnly),
    startTime: normalizeCalendarClock(text(event.startTime) || fallback.startTime),
    title: calendarTitleWithoutTime(title) || title
  };
}

export function calendarEditorEvents(store: PlannerStore, date: string): CalendarEditorEvent[] {
  return calendarEvents(store).filter((event) => event.date === date && !event.routineManaged)
    .sort(compareEvents)
    .map((event) => {
      const category = normalizeCalendarCategory(event.category);
      const title = calendarTitleWithoutTime(event.title) || event.title || calendarCategoryMeta(category).shortLabel;
      return {
        categoryClass: calendarCategoryMeta(category).className,
        categoryLabel: calendarCategoryMeta(category).label,
        id: event.id,
        note: event.note,
        title: [eventTimeLabel(event), title].filter(Boolean).join("  ")
      };
    });
}

function rawEventRecords(store: PlannerStore): unknown[] {
  try {
    const parsed: unknown = JSON.parse(store[CALENDAR_EVENTS_STORAGE_KEY] ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function updatedGoalPlannerValue(store: PlannerStore, event: Record<string, unknown>): string | null {
  const goalId = text(event.goalId);
  const goalStepId = text(event.goalStepId);
  if (!goalId || !goalStepId) return null;
  let value: unknown;
  try {
    value = JSON.parse(store[CALENDAR_GOAL_PLANNER_KEY] ?? "null");
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  const sourceItems = value as readonly unknown[];
  let changed = false;
  const items = sourceItems.map((candidate) => {
    if (!isRecord(candidate) || candidate.id !== goalId || !Array.isArray(candidate.steps)) return candidate;
    const sourceSteps = candidate.steps as readonly unknown[];
    return {
      ...candidate,
      steps: sourceSteps.map((step) => {
        if (!isRecord(step) || step.id !== goalStepId) return step;
        changed = true;
        const dayPart = calendarEventDayPart(event);
        return { ...step, eventId: text(event.id), scheduledDay: `${text(event.date)}|${dayPart}` };
      })
    };
  });
  return changed ? JSON.stringify(items) : null;
}

function clearedGoalPlannerValue(store: PlannerStore, eventId: string): string | null {
  let value: unknown;
  try {
    value = JSON.parse(store[CALENDAR_GOAL_PLANNER_KEY] ?? "null");
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  const sourceItems = value as readonly unknown[];
  let changed = false;
  const items = sourceItems.map((candidate) => {
    if (!isRecord(candidate) || !Array.isArray(candidate.steps)) return candidate;
    const sourceSteps = candidate.steps as readonly unknown[];
    return {
      ...candidate,
      steps: sourceSteps.map((step) => {
        if (!isRecord(step) || step.eventId !== eventId) return step;
        changed = true;
        return { ...step, eventId: "", scheduledDay: "" };
      })
    };
  });
  return changed ? JSON.stringify(items) : null;
}

export function saveCalendarEvent(
  store: PlannerStore,
  draft: CalendarEventDraft,
  editingEventId: string,
  nowIso: string,
  newId: string
): PlannerStoreWrite[] {
  const category = normalizeCalendarCategory(draft.category);
  const eventFields = {
    category,
    date: draft.date,
    dayPart: draft.dayPart,
    effort: normalizedEffort(draft.effort, category),
    endTime: normalizeCalendarClock(draft.endTime),
    note: draft.note.trim(),
    reminderMinutes: normalizedReminder(draft.reminderMinutes),
    reminderOnly: draft.reminderOnly,
    startTime: normalizeCalendarClock(draft.startTime),
    title: draft.title.trim() || calendarCategoryMeta(category).shortLabel
  };
  let savedEvent: Record<string, unknown>;
  let found = false;
  const events = rawEventRecords(store).map((candidate) => {
    if (!editingEventId || !isRecord(candidate) || candidate.id !== editingEventId) return candidate;
    found = true;
    savedEvent = { ...candidate, ...eventFields, updatedAt: nowIso };
    delete savedEvent.reminderSentAt;
    delete savedEvent.reminderSentFor;
    return savedEvent;
  });
  if (!found) {
    savedEvent = { ...eventFields, createdAt: nowIso, id: newId };
    events.push(savedEvent);
  }
  const writes: PlannerStoreWrite[] = [{ key: CALENDAR_EVENTS_STORAGE_KEY, value: JSON.stringify(events) }];
  const goalValue = updatedGoalPlannerValue(store, savedEvent!);
  if (goalValue !== null) writes.push({ key: CALENDAR_GOAL_PLANNER_KEY, value: goalValue });
  return writes;
}

export function deleteCalendarEvent(store: PlannerStore, eventId: string): PlannerStoreWrite[] {
  const events = rawEventRecords(store).filter((candidate) => !isRecord(candidate) || candidate.id !== eventId);
  const writes: PlannerStoreWrite[] = [{ key: CALENDAR_EVENTS_STORAGE_KEY, value: JSON.stringify(events) }];
  const goalValue = clearedGoalPlannerValue(store, eventId);
  if (goalValue !== null) writes.push({ key: CALENDAR_GOAL_PLANNER_KEY, value: goalValue });
  return writes;
}
