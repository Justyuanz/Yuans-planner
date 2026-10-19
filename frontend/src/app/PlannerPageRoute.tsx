import { useMemo, type ComponentType } from "react";
import { useLocation } from "react-router";

import { plannerDateForRoute } from "./planner-navigation";

export interface PlannerPageProps {
  today: Date;
}

// Route components receive URL state from React Router, while the planner pages
// use a simple `today` prop. This adapter keeps that URL parsing in one place
// instead of repeating it in all six page components.
export function PlannerPageRoute({ page: Page }: { page: ComponentType<PlannerPageProps> }) {
  const { pathname, search } = useLocation();
  const today = useMemo(
    () => plannerDateForRoute(pathname, search, new Date()),
    [pathname, search]
  );

  return <Page today={today} />;
}
