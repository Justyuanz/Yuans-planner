import type { PlannerStore } from "../../../../api/planner-store";
import { formatMoney } from "../quick/money-quick";
import { decodeMoneyStore } from "../../../../shared/money-store";

interface MoneyBarRow {
  fillPercent: number;
  formattedValue: string;
  label: string;
}

export interface MoneyPacingModel {
  categories: readonly MoneyBarRow[];
  history: readonly MoneyBarRow[];
  progress: readonly {
    className: string;
    estimate: {
      fillPercent: number;
      formattedValue: string;
    } | null;
    fillPercent: number;
    remainingLabel: string;
    spentLabel: string;
    title: string;
    usedLabel: string;
  }[];
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function clampPercent(value: number, minimum: number): number {
  return Math.max(minimum, Math.min(100, value));
}

function progressCard(
  title: string,
  spentCents: number,
  budgetCents: number,
  estimatedTotalCents: number | null
): MoneyPacingModel["progress"][number] {
  const remainingCents = budgetCents - spentCents;
  const usedPercent = percentage(spentCents, budgetCents);
  return {
    className: `mini-chart money-chart-card money-progress-card${remainingCents < 0 ? " is-negative" : ""}`,
    estimate: estimatedTotalCents === null ? null : {
      fillPercent: clampPercent(percentage(estimatedTotalCents, budgetCents), 4),
      formattedValue: formatMoney(estimatedTotalCents)
    },
    fillPercent: clampPercent(usedPercent, 4),
    remainingLabel: `${formatMoney(remainingCents)} remaining`,
    spentLabel: `${formatMoney(spentCents)} spent of ${formatMoney(budgetCents)}`,
    title,
    usedLabel: `${usedPercent}% used`
  };
}

export function buildMoneyPacing(store: PlannerStore, today: Date): MoneyPacingModel {
  const state = decodeMoneyStore(store, today);
  const history = state.month.monthlyTotalsRows.slice().reverse().slice(0, 12);
  const historyMaximum = history.reduce((maximum, row) => Math.max(maximum, row.spentCents), 0) || 1;

  return {
    categories: state.categories.filter((category) => category.kind === "flex")
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((category) => ({
        fillPercent: clampPercent(
          category.budgetCents > 0
            ? percentage(category.spentCents, category.budgetCents)
            : (category.spentCents > 0 ? 100 : 0),
          0
        ),
        formattedValue: formatMoney(Math.max(0, category.remainingCents)),
        label: category.name
      })),
    history: history.map((row) => ({
      fillPercent: Math.max(4, Math.round((row.spentCents / historyMaximum) * 100)),
      formattedValue: formatMoney(row.spentCents),
      label: row.label
    })),
    progress: [
      progressCard(
        "Monthly spending",
        state.month.spentCents,
        state.month.targetCents,
        state.month.projectedTotalCents
      ),
      progressCard(
        "Flexible spending",
        state.month.flexibleSpentCents,
        state.month.flexibleBudgetCents,
        null
      )
    ]
  };
}
