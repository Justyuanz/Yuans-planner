export type LifePiePeriod = "day" | "week" | "month" | "all";

export type LifePieActivityId =
  | "lc"
  | "cpp"
  | "python"
  | "skate"
  | "p90x3"
  | "guitar"
  | "meditation"
  | "journal";

export interface LifePieActivityDefinition {
  id: LifePieActivityId;
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
] as const satisfies readonly { id: LifePiePeriod; label: string }[];

export const LIFE_PIE_GROUPS = [
  {
    label: "Study",
    color: "#cbdcf3",
    activities: [
      { id: "lc", label: "Leetcode" },
      { id: "cpp", label: "Coding" },
      { id: "python", label: "Python" }
    ]
  },
  {
    label: "Body",
    color: "#dbe8c7",
    activities: [
      { id: "skate", label: "Skate" },
      { id: "p90x3", label: "Gym / Judo" }
    ]
  },
  {
    label: "Mind",
    color: "#e4d9f3",
    activities: [
      { id: "guitar", label: "Guitar" },
      { id: "meditation", label: "Meditation" },
      { id: "journal", label: "Journal" }
    ]
  }
] as const satisfies readonly LifePieGroupDefinition[];
