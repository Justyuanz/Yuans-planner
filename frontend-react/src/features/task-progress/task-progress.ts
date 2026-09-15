import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";

export interface TaskProgressModel {
  message: string;
  progress: string;
}

const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
const MESSAGE = "Tasks from your calendar and planner.";

function storedTasks(store: PlannerStore, dateKey: string): Readonly<Record<string, unknown>>[] {
  try {
    const parsed: unknown = JSON.parse(store[`${DAILY_TASKS_PREFIX}${dateKey}`] ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((candidate): candidate is Readonly<Record<string, unknown>> => (
      isRecord(candidate)
      && typeof candidate.label === "string"
      && Boolean(candidate.label.trim())
    ));
  } catch {
    return [];
  }
}

export function buildTaskProgressModel(store: PlannerStore, dateKey: string): TaskProgressModel {
  const tasks = storedTasks(store, dateKey);
  const doneCount = tasks.filter((task) => Boolean(task.done)).length;
  return {
    message: MESSAGE,
    progress: `${doneCount} / ${tasks.length} tasks done today`
  };
}
