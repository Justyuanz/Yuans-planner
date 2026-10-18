import { useMemo, type ComponentType } from "react";
import { useLocation } from "react-router";

import { plannerDateFromSearch } from "./planner-navigation";

export interface PlannerPageProps {
  today: Date;
}

// Route components receive URL state from React Router, while the planner pages
// use a simple `today` prop. This adapter keeps that URL parsing in one place
// instead of repeating it in all six page components.
export function PlannerPageRoute({ page: Page }: { page: ComponentType<PlannerPageProps> }) {
  const { search } = useLocation();
  // Recalculate only when the query string changes, for example after choosing
  // another `?date=YYYY-MM-DD` value.
  const today = useMemo(() => plannerDateFromSearch(search, new Date()), [search]);

  return <Page today={today} />;
}
