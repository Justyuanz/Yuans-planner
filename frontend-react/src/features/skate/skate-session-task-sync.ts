import { linkSessionToTodayTask } from "../sessions/session-task-sync";

export interface SkateTaskSyncResult {
  label: string;
  tasks: unknown[];
}

export function linkSkateSessionToTodayTask(
  rawValue: string | undefined,
  durationHours: number,
  nowIso: string
): SkateTaskSyncResult {
  return linkSessionToTodayTask(rawValue, {
    activityId: "skate",
    defaultLabel: "Skate session",
    durationHours,
    nowIso
  });
}
