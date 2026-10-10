import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard-page/DashboardPage";
import { GuitarPage } from "../features/guitar/GuitarPage";
import { JournalPage } from "../features/journal-page/JournalPage";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { MoneyBudgetsCard } from "../features/money-budgets/MoneyBudgetsCard";
import { MoneyPage } from "../features/money-page/MoneyPage";
import { SkatePage } from "../features/skate/SkatePage";
import { usePlannerStore } from "./use-planner-store";
import { persistPlannerWrites } from "./planner-persistence";

function LegacyPlannerApp() {
  const plannerStore = usePlannerStore();
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const [moneyBudgetsMount, setMoneyBudgetsMount] = useState<HTMLElement | null>(null);
  const legacyUrl = `/legacy/${window.location.search}`;
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  function claimReactMounts(frame: HTMLIFrameElement): void {
    const document = frame.contentDocument;
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
