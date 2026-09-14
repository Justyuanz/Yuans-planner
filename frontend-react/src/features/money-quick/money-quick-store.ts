import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_VENDOR_RULES,
  MONEY_SETTINGS_KEY,
  MONEY_TRANSACTIONS_KEY,
  MONEY_VENDOR_RULES_KEY,
  type MoneyCategory,
  type MoneyCategoryState,
  type MoneyTransaction,
  type MoneyVendorRule
} from "./money-quick-definitions";

interface MoneyTransfer {
  amountCents: number;
  fromCategoryId: string;
  toCategoryId: string;
}

interface MoneySettings {
  categories: readonly MoneyCategory[];
  transfers: readonly MoneyTransfer[];
}

export interface MoneyStoreState {
  categories: readonly MoneyCategoryState[];
  inputCategories: readonly MoneyCategory[];
  month: {
    availableWeekCents: number;
    flexibleRemainingCents: number;
    paceDeltaCents: number;
    remainingCents: number;
  };
  transactions: readonly MoneyTransaction[];
}

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

function cents(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function primitiveText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

function normalizeTransfers(value: unknown): MoneyTransfer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const transfer = {
      amountCents: Math.max(0, cents(candidate.amountCents)),
      fromCategoryId: primitiveText(candidate.fromCategoryId),
      toCategoryId: primitiveText(candidate.toCategoryId)
    };
    return transfer.amountCents > 0 && transfer.fromCategoryId && transfer.toCategoryId
      && transfer.fromCategoryId !== transfer.toCategoryId
      ? [transfer]
      : [];
  });
}

function normalizeSettings(value: unknown): MoneySettings {
  const source = isRecord(value) ? value : {};
  const categoriesById = new Map(DEFAULT_CATEGORIES.map((category) => [category.id, { ...category }]));
  const provided = Array.isArray(source.categories) ? source.categories : [];
  provided.forEach((candidate) => {
    if (!isRecord(candidate) || !candidate.id) {
      return;
    }
    const id = primitiveText(candidate.id);
    if (!id) {
      return;
    }
    const existing = categoriesById.get(id);
    categoriesById.set(id, {
      budgetCents: cents(candidate.budgetCents),
      id,
      kind: candidate.kind === "fixed" ? "fixed" : "flex",
      name: typeof candidate.name === "string" ? candidate.name : existing?.name ?? id,
      protected: Boolean(candidate.protected),
      weeklyBudgetCents: candidate.weeklyBudgetCents === null || candidate.weeklyBudgetCents === undefined
        ? null
        : cents(candidate.weeklyBudgetCents)
    });
  });
  return {
    categories: [...categoriesById.values()],
    transfers: normalizeTransfers(source.transfers)
  };
}

function normalizeTransactions(value: unknown): MoneyTransaction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const transaction = {
      amountCents: Math.max(0, cents(candidate.amountCents)),
      categoryId: primitiveText(candidate.categoryId) || "other",
      createdAt: primitiveText(candidate.createdAt),
      date: primitiveText(candidate.date) || formatPlannerDate(new Date()),
      id: primitiveText(candidate.id) || `txn-normalized-${index}`,
      note: primitiveText(candidate.note).trim(),
      vendor: primitiveText(candidate.vendor).trim()
    };
    return transaction.amountCents > 0 && transaction.date ? [transaction] : [];
  }).sort((left, right) => right.date.localeCompare(left.date)
    || right.createdAt.localeCompare(left.createdAt)
    || right.id.localeCompare(left.id));
}

function cloneDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date): Date {
  const date = cloneDate(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function endOfWeek(value: Date): Date {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return date;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.floor((cloneDate(end).getTime() - cloneDate(start).getTime()) / 86_400_000) + 1;
}

function deriveWeeklyBudgetCents(monthlyBudgetCents: number, referenceDate: Date): number {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return Math.floor(monthlyBudgetCents / Math.max(1, Math.ceil(daysBetweenInclusive(monthStart, monthEnd) / 7)));
}

function summarizeCategories(
  settings: MoneySettings,
  transactions: readonly MoneyTransaction[],
  referenceDate: Date
): MoneyCategoryState[] {
  const monthKey = formatPlannerDate(referenceDate).slice(0, 7);
  const spentByCategory = new Map<string, number>();
  transactions.filter((entry) => entry.date.slice(0, 7) === monthKey).forEach((entry) => {
    spentByCategory.set(entry.categoryId, (spentByCategory.get(entry.categoryId) ?? 0) + entry.amountCents);
  });
  const transfersIn = new Map<string, number>();
  const transfersOut = new Map<string, number>();
  settings.transfers.forEach((transfer) => {
    transfersIn.set(transfer.toCategoryId, (transfersIn.get(transfer.toCategoryId) ?? 0) + transfer.amountCents);
    transfersOut.set(transfer.fromCategoryId, (transfersOut.get(transfer.fromCategoryId) ?? 0) + transfer.amountCents);
  });
  return settings.categories.map((category) => {
    const adjustedBudgetCents = category.budgetCents
      + (transfersIn.get(category.id) ?? 0)
      - (transfersOut.get(category.id) ?? 0);
    const spentCents = spentByCategory.get(category.id) ?? 0;
    return {
      ...category,
      adjustedBudgetCents,
      remainingCents: adjustedBudgetCents - spentCents,
      spentCents,
      weeklyBudgetCents: category.weeklyBudgetCents
        ?? deriveWeeklyBudgetCents(category.budgetCents, referenceDate)
    };
  });
}

export function decodeMoneyStore(store: PlannerStore, referenceDate: Date): MoneyStoreState {
  const settings = normalizeSettings(parseStoredJson(store[MONEY_SETTINGS_KEY]));
  const transactions = normalizeTransactions(parseStoredJson(store[MONEY_TRANSACTIONS_KEY]));
  const categories = summarizeCategories(settings, transactions, referenceDate);
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const weekEnd = new Date(Math.min(endOfWeek(referenceDate).getTime(), monthEnd.getTime()));
  const elapsedDays = daysBetweenInclusive(monthStart, referenceDate);
  const remainingMonthDays = daysBetweenInclusive(referenceDate, monthEnd);
  const remainingWeekDays = daysBetweenInclusive(referenceDate, weekEnd);
  const currentMonthTransactions = transactions.filter(
    (entry) => entry.date.slice(0, 7) === formatPlannerDate(referenceDate).slice(0, 7)
  );
  const fixedCategories = categories.filter((category) => category.kind === "fixed");
  const flexCategories = categories.filter((category) => category.kind === "flex");
  const fixedBudgetCents = fixedCategories.reduce((sum, category) => sum + category.adjustedBudgetCents, 0);
  const flexibleBudgetCents = flexCategories.reduce((sum, category) => sum + category.adjustedBudgetCents, 0);
  const flexibleSpentCents = flexCategories.reduce((sum, category) => sum + category.spentCents, 0);
  const flexibleRemainingCents = flexibleBudgetCents - flexibleSpentCents;
  const totalSpentCents = currentMonthTransactions.reduce((sum, entry) => sum + entry.amountCents, 0);
  const totalBudgetCents = fixedBudgetCents + flexibleBudgetCents;
  const dailyAvailableCents = Math.floor(flexibleRemainingCents / Math.max(1, remainingMonthDays));

  return {
    categories,
    inputCategories: settings.categories,
    month: {
      availableWeekCents: Math.min(
        flexibleRemainingCents,
        dailyAvailableCents * Math.max(1, remainingWeekDays)
      ),
      flexibleRemainingCents,
      paceDeltaCents: totalSpentCents
        - Math.round(totalBudgetCents * (elapsedDays / daysBetweenInclusive(monthStart, monthEnd))),
      remainingCents: totalBudgetCents - totalSpentCents
    },
    transactions
  };
}

function normalizeVendorRules(value: unknown): MoneyVendorRule[] {
  const rules = Array.isArray(value) ? value : DEFAULT_VENDOR_RULES;
  return rules.flatMap((candidate, index) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const rule = {
      categoryId: primitiveText(candidate.categoryId),
      id: primitiveText(candidate.id) || `rule-normalized-${index}`,
      match: primitiveText(candidate.match).trim().toLowerCase()
    };
    return rule.categoryId && rule.match ? [rule] : [];
  });
}

export function moneyVendorRules(store: PlannerStore): MoneyVendorRule[] {
  return normalizeVendorRules(parseStoredJson(store[MONEY_VENDOR_RULES_KEY]));
}
