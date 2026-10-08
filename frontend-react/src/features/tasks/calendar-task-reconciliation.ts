import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import type { ActivityId } from "../activity-categories/activity-categories";
import {
  CALENDAR_EVENTS_STORAGE_KEY,
  normalizeCalendarCategory
} from "../calendar/calendar-event-store";
import {
  decodeTasks,
  normalizeReminderMinutes,
  normalizeScheduledTime,
  type PlannerTask
} from "./tasks";

export const CALENDAR_EVENTS_KEY = CALENDAR_EVENTS_STORAGE_KEY;

interface CalendarTaskIdentity {
  createdAt: string;
  id: string;
}

interface CalendarTaskReconciliation {
  changed: boolean;
  importedCount: number;
  tasks: PlannerTask[];
  write: PlannerStoreWrite | null;
}

interface CalendarEvent {
  activity: ActivityId;
  id: string;
  reminderMinutes: number;
  scheduledTime: string;
  title: string;
}

type IdentityFactory = (eventId: string) => CalendarTaskIdentity;

const CATEGORY_ACTIVITY: Readonly<Record<string, ActivityId>> = {
  "Study/school": "transcendence",
  Transcendence: "transcendence",
  "Mobile Development": "mobileDevelopment",
  "Portfolio / Job Prep": "portfolioJobPrep",
  Skate: "skate",
  Gym: "gym",
  Guitar: "guitar"
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  "Study/school": "Study",
  "Mobile Development": "Mobile Dev",
  "Portfolio / Job Prep": "Portfolio"
};

function parseArray(rawValue: string | undefined): unknown[] | null {
  try {
    const parsed: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function leadingRangeStart(title: string): string {
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?(?=\s|$)/.exec(title);
  if (match === null) {
    return "";
  }
  const startHours = Number(match[1]);
  const startMinutes = Number(match[2] ?? 0);
  const endHours = Number(match[3]);
  const endMinutes = Number(match[4] ?? 0);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;
  if (startHours > 23 || startMinutes > 59 || endHours > 24 || endMinutes > 59
    || (endHours === 24 && endMinutes !== 0) || end <= start) {
    return "";
  }
  return `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;
}

function titleWithoutLeadingTime(title: string): string {
  return title.replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?)?\s*/, "").trim();
}

function eventTitle(rawTitle: string, category: string): string {
  const withoutTime = titleWithoutLeadingTime(rawTitle);
  if (withoutTime) return withoutTime;
  if (rawTitle) return rawTitle;
  return CATEGORY_LABELS[category] ?? category;
}

function normalizedEvent(candidate: unknown, dateKey: string): CalendarEvent | null {
  if (!isRecord(candidate) || candidate.date !== dateKey || candidate.routineManaged
    || typeof candidate.id !== "string" || !candidate.id) {
    return null;
  }
  const category = normalizeCalendarCategory(candidate.category);
  const rawTitle = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const structuredTime = normalizeScheduledTime(candidate.startTime);
  return {
    activity: CATEGORY_ACTIVITY[category] ?? "other",
    id: candidate.id,
    reminderMinutes: normalizeReminderMinutes(candidate.reminderMinutes),
    scheduledTime: structuredTime || leadingRangeStart(rawTitle),
    title: eventTitle(rawTitle, category)
  };
}

function eventMinutes(event: CalendarEvent): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(event.scheduledTime);
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

function eventsForDate(rawValue: string | undefined, dateKey: string): CalendarEvent[] {
  const parsed = parseArray(rawValue) ?? [];
  const seenIds = new Set<string>();
  return parsed.map((candidate) => normalizedEvent(candidate, dateKey))
    .filter((event): event is CalendarEvent => event !== null)
    .filter((event) => {
      if (seenIds.has(event.id)) {
        return false;
      }
      seenIds.add(event.id);
      return true;
    })
    .sort((left, right) => {
      const leftMinutes = eventMinutes(left);
      const rightMinutes = eventMinutes(right);
      if (leftMinutes !== null && rightMinutes !== null) return leftMinutes - rightMinutes;
      if (leftMinutes !== null) return -1;
      if (rightMinutes !== null) return 1;
      return left.id.localeCompare(right.id);
    });
}

function isRetiredRoutineTask(candidate: unknown): boolean {
  return isRecord(candidate) && (candidate.createdAt === "routine"
    || (typeof candidate.id === "string" && candidate.id.startsWith("routine-")));
}

function createTask(event: CalendarEvent, identity: CalendarTaskIdentity): PlannerTask {
  return {
    activity: event.activity,
    createdAt: identity.createdAt,
    done: false,
    hours: 0,
    id: identity.id,
    label: event.title,
    reminderMinutes: event.reminderMinutes,
    reminderSentAt: "",
    reminderSentFor: "",
    scheduledTime: event.scheduledTime,
    sourceEventId: event.id,
    timerSeconds: 0,
    timerStartedAt: null,
    useSourceEventReminder: true
  };
}

export function buildCalendarTaskReconciliation(
  store: PlannerStore,
  dateKey: string,
  createIdentity: IdentityFactory
): CalendarTaskReconciliation {
  const taskKey = `hivePlanner.dailyTasks.${dateKey}`;
  const storedCandidates = parseArray(store[taskKey]);
  const withoutRoutineTasks = (storedCandidates ?? []).filter((candidate) => !isRetiredRoutineTask(candidate));
  const routineTaskRemoved = withoutRoutineTasks.length !== (storedCandidates ?? []).length;
  const existingTasks = decodeTasks(JSON.stringify(withoutRoutineTasks), `${dateKey}T00:00:00.000Z`);
  const events = eventsForDate(store[CALENDAR_EVENTS_KEY], dateKey);
  const eventIds = new Set(events.map(({ id }) => id));
  const keptTasks = existingTasks.filter(({ sourceEventId }) => !sourceEventId || eventIds.has(sourceEventId));
  const linkedEventIds = new Set(keptTasks.map(({ sourceEventId }) => sourceEventId).filter(Boolean));
  const importedTasks = events.filter(({ id }) => !linkedEventIds.has(id))
    .map((event) => createTask(event, createIdentity(event.id)));
  const tasks = decodeTasks(
    JSON.stringify([...keptTasks, ...importedTasks]),
    `${dateKey}T00:00:00.000Z`
  );
  const changed = storedCandidates === null || routineTaskRemoved
    || keptTasks.length !== existingTasks.length || importedTasks.length > 0;
  return {
    changed,
    importedCount: importedTasks.length,
    tasks,
    write: changed ? { key: taskKey, value: JSON.stringify(tasks) } : null
  };
}
