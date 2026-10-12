import type { PlannerStore, PlannerStoreWrite } from "../../../../api/planner-store";
import { linkSessionToTodayTask } from "../../../../shared/session-task-sync";
import { GUITAR_FOCUS_STORAGE_KEY, GUITAR_NEXT_STEP_STORAGE_KEY } from "../goal/guitar-goal";
import {
  GUITAR_SESSIONS_STORAGE_KEY,
  guitarSessionDurationMinutes,
  storedGuitarSessions
} from "./guitar-session";

export interface GuitarSessionFeedback {
  durationMinutes: number;
  note: string;
}

interface GuitarSessionSaveOptions {
  nowIso: string;
  sessionId: string;
  sessionStartedAt: string;
  todayKey: string;
}

export interface GuitarSessionSaveResult {
  linkedTaskLabel: string;
  message: string;
  savedSession: Record<string, unknown>;
  writes: PlannerStoreWrite[];
}

function normalizedDurationMinutes(feedback: GuitarSessionFeedback, options: GuitarSessionSaveOptions) {
  const fallback = guitarSessionDurationMinutes(
    options.sessionStartedAt,
    Date.parse(options.nowIso)
  );
  return Math.max(1, Number(feedback.durationMinutes) || fallback);
}

export function buildGuitarSessionSave(
  store: PlannerStore,
  feedback: GuitarSessionFeedback,
  options: GuitarSessionSaveOptions
): GuitarSessionSaveResult {
  const minutes = normalizedDurationMinutes(feedback, options);
  const durationHours = minutes / 60;
  const taskKey = `hivePlanner.dailyTasks.${options.todayKey}`;
  const taskResult = linkSessionToTodayTask(store[taskKey], {
    activityId: "guitar",
    defaultLabel: "Saved session",
    durationHours,
    nowIso: options.nowIso
  });
  const savedSession: Record<string, unknown> = {
    id: options.sessionId,
    focus: store[GUITAR_FOCUS_STORAGE_KEY] ?? "",
    nextStep: store[GUITAR_NEXT_STEP_STORAGE_KEY] ?? "",
    note: feedback.note.trim(),
    durationHours,
    trackedInTask: true,
    startedAt: options.sessionStartedAt,
    finishedAt: options.nowIso
  };
  const sessions = storedGuitarSessions(store[GUITAR_SESSIONS_STORAGE_KEY]);
  sessions.push(savedSession);
  const writes = [
    { key: taskKey, value: JSON.stringify(taskResult.tasks) },
    // The session marks completion, so its compatible task update is persisted first.
    { key: GUITAR_SESSIONS_STORAGE_KEY, value: JSON.stringify(sessions) }
  ];
  return {
    linkedTaskLabel: taskResult.label,
    message: `Session saved and added to "${taskResult.label}".`,
    savedSession,
    writes
  };
}
