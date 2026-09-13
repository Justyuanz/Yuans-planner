import { useEffect, useState } from "react";

import { fetchPlannerStore, type PlannerStore } from "../api/planner-store";

export type PlannerStoreState =
  | { status: "loading" }
  | { message: string; status: "error" }
  | { status: "ready"; store: PlannerStore };

export function usePlannerStore(): PlannerStoreState {
  const [state, setState] = useState<PlannerStoreState>({ status: "loading" });

  useEffect(() => {
    // Let the local request finish; aborting it makes the simple Python server log a broken pipe.
    let acceptsUpdates = true;

    async function loadPlannerStore(): Promise<void> {
      try {
        const store = await fetchPlannerStore();
        if (acceptsUpdates) {
          setState({ status: "ready", store });
        }
      } catch (error: unknown) {
        if (!acceptsUpdates) {
          return;
        }
        const message = error instanceof Error ? error.message : "Planner data could not be loaded";
        setState({ message, status: "error" });
      }
    }

    void loadPlannerStore();
    return () => {
      acceptsUpdates = false;
    };
  }, []);

  return state;
}
