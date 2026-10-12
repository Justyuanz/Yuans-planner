import type { PlannerStore, PlannerStoreWrite } from "../../../../api/planner-store";
import { decodeActivityLog } from "../../../../shared/activity-log";
import { isRecord } from "../../../../shared/is-record";
import { toDateKey } from "../../../../shared/planner-date";
import {
  DEFAULT_VENDOR_RULES,
  MONEY_ACTIVITY_LOG_KEY,
  MONEY_TRANSACTIONS_KEY,
  MONEY_VENDOR_RULES_KEY,
  type MoneyTransaction
} from "../../../../shared/money-definitions";

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

function encodeActivityLog(
  rawValue: string | undefined,
  transaction: MoneyTransaction,
  identity: MoneyTransactionIdentity
): string {
  const entries = decodeActivityLog(rawValue);
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
    date: toDateKey(today),
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
