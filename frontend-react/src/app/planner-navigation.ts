import { formatPlannerDate } from "../features/life-pie/life-pie-store";

export function navigateToPlannerView(viewId: string, date: Date | string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("date", typeof date === "string" ? date : formatPlannerDate(date));
  url.searchParams.set("view", viewId);
  window.location.assign(url);
}
