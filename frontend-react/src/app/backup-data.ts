import type { PlannerStore } from "../api/planner-store";

const TRANSIENT_KEYS = new Set(["hivePlanner.guitar.currentSession"]);

export function selectBackupData(store: PlannerStore): PlannerStore {
  return Object.fromEntries(Object.entries(store).filter(([key]) => (
    key.startsWith("hivePlanner.") && !TRANSIENT_KEYS.has(key)
  )));
}

export function decodeImportedPlannerData(payload: unknown): PlannerStore {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {};
  }
  const source = "data" in payload ? payload.data : payload;
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return {};
  }
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => (
    key.startsWith("hivePlanner.")
    && !TRANSIENT_KEYS.has(key)
    && typeof value === "string"
  )));
}
