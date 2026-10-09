import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { isSkateIntensity, type SkateIntensity } from "./skate-intensity";
import { SKATE_PROGRAM } from "./skate-program-data";

export const SKATE_SETTINGS_STORAGE_KEY = "hivePlanner.skate.settings";

const SKATE_TOTAL_WEEKS = 21;
const SKATE_SEASON_START = new Date(2026, 7, 29);
const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

const INTENSITY_META = {
  blue: { attempts: "0-5 focused attempts", label: "Blue" },
  green: { attempts: "20-30 focused attempts", label: "Green" },
  yellow: { attempts: "10-20 focused attempts", label: "Yellow" }
} satisfies Record<SkateIntensity, { attempts: string; label: string }>;

interface SkateSettings {
  currentProgramDay: number;
  extraRestDayOfWeek: number | null;
  restDayOfWeek: number;
}

export interface SkateTrainingPlanBlock {
  label: string;
  value: string;
}

export interface SkateTrainingPlanRow {
  benchmark: string;
  current: boolean;
  detail: string;
  intensity: SkateIntensity;
  intensityLabel: string;
  label: string;
  preview: boolean;
  subtitle: string;
  title: string;
}

export interface SkateTrainingPlanState {
  emptyMessage: string;
  today: {
    blocks: SkateTrainingPlanBlock[];
    description: string;
    kicker: string;
    note: string;
    title: string;
  };
  week: {
    description: string;
    kicker: string;
    rows: SkateTrainingPlanRow[];
    title: string;
  };
}

type SkateProgramDay = typeof SKATE_PROGRAM.days[number];

function storedRecord(rawValue: string | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function programDay(value: unknown): number {
  const rounded = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(SKATE_PROGRAM.days.length, rounded));
}

function restDay(value: unknown): number {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded >= 0 && rounded <= 6 ? rounded : 0;
}

function extraRestDay(value: unknown, primaryDay: number): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded >= 0 && rounded <= 6 && rounded !== primaryDay
    ? rounded : null;
}

function decodeSkateSettings(store: PlannerStore): SkateSettings {
  const value = storedRecord(store[SKATE_SETTINGS_STORAGE_KEY]);
  const primaryDay = restDay(value.restDayOfWeek);
  return {
    currentProgramDay: programDay(value.currentProgramDay),
    extraRestDayOfWeek: extraRestDay(value.extraRestDayOfWeek, primaryDay),
    restDayOfWeek: primaryDay
  };
}

function localDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeSeason(date: Date): boolean {
  return Math.round((localDay(date).getTime() - SKATE_SEASON_START.getTime()) / DAY_MS) + 1 <= 0;
}

function dayPlan(dayNumber: number): SkateProgramDay {
  return SKATE_PROGRAM.days.find((day) => day.dayNumber === dayNumber)
    ?? SKATE_PROGRAM.days[0];
}

function restDaysLabel(settings: SkateSettings): string {
  const names = [WEEKDAY_NAMES[settings.restDayOfWeek]];
  if (settings.extraRestDayOfWeek !== null) {
    names.push(WEEKDAY_NAMES[settings.extraRestDayOfWeek]);
  }
  return names.join(" and ");
}

function planRow(day: SkateProgramDay, currentDay: number): SkateTrainingPlanRow {
  const intensity = isSkateIntensity(day.intensity) ? day.intensity : "yellow";
  return {
    benchmark: day.benchmark ? day.benchmarkLabel || "Benchmark" : "",
    current: day.dayNumber === currentDay,
    detail: day.flow,
    intensity,
    intensityLabel: INTENSITY_META[intensity].label,
    label: `Day ${day.dayNumber}`,
    preview: false,
    subtitle: day.skateiq,
    title: day.mainFocus
  };
}

export function buildSkateTrainingPlanState(
  store: PlannerStore,
  referenceDate: Date
): SkateTrainingPlanState {
  const settings = decodeSkateSettings(store);
  const preview = isBeforeSeason(referenceDate);
  const selectedDay = preview ? 1 : settings.currentProgramDay;
  const selectedPlan = dayPlan(selectedDay);
  const intensity = isSkateIntensity(selectedPlan.intensity) ? selectedPlan.intensity : "yellow";
  const note = [selectedPlan.benchmarkLabel, selectedPlan.note].filter(Boolean).join(" · ");
  const rows = preview ? [] : SKATE_PROGRAM.days
    .filter((day) => day.weekNumber === selectedPlan.weekNumber)
    .map((day) => planRow(day, selectedDay));

  return {
    emptyMessage: "",
    today: {
      blocks: [
        { label: "30-min SkateIQ", value: selectedPlan.skateiq },
        { label: "Flow / fun", value: selectedPlan.flow },
        {
          label: "Default intensity",
          value: `${INTENSITY_META[intensity].label} · ${INTENSITY_META[intensity].attempts}`
        }
      ],
      description: `${selectedPlan.phase} · Week ${selectedPlan.weekNumber}`,
      kicker: `Day ${selectedPlan.dayNumber}`,
      note,
      title: selectedPlan.mainFocus
    },
    week: {
      description: preview
        ? "Previewing the program before Saturday, August 29, 2026."
        : `Current training week from your checked-in plan. Rest days: ${restDaysLabel(settings)}.`,
      kicker: `Week ${selectedPlan.weekNumber} / ${SKATE_TOTAL_WEEKS}`,
      rows,
      title: selectedPlan.summary
    }
  };
}
