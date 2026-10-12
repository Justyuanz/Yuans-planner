import { useEffect, useState } from "react";

import {
  applyPlannerStorageChange,
  fetchPlannerStore,
  mergePlannerHydrationSources,
  readPlannerBrowserStore,
  type PlannerStore
} from "../api/planner-store";
import { queuePlannerServerWrites } from "./planner-persistence";

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
        const serverStore = await fetchPlannerStore();
        let browserStore: PlannerStore = {};
        try {
          browserStore = readPlannerBrowserStore(window.localStorage);
        } catch {
          // Server storage remains authoritative when browser storage is blocked.
        }
        const hydration = mergePlannerHydrationSources(serverStore, browserStore);
        // Backfills share the write queue so one cannot land after, and then
        // overwrite, an edit the user makes to the same key straight away.
        void queuePlannerServerWrites(hydration.serverBackfills);
        if (acceptsUpdates) {
          setState({ status: "ready", store: hydration.store });
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

  useEffect(() => {
    // Still-legacy features publish their writes through same-origin browser storage.
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

  return state;
}
