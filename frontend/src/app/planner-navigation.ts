import { useCallback } from "react";
import { useNavigate } from "react-router";

import { toDateKey } from "../shared/planner-date";

export const PLANNER_ROUTES = [
  { id: "todayView", label: "Dashboard", path: "/" },
  { id: "journalView", label: "Journal", path: "/journal" },
  { id: "moneyView", label: "Money", path: "/money" },
  { id: "calendarView", label: "Calendar", path: "/calendar" },
  { id: "skateView", label: "Skate", path: "/skate" },
  { id: "guitarView", label: "Guitar", path: "/guitar" }
] as const;

export type PlannerViewId = typeof PLANNER_ROUTES[number]["id"];

interface PlannerLocation {
  pathname: string;
  search: string;
}

export function plannerPathForView(viewId: string): string | null {
  return PLANNER_ROUTES.find(({ id }) => id === viewId)?.path ?? null;
}

export function plannerLocation(viewId: PlannerViewId, date: Date | string): PlannerLocation {
  const pathname = plannerPathForView(viewId) ?? "/";
  const dateKey = typeof date === "string" ? date : toDateKey(date);
  return { pathname, search: `?date=${encodeURIComponent(dateKey)}` };
}

export type PlannerNavigate = (viewId: PlannerViewId, date: Date | string) => void;

export function usePlannerNavigation(): PlannerNavigate {
  const navigate = useNavigate();
  return useCallback((viewId, date) => {
    void navigate(plannerLocation(viewId, date));
  }, [navigate]);
}

export function plannerDateFromSearch(search: string, fallback: Date): Date {
  const dateKey = new URLSearchParams(search).get("date");
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return fallback;
  }
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
    ? candidate
    : fallback;
}
