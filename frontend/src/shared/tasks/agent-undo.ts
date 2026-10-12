import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { decodeActivityLog } from "../activity-log";
import { isRecord } from "../is-record";
import { ACTIVITY_LOG_KEY, decodeTasks } from "./tasks";

export const AGENT_UI_STATE_KEY = "hivePlanner.agent.uiState";
export const AGENT_UNDO_KEY = "hivePlanner.agent.undo";

interface AgentUndoIdentity {
  activityId: string;
  timestamp: string;
}

interface AgentUndoResult {
  actionLabel: string | null;
  undone: boolean;
  writes: PlannerStoreWrite[];
}

interface UndoEntry {
  actionId: string;
  actionLabel: string;
  after: unknown;
  before: Record<string, unknown>;
  todayKey: string;
  tomorrowKey: string;
}

function parseStoredJson(rawValue: string | undefined): unknown {
  try {
    return rawValue === undefined ? null : JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function undoStack(rawValue: string | undefined): unknown[] {
  const parsed = parseStoredJson(rawValue);
  return Array.isArray(parsed) ? parsed.slice() : [];
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function decodeUndoEntry(candidate: unknown): UndoEntry | null {
  if (!isRecord(candidate) || !isRecord(candidate.snapshot) || !isRecord(candidate.snapshot.before)) {
    return null;
  }
  const actionId = nonEmptyString(candidate.actionId);
  const actionLabel = nonEmptyString(candidate.actionLabel);
  const todayKey = nonEmptyString(candidate.todayKey);
  const tomorrowKey = nonEmptyString(candidate.tomorrowKey);
  if (actionId === null || actionLabel === null || todayKey === null || tomorrowKey === null) {
    return null;
  }
  return {
    actionId,
    actionLabel,
    after: candidate.snapshot.after,
    before: candidate.snapshot.before,
    todayKey,
    tomorrowKey
  };
}

function normalizeAgentState(value: unknown): Record<string, unknown> {
  const state = isRecord(value) ? { ...value } : {};
  return {
    ...state,
    dayStates: isRecord(state.dayStates) ? { ...state.dayStates } : {},
    hiddenTaskIdsByDate: isRecord(state.hiddenTaskIdsByDate)
      ? { ...state.hiddenTaskIdsByDate }
      : {}
  };
}

function snapshotTasks(value: unknown, dateKey: string, fallbackCreatedAt: string) {
  const tasks = Array.isArray(value) ? value : [];
  return decodeTasks(JSON.stringify(tasks), fallbackCreatedAt || `${dateKey}T00:00:00.000Z`);
}

export function buildAgentUndoWrites(
  store: PlannerStore,
  identity: AgentUndoIdentity
): AgentUndoResult {
  const stack = undoStack(store[AGENT_UNDO_KEY]);
  const candidate = stack.pop();
  const writes: PlannerStoreWrite[] = [{
    key: AGENT_UNDO_KEY,
    value: JSON.stringify(stack.slice(-10))
  }];
  const entry = decodeUndoEntry(candidate);
  if (entry === null) {
    return { actionLabel: null, undone: false, writes };
  }

  const todayTasks = snapshotTasks(entry.before.todayTasks, entry.todayKey, identity.timestamp);
  const tomorrowTasks = snapshotTasks(entry.before.tomorrowTasks, entry.tomorrowKey, identity.timestamp);
  const agentState = normalizeAgentState(entry.before.agentState);
  const log = decodeActivityLog(store[ACTIVITY_LOG_KEY]);
  log.push({
    action: "agent_action_undone",
    after: entry.before,
    before: entry.after,
    dateKey: entry.todayKey,
    entityId: entry.actionId,
    entityType: "agent_action",
    field: "",
    id: identity.activityId,
    meta: { label: entry.actionLabel },
    timestamp: identity.timestamp
  });
  writes.push(
    { key: `hivePlanner.dailyTasks.${entry.todayKey}`, value: JSON.stringify(todayTasks) },
    { key: `hivePlanner.dailyTasks.${entry.tomorrowKey}`, value: JSON.stringify(tomorrowTasks) },
    { key: AGENT_UI_STATE_KEY, value: JSON.stringify(agentState) },
    { key: ACTIVITY_LOG_KEY, value: JSON.stringify(log) }
  );
  return { actionLabel: entry.actionLabel, undone: true, writes };
}
