import type { PlannerStore } from "../../../../api/planner-store";
import { isRecord } from "../../../../shared/is-record";
import { isoWeekKey } from "../planned-actual/planned-actual";

export interface TodayIntentionModel {
  className: string;
  dayTypeLabel: string;
  label: string;
}

interface DayTypeDefinition {
  className: string;
  label: string;
}

const LABEL = "Today's intention";
const NORMAL_DAY: DayTypeDefinition = { className: "normal-day", label: "Normal Day" };
const DAY_TYPES: Readonly<Record<string, DayTypeDefinition>> = {
  high: { className: "high-day", label: "High-Intensity Day" },
  normal: NORMAL_DAY,
  recovery: { className: "recovery-day", label: "Recovery Day" }
};
const DAY_TYPE_ALIASES: Readonly<Record<string, string>> = {
  personal: "recovery",
  rest: "recovery",
  skate: "high",
  study: "normal"
};

export function todayIntentionStorageKey(date: Date): string {
  return `hivePlanner.routine.week.${isoWeekKey(date)}`;
}

function dayTypeDefinition(value: unknown): DayTypeDefinition {
  const rawType = typeof value === "string" ? value.trim() : "";
  const type = DAY_TYPE_ALIASES[rawType] ?? rawType;
  return DAY_TYPES[type] ?? NORMAL_DAY;
}

function storedDays(store: PlannerStore, date: Date): readonly unknown[] {
  try {
    const parsed: unknown = JSON.parse(store[todayIntentionStorageKey(date)] ?? "null");
    return isRecord(parsed) && Array.isArray(parsed.days) ? parsed.days : [];
  } catch {
    return [];
  }
}

function mondayFirstDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function buildTodayIntentionModel(
  store: PlannerStore,
  date: Date
): TodayIntentionModel {
  const day = storedDays(store, date)[mondayFirstDayIndex(date)];
  const type = dayTypeDefinition(isRecord(day) ? day.type : undefined);
  return {
    className: type.className,
    dayTypeLabel: type.label,
    label: LABEL
  };
}
