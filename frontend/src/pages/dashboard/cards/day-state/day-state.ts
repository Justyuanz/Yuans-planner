import type { PlannerStore } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";

export const DAY_STATE_STORAGE_KEY = "hivePlanner.dayState";

export const DAY_STATE_OPTIONS = [
  { id: "good", label: "Good" },
  { id: "okay", label: "Steady" },
  { id: "tired", label: "Tired" },
  { id: "overwhelmed", label: "Heavy" },
  { id: "low-focus", label: "Scattered" }
] as const;

export type DayStateId = typeof DAY_STATE_OPTIONS[number]["id"];

const DAY_STATE_IDS = new Set<string>(DAY_STATE_OPTIONS.map(({ id }) => id));

function normalizeDayState(value: unknown): DayStateId {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return DAY_STATE_IDS.has(normalized) ? normalized as DayStateId : "okay";
}

export function decodeDayState(store: PlannerStore, dateKey: string): DayStateId {
  try {
    const stateMap: unknown = JSON.parse(store[DAY_STATE_STORAGE_KEY] ?? "{}");
    return normalizeDayState(isRecord(stateMap) ? stateMap[dateKey] : undefined);
  } catch {
    return "okay";
  }
}
