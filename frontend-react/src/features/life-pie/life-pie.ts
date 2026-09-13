import type { PlannerStore } from "../../api/planner-store";
import {
  LIFE_PIE_GROUPS,
  type LifePieActivityId,
  type LifePiePeriod
} from "./life-pie-definitions";
import { lifePieTotalsForPeriod } from "./life-pie-store";

export type { LifePiePeriod } from "./life-pie-definitions";

export interface LifePieActivity {
  color: string;
  hours: number;
  id: LifePieActivityId;
  label: string;
  summary: string;
}

export interface LifePieGroup {
  color: string;
  hours: number;
  label: string;
  summary: string;
}

export interface LifePieModel {
  activities: readonly LifePieActivity[];
  ariaLabel: string;
  background: string;
  formattedTotal: string;
  groups: readonly LifePieGroup[];
  totalHours: number;
}

export function formatLifePieHours(value: number): string {
  const hours = Number.isFinite(value) ? value : 0;
  if (Math.abs(hours - Math.round(hours)) < 0.001) {
    return `${Math.round(hours)}h`;
  }
  return `${Math.round(hours * 100) / 100}h`;
}

function percentage(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

export function buildLifePie(
  store: PlannerStore,
  period: LifePiePeriod,
  today: Date,
  nowMs: number = Date.now()
): LifePieModel {
  const totals = lifePieTotalsForPeriod(store, period, today, nowMs);
  const groupHours = LIFE_PIE_GROUPS.map((group) => group.activities.reduce(
    (sum, activity) => sum + totals[activity.id],
    0
  ));
  const totalHours = groupHours.reduce((sum, hours) => sum + hours, 0);
  let degrees = 0;
  const stops = LIFE_PIE_GROUPS.map((group, index) => {
    const from = degrees;
    degrees += totalHours ? ((groupHours[index] ?? 0) / totalHours) * 360 : 0;
    return `${group.color} ${from}deg ${degrees}deg`;
  });
  const groups = LIFE_PIE_GROUPS.map((group, index) => {
    const hours = groupHours[index] ?? 0;
    return {
      color: group.color,
      hours,
      label: group.label,
      summary: `${percentage(hours, totalHours)}% · ${formatLifePieHours(hours)}`
    };
  });
  const activities = LIFE_PIE_GROUPS.flatMap((group) => group.activities.map((activity) => {
    const hours = totals[activity.id];
    return {
      color: group.color,
      hours,
      id: activity.id,
      label: activity.label,
      summary: `${percentage(hours, totalHours)}% · ${formatLifePieHours(hours)}`
    };
  }));

  return {
    activities,
    ariaLabel: groups.map((group) => `${group.label} ${formatLifePieHours(group.hours)}`).join(", "),
    background: totalHours ? `conic-gradient(${stops.join(",")})` : "#efedf2",
    formattedTotal: formatLifePieHours(totalHours),
    groups,
    totalHours
  };
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
