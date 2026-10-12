import type { PlannerStore } from "../../../../api/planner-store";
import { formatMoney } from "../quick/money-quick";
import { decodeMoneyStore } from "../quick/money-quick-store";

export interface MoneyActivityModel {
  rows: readonly {
    categoryName: string;
    formattedAmount: string;
    vendorAndDate: string;
  }[];
}

export function buildMoneyActivity(store: PlannerStore, today: Date): MoneyActivityModel {
  const state = decodeMoneyStore(store, today);
  const categoryNames = new Map(state.inputCategories.map((category) => [category.id, category.name]));

  return {
    rows: state.transactions.slice(0, 8).map((transaction) => ({
      categoryName: categoryNames.get(transaction.categoryId) ?? "Other",
      formattedAmount: formatMoney(transaction.amountCents),
      vendorAndDate: `${transaction.vendor || "No vendor"} · ${transaction.date}`
    }))
  };
}
