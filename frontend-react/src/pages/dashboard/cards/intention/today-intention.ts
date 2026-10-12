import type { PlannerStore } from "../../../../api/planner-store";
import { dayTypeForDate } from "../../../../shared/routine-week";

export interface TodayIntentionModel {
  className: string;
  dayTypeLabel: string;
  label: string;
}

const LABEL = "Today's intention";

export function buildTodayIntentionModel(
  store: PlannerStore,
  date: Date
): TodayIntentionModel {
  const type = dayTypeForDate(store, date);
  return {
    className: type.className,
    dayTypeLabel: type.label,
    label: LABEL
  };
}
