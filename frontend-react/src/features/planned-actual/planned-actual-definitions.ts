export type PlannedActivityId = "lc" | "cpp" | "python" | "skate" | "p90x3" | "guitar";
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
      { id: "lc", shortLabel: "lc", className: "lc" },
      { id: "cpp", shortLabel: "Coding", className: "cpp" },
      { id: "python", shortLabel: "Python", className: "python" }
    ]
  },
  {
    id: "leisure",
    label: "Leisure",
    activities: [
      { id: "skate", shortLabel: "Skate", className: "skate" },
      { id: "p90x3", shortLabel: "Gym / Judo", className: "gym" },
      { id: "guitar", shortLabel: "Guitar", className: "guitar" }
    ]
  }
] as const satisfies readonly PlannedGroupDefinition[];
