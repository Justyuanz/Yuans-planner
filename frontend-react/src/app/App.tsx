import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue } from "../api/planner-store";
import { LifePieCard } from "../features/life-pie/LifePieCard";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import {
  PlannedActualCard,
  type PlannerStoreWrite
} from "../features/planned-actual/PlannedActualCard";
import { plannedStorageKey } from "../features/planned-actual/planned-actual";
import { WeeklyGoalsCard } from "../features/weekly-goals/WeeklyGoalsCard";
import {
  decodeWeeklyGoals,
  encodeWeeklyGoalUpdate,
  WEEKLY_GOALS_STORAGE_KEY,
  type WeeklyGoalId
} from "../features/weekly-goals/weekly-goals";
import { usePlannerStore } from "./use-planner-store";

interface ReactPanelBoundary {
  initialNowMs: number;
  mount: HTMLElement;
}

export function App() {
  const plannerStore = usePlannerStore();
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);
  const [lifePieBoundary, setLifePieBoundary] = useState<ReactPanelBoundary | null>(null);
  const [plannedBoundary, setPlannedBoundary] = useState<ReactPanelBoundary | null>(null);
  const [weeklyGoalsOverride, setWeeklyGoalsOverride] = useState<string | null>(null);
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);

  function claimReactMounts(frame: HTMLIFrameElement): void {
    const document = frame.contentDocument;
    const weeklyMount = document?.getElementById("weeklyGoals");
    if (weeklyMount !== null && weeklyMount !== undefined) {
      // The legacy renderer respects this marker so React remains the sole owner of the boundary.
      weeklyMount.dataset.reactOwned = "true";
      setWeeklyGoalsMount(weeklyMount);
    }

    const lifeCard = document?.querySelector<HTMLElement>(".life-card");
    const lifeMount = lifeCard?.querySelector<HTMLElement>(".panel-inner");
    if (lifeCard !== null && lifeCard !== undefined && lifeMount !== null && lifeMount !== undefined) {
      lifeCard.dataset.reactOwned = "true";
      // Remove the static children before the portal becomes this panel's only renderer.
      lifeMount.replaceChildren();
      setLifePieBoundary({ initialNowMs: Date.now(), mount: lifeMount });
    }

    const plannedCard = document?.querySelector<HTMLElement>(".planned-card");
    const plannedMount = plannedCard?.querySelector<HTMLElement>(".panel-inner");
    if (plannedCard !== null && plannedCard !== undefined
      && plannedMount !== null && plannedMount !== undefined) {
      plannedCard.dataset.reactOwned = "true";
      plannedMount.replaceChildren();
      setPlannedBoundary({ initialNowMs: Date.now(), mount: plannedMount });
    }
  }

  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  const plannedKey = plannedStorageKey(today);
  const weeklyStore = loadedStore === null || weeklyGoalsOverride === null
    ? loadedStore
    : { ...loadedStore, [WEEKLY_GOALS_STORAGE_KEY]: weeklyGoalsOverride };

  function saveWeeklyGoal(goalId: WeeklyGoalId, text: string): void {
    if (weeklyStore === null) {
      return;
    }

    const value = encodeWeeklyGoalUpdate(weeklyStore, goalId, text);
    setWeeklyGoalsOverride(value);
    try {
      window.localStorage.setItem(WEEKLY_GOALS_STORAGE_KEY, value);
    } catch {
      // Server persistence still works when browser storage is unavailable.
    }
    void putPlannerStoreValue(WEEKLY_GOALS_STORAGE_KEY, value).catch(() => undefined);
  }

  function persistPlannerWrites(writes: readonly PlannerStoreWrite[]): void {
    writes.forEach(({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Server persistence still works when browser storage is unavailable.
      }
      void putPlannerStoreValue(key, value).catch(() => undefined);
    });
  }

  return (
    <>
      <iframe
        className="planner-frame"
        onLoad={(event) => claimReactMounts(event.currentTarget)}
        src={legacyUrl}
        title="Yuan's Planner"
      />
      {weeklyStore !== null && weeklyGoalsMount !== null && (
        createPortal(
          <WeeklyGoalsCard goals={decodeWeeklyGoals(weeklyStore)} onGoalChange={saveWeeklyGoal} />,
          weeklyGoalsMount
        )
      )}
      {loadedStore !== null && lifePieBoundary !== null && (
        createPortal(
          <LifePieCard
            initialNowMs={lifePieBoundary.initialNowMs}
            store={loadedStore}
            today={today}
          />,
          lifePieBoundary.mount
        )
      )}
      {loadedStore !== null && plannedBoundary !== null && (
        createPortal(
          <PlannedActualCard
            initialNowMs={plannedBoundary.initialNowMs}
            key={`${plannedKey}:${loadedStore[plannedKey] ?? ""}`}
            onPersist={persistPlannerWrites}
            store={loadedStore}
            today={today}
          />,
          plannedBoundary.mount
        )
      )}
    </>
  );
}
