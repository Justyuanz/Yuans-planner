import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue, type PlannerStoreWrite } from "../api/planner-store";
import { EnergyTrailCard } from "../features/energy-trail/EnergyTrailCard";
import { LifePieCard } from "../features/life-pie/LifePieCard";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { MoneyQuickCard } from "../features/money-quick/MoneyQuickCard";
import { PlannedActualCard } from "../features/planned-actual/PlannedActualCard";
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

interface EnergyTrailBoundary {
  frame: HTMLIFrameElement;
  mount: HTMLElement;
}

export function App() {
  const plannerStore = usePlannerStore();
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);
  const [lifePieBoundary, setLifePieBoundary] = useState<ReactPanelBoundary | null>(null);
  const [plannedBoundary, setPlannedBoundary] = useState<ReactPanelBoundary | null>(null);
  const [energyTrailBoundary, setEnergyTrailBoundary] = useState<EnergyTrailBoundary | null>(null);
  const [moneyQuickMount, setMoneyQuickMount] = useState<HTMLElement | null>(null);
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

    const energyTrailCard = document?.querySelector<HTMLElement>(".state-history-card");
    const energyTrailMount = energyTrailCard?.querySelector<HTMLElement>(".panel-inner");
    if (energyTrailCard !== null && energyTrailCard !== undefined
      && energyTrailMount !== null && energyTrailMount !== undefined) {
      energyTrailCard.dataset.reactOwned = "true";
      energyTrailMount.replaceChildren();
      setEnergyTrailBoundary({ frame, mount: energyTrailMount });
    }

    const moneyQuickCard = document?.querySelector<HTMLElement>(".money-quick-card");
    const moneyQuickPanel = moneyQuickCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyQuickCard !== null && moneyQuickCard !== undefined
      && moneyQuickPanel !== null && moneyQuickPanel !== undefined) {
      moneyQuickCard.dataset.reactOwned = "true";
      moneyQuickPanel.replaceChildren();
      setMoneyQuickMount(moneyQuickPanel);
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

  function openJournalDate(boundary: EnergyTrailBoundary, date: string): void {
    const frameDocument = boundary.frame.contentDocument;
    if (frameDocument === null) {
      return;
    }
    const journalTab = frameDocument.querySelector<HTMLButtonElement>('[data-view-target="journalView"]');
    const journalDate = frameDocument.querySelector<HTMLInputElement>("#journalDate");
    if (journalTab === null || journalDate === null) {
      return;
    }
    journalTab.click();
    journalDate.value = date;
    const changeEvent = frameDocument.createEvent("Event");
    changeEvent.initEvent("change", true, false);
    journalDate.dispatchEvent(changeEvent);
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
      {loadedStore !== null && energyTrailBoundary !== null && (
        createPortal(
          <EnergyTrailCard
            onOpenJournalDate={(date) => openJournalDate(energyTrailBoundary, date)}
            store={loadedStore}
            today={today}
          />,
          energyTrailBoundary.mount
        )
      )}
      {loadedStore !== null && moneyQuickMount !== null && (
        createPortal(
          <MoneyQuickCard onPersist={persistPlannerWrites} store={loadedStore} today={today} />,
          moneyQuickMount
        )
      )}
    </>
  );
}
