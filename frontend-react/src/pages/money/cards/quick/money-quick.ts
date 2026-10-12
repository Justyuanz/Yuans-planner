import type { PlannerStore } from "../../../../api/planner-store";
import type { MoneyCategory, MoneyTransaction } from "./money-quick-definitions";
import { decodeMoneyStore, moneyVendorRules } from "./money-quick-store";

export { DEFAULT_MONEY_IMPACT } from "./money-quick-definitions";
export { buildMoneyTransactionUpdate } from "./money-quick-persistence";

export interface MoneyQuickCategory {
  id: string;
  name: string;
}

export interface MoneyQuickModel {
  categories: readonly MoneyQuickCategory[];
  categoryStates: ReturnType<typeof decodeMoneyStore>["categories"];
  month: ReturnType<typeof decodeMoneyStore>["month"];
  paceBadge: string;
  shortcuts: readonly {
    formattedWeeklyBudget: string;
    id: string;
    name: string;
  }[];
  summary: readonly {
    className: string;
    formattedValue: string;
    label: string;
  }[];
}

const CATEGORY_ORDER = ["groceries", "therapy", "fun", "eating-out", "resq"] as const;
const SHORTCUT_ORDER = ["groceries", "therapy", "eating-out", "other"] as const;
const MONEY_FORMATTER = new Intl.NumberFormat("en-FI", { style: "currency", currency: "EUR" });

export function formatMoney(centsValue: number): string {
  const cents = Number.isFinite(Number(centsValue)) ? Math.round(Number(centsValue)) : 0;
  return MONEY_FORMATTER.format(cents / 100);
}

export function parseAmountToCents(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const compact = raw.replace(/[€\s]/g, "");
  const hasDot = compact.includes(".");
  const hasComma = compact.includes(",");
  let normalized = compact;
  if (hasDot && hasComma) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(compact) ? compact.replace(",", ".") : compact.replace(/,/g, "");
  } else if (hasDot && !/\.\d{1,2}$/.test(compact)) {
    normalized = compact.replace(/\./g, "");
  }
  return /^-?\d+(?:\.\d{1,2})?$/.test(normalized)
    ? Math.round(Number(normalized) * 100)
    : null;
}

function orderedCategories(categories: readonly MoneyCategory[], preferred: readonly string[]): MoneyCategory[] {
  const ranks = new Map(preferred.map((id, index) => [id, index]));
  return [...categories].sort((left, right) => (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER)
    - (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name));
}

export function buildMoneyQuick(store: PlannerStore, today: Date): MoneyQuickModel {
  const state = decodeMoneyStore(store, today);
  const inputCategories = orderedCategories(state.inputCategories, CATEGORY_ORDER);
  const shortcuts = orderedCategories(
    state.categories.filter((category) => SHORTCUT_ORDER.includes(
      category.id as (typeof SHORTCUT_ORDER)[number]
    )),
    SHORTCUT_ORDER
  ).slice(0, 4);
  const summaryValues = [
    { label: "Remaining this week", value: state.month.availableWeekCents },
    { label: "Remaining this month", value: state.month.flexibleRemainingCents }
  ];
  return {
    categories: inputCategories.map(({ id, name }) => ({ id, name })),
    categoryStates: state.categories,
    month: state.month,
    paceBadge: state.month.paceDeltaCents > 0 ? "Above pace" : "On pace",
    shortcuts: shortcuts.map((category) => ({
      id: category.id,
      name: category.name,
      formattedWeeklyBudget: formatMoney(category.weeklyBudgetCents ?? category.budgetCents)
    })),
    summary: summaryValues.map((item) => ({
      className: `money-mini-stat${item.value < 0 ? " is-negative" : ""}`,
      formattedValue: formatMoney(item.value),
      label: item.label
    }))
  };
}

export function suggestMoneyCategory(store: PlannerStore, vendor: string): string {
  const normalizedVendor = vendor.trim().toLowerCase();
  if (!normalizedVendor) {
    return "";
  }
  return moneyVendorRules(store).find((rule) => normalizedVendor.includes(rule.match))?.categoryId ?? "";
}

export function moneyImpactMessage(
  before: MoneyQuickModel,
  after: MoneyQuickModel,
  transaction: MoneyTransaction
): string {
  const category = after.categoryStates.find((item) => item.id === transaction.categoryId);
  const categoryName = category?.name
    ?? after.categories.find((item) => item.id === transaction.categoryId)?.name
    ?? "Other";
  const intro = `Saved ${formatMoney(transaction.amountCents)} to ${categoryName}.`;
  const categoryLine = category === undefined
    ? ""
    : ` ${category.name} now has ${formatMoney(category.remainingCents)} left this month and about ${formatMoney(category.weeklyBudgetCents ?? category.budgetCents)} for the week.`;
  const changedWeekCents = before.month.availableWeekCents - after.month.availableWeekCents;
  if (changedWeekCents <= 0) {
    return intro + categoryLine;
  }
  return intro
    + ` This week's remaining changed by ${formatMoney(changedWeekCents)}.`
    + categoryLine
    + ` This week now has ${formatMoney(after.month.availableWeekCents)} left and this month has ${formatMoney(after.month.remainingCents)} left.`;
}

export { MONEY_SETTINGS_KEY } from "./money-quick-definitions";
