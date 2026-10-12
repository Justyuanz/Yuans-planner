import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { decodeActivityLog } from "@/shared/activity-log";
import { isRecord } from "@/shared/is-record";
import { ACTIVITY_LOG_KEY } from "@/shared/tasks/tasks";
import {
  DAY_STATE_STORAGE_KEY,
  type DayStateId
} from "./day-state";

interface DayStateWriteIdentity {
  activityId: string;
  timestamp: string;
}

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
  const log = decodeActivityLog(store[ACTIVITY_LOG_KEY]);
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
