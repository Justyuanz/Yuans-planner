import { useMemo, type ComponentType } from "react";
import { useLocation } from "react-router";

import { plannerDateFromSearch } from "./planner-navigation";

export interface PlannerPageProps {
  today: Date;
}

function pageWasReloaded(): boolean {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}

// Route components receive URL state from React Router, while the planner pages
// use a simple `today` prop. This adapter keeps that URL parsing in one place
// instead of repeating it in all six page components.
export function PlannerPageRoute({ page: Page }: { page: ComponentType<PlannerPageProps> }) {
  const { pathname, search } = useLocation();
  // Recalculate only when the query string changes, for example after choosing
  // another `?date=YYYY-MM-DD` value.
  const today = useMemo(() => {
    const currentDate = new Date();

    // A refreshed Dashboard means "show me today", even if yesterday's date
    // is still in the address bar. Other pages may intentionally show old dates.
    if (pathname === "/" && pageWasReloaded()) return currentDate;

    return plannerDateFromSearch(search, currentDate);
  }, [pathname, search]);

  return <Page today={today} />;
}
