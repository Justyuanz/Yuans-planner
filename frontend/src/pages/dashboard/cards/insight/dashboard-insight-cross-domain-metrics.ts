import {
  calculateLateStudyCorrelation,
  calculateSimpleMorningCorrelation
} from "./dashboard-insight-correlation-metrics";
import {
  calculateEnergyCrashPattern,
  calculateJournalBehaviorPattern
} from "./dashboard-insight-journal-metrics";
import {
  calculateFoodSpendingPattern,
  calculateInsightMoneySummary
} from "./dashboard-insight-money-metrics";
import type { DailyTaskSummary } from "./dashboard-insight-task-summaries";

interface BuildDashboardCrossDomainMetricsInput {
  activityLog: unknown;
  currentDateKey: string;
  dailySummaries: readonly DailyTaskSummary[];
  journalEntries: unknown;
  lookbackDays: number;
  moneyState: unknown;
  moneyTransactions: unknown;
}

export function buildDashboardCrossDomainMetrics(input: BuildDashboardCrossDomainMetricsInput) {
  const lookbackDays = Math.max(1, Number(input.lookbackDays) || 14);
  return {
    energyCrashPattern: calculateEnergyCrashPattern(
      input.dailySummaries, input.journalEntries, input.currentDateKey, lookbackDays
    ),
    foodSpendingOnHighEditDays: calculateFoodSpendingPattern(
      input.dailySummaries,
      input.activityLog,
      input.moneyTransactions,
      input.currentDateKey,
      lookbackDays
    ),
    journalBehaviorOnOverloadedDays: calculateJournalBehaviorPattern(
      input.dailySummaries, input.journalEntries, input.currentDateKey, lookbackDays
    ),
    lateStudyCorrelation: calculateLateStudyCorrelation(
      input.dailySummaries, input.currentDateKey, lookbackDays
    ),
    moneySummary: calculateInsightMoneySummary(input.moneyState),
    simpleMorningCorrelation: calculateSimpleMorningCorrelation(
      input.dailySummaries, input.currentDateKey, lookbackDays
    )
  };
}
