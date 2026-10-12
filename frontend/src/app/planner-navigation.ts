// Reading and writing the planner's `?view=` and `?date=` query parameters.

import { toDateKey } from "../shared/planner-date";

export function navigateToPlannerView(viewId: string, date: Date | string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("date", typeof date === "string" ? date : toDateKey(date));
  url.searchParams.set("view", viewId);
  window.location.assign(url);
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
