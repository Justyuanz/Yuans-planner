import { isRecord } from "../../shared/is-record";

export interface SkateTaskSyncResult {
  label: string;
  tasks: unknown[];
}

function storedTasks(rawValue: string | undefined): unknown[] {
  try {
    const parsed: unknown = rawValue === undefined ? [] : JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((task: unknown) => task) : [];
  } catch {
    return [];
  }
}

function elapsedTaskSeconds(task: Readonly<Record<string, unknown>>, nowMs: number): number {
  const base = Number(task.timerSeconds);
  let seconds = Number.isFinite(base) ? Math.max(0, base) : 0;
  if (typeof task.timerStartedAt === "string" && task.timerStartedAt) {
    const startedAt = Date.parse(task.timerStartedAt);
    const elapsed = Math.floor((nowMs - startedAt) / 1000);
    if (Number.isFinite(elapsed)) seconds += Math.max(0, elapsed);
  }
  return Math.max(0, seconds);
}

function isSkateTask(task: unknown): task is Record<string, unknown> {
  return isRecord(task) && task.activity === "skate";
}

function matchingTaskIndex(tasks: readonly unknown[]): number {
  const ready = tasks.findIndex((task) => isSkateTask(task) && !task.done && !task.timerStartedAt);
  if (ready >= 0) return ready;
  const unfinished = tasks.findIndex((task) => isSkateTask(task) && !task.done);
  return unfinished >= 0 ? unfinished : tasks.findIndex(isSkateTask);
}

export function linkSkateSessionToTodayTask(
  rawValue: string | undefined,
  durationHours: number,
  nowIso: string
): SkateTaskSyncResult {
  const tasks = storedTasks(rawValue).map((task) => isRecord(task) ? { ...task } : task);
  const matchIndex = matchingTaskIndex(tasks);
  const addedSeconds = Math.round(durationHours * 3600);
  const nowMs = Date.parse(nowIso);
  if (matchIndex < 0) {
    tasks.push({
      id: `auto-skate-${nowMs}`,
      label: "Skate session",
      activity: "skate",
      hours: Math.round((addedSeconds / 3600) * 100) / 100,
      timerSeconds: addedSeconds,
      timerStartedAt: null,
      done: true,
      createdAt: nowIso,
      sourceEventId: ""
    });
    return { label: "Skate session", tasks };
  }
  const task = tasks[matchIndex] as Record<string, unknown>;
  const timerSeconds = elapsedTaskSeconds(task, nowMs) + addedSeconds;
  tasks[matchIndex] = {
    ...task,
    timerStartedAt: null,
    timerSeconds,
    hours: Math.round((timerSeconds / 3600) * 100) / 100,
    done: true
  };
  return {
    label: typeof task.label === "string" && task.label ? task.label : "Skate session",
    tasks
  };
}
