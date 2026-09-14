import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import {
  DEFAULT_VENDOR_RULES,
  MONEY_ACTIVITY_LOG_KEY,
  MONEY_TRANSACTIONS_KEY,
  MONEY_VENDOR_RULES_KEY,
  type MoneyTransaction
} from "./money-quick-definitions";

interface MoneyTransactionInput {
  amountCents: number;
  categoryId: string;
  vendor: string;
}

interface MoneyTransactionIdentity {
  activityId: string;
  timestamp: string;
  transactionId: string;
  vendorRuleId: string;
}

export interface MoneyTransactionUpdate {
  nextStore: PlannerStore;
  transaction: MoneyTransaction;
  writes: readonly PlannerStoreWrite[];
}

const VALID_ACTIVITY_ACTIONS = new Set([
  "task_created", "task_updated", "task_deleted", "task_done_changed",
  "task_timer_started", "task_timer_paused", "task_timer_ended", "planned_hours_updated",
  "money_transaction_created", "money_transaction_updated", "money_transaction_deleted",
  "journal_entry_created", "journal_entry_updated", "journal_entry_deleted",
  "day_state_updated", "agent_action_applied", "agent_action_undone"
]);

function parseArray(rawValue: string | undefined): unknown[] | null {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function encodeTransactions(rawValue: string | undefined, transaction: MoneyTransaction): string {
  const existing = (parseArray(rawValue) ?? []).filter(isRecord);
  return JSON.stringify([transaction, ...existing]);
}

function normalizedActivityEntry(candidate: unknown): Record<string, unknown> | null {
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

function encodeActivityLog(
  rawValue: string | undefined,
  transaction: MoneyTransaction,
  identity: MoneyTransactionIdentity
): string {
  const entries = (parseArray(rawValue) ?? [])
    .map(normalizedActivityEntry)
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp))
      || String(left.id).localeCompare(String(right.id)));
  entries.push({
    id: identity.activityId,
    timestamp: identity.timestamp,
    action: "money_transaction_created",
    entityType: "money_transaction",
    entityId: transaction.id,
    dateKey: transaction.date,
    field: "",
    before: null,
    after: transaction,
    meta: { amountCents: transaction.amountCents, categoryId: transaction.categoryId }
  });
  return JSON.stringify(entries);
}

function encodeVendorRules(
  rawValue: string | undefined,
  vendor: string,
  categoryId: string,
  ruleId: string
): string | null {
  const match = vendor.trim().toLowerCase();
  if (!match) {
    return null;
  }
  const source = parseArray(rawValue) ?? DEFAULT_VENDOR_RULES;
  const rules = source.filter(isRecord).map((rule) => ({ ...rule }));
  const existing = rules.find((rule) => typeof rule.match === "string"
    && rule.match.trim().toLowerCase() === match);
  if (existing === undefined) {
    rules.unshift({ id: ruleId, match, categoryId });
  } else {
    existing.categoryId = categoryId;
  }
  return JSON.stringify(rules);
}

export function buildMoneyTransactionUpdate(
  store: PlannerStore,
  input: MoneyTransactionInput,
  today: Date,
  identity: MoneyTransactionIdentity
): MoneyTransactionUpdate {
  const transaction: MoneyTransaction = {
    id: identity.transactionId,
    date: formatPlannerDate(today),
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    vendor: input.vendor.trim(),
    note: "",
    createdAt: identity.timestamp
  };
  const transactionValue = encodeTransactions(store[MONEY_TRANSACTIONS_KEY], transaction);
  const activityValue = encodeActivityLog(store[MONEY_ACTIVITY_LOG_KEY], transaction, identity);
  const vendorRulesValue = encodeVendorRules(
    store[MONEY_VENDOR_RULES_KEY],
    transaction.vendor,
    transaction.categoryId,
    identity.vendorRuleId
  );
  const writes: PlannerStoreWrite[] = [
    { key: MONEY_TRANSACTIONS_KEY, value: transactionValue },
    { key: MONEY_ACTIVITY_LOG_KEY, value: activityValue }
  ];
  if (vendorRulesValue !== null) {
    writes.push({ key: MONEY_VENDOR_RULES_KEY, value: vendorRulesValue });
  }
  const nextStore = writes.reduce<PlannerStore>(
    (current, write) => ({ ...current, [write.key]: write.value }),
    store
  );
  return { nextStore, transaction, writes };
}
