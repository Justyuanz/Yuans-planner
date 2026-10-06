import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { ACTIVITY_LOG_KEY } from "../tasks/tasks";
import {
  DAY_STATE_STORAGE_KEY,
  type DayStateId
} from "./day-state";

interface DayStateWriteIdentity {
  activityId: string;
  timestamp: string;
}

interface ActivityLogEntry {
  action: string;
  after: unknown;
  before: unknown;
  dateKey: string;
  entityId: string;
  entityType: string;
  field: string;
  id: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

const VALID_ACTIVITY_ACTIONS = new Set([
  "task_created",
  "task_updated",
  "task_deleted",
  "task_done_changed",
  "task_timer_started",
  "task_timer_paused",
  "task_timer_ended",
  "planned_hours_updated",
  "money_transaction_created",
  "money_transaction_updated",
  "money_transaction_deleted",
  "journal_entry_created",
  "journal_entry_updated",
  "journal_entry_deleted",
  "day_state_updated",
  "agent_action_applied",
  "agent_action_undone"
]);

function parseStoredJson(rawValue: string | undefined): unknown {
  try {
    return rawValue === undefined ? null : JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function dayStateMap(rawValue: string | undefined): Record<string, unknown> {
  const parsed = parseStoredJson(rawValue);
  return isRecord(parsed) ? { ...parsed } : {};
}

function normalizeActivityEntry(candidate: unknown): ActivityLogEntry | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const action = typeof candidate.action === "string" ? candidate.action.trim() : "";
  const timestamp = typeof candidate.timestamp === "string" ? candidate.timestamp : "";
  const entityType = typeof candidate.entityType === "string" ? candidate.entityType.trim() : "";
  const entityId = typeof candidate.entityId === "string" ? candidate.entityId.trim() : "";
  if (!VALID_ACTIVITY_ACTIONS.has(action) || !timestamp || !entityType || !entityId) {
    return null;
  }
  return {
    action,
    after: candidate.after,
    before: candidate.before,
    dateKey: typeof candidate.dateKey === "string" ? candidate.dateKey : "",
    entityId,
    entityType,
    field: typeof candidate.field === "string" ? candidate.field : "",
    id: typeof candidate.id === "string" ? candidate.id : "",
    meta: isRecord(candidate.meta) ? { ...candidate.meta } : {},
    timestamp
  };
}

function activityLog(rawValue: string | undefined): ActivityLogEntry[] {
  const parsed = parseStoredJson(rawValue);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map(normalizeActivityEntry)
    .filter((entry): entry is ActivityLogEntry => entry !== null)
    .sort((left, right) => {
      const timestampOrder = left.timestamp.localeCompare(right.timestamp);
      return timestampOrder !== 0 ? timestampOrder : left.id.localeCompare(right.id);
    });
}

function legacyPreviousState(value: unknown): unknown {
  // The legacy audit contract treats every falsy stored value as the steady default.
  if (!value) {
    return "okay";
  }
  return value;
}

export function buildDayStateWrites(
  store: PlannerStore,
  dateKey: string,
  state: DayStateId,
  identity: DayStateWriteIdentity
): PlannerStoreWrite[] {
  const stateMap = dayStateMap(store[DAY_STATE_STORAGE_KEY]);
  const before = legacyPreviousState(stateMap[dateKey]);
  stateMap[dateKey] = state;
  const log = activityLog(store[ACTIVITY_LOG_KEY]);
  log.push({
    action: "day_state_updated",
    after: state,
    before,
    dateKey,
    entityId: dateKey,
    entityType: "day_state",
    field: "",
    id: identity.activityId,
    meta: {},
    timestamp: identity.timestamp
  });
  return [
    { key: DAY_STATE_STORAGE_KEY, value: JSON.stringify(stateMap) },
    { key: ACTIVITY_LOG_KEY, value: JSON.stringify(log) }
  ];
}
