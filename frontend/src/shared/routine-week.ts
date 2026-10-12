// The weekly routine document, `hivePlanner.routine.week.<ISO week>`, is written
// by the Calendar's weekly planner and read by the Dashboard's Today intention
// card. Both used to carry their own copy of the key and of the day-type
// aliases, which meant two features could drift apart on the same stored
// document. They share these instead.

import type { PlannerStore } from "../api/planner-store";
import { isRecord } from "./is-record";
import { isoWeekKey } from "./planner-date";

/** Where a week's routine plan is stored. */
export function routineWeekKey(date: Date): string {
  return `hivePlanner.routine.week.${isoWeekKey(date)}`;
}

/**
 * Day types renamed over the app's life. Stored weeks still hold the old names,
 * so both readers map them forward rather than rewriting saved data.
 */
export const DAY_TYPE_ALIASES: Readonly<Record<string, string>> = {
  personal: "recovery",
  rest: "recovery",
  skate: "high",
  study: "normal"
};

export interface DayType {
  className: string;
  label: string;
}

const NORMAL_DAY: DayType = { className: "normal-day", label: "Normal Day" };
const DAY_TYPES: Readonly<Record<string, DayType>> = {
  high: { className: "high-day", label: "High-Intensity Day" },
  normal: NORMAL_DAY,
  recovery: { className: "recovery-day", label: "Recovery Day" }
};

function dayTypeDefinition(value: unknown): DayType {
  const rawType = typeof value === "string" ? value.trim() : "";
  const type = DAY_TYPE_ALIASES[rawType] ?? rawType;
  return DAY_TYPES[type] ?? NORMAL_DAY;
}

function storedDays(store: PlannerStore, date: Date): readonly unknown[] {
  try {
    const parsed: unknown = JSON.parse(store[routineWeekKey(date)] ?? "null");
    return isRecord(parsed) && Array.isArray(parsed.days) ? parsed.days : [];
  } catch {
    return [];
  }
}

/** The stored week runs Monday first, unlike `Date.getDay()`. */
function mondayFirstDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * The planned type of a single day. Anything missing, malformed or unknown
 * reads as a normal day, which is what both readers showed before they shared
 * this.
 */
export function dayTypeForDate(store: PlannerStore, date: Date): DayType {
  const day = storedDays(store, date)[mondayFirstDayIndex(date)];
  return dayTypeDefinition(isRecord(day) ? day.type : undefined);
}
