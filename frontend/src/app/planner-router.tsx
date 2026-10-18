import type { ComponentType } from "react";
import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs
} from "react-router";

import {
  PLANNER_ROUTES,
  plannerPathForView,
  type PlannerViewId
} from "./planner-navigation";
import { PlannerPageRoute, type PlannerPageProps } from "./PlannerPageRoute";

type PlannerPageLoader = () => Promise<ComponentType<PlannerPageProps>>;

// Each import becomes a separate build chunk. The browser therefore downloads
// a page only when its route is opened. `satisfies` also makes TypeScript check
// that every view in the navigation table has a corresponding page loader.
const PAGE_LOADER_BY_VIEW = {
  todayView: async () => (await import("../pages/dashboard/DashboardPage")).DashboardPage,
  journalView: async () => (await import("../pages/journal/JournalPage")).JournalPage,
  moneyView: async () => (await import("../pages/money/MoneyPage")).MoneyPage,
  calendarView: async () => (await import("../pages/calendar/CalendarPage")).CalendarPage,
  skateView: async () => (await import("../pages/skate/SkatePage")).SkatePage,
  guitarView: async () => (await import("../pages/guitar/GuitarPage")).GuitarPage
} satisfies Record<PlannerViewId, PlannerPageLoader>;

// Older versions used URLs such as `/?view=journalView&date=2026-09-14`.
// Keep those bookmarks working by translating them once to `/journal?date=...`.
function redirectLegacyView({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const requestedView = url.searchParams.get("view");
  if (requestedView === null) return null;

  url.searchParams.delete("view");
  return redirect(`${plannerPathForView(requestedView) ?? "/"}${url.search}`);
}

// An unknown client-side path returns to the dashboard while preserving useful
// query parameters such as the selected planner date.
function redirectUnknownRoute({ request }: LoaderFunctionArgs) {
  const { search } = new URL(request.url);
  return redirect(`/${search}`);
}

// Navigation labels and router paths come from the same table, so adding or
// renaming a route cannot silently make the sidebar and router disagree.
const pageRoutes = PLANNER_ROUTES.map(({ id, path }) => ({
  path,
  // React Router calls this only after the path matches. The loaded page is
  // passed through PlannerPageRoute, which supplies its `today` prop.
  lazy: async () => ({
    element: <PlannerPageRoute page={await PAGE_LOADER_BY_VIEW[id]()} />
  }),
  // Only the dashboard path can receive the old `?view=` URL format.
  loader: id === "todayView" ? redirectLegacyView : undefined
}));

// This object owns browser history, path matching, loaders, and redirects.
export const plannerRouter = createBrowserRouter([
  ...pageRoutes,
  { path: "*", loader: redirectUnknownRoute }
]);
