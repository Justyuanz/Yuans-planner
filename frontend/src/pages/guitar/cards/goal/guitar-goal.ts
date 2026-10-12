import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";

export const GUITAR_FOCUS_STORAGE_KEY = "hivePlanner.guitar.focus";
export const GUITAR_NEXT_STEP_STORAGE_KEY = "hivePlanner.guitar.nextStep";

export type GuitarGoalField = "focus" | "nextStep";

export interface GuitarGoalModel {
  focus: string;
  nextStep: string;
}

const STORAGE_KEY_BY_FIELD: Record<GuitarGoalField, string> = {
  focus: GUITAR_FOCUS_STORAGE_KEY,
  nextStep: GUITAR_NEXT_STEP_STORAGE_KEY
};

export function buildGuitarGoalModel(store: PlannerStore): GuitarGoalModel {
  return {
    focus: store[GUITAR_FOCUS_STORAGE_KEY] ?? "",
    nextStep: store[GUITAR_NEXT_STEP_STORAGE_KEY] ?? ""
  };
}

export function buildGuitarGoalWrite(
  field: GuitarGoalField,
  value: string
): PlannerStoreWrite {
  // Legacy saves these fields on every keystroke and preserves whitespace exactly.
  return { key: STORAGE_KEY_BY_FIELD[field], value };
}
