import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import {
  DEFAULT_CATEGORIES,
  MONEY_SETTINGS_KEY
} from "@/shared/money-definitions";

export type MoneyBudgetField = "budgetCents" | "weeklyBudgetCents";

interface MoneyTransferInput {
  amountCents: number;
  fromCategoryId: string;
  toCategoryId: string;
}

interface MoneyTransferIdentity {
  id: string;
  timestamp: string;
}

const DEFAULT_NOTES = {
  averages: [
    { id: "avg-groceries", label: "Groceries", valueCents: 30_200 },
    { id: "avg-eating-out", label: "Eating out", valueCents: 5_550 },
    { id: "avg-resq", label: "ResQ", valueCents: 2_650 },
    { id: "avg-fixed", label: "Fixed baseline", valueCents: 103_889 }
  ]
};

function cents(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function primitiveText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

function parseSettings(rawValue: string | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : null;
    return isRecord(parsed) ? { ...parsed } : {};
  } catch {
    return {};
  }
}

function normalizeMonthlyTarget(value: unknown): number {
  if (value) {
    return cents(value);
  }
  return 130_000;
}

function normalizeCategories(source: Record<string, unknown>): Record<string, unknown>[] {
  const categories = new Map<string, Record<string, unknown>>(
    DEFAULT_CATEGORIES.map((category) => [category.id, { ...category }])
  );
  const provided = Array.isArray(source.categories) ? source.categories : [];
  provided.forEach((candidate) => {
    if (!isRecord(candidate)) {
      return;
    }
    const id = primitiveText(candidate.id);
    if (!id) {
      return;
    }
    const existing = categories.get(id) ?? {};
    categories.set(id, {
      ...existing,
      ...candidate,
      budgetCents: cents(candidate.budgetCents),
      id,
      kind: candidate.kind === "fixed" ? "fixed" : "flex",
      protected: Boolean(candidate.protected),
      weeklyBudgetCents: candidate.weeklyBudgetCents === null
        || candidate.weeklyBudgetCents === undefined
        ? null
        : cents(candidate.weeklyBudgetCents)
    });
  });
  return [...categories.values()];
}

function normalizeTransfers(source: Record<string, unknown>): Record<string, unknown>[] {
  const transfers = Array.isArray(source.transfers) ? source.transfers : [];
  return transfers.flatMap((candidate, index) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const amountCents = Math.max(0, cents(candidate.amountCents));
    const fromCategoryId = primitiveText(candidate.fromCategoryId);
    const toCategoryId = primitiveText(candidate.toCategoryId);
    if (!amountCents || !fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) {
      return [];
    }
    return [{
      ...candidate,
      amountCents,
      createdAt: primitiveText(candidate.createdAt),
      fromCategoryId,
      id: primitiveText(candidate.id) || `transfer-normalized-${index}`,
      note: primitiveText(candidate.note),
      toCategoryId
    }];
  });
}

function normalizeSettings(rawValue: string | undefined): Record<string, unknown> {
  const source = parseSettings(rawValue);
  // Normalize fields legacy readers expect while retaining unknown compatibility data.
  return {
    ...source,
    monthlyTargetCents: normalizeMonthlyTarget(source.monthlyTargetCents),
    categories: normalizeCategories(source),
    transfers: normalizeTransfers(source),
    notes: {
      ...DEFAULT_NOTES,
      ...(isRecord(source.notes) ? source.notes : {})
    }
  };
}

function daysInBudgetWeeks(referenceDate: Date): number {
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return Math.max(1, Math.ceil(monthEnd.getDate() / 7));
}

function settingsWrite(settings: Record<string, unknown>): PlannerStoreWrite {
  return { key: MONEY_SETTINGS_KEY, value: JSON.stringify(settings) };
}

export function buildMoneyCategoryUpdate(
  store: PlannerStore,
  categoryId: string,
  field: MoneyBudgetField,
  valueCents: number,
  referenceDate: Date
): PlannerStoreWrite {
  const settings = normalizeSettings(store[MONEY_SETTINGS_KEY]);
  const categories = settings.categories as Record<string, unknown>[];
  const category = categories.find((candidate) => candidate.id === categoryId);
  if (category !== undefined) {
    category[field] = cents(valueCents);
    if (field === "budgetCents") {
      category.weeklyBudgetCents = Math.floor(cents(valueCents) / daysInBudgetWeeks(referenceDate));
    }
  } else {
    categories.push({
      id: categoryId,
      name: categoryId,
      kind: "flex",
      budgetCents: field === "budgetCents" ? cents(valueCents) : 0,
      weeklyBudgetCents: field === "weeklyBudgetCents" ? cents(valueCents) : 0,
      protected: false
    });
  }
  return settingsWrite(settings);
}

export function buildMoneyTransferAddition(
  store: PlannerStore,
  input: MoneyTransferInput,
  identity: MoneyTransferIdentity
): PlannerStoreWrite {
  const settings = normalizeSettings(store[MONEY_SETTINGS_KEY]);
  const transfers = settings.transfers as Record<string, unknown>[];
  transfers.unshift({
    id: identity.id,
    fromCategoryId: input.fromCategoryId,
    toCategoryId: input.toCategoryId,
    amountCents: cents(input.amountCents),
    note: "",
    createdAt: identity.timestamp
  });
  return settingsWrite(settings);
}

export function buildMoneyTransferDeletion(
  store: PlannerStore,
  transferId: string
): PlannerStoreWrite {
  const settings = normalizeSettings(store[MONEY_SETTINGS_KEY]);
  settings.transfers = (settings.transfers as Record<string, unknown>[]).filter(
    (transfer) => transfer.id !== transferId
  );
  return settingsWrite(settings);
}
