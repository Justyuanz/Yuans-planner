import type { PlannerStore } from "@/api/planner-store";
import { dayTypeForDate } from "@/shared/routine-week";
import {
  calendarCategoryMeta,
  calendarEvents,
  type CalendarEvent
} from "@/shared/calendar-event-store";
import { humanDate, toDateKey } from "@/shared/planner-date";
import { leadingTimeMinutes } from "@/shared/planner-time";

export interface CalendarMonthPill {
  categoryClass: string;
  date: string;
  eventId: string;
  label: string;
  startLabel: string;
  title: string;
}

export interface CalendarMonthCell {
  ariaLabel: string;
  className: string;
  date: string;
  dayNumber: number;
  moreCount: number;
  pills: readonly CalendarMonthPill[];
  today: boolean;
}

export interface CalendarMonthModel {
  cells: readonly CalendarMonthCell[];
  label: string;
  weekdays: readonly string[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

function parseTimeMinutes(value: unknown): number | null {
  return leadingTimeMinutes(typeof value === "string" ? value : "");
}

function parseTimeRange(event: CalendarEvent): { end: number; start: number } | null {
  const value = event.startTime && event.endTime
    ? `${event.startTime}-${event.endTime}`
    : event.title.trim();
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?(?=\s|$)/.exec(value);
  if (match === null) return null;
  const startHours = Number(match[1]);
  const startMinutes = Number(match[2] ?? 0);
  const endHours = Number(match[3]);
  const endMinutes = Number(match[4] ?? 0);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;
  if (startHours > 23 || startMinutes > 59 || endHours > 24 || endMinutes > 59
    || (endHours === 24 && endMinutes !== 0) || end <= start) return null;
  return { end, start };
}

function eventStartMinutes(event: CalendarEvent): number | null {
  return parseTimeMinutes(event.startTime || event.title);
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  const leftTime = eventStartMinutes(left);
  const rightTime = eventStartMinutes(right);
  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
  if (leftTime !== null && rightTime === null) return -1;
  if (leftTime === null && rightTime !== null) return 1;
  return (left.createdAt || left.updatedAt).localeCompare(right.createdAt || right.updatedAt)
    || left.id.localeCompare(right.id);
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeLabel(event: CalendarEvent): string {
  const range = parseTimeRange(event);
  if (range !== null && !event.reminderOnly) {
    const minutes = range.end - range.start;
    const duration = [
      Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h` : "",
      minutes % 60 ? `${minutes % 60}m` : ""
    ].filter(Boolean).join(" ");
    return `${clock(range.start)}–${clock(range.end)} · ${duration}`;
  }
  const start = eventStartMinutes(event);
  return [start === null ? "" : clock(start), event.reminderOnly ? "Reminder" : ""]
    .filter(Boolean).join(" · ");
}

function chipLabel(title: string): string {
  const cleaned = title.replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[–-]\s*\d{1,2}(?::?(\d{2}))?)?\s*/, "").trim();
  const label = cleaned || title.trim();
  return label.length <= 20 ? label : `${label.slice(0, 17).trimEnd()}...`;
}


function pillForEvent(event: CalendarEvent): CalendarMonthPill {
  const startMinutes = eventStartMinutes(event);
  return {
    categoryClass: calendarCategoryMeta(event.category).className,
    date: event.date,
    eventId: event.id,
    label: chipLabel(event.title),
    startLabel: startMinutes === null ? "" : clock(startMinutes),
    title: [event.title, timeLabel(event), event.category, event.note].filter(Boolean).join(" · ")
  };
}

export function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function dateFromKey(dateKey: string): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function buildCalendarMonth(
  store: PlannerStore,
  cursor: Date,
  selectedDate: string,
  today: Date
): CalendarMonthModel {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const todayKey = toDateKey(today);
  const events = calendarEvents(store).filter((event) => !event.routineManaged);
  const cells = Array.from({ length: 42 }, (_, index): CalendarMonthCell => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const dateKey = toDateKey(date);
    const dayEvents = events.filter((event) => event.date === dateKey).sort(compareEvents);
    const classes = ["day-cell"];
    if (date.getMonth() !== month) classes.push("outside");
    if (dateKey === todayKey) classes.push("today");
    if (dateKey === selectedDate) classes.push("selected");
    classes.push(dayTypeForDate(store, date).className);
    return {
      ariaLabel: `Select ${humanDate(date)}`,
      className: classes.join(" "),
      date: dateKey,
      dayNumber: date.getDate(),
      moreCount: Math.max(0, dayEvents.length - 4),
      pills: dayEvents.slice(0, 4).map(pillForEvent),
      today: dateKey === todayKey
    };
  });
  return {
    cells,
    label: `${MONTHS[month]} ${year}`,
    weekdays: WEEKDAYS
  };
}
