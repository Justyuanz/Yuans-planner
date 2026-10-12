import type { PlannerStore } from "../../../../api/planner-store";
import { formatMoney } from "../quick/money-quick";
import { decodeMoneyStore } from "../quick/money-quick-store";

export interface MoneyOverviewModel {
  monthLabel: string;
  stats: readonly {
    className: string;
    formattedValue: string;
    label: string;
    note: string;
  }[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

export function buildMoneyOverview(store: PlannerStore, today: Date): MoneyOverviewModel {
  const state = decodeMoneyStore(store, today);
  const values = [
    {
      label: "Remaining this week",
      note: `${state.currentWeek.start} to ${state.currentWeek.end}`,
      value: state.month.availableWeekCents
    },
    {
      label: "Flexible money left",
      note: "Adjustable spending.",
      value: state.month.flexibleRemainingCents
    }
  ];

  return {
    monthLabel: `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`,
    stats: values.map((item) => ({
      className: `money-mini-stat${item.value < 0 ? " is-negative" : ""}`,
      formattedValue: formatMoney(item.value),
      label: item.label,
      note: item.note
    }))
  };
}
