import { useMemo } from "react";

import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard-page/DashboardPage";
import { GuitarPage } from "../features/guitar/GuitarPage";
import { JournalPage } from "../features/journal-page/JournalPage";
import { plannerDateFromSearch } from "../features/life-pie/life-pie";
import { MoneyPage } from "../features/money-page/MoneyPage";
import { SkatePage } from "../features/skate/SkatePage";

export function App() {
  const today = useMemo(() => plannerDateFromSearch(window.location.search, new Date()), []);
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (requestedView === "moneyView") return <MoneyPage today={today} />;
  if (requestedView === "journalView") return <JournalPage today={today} />;
  if (requestedView === "calendarView") return <CalendarPage today={today} />;
  if (requestedView === "skateView") return <SkatePage today={today} />;
  if (requestedView === "guitarView") return <GuitarPage today={today} />;
  return <DashboardPage today={today} />;
}
