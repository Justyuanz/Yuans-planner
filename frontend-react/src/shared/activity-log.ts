import { isRecord } from "./is-record";

export interface ActivityLogEntry {
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

function normalizeActivityEntry(candidate: unknown): ActivityLogEntry | null {
  if (!isRecord(candidate)) return null;
  const action = typeof candidate.action === "string" ? candidate.action.trim() : "";
  const timestamp = typeof candidate.timestamp === "string" ? candidate.timestamp : "";
  const entityType = typeof candidate.entityType === "string" ? candidate.entityType.trim() : "";
  const entityId = typeof candidate.entityId === "string" ? candidate.entityId.trim() : "";
  if (!VALID_ACTIVITY_ACTIONS.has(action) || !timestamp || !entityType || !entityId) return null;
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

export function decodeActivityLog(rawValue: string | undefined): ActivityLogEntry[] {
  try {
    const parsed: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeActivityEntry)
      .filter((entry): entry is ActivityLogEntry => entry !== null)
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp)
        || left.id.localeCompare(right.id));
  } catch {
    return [];
  }
}
