import { useEffect, useState, type ReactNode } from "react";

import {
  applyPlannerStorageChange,
  fetchPlannerStore,
  mergePlannerHydrationSources,
  readPlannerBrowserStore,
  type PlannerStore
} from "../api/planner-store";
import { queuePlannerServerWrites } from "./planner-persistence";
import { PlannerStoreContext, type PlannerStoreState } from "./use-planner-store";

export function PlannerStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlannerStoreState>({ status: "loading" });

  useEffect(() => {
    let acceptsUpdates = true;

    async function loadPlannerStore(): Promise<void> {
      try {
        const serverStore = await fetchPlannerStore();
        let browserStore: PlannerStore = {};
        try {
          browserStore = readPlannerBrowserStore(window.localStorage);
        } catch {
          // Server storage remains authoritative when browser storage is blocked.
        }
        const hydration = mergePlannerHydrationSources(serverStore, browserStore);
        void queuePlannerServerWrites(hydration.serverBackfills);
        if (acceptsUpdates) {
          setState({ status: "ready", store: hydration.store });
        }
      } catch (error: unknown) {
        if (!acceptsUpdates) return;
        const message = error instanceof Error ? error.message : "Planner data could not be loaded";
        setState({ message, status: "error" });
      }
    }

    void loadPlannerStore();
    return () => {
      acceptsUpdates = false;
    };
  }, []);

  useEffect(() => {
    function updateFromBrowserStorage(event: StorageEvent): void {
      setState((current) => current.status === "ready"
        ? {
            status: "ready",
            store: applyPlannerStorageChange(current.store, event.key, event.newValue)
          }
        : current);
    }

    window.addEventListener("storage", updateFromBrowserStorage);
    return () => window.removeEventListener("storage", updateFromBrowserStorage);
  }, []);

  return <PlannerStoreContext.Provider value={state}>{children}</PlannerStoreContext.Provider>;
}
