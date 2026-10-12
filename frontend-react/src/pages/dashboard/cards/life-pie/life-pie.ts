import type { PlannerStore } from "@/api/planner-store";
import type { TrackedActivityId } from "@/shared/activity-categories";
import { activityTotalsForPeriod, type ActivityPeriod } from "@/shared/activity-totals";
import { formatHours } from "@/shared/format-hours";
import { LIFE_PIE_GROUPS } from "./life-pie-definitions";

export type { ActivityPeriod } from "@/shared/activity-totals";

export interface LifePieActivity {
  color: string;
  hours: number;
  id: TrackedActivityId;
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

function percentage(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

export function buildLifePie(
  store: PlannerStore,
  period: ActivityPeriod,
  today: Date,
  nowMs: number = Date.now()
): LifePieModel {
  const totals = activityTotalsForPeriod(store, period, today, nowMs);
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
      summary: `${percentage(hours, totalHours)}% · ${formatHours(hours)}`
    };
  });
  const activities = LIFE_PIE_GROUPS.flatMap((group) => group.activities.map((activity) => {
    const hours = totals[activity.id];
    return {
      color: group.color,
      hours,
      id: activity.id,
      label: activity.label,
      summary: `${percentage(hours, totalHours)}% · ${formatHours(hours)}`
    };
  }));

  return {
    activities,
    ariaLabel: groups.map((group) => `${group.label} ${formatHours(group.hours)}`).join(", "),
    background: totalHours ? `conic-gradient(${stops.join(",")})` : "#efedf2",
    formattedTotal: formatHours(totalHours),
    groups,
    totalHours
  };
}
