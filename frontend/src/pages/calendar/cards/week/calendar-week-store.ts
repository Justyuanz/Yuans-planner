import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { isoWeekKey } from "@/shared/planner-date";
import { DAY_TYPE_ALIASES, routineWeekKey } from "@/shared/routine-week";

export type CalendarDayTypeId = "high" | "normal" | "recovery";

export interface CalendarDayType {
  capacityLoad: number;
  className: string;
  id: CalendarDayTypeId;
  label: string;
  shortLabel: string;
}

export interface CalendarWeekPlan {
  days: readonly { type: CalendarDayTypeId }[];
  isConfigured: boolean;
  week: string;
}

export interface CalendarWeekValidation {
  errors: readonly string[];
  valid: boolean;
}

export const CALENDAR_DAY_TYPES: readonly CalendarDayType[] = [
  { capacityLoad: 4.5, className: "recovery-day", id: "recovery", label: "Recovery Day", shortLabel: "Recovery" },
  { capacityLoad: 7, className: "normal-day", id: "normal", label: "Normal Day", shortLabel: "Normal" },
  { capacityLoad: 9, className: "high-day", id: "high", label: "High-Intensity Day", shortLabel: "High-Intensity" }
];

export function calendarDayType(value: unknown): CalendarDayType {
  const requested = typeof value === "string" ? value.trim() : "";
  const id = DAY_TYPE_ALIASES[requested] ?? requested;
  return CALENDAR_DAY_TYPES.find((type) => type.id === id) ?? CALENDAR_DAY_TYPES[1]!;
}

export function calendarWeekDates(date: Date): Date[] {
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => (
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
  ));
}

function storedWeek(store: PlannerStore, date: Date): unknown {
  try {
    return JSON.parse(store[routineWeekKey(date)] ?? "null");
  } catch {
    return null;
  }
}

export function decodeCalendarWeek(store: PlannerStore, date: Date): CalendarWeekPlan {
  const value = storedWeek(store, date);
  const source = isRecord(value) ? value : {};
  const storedDays: readonly unknown[] = Array.isArray(source.days)
    ? source.days as readonly unknown[]
    : [];
  return {
    days: Array.from({ length: 7 }, (_, index) => {
      const day = storedDays[index];
      return { type: calendarDayType(isRecord(day) ? day.type : undefined).id };
    }),
    isConfigured: source.isConfigured === undefined ? Array.isArray(source.days) : Boolean(source.isConfigured),
    week: isoWeekKey(date)
  };
}

export function validateCalendarWeek(plan: CalendarWeekPlan): CalendarWeekValidation {
  const recoveryCount = plan.days.filter((day) => day.type === "recovery").length;
  const highCount = plan.days.filter((day) => day.type === "high").length;
  const errors: string[] = [];
  if (recoveryCount < 1) errors.push("At least one Recovery Day is required.");
  if (highCount > 2) errors.push("You can only have up to two High-Intensity Days.");
  return { errors, valid: errors.length === 0 };
}

export function calendarWeekTypeChangeReason(
  plan: CalendarWeekPlan,
  dayIndex: number,
  nextType: CalendarDayTypeId
): string {
  const current = plan.days[dayIndex]?.type ?? "normal";
  if (current === "recovery" && nextType !== "recovery"
    && plan.days.filter((day) => day.type === "recovery").length === 1) {
    return "Keep one Recovery Day protected before changing this one.";
  }
  if (current !== "high" && nextType === "high"
    && plan.days.filter((day) => day.type === "high").length >= 2) {
    return "Two High-Intensity Days is the weekly maximum.";
  }
  return "";
}

export function updateCalendarWeekType(
  plan: CalendarWeekPlan,
  dayIndex: number,
  nextType: CalendarDayTypeId
): CalendarWeekPlan {
  return {
    ...plan,
    days: plan.days.map((day, index) => index === dayIndex ? { type: nextType } : day)
  };
}

export function calendarWeekWrite(plan: CalendarWeekPlan, date: Date): PlannerStoreWrite {
  return {
    key: routineWeekKey(date),
    value: JSON.stringify({ ...plan, isConfigured: true, week: isoWeekKey(date) })
  };
}
