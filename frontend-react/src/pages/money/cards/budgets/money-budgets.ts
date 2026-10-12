import type { PlannerStore } from "../../../../api/planner-store";
import { formatMoney } from "../quick/money-quick";
import type { MoneyCategoryState } from "../../../../shared/money-definitions";
import { decodeMoneyStore } from "../../../../shared/money-store";

export {
  buildMoneyCategoryUpdate,
  buildMoneyTransferAddition,
  buildMoneyTransferDeletion,
  type MoneyBudgetField
} from "./money-budgets-persistence";

interface MoneyBudgetRow {
  className: string;
  guide: string;
  id: string;
  kind: "Fixed" | "Flex";
  monthValue: string;
  name: string;
  remaining: string;
  spent: string;
  weekValue: string;
}

export interface MoneyBudgetsModel {
  flexCategories: readonly { id: string; name: string }[];
  formattedTarget: string;
  sections: readonly {
    key: "fixed" | "flexible";
    note: string;
    rows: readonly MoneyBudgetRow[];
    title: string;
  }[];
  transfers: readonly {
    amount: string;
    id: string;
    toCategoryName: string;
  }[];
}

function inputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function budgetRow(category: MoneyCategoryState): MoneyBudgetRow {
  const weeklyBudgetCents = category.weeklyBudgetCents ?? 0;
  return {
    className: `money-budget-row money-budget-row-${category.kind}${category.remainingCents < 0 ? " is-negative" : ""}`,
    guide: `Guide ${formatMoney(weeklyBudgetCents)} / week`,
    id: category.id,
    kind: category.kind === "fixed" ? "Fixed" : "Flex",
    monthValue: inputValue(category.budgetCents),
    name: category.name,
    remaining: `${formatMoney(category.remainingCents)} left`,
    spent: `Spent ${formatMoney(category.spentCents)}`,
    weekValue: inputValue(weeklyBudgetCents)
  };
}

export function buildMoneyBudgets(store: PlannerStore, today: Date): MoneyBudgetsModel {
  const state = decodeMoneyStore(store, today);
  const orderedCategories = [...state.categories].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "fixed" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  const categoryNames = new Map(state.inputCategories.map((category) => [category.id, category.name]));
  const sections = [
    {
      key: "fixed" as const,
      title: "Fixed",
      note: "Protected baseline.",
      rows: orderedCategories.filter((category) => category.kind === "fixed").map(budgetRow)
    },
    {
      key: "flexible" as const,
      title: "Flexible",
      note: "Weekly pace.",
      rows: orderedCategories.filter((category) => category.kind !== "fixed").map(budgetRow)
    }
  ];
  return {
    flexCategories: state.inputCategories.filter((category) => category.kind === "flex")
      .map(({ id, name }) => ({ id, name })),
    formattedTarget: inputValue(state.month.targetCents),
    sections: sections.map((section) => ({
      ...section,
      note: `${section.note} · ${section.rows.length}`
    })),
    transfers: state.transfers.map((transfer) => ({
      amount: `${formatMoney(transfer.amountCents)} moved from ${categoryNames.get(transfer.fromCategoryId) ?? "Other"}`,
      id: transfer.id,
      toCategoryName: categoryNames.get(transfer.toCategoryId) ?? "Other"
    }))
  };
}
