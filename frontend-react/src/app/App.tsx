import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue, type PlannerStoreWrite } from "../api/planner-store";
import { DayStateOptions } from "../features/day-state/DayStateOptions";
import { selectDayState } from "../features/day-state/day-state-bridge";
import { decodeDayState } from "../features/day-state/day-state";
import { DashboardInsightCard } from "../features/dashboard-insight/DashboardInsightCard";
import {
  DASHBOARD_INSIGHT_UPDATED_EVENT,
  readDashboardInsight,
  readDashboardInsightHistory,
  undoDashboardAgentAction
} from "../features/dashboard-insight/dashboard-insight-bridge";
import {
  applyDashboardInsightAction,
  createDashboardInsightActionTarget,
  openDashboardInsightHistory
} from "../features/dashboard-insight/dashboard-insight-actions";
import {
  buildDashboardInsightModel,
  type DashboardInsightModel
} from "../features/dashboard-insight/dashboard-insight";
import { EnergyTrailCard } from "../features/energy-trail/EnergyTrailCard";
import { JournalArchiveCard } from "../features/journal-archive/JournalArchiveCard";
import { LifePieCard } from "../features/life-pie/LifePieCard";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { formatPlannerDate } from "../features/life-pie/life-pie-store";
import { MeditationCard } from "../features/meditation/MeditationCard";
import { MoneyActivityCard } from "../features/money-activity/MoneyActivityCard";
import { MoneyBudgetsCard } from "../features/money-budgets/MoneyBudgetsCard";
import { MoneyOverviewCard } from "../features/money-overview/MoneyOverviewCard";
import { MoneyPacingCard } from "../features/money-pacing/MoneyPacingCard";
import { MoneyQuickCard } from "../features/money-quick/MoneyQuickCard";
import { MoneyVendorsCard } from "../features/money-vendors/MoneyVendorsCard";
import { MoneyPage } from "../features/money-page/MoneyPage";
import { PlannedActualCard } from "../features/planned-actual/PlannedActualCard";
import { plannedStorageKey } from "../features/planned-actual/planned-actual";
import { PatternHistoryDialog } from "../features/pattern-history/PatternHistoryDialog";
import { emptyPatternHistoryModel } from "../features/pattern-history/pattern-history";
import { TaskProgressBanner } from "../features/task-progress/TaskProgressBanner";
import { buildTaskProgressModel } from "../features/task-progress/task-progress";
import { TaskForm } from "../features/tasks/TaskForm";
import { TaskList } from "../features/tasks/TaskList";
import { TodayIntention } from "../features/today-intention/TodayIntention";
import { buildTodayIntentionModel } from "../features/today-intention/today-intention";
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

interface FramePortalBoundary {
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

function LegacyPlannerApp() {
  const plannerStore = usePlannerStore();
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const todayKey = formatPlannerDate(today);
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);
  const [dayStateBoundary, setDayStateBoundary] = useState<FramePortalBoundary | null>(null);
  const [taskProgressMount, setTaskProgressMount] = useState<HTMLElement | null>(null);
  const [taskListMount, setTaskListMount] = useState<HTMLElement | null>(null);
  const [taskFormMount, setTaskFormMount] = useState<HTMLFormElement | null>(null);
  const [todayIntentionMount, setTodayIntentionMount] = useState<HTMLElement | null>(null);
  const [dashboardInsightBoundary, setDashboardInsightBoundary] = useState<FramePortalBoundary | null>(null);
  const [dashboardInsightModel, setDashboardInsightModel] = useState<DashboardInsightModel>(
    buildDashboardInsightModel(null)
  );
  const [patternHistoryBoundary, setPatternHistoryBoundary] = useState<FramePortalBoundary | null>(null);
  const [patternHistoryModel, setPatternHistoryModel] = useState(
    emptyPatternHistoryModel(todayKey)
  );
  const [patternHistoryRevision, setPatternHistoryRevision] = useState(0);
  const [lifePieBoundary, setLifePieBoundary] = useState<ReactPanelBoundary | null>(null);
  const [plannedBoundary, setPlannedBoundary] = useState<ReactPanelBoundary | null>(null);
  const [energyTrailBoundary, setEnergyTrailBoundary] = useState<FramePortalBoundary | null>(null);
  const [journalArchiveBoundary, setJournalArchiveBoundary] = useState<FramePortalBoundary | null>(null);
  const [legacyFrame, setLegacyFrame] = useState<HTMLIFrameElement | null>(null);
  const [meditationBoundary, setMeditationBoundary] = useState<ReactPanelBoundary | null>(null);
  const [moneyActivityMount, setMoneyActivityMount] = useState<HTMLElement | null>(null);
  const [moneyBudgetsMount, setMoneyBudgetsMount] = useState<HTMLElement | null>(null);
  const [moneyOverviewMount, setMoneyOverviewMount] = useState<HTMLElement | null>(null);
  const [moneyPacingMount, setMoneyPacingMount] = useState<HTMLElement | null>(null);
  const [moneyQuickMount, setMoneyQuickMount] = useState<HTMLElement | null>(null);
  const [moneyVendorsMount, setMoneyVendorsMount] = useState<HTMLElement | null>(null);
  const [weeklyGoalsOverride, setWeeklyGoalsOverride] = useState<string | null>(null);
  const [selectedJournalDateKey, setSelectedJournalDateKey] = useState(formatPlannerDate(today));
  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  const plannedKey = plannedStorageKey(today);
  const weeklyStore = loadedStore === null || weeklyGoalsOverride === null
    ? loadedStore
    : { ...loadedStore, [WEEKLY_GOALS_STORAGE_KEY]: weeklyGoalsOverride };

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

    const dayStateMount = document?.getElementById("dayStateOptions");
    if (dayStateMount !== null && dayStateMount !== undefined) {
      dayStateMount.dataset.reactOwned = "true";
      dayStateMount.replaceChildren();
      setDayStateBoundary({ frame, mount: dayStateMount });
    }

    const taskProgressMount = document?.querySelector<HTMLElement>(".day-banner");
    if (taskProgressMount !== null && taskProgressMount !== undefined) {
      taskProgressMount.dataset.reactOwned = "true";
      taskProgressMount.replaceChildren();
      setTaskProgressMount(taskProgressMount);
    }

    const taskListMount = document?.getElementById("tasksMount");
    if (taskListMount !== null && taskListMount !== undefined) {
      taskListMount.dataset.reactOwned = "true";
      taskListMount.replaceChildren();
      setTaskListMount(taskListMount);
    }

    const taskFormMount = document?.querySelector<HTMLFormElement>("#taskForm");
    if (taskFormMount !== null && taskFormMount !== undefined) {
      taskFormMount.dataset.reactOwned = "true";
      taskFormMount.replaceChildren();
      setTaskFormMount(taskFormMount);
    }

    const todayIntentionMount = document?.querySelector<HTMLElement>(".intention-block");
    if (todayIntentionMount !== null && todayIntentionMount !== undefined) {
      todayIntentionMount.dataset.reactOwned = "true";
      todayIntentionMount.replaceChildren();
      setTodayIntentionMount(todayIntentionMount);
    }

    const dashboardInsightCard = document?.getElementById("dashboardInsightCard");
    const dashboardInsightMount = dashboardInsightCard?.querySelector<HTMLElement>(".panel-inner");
    if (dashboardInsightCard !== null && dashboardInsightCard !== undefined
      && dashboardInsightMount !== null && dashboardInsightMount !== undefined) {
      dashboardInsightCard.hidden = false;
      dashboardInsightCard.dataset.reactOwned = "true";
      dashboardInsightMount.replaceChildren();
      setDashboardInsightBoundary({ frame, mount: dashboardInsightMount });
    }

    const patternHistoryDialog = document?.querySelector<HTMLDialogElement>("#patternHistoryDialog");
    if (patternHistoryDialog !== null && patternHistoryDialog !== undefined) {
      patternHistoryDialog.dataset.reactOwned = "true";
      patternHistoryDialog.replaceChildren();
      setPatternHistoryBoundary({ frame, mount: patternHistoryDialog });
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

    const moneyBudgetsCard = document?.querySelector<HTMLElement>(".money-budget-card");
    const moneyBudgetsPanel = moneyBudgetsCard?.querySelector<HTMLElement>(".panel-inner");
    if (moneyBudgetsCard !== null && moneyBudgetsCard !== undefined
      && moneyBudgetsPanel !== null && moneyBudgetsPanel !== undefined) {
      moneyBudgetsCard.dataset.reactOwned = "true";
      moneyBudgetsPanel.replaceChildren();
      setMoneyBudgetsMount(moneyBudgetsPanel);
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
    if (dashboardInsightBoundary === null) {
      return;
    }
    const frame = dashboardInsightBoundary.frame;
    const frameWindow = frame.contentWindow;
    function syncDashboardInsight(): void {
      setDashboardInsightModel(readDashboardInsight(frame));
      const historyDialog = frame.contentDocument?.querySelector<HTMLDialogElement>("#patternHistoryDialog");
      // Legacy history is a snapshot taken when opened, not a live-changing dialog.
      if (!historyDialog?.open) {
        setPatternHistoryModel(readDashboardInsightHistory(frame, todayKey));
      }
    }
    frameWindow?.addEventListener(DASHBOARD_INSIGHT_UPDATED_EVENT, syncDashboardInsight);
    syncDashboardInsight();
    return () => {
      frameWindow?.removeEventListener(DASHBOARD_INSIGHT_UPDATED_EVENT, syncDashboardInsight);
    };
  }, [dashboardInsightBoundary, loadedStore, todayKey]);

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

  function openJournalDate(boundary: FramePortalBoundary, date: string): void {
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
      {loadedStore !== null && dayStateBoundary !== null && (
        createPortal(
          <DayStateOptions
            activeState={decodeDayState(loadedStore, todayKey)}
            onSelect={(state) => selectDayState(dayStateBoundary.frame, state)}
          />,
          dayStateBoundary.mount
        )
      )}
      {loadedStore !== null && taskProgressMount !== null && (
        createPortal(
          <TaskProgressBanner model={buildTaskProgressModel(loadedStore, todayKey)} />,
          taskProgressMount
        )
      )}
      {loadedStore !== null && taskListMount !== null && (
        createPortal(
          <TaskList
            dateKey={todayKey}
            onPersist={persistPlannerWrites}
            onUndoAgentAction={() => {
              if (legacyFrame !== null) undoDashboardAgentAction(legacyFrame);
            }}
            store={loadedStore}
          />,
          taskListMount
        )
      )}
      {loadedStore !== null && taskFormMount !== null && (
        createPortal(
          <TaskForm
            dateKey={todayKey}
            onPersist={persistPlannerWrites}
            store={loadedStore}
          />,
          taskFormMount
        )
      )}
      {loadedStore !== null && todayIntentionMount !== null && (
        createPortal(
          <TodayIntention model={buildTodayIntentionModel(loadedStore, today)} />,
          todayIntentionMount
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
      {loadedStore !== null && dashboardInsightBoundary !== null && (
        createPortal(
          <DashboardInsightCard
            model={dashboardInsightModel}
            onAction={(actionId) => {
              applyDashboardInsightAction(
                createDashboardInsightActionTarget(dashboardInsightBoundary.frame),
                actionId
              );
            }}
            onOpenHistory={() => {
              setPatternHistoryModel(readDashboardInsightHistory(
                dashboardInsightBoundary.frame,
                todayKey
              ));
              setPatternHistoryRevision((revision) => revision + 1);
              openDashboardInsightHistory(dashboardInsightBoundary.frame);
            }}
          />,
          dashboardInsightBoundary.mount
        )
      )}
      {loadedStore !== null && patternHistoryBoundary !== null && (
        createPortal(
          <PatternHistoryDialog
            key={patternHistoryRevision}
            model={patternHistoryModel}
            onAction={(actionId) => {
              applyDashboardInsightAction(
                createDashboardInsightActionTarget(patternHistoryBoundary.frame),
                actionId
              );
            }}
          />,
          patternHistoryBoundary.mount
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
      {loadedStore !== null && moneyBudgetsMount !== null && (
        createPortal(
          <MoneyBudgetsCard onPersist={persistPlannerWrites} store={loadedStore} today={today} />,
          moneyBudgetsMount
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

export function App() {
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return requestedView === "moneyView" ? <MoneyPage today={today} /> : <LegacyPlannerApp />;
}
