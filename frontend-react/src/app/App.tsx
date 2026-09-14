import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue, type PlannerStoreWrite } from "../api/planner-store";
import { EnergyTrailCard } from "../features/energy-trail/EnergyTrailCard";
import { JournalArchiveCard } from "../features/journal-archive/JournalArchiveCard";
import { LifePieCard } from "../features/life-pie/LifePieCard";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { formatPlannerDate } from "../features/life-pie/life-pie-store";
import { MeditationCard } from "../features/meditation/MeditationCard";
import { MoneyActivityCard } from "../features/money-activity/MoneyActivityCard";
import { MoneyOverviewCard } from "../features/money-overview/MoneyOverviewCard";
import { MoneyPacingCard } from "../features/money-pacing/MoneyPacingCard";
import { MoneyQuickCard } from "../features/money-quick/MoneyQuickCard";
import { MoneyVendorsCard } from "../features/money-vendors/MoneyVendorsCard";
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

function selectedJournalDate(input: HTMLInputElement | null | undefined, fallback: string): string {
  const value = input?.value.trim();
  if (!value) {
    return fallback;
  }
  return value;
}

export function App() {
  const plannerStore = usePlannerStore();
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);
  const [lifePieBoundary, setLifePieBoundary] = useState<ReactPanelBoundary | null>(null);
  const [plannedBoundary, setPlannedBoundary] = useState<ReactPanelBoundary | null>(null);
  const [energyTrailBoundary, setEnergyTrailBoundary] = useState<EnergyTrailBoundary | null>(null);
  const [journalArchiveBoundary, setJournalArchiveBoundary] = useState<EnergyTrailBoundary | null>(null);
  const [legacyFrame, setLegacyFrame] = useState<HTMLIFrameElement | null>(null);
  const [meditationBoundary, setMeditationBoundary] = useState<ReactPanelBoundary | null>(null);
  const [moneyActivityMount, setMoneyActivityMount] = useState<HTMLElement | null>(null);
  const [moneyOverviewMount, setMoneyOverviewMount] = useState<HTMLElement | null>(null);
  const [moneyPacingMount, setMoneyPacingMount] = useState<HTMLElement | null>(null);
  const [moneyQuickMount, setMoneyQuickMount] = useState<HTMLElement | null>(null);
  const [moneyVendorsMount, setMoneyVendorsMount] = useState<HTMLElement | null>(null);
  const [weeklyGoalsOverride, setWeeklyGoalsOverride] = useState<string | null>(null);
  const [selectedJournalDateKey, setSelectedJournalDateKey] = useState(formatPlannerDate(today));

  function claimReactMounts(frame: HTMLIFrameElement): void {
    const document = frame.contentDocument;
    const journalDate = document?.querySelector<HTMLInputElement>("#journalDate");
    setLegacyFrame(frame);
    setSelectedJournalDateKey(selectedJournalDate(journalDate, formatPlannerDate(today)));
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

    const journalArchiveCard = document?.querySelector<HTMLElement>(".journal-archive-card");
    const journalArchiveMount = journalArchiveCard?.querySelector<HTMLElement>(".panel-inner");
    if (journalArchiveCard !== null && journalArchiveCard !== undefined
      && journalArchiveMount !== null && journalArchiveMount !== undefined) {
      journalArchiveCard.dataset.reactOwned = "true";
      journalArchiveMount.replaceChildren();
      setJournalArchiveBoundary({ frame, mount: journalArchiveMount });
    }

    const moneyQuickCard = document?.querySelector<HTMLElement>(".money-quick-card");
    const moneyQuickPanel = moneyQuickCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyQuickCard !== null && moneyQuickCard !== undefined
      && moneyQuickPanel !== null && moneyQuickPanel !== undefined) {
      moneyQuickCard.dataset.reactOwned = "true";
      moneyQuickPanel.replaceChildren();
      setMoneyQuickMount(moneyQuickPanel);
    }

    const moneyOverviewCard = document?.querySelector<HTMLElement>(".money-overview-card");
    const moneyOverviewPanel = moneyOverviewCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyOverviewCard !== null && moneyOverviewCard !== undefined
      && moneyOverviewPanel !== null && moneyOverviewPanel !== undefined) {
      moneyOverviewCard.dataset.reactOwned = "true";
      moneyOverviewPanel.replaceChildren();
      setMoneyOverviewMount(moneyOverviewPanel);
    }

    const moneyPacingCard = document?.querySelector<HTMLElement>(".money-pacing-card");
    const moneyPacingPanel = moneyPacingCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyPacingCard !== null && moneyPacingCard !== undefined
      && moneyPacingPanel !== null && moneyPacingPanel !== undefined) {
      moneyPacingCard.dataset.reactOwned = "true";
      moneyPacingPanel.replaceChildren();
      setMoneyPacingMount(moneyPacingPanel);
    }

    const moneyActivityCard = document?.querySelector<HTMLElement>(".money-activity-card");
    const moneyActivityPanel = moneyActivityCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyActivityCard !== null && moneyActivityCard !== undefined
      && moneyActivityPanel !== null && moneyActivityPanel !== undefined) {
      moneyActivityCard.dataset.reactOwned = "true";
      moneyActivityPanel.replaceChildren();
      setMoneyActivityMount(moneyActivityPanel);
    }

    const moneyVendorsCard = document?.querySelector<HTMLElement>(".money-vendors-card");
    const moneyVendorsPanel = moneyVendorsCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyVendorsCard !== null && moneyVendorsCard !== undefined
      && moneyVendorsPanel !== null && moneyVendorsPanel !== undefined) {
      moneyVendorsCard.dataset.reactOwned = "true";
      moneyVendorsPanel.replaceChildren();
      setMoneyVendorsMount(moneyVendorsPanel);
    }

    const meditationCard = document?.querySelector<HTMLElement>(".meditation-card");
    if (meditationCard !== null && meditationCard !== undefined) {
      meditationCard.dataset.reactOwned = "true";
      meditationCard.replaceChildren();
      setMeditationBoundary({
        initialNowMs: Date.now(),
        mount: meditationCard
      });
    }
  }

  useEffect(() => {
    if (legacyFrame === null) {
      return;
    }
    const frame = legacyFrame;
    const frameWindow = frame.contentWindow;
    function syncSelectedDate(): void {
      const input = frame.contentDocument?.querySelector<HTMLInputElement>("#journalDate");
      if (input?.value) {
        setSelectedJournalDateKey(input.value);
      }
    }
    frameWindow?.addEventListener("change", syncSelectedDate);
    frameWindow?.addEventListener("click", syncSelectedDate);
    return () => {
      frameWindow?.removeEventListener("change", syncSelectedDate);
      frameWindow?.removeEventListener("click", syncSelectedDate);
    };
  }, [legacyFrame]);

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
      // Native storage events skip the writing window, so notify sibling React boundaries explicitly.
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
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
      {loadedStore !== null && journalArchiveBoundary !== null && (
        createPortal(
          <JournalArchiveCard
            onOpenJournalDate={(date) => openJournalDate(journalArchiveBoundary, date)}
            selectedDate={selectedJournalDateKey}
            store={loadedStore}
          />,
          journalArchiveBoundary.mount
        )
      )}
      {loadedStore !== null && moneyQuickMount !== null && (
        createPortal(
          <MoneyQuickCard onPersist={persistPlannerWrites} store={loadedStore} today={today} />,
          moneyQuickMount
        )
      )}
      {loadedStore !== null && moneyOverviewMount !== null && (
        createPortal(
          <MoneyOverviewCard store={loadedStore} today={today} />,
          moneyOverviewMount
        )
      )}
      {loadedStore !== null && moneyPacingMount !== null && (
        createPortal(
          <MoneyPacingCard store={loadedStore} today={today} />,
          moneyPacingMount
        )
      )}
      {loadedStore !== null && moneyActivityMount !== null && (
        createPortal(
          <MoneyActivityCard store={loadedStore} today={today} />,
          moneyActivityMount
        )
      )}
      {loadedStore !== null && moneyVendorsMount !== null && (
        createPortal(
          <MoneyVendorsCard store={loadedStore} today={today} />,
          moneyVendorsMount
        )
      )}
      {loadedStore !== null && meditationBoundary !== null && (
        createPortal(
          <MeditationCard
            initialNowMs={meditationBoundary.initialNowMs}
            onPersist={persistPlannerWrites}
            selectedDate={selectedJournalDateKey}
            store={loadedStore}
          />,
          meditationBoundary.mount
        )
      )}
    </>
  );
}
