import { useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue, type PlannerStore } from "../api/planner-store";
import { WeeklyGoalsCard } from "../features/weekly-goals/WeeklyGoalsCard";
import {
  decodeWeeklyGoals,
  encodeWeeklyGoalUpdate,
  WEEKLY_GOALS_STORAGE_KEY,
  type WeeklyGoalId
} from "../features/weekly-goals/weekly-goals";
import { usePlannerStore } from "./use-planner-store";

export function App() {
  const plannerStore = usePlannerStore();
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);
  const [editedStore, setEditedStore] = useState<PlannerStore | null>(null);

  function claimWeeklyGoalsMount(frame: HTMLIFrameElement): void {
    const mount = frame.contentDocument?.getElementById("weeklyGoals");
    if (mount === null || mount === undefined) {
      return;
    }

    // The legacy renderer respects this marker so React remains the sole owner of the boundary.
    mount.dataset.reactOwned = "true";
    setWeeklyGoalsMount(mount);
  }

  const legacyUrl = `/legacy/${window.location.search}`;
  const activeStore = editedStore ?? (plannerStore.status === "ready" ? plannerStore.store : null);

  function saveWeeklyGoal(goalId: WeeklyGoalId, text: string): void {
    if (activeStore === null) {
      return;
    }

    const value = encodeWeeklyGoalUpdate(activeStore, goalId, text);
    const updatedStore = { ...activeStore, [WEEKLY_GOALS_STORAGE_KEY]: value };
    setEditedStore(updatedStore);
    try {
      window.localStorage.setItem(WEEKLY_GOALS_STORAGE_KEY, value);
    } catch {
      // Server persistence still works when browser storage is unavailable.
    }
    void putPlannerStoreValue(WEEKLY_GOALS_STORAGE_KEY, value).catch(() => undefined);
  }

  return (
    <>
      <iframe
        className="planner-frame"
        onLoad={(event) => claimWeeklyGoalsMount(event.currentTarget)}
        src={legacyUrl}
        title="Yuan's Planner"
      />
      {activeStore !== null && weeklyGoalsMount !== null && (
        createPortal(
          <WeeklyGoalsCard goals={decodeWeeklyGoals(activeStore)} onGoalChange={saveWeeklyGoal} />,
          weeklyGoalsMount
        )
      )}
    </>
  );
}
