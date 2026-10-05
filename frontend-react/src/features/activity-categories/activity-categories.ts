import { isRecord } from "../../shared/is-record";

export type TrackedActivityId =
  | "transcendence"
  | "mobileDevelopment"
  | "portfolioJobPrep"
  | "skate"
  | "gym"
  | "guitar";

export type ActivityId = TrackedActivityId | "other";
export type ActivityGroupId = "study" | "leisure" | "other";

export interface ActivityDefinition {
  className: string;
  group: ActivityGroupId;
  id: ActivityId;
  label: string;
  shortLabel: string;
  showInStats?: false;
  trackTime?: false;
}

export const ACTIVITY_DEFINITIONS = [
  {
    id: "transcendence",
    label: "Transcendence",
    shortLabel: "Transcendence",
    className: "transcendence",
    group: "study"
  },
  {
    id: "mobileDevelopment",
    label: "Mobile Development",
    shortLabel: "Mobile Dev",
    className: "mobile-development",
    group: "study"
  },
  {
    id: "portfolioJobPrep",
    label: "Portfolio / Job Prep",
    shortLabel: "Portfolio",
    className: "portfolio-job-prep",
    group: "study"
  },
  { id: "skate", label: "Skate", shortLabel: "Skate", className: "skate", group: "leisure" },
  { id: "gym", label: "Gym", shortLabel: "Gym", className: "gym", group: "leisure" },
  { id: "guitar", label: "Guitar", shortLabel: "Guitar", className: "guitar", group: "leisure" },
  {
    id: "other",
    label: "Other",
    shortLabel: "Other",
    className: "other",
    group: "other",
    showInStats: false
  }
] as const satisfies readonly ActivityDefinition[];

const LEGACY_ACTIVITY_IDS = {
  cpp: "transcendence",
  fso: "transcendence",
  python: "mobileDevelopment",
  lc: "portfolioJobPrep",
  p90x3: "gym"
} as const satisfies Readonly<Record<string, TrackedActivityId>>;

const ACTIVE_IDS = new Set<ActivityId>(ACTIVITY_DEFINITIONS.map(({ id }) => id));
const PLANNED_IDS = new Set<TrackedActivityId>(
  ACTIVITY_DEFINITIONS.filter(({ id }) => id !== "other")
    .map(({ id }) => id as TrackedActivityId)
);

export function normalizeActivityId(value: unknown): ActivityId {
  const id = typeof value === "string" ? value.trim() : "";
  if (id in LEGACY_ACTIVITY_IDS) {
    return LEGACY_ACTIVITY_IDS[id as keyof typeof LEGACY_ACTIVITY_IDS];
  }
  return ACTIVE_IDS.has(id as ActivityId) ? id as ActivityId : "other";
}

export function migratePlannedActivityValues(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const migrated: Record<string, unknown> = {};
  Object.entries(value).forEach(([storedId, storedValue]) => {
    const normalizedId = normalizeActivityId(storedId);
    const isKnownId = storedId in LEGACY_ACTIVITY_IDS
      || PLANNED_IDS.has(storedId as TrackedActivityId);
    if (!isKnownId) {
      migrated[storedId] = storedValue;
      return;
    }

    const hours = Number(storedValue);
    if (!Number.isFinite(hours) || normalizedId === "other") {
      return;
    }
    migrated[normalizedId] = Number(migrated[normalizedId] ?? 0) + hours;
  });
  return migrated;
}
