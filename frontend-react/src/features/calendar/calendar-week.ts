import type { PlannerStore } from "../../api/planner-store";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { calendarCategoryMeta, calendarEvents, normalizeCalendarCategory } from "./calendar-event-store";
import {
  calendarDayType,
  calendarWeekDates,
  decodeCalendarWeek,
  validateCalendarWeek,
  type CalendarDayType,
  type CalendarWeekPlan
} from "./calendar-week-store";

export interface CalendarWeekActivity {
  categoryClass: string;
  shortLabel: string;
}

export interface CalendarWeekDay {
  activities: readonly CalendarWeekActivity[];
  capacityHint: string;
  className: string;
  date: string;
  dayLabel: string;
  expanded: boolean;
  humanDate: string;
  selected: boolean;
  status: string;
  type: CalendarDayType;
}

export interface CalendarWeekModel {
  days: readonly CalendarWeekDay[];
  label: string;
  plan: CalendarWeekPlan;
}

interface NormalizedWeekActivity extends CalendarWeekActivity {
  category: string;
  load: number;
  reminderOnly: boolean;
  sortMinutes: number | null;
  title: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;
const CATEGORY_LOAD: Readonly<Record<string, number>> = {
  "Study/school": 1,
  Finnish: 1,
  Transcendence: 1,
  "Mobile Development": 1,
  "Portfolio / Job Prep": 1,
  Skate: 1.2,
  Gym: 1.3,
  Cooking: 0.75,
  "Chores/groceries": 0.75,
  Social: 0.75,
  Guitar: 0.75,
  Personal: 0.75
};

function roundLoad(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeClock(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  const twelveHour = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/.exec(text);
  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(text);
  let hours: number;
  let minutes: number;
  if (twelveHour !== null) {
    hours = Number(twelveHour[1]);
    minutes = Number(twelveHour[2] ?? 0);
    if (hours < 1 || hours > 12 || minutes > 59) return "";
    if (hours === 12) hours = 0;
    if (twelveHour[3]?.toLowerCase() === "pm") hours += 12;
  } else if (twentyFourHour !== null) {
    hours = Number(twentyFourHour[1]);
    minutes = Number(twentyFourHour[2]);
  } else {
    return "";
  }
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function fallbackRange(title: string): { endTime: string; startTime: string } {
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?(?=\s|$)/.exec(title.trim());
  if (match === null) return { endTime: "", startTime: "" };
  const start = normalizeClock(`${match[1]}:${match[2] ?? "00"}`);
  const end = normalizeClock(`${match[3]}:${match[4] ?? "00"}`);
  return { endTime: end, startTime: start };
}

function activityDuration(startTime: string, endTime: string): number {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  return startTime && endTime ? Math.max(0, minutes(endTime) - minutes(startTime)) : 0;
}

function clockMinutes(value: string): number | null {
  return value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
}

function normalizeActivities(store: PlannerStore, date: string): NormalizedWeekActivity[] {
  return calendarEvents(store).filter((event) => event.date === date && !event.routineManaged)
    .map((event): NormalizedWeekActivity | null => {
      const category = normalizeCalendarCategory(event.category);
      const fallback = fallbackRange(event.title);
      const startTime = normalizeClock(event.startTime || fallback.startTime);
      const endTime = normalizeClock(event.endTime || fallback.endTime);
      const duration = activityDuration(startTime, endTime);
      const reminderOnly = event.reminderOnly;
      if (!reminderOnly && duration <= 0) return null;
      const effort = ["easy", "standard", "demanding"].includes(event.effort.toLowerCase())
        ? event.effort.toLowerCase()
        : (["Skate", "Gym"].includes(category) ? "demanding" : "standard");
      const effortMultiplier = effort === "easy" ? 0.75 : effort === "demanding" ? 1.25 : 1;
      return {
        category,
        categoryClass: calendarCategoryMeta(category).className,
        load: reminderOnly ? 0 : (duration / 60) * (CATEGORY_LOAD[category] ?? 0.75) * effortMultiplier,
        reminderOnly,
        shortLabel: calendarCategoryMeta(category).shortLabel,
        sortMinutes: clockMinutes(startTime),
        title: event.title
      };
    })
    .filter((activity): activity is NormalizedWeekActivity => activity !== null)
    .sort((left, right) => {
      if (left.sortMinutes !== null && right.sortMinutes !== null) return left.sortMinutes - right.sortMinutes;
      if (left.sortMinutes !== null) return -1;
      if (right.sortMinutes !== null) return 1;
      return left.title.localeCompare(right.title);
    });
}

function formatLoad(value: number): string {
  const amount = Math.abs(value);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
}

function daySummary(type: CalendarDayType, activities: readonly NormalizedWeekActivity[]) {
  const activityLoad = roundLoad(activities.reduce((sum, activity) => sum + activity.load, 0));
  const realActivities = activities.filter((activity) => !activity.reminderOnly).length;
  const contextSwitchLoad = roundLoad(Math.max(0, realActivities - 3) * 0.25);
  const usedLoad = roundLoad(activityLoad + contextSwitchLoad);
  const remainingLoad = roundLoad(type.capacityLoad - usedLoad);
  const status = remainingLoad < 0 ? "Over planned" : remainingLoad === 0 ? "Day full" : "Space left";
  const switchNote = contextSwitchLoad ? ` + ${formatLoad(contextSwitchLoad)} switching` : "";
  const ending = remainingLoad < 0
    ? `over by ${formatLoad(remainingLoad)}.`
    : `${formatLoad(remainingLoad)} left.`;
  return {
    capacityHint: `${formatLoad(usedLoad)} / ${formatLoad(type.capacityLoad)} load hours planned${switchNote} · ${ending}`,
    status
  };
}

function humanDate(date: Date): string {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return `${weekday} ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function buildCalendarWeek(
  store: PlannerStore,
  selectedDate: string,
  expandedDate: string
): CalendarWeekModel {
  const [year = 0, month = 1, day = 1] = selectedDate.split("-").map(Number);
  const referenceDate = new Date(year, month - 1, day);
  const plan = decodeCalendarWeek(store, referenceDate);
  const validation = validateCalendarWeek(plan);
  const dates = calendarWeekDates(referenceDate);
  return {
    days: dates.map((date, index): CalendarWeekDay => {
      const dateKey = formatPlannerDate(date);
      const type = calendarDayType(plan.days[index]?.type);
      const activities = normalizeActivities(store, dateKey);
      const summary = daySummary(type, activities);
      return {
        activities,
        capacityHint: summary.capacityHint,
        className: ["week-day-panel", type.className, dateKey === selectedDate ? "selected-day" : ""]
          .filter(Boolean).join(" "),
        date: dateKey,
        dayLabel: DAY_LABELS[index]!,
        expanded: dateKey === expandedDate,
        humanDate: humanDate(date),
        selected: dateKey === selectedDate,
        status: summary.status,
        type
      };
    }),
    label: validation.errors[0] ?? "Every week needs at least one Recovery Day and no more than two High-Intensity Days.",
    plan
  };
}

export function recoveryTypeChangeReason(store: PlannerStore, date: string): string {
  const hasLongPhysicalActivity = calendarEvents(store).filter((event) => event.date === date && !event.routineManaged)
    .some((event) => {
      const category = normalizeCalendarCategory(event.category);
      if (!(["Skate", "Gym"].includes(category)) || event.reminderOnly) return false;
      const fallback = fallbackRange(event.title);
      return activityDuration(
        normalizeClock(event.startTime || fallback.startTime),
        normalizeClock(event.endTime || fallback.endTime)
      ) > 30;
    });
  return hasLongPhysicalActivity
    ? "Shorten skate or gym to 30 minutes before making this a Recovery Day."
    : "";
}
