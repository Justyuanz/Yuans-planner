import type { TrackedActivityId } from "../../../../shared/activity-categories";
import type { ActivityPeriod } from "../../../../shared/activity-totals";

export interface LifePieActivityDefinition {
  id: TrackedActivityId;
  label: string;
}

export interface LifePieGroupDefinition {
  activities: readonly LifePieActivityDefinition[];
  color: string;
  label: string;
}

export const LIFE_PIE_PERIODS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" }
] as const satisfies readonly { id: ActivityPeriod; label: string }[];

export const LIFE_PIE_GROUPS = [
  {
    label: "Work",
    color: "#cbdcf3",
    activities: [
      { id: "transcendence", label: "Transcendence" },
      { id: "mobileDevelopment", label: "Mobile Development" },
      { id: "portfolioJobPrep", label: "Portfolio / Job Prep" }
    ]
  },
  {
    label: "Body",
    color: "#dbe8c7",
    activities: [
      { id: "skate", label: "Skate" },
      { id: "gym", label: "Gym" }
    ]
  },
  {
    label: "Guitar",
    color: "#e4d9f3",
    activities: [{ id: "guitar", label: "Guitar" }]
  }
] as const satisfies readonly LifePieGroupDefinition[];
