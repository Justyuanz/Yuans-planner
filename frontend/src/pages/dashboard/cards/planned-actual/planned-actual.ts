import type { PlannerStore } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { formatHours } from "@/shared/format-hours";
import { activityTotalsForPeriod } from "@/shared/activity-totals";
import { migratePlannedActivityValues } from "@/shared/activity-categories";
import {
  PLANNED_GROUPS,
  type PlannedActivityId,
  type PlannedGroupId
} from "./planned-actual-definitions";
import { isoWeekKey } from "@/shared/planner-date";

export { ACTIVITY_LOG_KEY, appendPlannedActivityLog } from "./planned-actual-log";
export type { PlannedActivityId, PlannedGroupId } from "./planned-actual-definitions";

const PLANNED_STORAGE_PREFIX = "hivePlanner.planned.";

export type PlannedValues = Record<string, unknown>;

export interface PlannedActualRow {
  className: string;
  formattedActual: string;
  id: PlannedActivityId;
  inputValue: string;
  shortLabel: string;
}

export interface PlannedActualGroup {
  formattedActual: string;
  formattedPlanned: string;
  id: PlannedGroupId;
  label: string;
  progressDone: number;
  progressTarget: number;
  progressWidth: number;
  rows: readonly PlannedActualRow[];
}

export interface PlannedActualModel {
  groups: readonly PlannedActualGroup[];
  plannedValues: PlannedValues;
  storageKey: string;
  weekKey: string;
}

export function plannedStorageKey(date: Date): string {
  return `${PLANNED_STORAGE_PREFIX}${isoWeekKey(date)}`;
}

function parsePlannedValues(rawValue: string | undefined): PlannedValues {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : {};
    return isRecord(parsed) ? migratePlannedActivityValues(parsed) : {};
  } catch {
    return {};
  }
}

export function decodePlannedValues(store: PlannerStore, date: Date): PlannedValues {
  return parsePlannedValues(store[plannedStorageKey(date)]);
}

function numericValue(value: unknown): number {
  const number = Number(value);
  return number || 0;
}

function inputValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" && value ? String(value) : "";
}

export function applyPlannedInput(
  values: PlannedValues,
  activityId: PlannedActivityId,
  input: string
): { after: number; before: number; values: PlannedValues } {
  const before = numericValue(values[activityId]);
  const after = Math.max(0, numericValue(input));
  return { before, after, values: { ...values, [activityId]: after } };
}

export function buildPlannedActual(
  store: PlannerStore,
  today: Date,
  nowMs: number = Date.now()
): PlannedActualModel {
  const weekKey = isoWeekKey(today);
  const storageKey = plannedStorageKey(today);
  const plannedValues = parsePlannedValues(store[storageKey]);
  const actual = activityTotalsForPeriod(store, "week", today, nowMs);
  const groups = PLANNED_GROUPS.map((group) => {
    const plannedHours = group.activities.reduce(
      (sum, activity) => sum + numericValue(plannedValues[activity.id]),
      0
    );
    const actualHours = group.activities.reduce((sum, activity) => sum + actual[activity.id], 0);
    const progressDone = Math.round(Math.max(0, actualHours) * 10) / 10;
    const progressTarget = Math.max(0, numericValue(plannedHours));
    const progressWidth = progressTarget
      ? Math.min(100, Math.round((progressDone / progressTarget) * 100))
      : 0;

    return {
      id: group.id,
      label: group.label,
      formattedPlanned: formatHours(plannedHours),
      formattedActual: formatHours(actualHours),
      progressDone,
      progressTarget,
      progressWidth,
      rows: group.activities.map((activity) => ({
        ...activity,
        inputValue: inputValue(plannedValues[activity.id]),
        formattedActual: formatHours(actual[activity.id])
      }))
    };
  });

  return { groups, plannedValues, storageKey, weekKey };
}
