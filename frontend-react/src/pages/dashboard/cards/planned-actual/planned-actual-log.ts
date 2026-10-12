import { isRecord } from "../../../../shared/is-record";
import type { PlannedActivityId, PlannedGroupId } from "./planned-actual-definitions";

const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";
const VALID_ACTIONS = new Set([
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

interface PlannedLogInput {
  activityId: PlannedActivityId;
  after: number;
  before: number;
  groupId: PlannedGroupId;
  id: string;
  timestamp: string;
  weekKey: string;
}

interface NormalizedActivityLogEntry {
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

function parseArray(rawValue: string | undefined): unknown[] {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEntry(candidate: unknown): NormalizedActivityLogEntry | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const action = typeof candidate.action === "string" ? candidate.action.trim() : "";
  const timestamp = typeof candidate.timestamp === "string" ? candidate.timestamp : "";
  const entityType = typeof candidate.entityType === "string" ? candidate.entityType.trim() : "";
  const entityId = typeof candidate.entityId === "string" ? candidate.entityId.trim() : "";
  if (!VALID_ACTIONS.has(action) || !timestamp || !entityType || !entityId) {
    return null;
  }
  return {
    id: typeof candidate.id === "string" ? candidate.id : "",
    timestamp,
    action,
    entityType,
    entityId,
    dateKey: typeof candidate.dateKey === "string" ? candidate.dateKey : "",
    field: typeof candidate.field === "string" ? candidate.field : "",
    before: candidate.before,
    after: candidate.after,
    meta: isRecord(candidate.meta) ? { ...candidate.meta } : {}
  };
}

export function appendPlannedActivityLog(rawValue: string | undefined, input: PlannedLogInput): string {
  const entries = parseArray(rawValue)
    .map(normalizeEntry)
    .filter((entry): entry is NormalizedActivityLogEntry => entry !== null)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id));

  entries.push({
    id: input.id,
    timestamp: input.timestamp,
    action: "planned_hours_updated",
    entityType: "planned_hours",
    entityId: input.activityId,
    dateKey: input.weekKey,
    field: input.activityId,
    before: input.before,
    after: input.after,
    meta: { group: input.groupId, activity: input.activityId }
  });
  return JSON.stringify(entries);
}

export { ACTIVITY_LOG_KEY };
