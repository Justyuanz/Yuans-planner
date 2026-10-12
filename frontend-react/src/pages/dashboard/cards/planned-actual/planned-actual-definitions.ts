import type { TrackedActivityId } from "../../../../shared/activity-categories";

export type PlannedActivityId = TrackedActivityId;
export type PlannedGroupId = "study" | "leisure";

export interface PlannedActivityDefinition {
  className: string;
  id: PlannedActivityId;
  shortLabel: string;
}

export interface PlannedGroupDefinition {
  activities: readonly PlannedActivityDefinition[];
  id: PlannedGroupId;
  label: string;
}

export const PLANNED_GROUPS = [
  {
    id: "study",
    label: "Study",
    activities: [
      { id: "transcendence", shortLabel: "Transcendence", className: "transcendence" },
      { id: "mobileDevelopment", shortLabel: "Mobile Dev", className: "mobile-development" },
      { id: "portfolioJobPrep", shortLabel: "Portfolio", className: "portfolio-job-prep" }
    ]
  },
  {
    id: "leisure",
    label: "Leisure",
    activities: [
      { id: "skate", shortLabel: "Skate", className: "skate" },
      { id: "gym", shortLabel: "Gym", className: "gym" },
      { id: "guitar", shortLabel: "Guitar", className: "guitar" }
    ]
  }
] as const satisfies readonly PlannedGroupDefinition[];
