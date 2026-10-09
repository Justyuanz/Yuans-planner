import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { putPlannerStoreValue } from "../api/planner-store";
import { MonthlyCalendarCard } from "../features/calendar/MonthlyCalendarCard";
import {
  CalendarEventEditor,
  type CalendarEditorRequest
} from "../features/calendar/CalendarEventEditor";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { WeeklyPlannerCard } from "../features/calendar/WeeklyPlannerCard";
import {
  CALENDAR_STATE_EVENT,
  calendarBridgeStateFromEvent,
  dispatchCalendarNavigation,
  type CalendarBridgeState
} from "../features/calendar/calendar-bridge";
import { DayStateOptions } from "../features/day-state/DayStateOptions";
import { decodeDayState } from "../features/day-state/day-state";
import { refreshLegacyDayStateEffects } from "../features/day-state/day-state-effects";
import { buildDayStateWrites } from "../features/day-state/day-state-persistence";
import { DashboardInsightCard } from "../features/dashboard-insight/DashboardInsightCard";
import { DashboardPage } from "../features/dashboard-page/DashboardPage";
import { DASHBOARD_INSIGHT_UPDATED_EVENT } from "../features/dashboard-insight/dashboard-insight-bridge";
import {
  buildDashboardInsightFromStore,
  buildDashboardInsightHistoryFromStore
} from "../features/dashboard-insight/dashboard-insight-store";
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
import { GuitarGoalCard } from "../features/guitar/GuitarGoalCard";
import { GuitarSessionCard } from "../features/guitar/GuitarSessionCard";
import { GuitarSessionDialog } from "../features/guitar/GuitarSessionDialog";
import { buildGuitarGoalModel, buildGuitarGoalWrite } from "../features/guitar/guitar-goal";
import { useGuitarSessionController } from "../features/guitar/use-guitar-session-controller";
import { JournalArchiveCard } from "../features/journal-archive/JournalArchiveCard";
import { JournalPage } from "../features/journal-page/JournalPage";
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
import { SkateFeedbackDialog } from "../features/skate/SkateFeedbackDialog";
import { SkateHeroCard } from "../features/skate/SkateHeroCard";
import { SkatePage } from "../features/skate/SkatePage";
import { SkateBodySupportCard } from "../features/skate/SkateBodySupportCard";
import { SkateRoadmapCard } from "../features/skate/SkateRoadmapCard";
import { SkateTrainingPlanCard } from "../features/skate/SkateTrainingPlanCard";
import {
  dispatchSkateHeroAction,
  SKATE_HERO_STATE_EVENT,
  skateHeroStateFromDocument,
  skateHeroStateFromEvent
} from "../features/skate/skate-hero-bridge";
import type { SkateHeroState } from "../features/skate/skate-hero";
import {
  buildSkateTrainingPlanState,
  type SkateTrainingPlanState
} from "../features/skate/skate-training-plan";
import type { SkateHeroSettingsAction } from "../features/skate/skate-settings";
import { useSkateFeedbackController } from "../features/skate/use-skate-feedback-controller";
import { TaskProgressBanner } from "../features/task-progress/TaskProgressBanner";
import { buildTaskProgressModel } from "../features/task-progress/task-progress";
import { TaskForm } from "../features/tasks/TaskForm";
import { TaskList } from "../features/tasks/TaskList";
import { buildAgentUndoWrites } from "../features/tasks/agent-undo";
import { buildCalendarTaskReconciliation } from "../features/tasks/calendar-task-reconciliation";
import { makeTaskRelatedId } from "../features/tasks/task-options";
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
import { persistPlannerWrites } from "./planner-persistence";

interface ReactPanelBoundary {
  initialNowMs: number;
  mount: HTMLElement;
}

interface FramePortalBoundary {
  frame: HTMLIFrameElement;
  mount: HTMLElement;
}

interface WeeklyPlannerBoundary extends FramePortalBoundary {
  editorCard: HTMLElement;
  editorMount: HTMLElement;
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
  const [guitarGoalMount, setGuitarGoalMount] = useState<HTMLElement | null>(null);
  const [guitarSessionMount, setGuitarSessionMount] = useState<HTMLElement | null>(null);
  const [journalArchiveBoundary, setJournalArchiveBoundary] = useState<FramePortalBoundary | null>(null);
  const [monthlyCalendarBoundary, setMonthlyCalendarBoundary] = useState<FramePortalBoundary | null>(null);
  const [weeklyPlannerBoundary, setWeeklyPlannerBoundary] = useState<WeeklyPlannerBoundary | null>(null);
  const [skateHeroBoundary, setSkateHeroBoundary] = useState<FramePortalBoundary | null>(null);
  const [skateHeroState, setSkateHeroState] = useState<SkateHeroState | null>(null);
  const [skateBodySupportMount, setSkateBodySupportMount] = useState<HTMLElement | null>(null);
  const [skateRoadmapBoundary, setSkateRoadmapBoundary] = useState<FramePortalBoundary | null>(null);
  const [skateTrainingPlanBoundary, setSkateTrainingPlanBoundary] = useState<FramePortalBoundary | null>(null);
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
  const [calendarState, setCalendarState] = useState<CalendarBridgeState>({
    cursorDate: formatPlannerDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    expandedDate: "",
    selectedDate: formatPlannerDate(today)
  });
  const [calendarEditorRequest, setCalendarEditorRequest] = useState<CalendarEditorRequest>({
    eventId: null,
    focus: "start",
    revision: 0
  });
  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  const skateTrainingPlanState: SkateTrainingPlanState | null = useMemo(
    () => loadedStore === null ? null : buildSkateTrainingPlanState(loadedStore, today),
    [loadedStore, today]
  );
  const plannedKey = plannedStorageKey(today);
  const weeklyStore = loadedStore === null || weeklyGoalsOverride === null
    ? loadedStore
    : { ...loadedStore, [WEEKLY_GOALS_STORAGE_KEY]: weeklyGoalsOverride };
  const calendarTaskReconciliation = useMemo(() => loadedStore === null ? null
    : buildCalendarTaskReconciliation(loadedStore, todayKey, () => ({
      createdAt: new Date().toISOString(),
      id: makeTaskRelatedId("calendar-task")
    })), [loadedStore, todayKey]);
  const dashboardStore = useMemo(() => calendarTaskReconciliation === null || loadedStore === null
    ? loadedStore
    : ({
      ...loadedStore,
      [`hivePlanner.dailyTasks.${todayKey}`]: JSON.stringify(calendarTaskReconciliation.tasks)
    }), [calendarTaskReconciliation, loadedStore, todayKey]);
  const dispatchLegacySkateSetting = useCallback((action: SkateHeroSettingsAction) => {
    if (skateHeroBoundary !== null) dispatchSkateHeroAction(skateHeroBoundary.frame, action);
  }, [skateHeroBoundary]);
  const skateFeedback = useSkateFeedbackController({
    heroState: skateHeroState,
    onPersist: persistPlannerWrites,
    onSettingsAction: dispatchLegacySkateSetting,
    store: loadedStore,
    todayKey
  });
  const guitarSession = useGuitarSessionController({
    onPersist: persistPlannerWrites,
    store: loadedStore,
    today,
    todayKey
  });

  useEffect(() => {
    if (calendarTaskReconciliation?.write !== null && calendarTaskReconciliation?.write !== undefined) {
      persistPlannerWrites([calendarTaskReconciliation.write]);
    }
  }, [calendarTaskReconciliation]);

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

    const monthlyCalendarCard = document?.querySelector<HTMLElement>(".monthly-calendar-card");
    const monthlyCalendarMount = monthlyCalendarCard?.querySelector<HTMLElement>(".panel-inner");
    const legacyCalendarGrid = document?.getElementById("calendarGrid");
    if (monthlyCalendarCard !== null && monthlyCalendarCard !== undefined
      && monthlyCalendarMount !== null && monthlyCalendarMount !== undefined
      && legacyCalendarGrid !== null && legacyCalendarGrid !== undefined) {
      monthlyCalendarCard.dataset.reactOwned = "true";
      legacyCalendarGrid.dataset.reactOwned = "true";
      monthlyCalendarMount.replaceChildren();
      setMonthlyCalendarBoundary({ frame, mount: monthlyCalendarMount });
    }

    const weeklyPlannerCard = document?.querySelector<HTMLElement>(".weekly-planner-card");
    const weeklyPlannerMount = weeklyPlannerCard?.querySelector<HTMLElement>(".panel-inner");
    const legacyWeeklyPlannerMount = document?.getElementById("weeklyPlannerMount");
    const eventEditorCard = document?.getElementById("eventEditorCard");
    const eventEditorMount = eventEditorCard?.querySelector<HTMLElement>(".panel-inner");
    if (weeklyPlannerCard !== null && weeklyPlannerCard !== undefined
      && weeklyPlannerMount !== null && weeklyPlannerMount !== undefined
      && legacyWeeklyPlannerMount !== null && legacyWeeklyPlannerMount !== undefined
      && eventEditorCard !== null && eventEditorCard !== undefined
      && eventEditorMount !== null && eventEditorMount !== undefined) {
      weeklyPlannerCard.dataset.reactOwned = "true";
      legacyWeeklyPlannerMount.dataset.reactOwned = "true";
      eventEditorCard.dataset.reactOwned = "true";
      weeklyPlannerMount.replaceChildren();
      eventEditorMount.replaceChildren();
      setWeeklyPlannerBoundary({
        editorCard: eventEditorCard,
        editorMount: eventEditorMount,
        frame,
        mount: weeklyPlannerMount
      });
    }

    const skateHeroCard = document?.querySelector<HTMLElement>(".skate-hero-card");
    const skateHeroMount = skateHeroCard?.querySelector<HTMLElement>(".panel-inner");
    const initialSkateHeroState = document === null ? null : skateHeroStateFromDocument(document);
    if (document !== null
      && skateHeroCard !== null && skateHeroCard !== undefined
      && skateHeroMount !== null && skateHeroMount !== undefined
      && initialSkateHeroState !== null) {
      setSkateHeroState(initialSkateHeroState);
      skateHeroCard.dataset.reactOwned = "true";
      skateHeroMount.replaceChildren();
      setSkateHeroBoundary({ frame, mount: skateHeroMount });
    }

    const feedbackDialog = document?.querySelector<HTMLDialogElement>("#skateFeedbackDialog");
    if (feedbackDialog !== null && feedbackDialog !== undefined) {
      skateFeedback.claimDialog(feedbackDialog);
    }

    const skateRoadmapCard = document?.querySelector<HTMLElement>(".skate-trends-card");
    const skateRoadmapMount = skateRoadmapCard?.querySelector<HTMLElement>(".panel-inner");
    if (skateRoadmapCard !== null && skateRoadmapCard !== undefined
      && skateRoadmapMount !== null && skateRoadmapMount !== undefined) {
      skateRoadmapCard.dataset.reactOwned = "true";
      skateRoadmapMount.replaceChildren();
      setSkateRoadmapBoundary({ frame, mount: skateRoadmapMount });
    }

    const skateBodySupportCard = document?.querySelector<HTMLElement>(".body-log-card");
    const skateBodySupportMount = skateBodySupportCard?.querySelector<HTMLElement>(".panel-inner");
    if (skateBodySupportCard !== null && skateBodySupportCard !== undefined
      && skateBodySupportMount !== null && skateBodySupportMount !== undefined) {
      skateBodySupportCard.dataset.reactOwned = "true";
      skateBodySupportMount.replaceChildren();
      setSkateBodySupportMount(skateBodySupportMount);
    }

    const guitarGoalCard = document?.querySelector<HTMLElement>(".guitar-goal-card");
    const guitarGoalMount = guitarGoalCard?.querySelector<HTMLElement>(".panel-inner");
    if (guitarGoalCard !== null && guitarGoalCard !== undefined
      && guitarGoalMount !== null && guitarGoalMount !== undefined) {
      guitarGoalCard.dataset.reactOwned = "true";
      guitarGoalMount.replaceChildren();
      setGuitarGoalMount(guitarGoalMount);
    }

    const guitarSessionCard = document?.querySelector<HTMLElement>(".guitar-session-card");
    const guitarSessionMount = guitarSessionCard?.querySelector<HTMLElement>(".panel-inner");
    if (guitarSessionCard !== null && guitarSessionCard !== undefined
      && guitarSessionMount !== null && guitarSessionMount !== undefined) {
      guitarSessionCard.dataset.reactOwned = "true";
      guitarSessionMount.replaceChildren();
      setGuitarSessionMount(guitarSessionMount);
    }

    const guitarSessionDialog = document?.querySelector<HTMLDialogElement>("#guitarSessionDialog");
    if (guitarSessionDialog !== null && guitarSessionDialog !== undefined) {
      guitarSession.claimDialog(guitarSessionDialog);
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
    if (dashboardInsightBoundary === null || dashboardStore === null) {
      return;
    }
    const insightStore = dashboardStore;
    const frame = dashboardInsightBoundary.frame;
    const frameWindow = frame.contentWindow;
    function syncDashboardInsight(): void {
      setDashboardInsightModel(buildDashboardInsightFromStore(insightStore, today));
      const historyDialog = frame.contentDocument?.querySelector<HTMLDialogElement>("#patternHistoryDialog");
      // Legacy history is a snapshot taken when opened, not a live-changing dialog.
      if (!historyDialog?.open) {
        setPatternHistoryModel(buildDashboardInsightHistoryFromStore(insightStore, today));
      }
    }
    frameWindow?.addEventListener(DASHBOARD_INSIGHT_UPDATED_EVENT, syncDashboardInsight);
    syncDashboardInsight();
    return () => {
      frameWindow?.removeEventListener(DASHBOARD_INSIGHT_UPDATED_EVENT, syncDashboardInsight);
    };
  }, [dashboardInsightBoundary, dashboardStore, today, todayKey]);

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

  useEffect(() => {
    const frameWindow = legacyFrame?.contentWindow;
    if (frameWindow === null || frameWindow === undefined) return;
    function syncCalendarState(event: Event): void {
      const state = calendarBridgeStateFromEvent(event);
      if (state !== null) setCalendarState(state);
    }
    frameWindow.addEventListener(CALENDAR_STATE_EVENT, syncCalendarState);
    return () => frameWindow.removeEventListener(CALENDAR_STATE_EVENT, syncCalendarState);
  }, [legacyFrame]);

  useEffect(() => {
    const frameWindow = skateHeroBoundary?.frame.contentWindow;
    if (frameWindow === null || frameWindow === undefined) return;
    function syncSkateHeroState(event: Event): void {
      const state = skateHeroStateFromEvent(event);
      if (state !== null) setSkateHeroState(state);
    }
    frameWindow.addEventListener(SKATE_HERO_STATE_EVENT, syncSkateHeroState);
    return () => frameWindow.removeEventListener(SKATE_HERO_STATE_EVENT, syncSkateHeroState);
  }, [skateHeroBoundary]);

  useEffect(() => {
    if (legacyFrame === null) return;
    const frame = legacyFrame;
    const frameDocument = frame.contentDocument;
    if (frameDocument === null) return;
    const card = frameDocument.querySelector<HTMLElement>(".skate-session-card");
    const mount = card?.querySelector<HTMLElement>(".panel-inner") ?? null;
    const legacyFlow = card?.querySelector<HTMLElement>("#skateCoachFlow") ?? null;
    if (card === null || mount === null || legacyFlow === null) return;

    // Legacy keeps its stale element reference, while React becomes the only visible renderer.
    legacyFlow.remove();
    card.dataset.reactOwned = "true";
    mount.replaceChildren();
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) setSkateTrainingPlanBoundary({ frame, mount });
    });
    return () => {
      disposed = true;
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
            onSelect={(state) => {
              persistPlannerWrites(buildDayStateWrites(loadedStore, todayKey, state, {
                activityId: `activity-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString()
              }));
              refreshLegacyDayStateEffects(dayStateBoundary.frame, todayKey, state);
            }}
          />,
          dayStateBoundary.mount
        )
      )}
      {dashboardStore !== null && taskProgressMount !== null && (
        createPortal(
          <TaskProgressBanner model={buildTaskProgressModel(dashboardStore, todayKey)} />,
          taskProgressMount
        )
      )}
      {dashboardStore !== null && taskListMount !== null && (
        createPortal(
          <TaskList
            dateKey={todayKey}
            onPersist={persistPlannerWrites}
            onUndoAgentAction={() => {
              const result = buildAgentUndoWrites(dashboardStore, {
                activityId: makeTaskRelatedId("activity"),
                timestamp: new Date().toISOString()
              });
              persistPlannerWrites(result.writes);
            }}
            store={dashboardStore}
          />,
          taskListMount
        )
      )}
      {dashboardStore !== null && taskFormMount !== null && (
        createPortal(
          <TaskForm
            dateKey={todayKey}
            onPersist={persistPlannerWrites}
            store={dashboardStore}
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
      {dashboardStore !== null && dashboardInsightBoundary !== null && (
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
              setPatternHistoryModel(buildDashboardInsightHistoryFromStore(dashboardStore, today));
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
      {loadedStore !== null && monthlyCalendarBoundary !== null && (
        createPortal(
          <MonthlyCalendarCard
            cursorDate={calendarState.cursorDate}
            onEditEvent={(eventId, date) => {
              setCalendarState((current) => ({ ...current, selectedDate: date }));
              setCalendarEditorRequest((current) => ({
                eventId,
                focus: "title",
                revision: current.revision + 1
              }));
              dispatchCalendarNavigation(monthlyCalendarBoundary.frame, { action: "select-date", date });
            }}
            onSelectDate={(date) => {
              setCalendarState((current) => ({ ...current, selectedDate: date }));
              setCalendarEditorRequest((current) => ({
                eventId: null,
                focus: "start",
                revision: current.revision + 1
              }));
              dispatchCalendarNavigation(monthlyCalendarBoundary.frame, { action: "select-date", date });
            }}
            onShiftMonth={(amount) => dispatchCalendarNavigation(monthlyCalendarBoundary.frame, {
              action: "shift-month",
              amount: amount < 0 ? -1 : 1
            })}
            selectedDate={calendarState.selectedDate}
            store={loadedStore}
            today={today}
          />,
          monthlyCalendarBoundary.mount
        )
      )}
      {loadedStore !== null && weeklyPlannerBoundary !== null && (
        createPortal(
          <WeeklyPlannerCard
            editorCard={weeklyPlannerBoundary.editorCard}
            expandedDate={calendarState.expandedDate}
            onCollapseDay={() => dispatchCalendarNavigation(weeklyPlannerBoundary.frame, {
              action: "collapse-day"
            })}
            onNavigateWeek={(amount) => dispatchCalendarNavigation(weeklyPlannerBoundary.frame, {
              action: "shift-week",
              amount
            })}
            onPersist={persistPlannerWrites}
            onSelectDay={(date, expanded) => dispatchCalendarNavigation(weeklyPlannerBoundary.frame, {
              action: "select-week-day",
              date,
              expanded
            })}
            selectedDate={calendarState.selectedDate}
            store={loadedStore}
          />,
          weeklyPlannerBoundary.mount
        )
      )}
      {loadedStore !== null && weeklyPlannerBoundary !== null && (
        createPortal(
          <CalendarEventEditor
            editRequest={calendarEditorRequest}
            key={`${calendarState.selectedDate}:${calendarEditorRequest.revision}`}
            onPersist={persistPlannerWrites}
            onSavedDate={(date) => {
              setCalendarState((current) => ({ ...current, selectedDate: date }));
              dispatchCalendarNavigation(weeklyPlannerBoundary.frame, { action: "select-date", date });
            }}
            selectedDate={calendarState.selectedDate}
            store={loadedStore}
          />,
          weeklyPlannerBoundary.editorMount
        )
      )}
      {skateHeroBoundary !== null && skateFeedback.heroState !== null && (
        createPortal(
          <SkateHeroCard
            onAction={skateFeedback.handleHeroAction}
            state={skateFeedback.heroState}
          />,
          skateHeroBoundary.mount
        )
      )}
      {loadedStore !== null && skateFeedback.dialog !== null && skateFeedback.request !== null && (
        createPortal(
          <SkateFeedbackDialog
            dialog={skateFeedback.dialog}
            intensityForDate={skateFeedback.intensityForDate}
            key={skateFeedback.request.revision}
            request={skateFeedback.request}
            onCancel={skateFeedback.cancelFeedback}
            onSave={skateFeedback.saveFeedback}
          />,
          skateFeedback.dialog
        )
      )}
      {loadedStore !== null && skateRoadmapBoundary !== null && (
        createPortal(
          <SkateRoadmapCard
            onLogDate={skateFeedback.openRoadmapLog}
            store={loadedStore}
            today={today}
          />,
          skateRoadmapBoundary.mount
        )
      )}
      {loadedStore !== null && skateBodySupportMount !== null && (
        createPortal(
          <SkateBodySupportCard
            onPersist={persistPlannerWrites}
            store={loadedStore}
            today={today}
          />,
          skateBodySupportMount
        )
      )}
      {skateTrainingPlanBoundary !== null && skateTrainingPlanState !== null && (
        createPortal(
          <SkateTrainingPlanCard state={skateTrainingPlanState} />,
          skateTrainingPlanBoundary.mount
        )
      )}
      {loadedStore !== null && guitarGoalMount !== null && (
        createPortal(
          <GuitarGoalCard
            model={buildGuitarGoalModel(loadedStore)}
            onChange={(field, value) => persistPlannerWrites([
              buildGuitarGoalWrite(field, value)
            ])}
          />,
          guitarGoalMount
        )
      )}
      {guitarSession.model !== null && guitarSessionMount !== null && (
        createPortal(
          <GuitarSessionCard
            model={guitarSession.model}
            onFinish={guitarSession.finishSession}
            onStart={guitarSession.startSession}
          />,
          guitarSessionMount
        )
      )}
      {guitarSession.dialog !== null && guitarSession.request !== null && (
        createPortal(
          <GuitarSessionDialog
            dialog={guitarSession.dialog}
            key={guitarSession.request.revision}
            onCancel={guitarSession.cancelSession}
            onSave={guitarSession.saveSession}
            request={guitarSession.request}
          />,
          guitarSession.dialog
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
  if (requestedView === "moneyView") return <MoneyPage today={today} />;
  if (requestedView === "journalView") return <JournalPage today={today} />;
  if (requestedView === "calendarView") return <CalendarPage today={today} />;
  if (requestedView === "skateView") return <SkatePage today={today} />;
  if (requestedView === null || requestedView === "todayView") return <DashboardPage today={today} />;
  return <LegacyPlannerApp />;
}
