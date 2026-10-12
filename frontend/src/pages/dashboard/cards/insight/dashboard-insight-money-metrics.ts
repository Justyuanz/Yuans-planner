import { isRecord } from "@/shared/is-record";
import {
  averageMetrics,
  finiteNonNegative,
  isValidDateKey,
  taskMetricWindowDateKeys
} from "./dashboard-insight-metric-utils";
import { selectTaskSummaryWindow, type DailyTaskSummary } from "./dashboard-insight-task-summaries";

const FOOD_CATEGORY_IDS = new Set(["groceries", "eating-out", "resq"]);
const EDIT_ACTIONS = new Set([
  "task_created",
  "task_updated",
  "task_deleted",
  "planned_hours_updated"
]);
const HIGH_EDIT_DAY_THRESHOLD = 3;

interface MoneyTransaction {
  amountCents: number;
  categoryId: string;
  date: string;
}

function fallbackMoneyLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value || 0);
  }
  return "0";
}

export function calculateInsightMoneySummary(value: unknown) {
  const month = isRecord(value) && isRecord(value.month) ? value.month : null;
  if (month === null) {
    return {
      available: false,
      availableWeekCents: 0,
      availableWeekLabel: "",
      flexibleRemainingCents: 0,
      flexibleRemainingLabel: "",
      sampleSize: 0
    };
  }
  return {
    available: true,
    availableWeekCents: Number(month.availableWeekCents) || 0,
    availableWeekLabel: typeof month.availableWeek === "string"
      ? month.availableWeek : fallbackMoneyLabel(month.availableWeekCents),
    flexibleRemainingCents: Number(month.flexibleRemainingCents) || 0,
    flexibleRemainingLabel: typeof month.flexibleRemaining === "string"
      ? month.flexibleRemaining : fallbackMoneyLabel(month.flexibleRemainingCents),
    sampleSize: 1
  };
}

function normalizeTransactions(value: unknown): MoneyTransaction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.date !== "string"
      || !isValidDateKey(candidate.date)) {
      return [];
    }
    const amountCents = finiteNonNegative(candidate.amountCents);
    if (amountCents <= 0) {
      return [];
    }
    return [{
      amountCents,
      categoryId: typeof candidate.categoryId === "string" ? candidate.categoryId : "",
      date: candidate.date
    }];
  });
}

function activityCounts(value: unknown, endDateKey: string, lookbackDays: number): Map<string, number> {
  const counts = new Map<string, number>(taskMetricWindowDateKeys(endDateKey, lookbackDays)
    .map((dateKey) => [dateKey, 0]));
  if (!Array.isArray(value)) {
    return counts;
  }
  value.filter(isRecord).forEach((entry) => {
    if (typeof entry.dateKey !== "string" || typeof entry.action !== "string"
      || !counts.has(entry.dateKey) || !EDIT_ACTIONS.has(entry.action)) {
      return;
    }
    counts.set(entry.dateKey, (counts.get(entry.dateKey) ?? 0) + 1);
  });
  return counts;
}

function foodSpendByDate(value: unknown, dates: readonly string[]): Map<string, number> {
  const spend = new Map<string, number>(dates.map((dateKey) => [dateKey, 0]));
  normalizeTransactions(value).forEach((transaction) => {
    if (!spend.has(transaction.date) || !FOOD_CATEGORY_IDS.has(transaction.categoryId)) {
      return;
    }
    spend.set(transaction.date, (spend.get(transaction.date) ?? 0) + transaction.amountCents);
  });
  return spend;
}

export function calculateFoodSpendingPattern(
  summaries: readonly DailyTaskSummary[],
  activityLog: unknown,
  moneyTransactions: unknown,
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const dates = window.map(({ dateKey }) => dateKey);
  const edits = activityCounts(activityLog, endDateKey, lookbackDays);
  const food = foodSpendByDate(moneyTransactions, dates);
  const highEdit: number[] = [];
  const lowerEdit: number[] = [];
  dates.forEach((dateKey) => {
    const bucket = (edits.get(dateKey) ?? 0) >= HIGH_EDIT_DAY_THRESHOLD ? highEdit : lowerEdit;
    bucket.push(food.get(dateKey) ?? 0);
  });
  const highAverage = averageMetrics(highEdit);
  const lowerAverage = averageMetrics(lowerEdit);
  return {
    averageFoodDifferenceCents: Math.round(highAverage - lowerAverage),
    highEditAverageFoodCents: Math.round(highAverage),
    highEditDays: highEdit.length,
    lowerEditAverageFoodCents: Math.round(lowerAverage),
    lowerEditDays: lowerEdit.length,
    sampleSize: window.length
  };
}
