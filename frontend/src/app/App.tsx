import { useMemo } from "react";

import { CalendarPage } from "../pages/calendar/CalendarPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { GuitarPage } from "../pages/guitar/GuitarPage";
import { JournalPage } from "../pages/journal/JournalPage";
import { plannerDateFromSearch } from "./planner-navigation";
import { MoneyPage } from "../pages/money/MoneyPage";
import { SkatePage } from "../pages/skate/SkatePage";

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
