import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";

export const CALENDAR_EVENTS_STORAGE_KEY = "hivePlanner.events";

export interface CalendarEvent {
  category: string;
  createdAt: string;
  date: string;
  effort: string;
  endTime: string;
  id: string;
  note: string;
  reminderMinutes: number;
  reminderOnly: boolean;
  routineManaged: boolean;
  startTime: string;
  title: string;
  updatedAt: string;
}

export interface CalendarCategoryMeta {
  className: string;
  label: string;
  shortLabel: string;
}

const CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  Chore: "Chores/groceries",
  Coding: "Transcendence",
  "Home study": "Study/school",
  LeetCode: "Portfolio / Job Prep",
  Leetcode: "Portfolio / Job Prep",
  Python: "Mobile Development",
  "School study": "Study/school",
  "Study deadline": "Study/school"
};

const CATEGORY_META: Readonly<Record<string, CalendarCategoryMeta>> = {
  "Study/school": { className: "study-block", label: "Study/school", shortLabel: "Study" },
  Finnish: { className: "finnish-block", label: "Finnish", shortLabel: "Finnish" },
  Transcendence: { className: "transcendence-block", label: "Transcendence", shortLabel: "Transcendence" },
  "Mobile Development": { className: "mobile-development-block", label: "Mobile Development", shortLabel: "Mobile Dev" },
  "Portfolio / Job Prep": { className: "portfolio-job-prep-block", label: "Portfolio / Job Prep", shortLabel: "Portfolio" },
  Skate: { className: "skate-block", label: "Skate", shortLabel: "Skate" },
  Gym: { className: "gym-block", label: "Gym", shortLabel: "Gym" },
  Cooking: { className: "cooking-block", label: "Cooking", shortLabel: "Cooking" },
  "Chores/groceries": { className: "chores-block", label: "Chores/groceries", shortLabel: "Chores" },
  Social: { className: "social-block", label: "Social", shortLabel: "Social" },
  Guitar: { className: "guitar-block", label: "Guitar", shortLabel: "Guitar" },
  Personal: { className: "personal-block", label: "Personal", shortLabel: "Personal" }
};

export const CALENDAR_CATEGORY_ORDER = Object.keys(CATEGORY_META);

function parseStoredArray(rawValue: string | undefined): unknown[] {
  try {
    const parsed: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function reminderMinutes(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
}

export function normalizeCalendarCategory(value: unknown): string {
  const requested = typeof value === "string" ? value.trim() : "";
  const category = CATEGORY_ALIASES[requested] ?? requested;
  return category in CATEGORY_META ? category : "Personal";
}

export function calendarCategoryMeta(value: unknown): CalendarCategoryMeta {
  return CATEGORY_META[normalizeCalendarCategory(value)] ?? CATEGORY_META.Personal!;
}

function normalizeCalendarEvent(candidate: unknown): CalendarEvent | null {
  if (!isRecord(candidate)) return null;
  return {
    // Keep the stored label for tooltips; display styling normalizes legacy aliases separately.
    category: text(candidate.category) || "Personal",
    createdAt: text(candidate.createdAt),
    date: text(candidate.date),
    effort: text(candidate.effort),
    endTime: text(candidate.endTime),
    id: text(candidate.id),
    note: text(candidate.note),
    reminderMinutes: reminderMinutes(candidate.reminderMinutes),
    reminderOnly: Boolean(candidate.reminderOnly),
    routineManaged: Boolean(candidate.routineManaged),
    startTime: text(candidate.startTime),
    title: text(candidate.title),
    updatedAt: text(candidate.updatedAt)
  };
}

export function calendarEvents(store: PlannerStore): CalendarEvent[] {
  return parseStoredArray(store[CALENDAR_EVENTS_STORAGE_KEY])
    .map(normalizeCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null);
}
