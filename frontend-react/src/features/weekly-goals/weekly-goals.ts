import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";

export const WEEKLY_GOALS_STORAGE_KEY = "hivePlanner.weeklyGoals";

const WEEKLY_GOAL_DEFINITIONS = [
  {
    id: "study",
    label: "Study",
    placeholder: "One study focus worth finishing this week."
  },
  {
    id: "body",
    label: "Body",
    placeholder: "Skate, gym, or recovery that would help."
  },
  {
    id: "mind",
    label: "Mind",
    placeholder: "Guitar, reading, or something steadying."
  }
] as const;

export type WeeklyGoalId = (typeof WEEKLY_GOAL_DEFINITIONS)[number]["id"];

export interface WeeklyGoal {
  id: WeeklyGoalId;
  label: string;
  placeholder: string;
  text: string;
}

function parseWeeklyGoalValues(rawValue: string | undefined): Record<string, unknown> {
  if (rawValue === undefined) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return isRecord(parsed) ? parsed : {};
  } catch {
    // Invalid legacy values remain stored but render empty, matching the current app.
    return {};
  }
}

export function decodeWeeklyGoals(store: PlannerStore): WeeklyGoal[] {
  const values = parseWeeklyGoalValues(store[WEEKLY_GOALS_STORAGE_KEY]);

  return WEEKLY_GOAL_DEFINITIONS.map((definition) => {
    const text = values[definition.id];
    return {
      ...definition,
      text: typeof text === "string" ? text : ""
    };
  });
}

export function encodeWeeklyGoalUpdate(
  store: PlannerStore,
  goalId: WeeklyGoalId,
  text: string
): string {
  const values = parseWeeklyGoalValues(store[WEEKLY_GOALS_STORAGE_KEY]);
  return JSON.stringify({
    ...values,
    [goalId]: text.trim()
  });
}
