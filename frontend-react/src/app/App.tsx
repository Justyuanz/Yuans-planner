import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard-page/DashboardPage";
import { GuitarGoalCard } from "../features/guitar/GuitarGoalCard";
import { GuitarPage } from "../features/guitar/GuitarPage";
import { GuitarSessionCard } from "../features/guitar/GuitarSessionCard";
import { GuitarSessionDialog } from "../features/guitar/GuitarSessionDialog";
import { buildGuitarGoalModel, buildGuitarGoalWrite } from "../features/guitar/guitar-goal";
import { useGuitarSessionController } from "../features/guitar/use-guitar-session-controller";
import { JournalPage } from "../features/journal-page/JournalPage";
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
  const [guitarGoalMount, setGuitarGoalMount] = useState<HTMLElement | null>(null);
  const [guitarSessionMount, setGuitarSessionMount] = useState<HTMLElement | null>(null);
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
  const [selectedJournalDateKey, setSelectedJournalDateKey] = useState(formatPlannerDate(today));
  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  const skateTrainingPlanState: SkateTrainingPlanState | null = useMemo(
    () => loadedStore === null ? null : buildSkateTrainingPlanState(loadedStore, today),
    [loadedStore, today]
  );
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

  function claimReactMounts(frame: HTMLIFrameElement): void {
    const document = frame.contentDocument;
    const journalDate = document?.querySelector<HTMLInputElement>("#journalDate");
    setLegacyFrame(frame);
    setSelectedJournalDateKey(selectedJournalDate(journalDate, formatPlannerDate(today)));
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

  return (
    <>
      <iframe
        className="planner-frame"
        onLoad={(event) => claimReactMounts(event.currentTarget)}
        src={legacyUrl}
        title="Yuan's Planner"
      />
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
  if (requestedView === "guitarView") return <GuitarPage today={today} />;
  if (requestedView === null || requestedView === "todayView") return <DashboardPage today={today} />;
  return <LegacyPlannerApp />;
}
