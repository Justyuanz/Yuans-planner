import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { journalEntries } from "../journal/journal-entry-store";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { decodeMoneyStore } from "../money-quick/money-quick-store";
import { decodeTasks } from "../tasks/tasks";
import { buildDashboardInsightModel } from "./dashboard-insight";
import { buildDashboardCrossDomainMetrics } from "./dashboard-insight-cross-domain-metrics";
import {
  deriveDashboardInsights,
  selectTopDashboardInsight
} from "./dashboard-insight-rules";
import { buildDashboardTaskMetrics } from "./dashboard-insight-task-metrics";

const ACTIVITY_LOG_KEY = "hivePlanner.activityLog";
const DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks.";
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
  if (rawValue === undefined) {
    return null;
  }
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function taskMapFromStore(store: PlannerStore): Record<string, unknown> {
  return Object.fromEntries(Object.entries(store).flatMap(([key, rawValue]) => {
    if (!key.startsWith(DAILY_TASKS_PREFIX)) {
      return [];
    }
    const dateKey = key.slice(DAILY_TASKS_PREFIX.length);
    const fallbackCreatedAt = `${dateKey}T00:00:00.000Z`;
    return [[dateKey, decodeTasks(rawValue, fallbackCreatedAt)]];
  }));
}

function activityLogFromStore(store: PlannerStore): Record<string, unknown>[] {
  const parsed = parseStoredJson(store[ACTIVITY_LOG_KEY]);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.action !== "string"
      || !VALID_ACTIVITY_ACTIONS.has(candidate.action.trim())
      || typeof candidate.timestamp !== "string" || !candidate.timestamp
      || typeof candidate.entityType !== "string" || !candidate.entityType.trim()
      || typeof candidate.entityId !== "string" || !candidate.entityId.trim()) {
      return [];
    }
    return [{
      ...candidate,
      action: candidate.action.trim(),
      dateKey: typeof candidate.dateKey === "string" ? candidate.dateKey : "",
      entityId: candidate.entityId.trim(),
      entityType: candidate.entityType.trim(),
      field: typeof candidate.field === "string" ? candidate.field : "",
      id: typeof candidate.id === "string" ? candidate.id : "",
      timestamp: candidate.timestamp
    }];
  }).sort((left, right) => {
    const timestampOrder = left.timestamp.localeCompare(right.timestamp);
    return timestampOrder !== 0 ? timestampOrder : left.id.localeCompare(right.id);
  });
}

export function buildDashboardInsightMetricsFromStore(
  store: PlannerStore,
  referenceDate: Date,
  requestedLookbackDays = 14
) {
  const currentDateKey = formatPlannerDate(referenceDate);
  const lookbackDays = Math.max(1, Number(requestedLookbackDays) || 14);
  const activityLog = activityLogFromStore(store);
  const taskMetrics = buildDashboardTaskMetrics({
    activityLog,
    currentDateKey,
    lookbackDays,
    taskMap: taskMapFromStore(store)
  });
  const moneyState = decodeMoneyStore(store, referenceDate);
  const crossDomainMetrics = buildDashboardCrossDomainMetrics({
    activityLog,
    currentDateKey,
    dailySummaries: taskMetrics.dailySummaries,
    journalEntries: journalEntries(store),
    lookbackDays,
    moneyState,
    moneyTransactions: moneyState.transactions
  });
  return {
    currentDateKey,
    lookbackDays,
    ...taskMetrics,
    ...crossDomainMetrics
  };
}

export function buildDashboardInsightFromStore(
  store: PlannerStore,
  referenceDate: Date,
  lookbackDays = 14
) {
  const metrics = buildDashboardInsightMetricsFromStore(store, referenceDate, lookbackDays);
  const insights = deriveDashboardInsights(metrics);
  return buildDashboardInsightModel(selectTopDashboardInsight(insights));
}
