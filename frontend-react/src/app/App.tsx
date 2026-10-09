import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard-page/DashboardPage";
import { GuitarPage } from "../features/guitar/GuitarPage";
import { JournalPage } from "../features/journal-page/JournalPage";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { MoneyActivityCard } from "../features/money-activity/MoneyActivityCard";
import { MoneyBudgetsCard } from "../features/money-budgets/MoneyBudgetsCard";
import { MoneyOverviewCard } from "../features/money-overview/MoneyOverviewCard";
import { MoneyPacingCard } from "../features/money-pacing/MoneyPacingCard";
import { MoneyQuickCard } from "../features/money-quick/MoneyQuickCard";
import { MoneyVendorsCard } from "../features/money-vendors/MoneyVendorsCard";
import { MoneyPage } from "../features/money-page/MoneyPage";
import { SkatePage } from "../features/skate/SkatePage";
import { usePlannerStore } from "./use-planner-store";
import { persistPlannerWrites } from "./planner-persistence";

function LegacyPlannerApp() {
  const plannerStore = usePlannerStore();
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const [moneyActivityMount, setMoneyActivityMount] = useState<HTMLElement | null>(null);
  const [moneyBudgetsMount, setMoneyBudgetsMount] = useState<HTMLElement | null>(null);
  const [moneyOverviewMount, setMoneyOverviewMount] = useState<HTMLElement | null>(null);
  const [moneyPacingMount, setMoneyPacingMount] = useState<HTMLElement | null>(null);
  const [moneyQuickMount, setMoneyQuickMount] = useState<HTMLElement | null>(null);
  const [moneyVendorsMount, setMoneyVendorsMount] = useState<HTMLElement | null>(null);
  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  function claimReactMounts(frame: HTMLIFrameElement): void {
    const document = frame.contentDocument;
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

  }

  return (
    <>
      <iframe
        className="planner-frame"
        onLoad={(event) => claimReactMounts(event.currentTarget)}
        src={legacyUrl}
        title="Yuan's Planner"
      />
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
