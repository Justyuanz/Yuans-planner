import { createContext, useContext } from "react";

import type { PlannerStore } from "../api/planner-store";

export type PlannerStoreState =
  | { status: "loading" }
  | { message: string; status: "error" }
  | { status: "ready"; store: PlannerStore };

export const PlannerStoreContext = createContext<PlannerStoreState | null>(null);

export function usePlannerStore(): PlannerStoreState {
  const state = useContext(PlannerStoreContext);
  if (state === null) {
    throw new Error("usePlannerStore must be used inside PlannerStoreProvider");
  }
  return state;
}
