import type { PlannerStore } from "../../../../api/planner-store";
import { formatMoney } from "../quick/money-quick";
import { decodeMoneyStore } from "../../../../shared/money-store";

export interface MoneyVendorsModel {
  rows: readonly {
    detail: string;
    formattedPreviousMonthSpent: string;
    formattedSpent: string;
    vendor: string;
  }[];
}

export function buildMoneyVendors(store: PlannerStore, today: Date): MoneyVendorsModel {
  const state = decodeMoneyStore(store, today);
  const categoryNames = new Map(state.inputCategories.map((category) => [category.id, category.name]));

  return {
    rows: state.vendors.slice(0, 8).map((vendor) => ({
      detail: `${categoryNames.get(vendor.topCategoryId) ?? "Other"} · ${vendor.count} visits · avg ${formatMoney(vendor.averageCents)}`,
      formattedPreviousMonthSpent: formatMoney(vendor.previousMonthSpentCents),
      formattedSpent: formatMoney(vendor.spentCents),
      vendor: vendor.vendor
    }))
  };
}
