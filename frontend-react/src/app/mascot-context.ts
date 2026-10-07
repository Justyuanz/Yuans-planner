import type { PlannerStore } from "../api/planner-store";
import { decodeActivityLog } from "../shared/activity-log";
import { decodeDayState, type DayStateId } from "../features/day-state/day-state";
import {
  buildDashboardInsightMetricsFromStore
} from "../features/dashboard-insight/dashboard-insight-store";
import {
  deriveDashboardInsights,
  selectTopDashboardInsight
} from "../features/dashboard-insight/dashboard-insight-rules";
import { journalEntries } from "../features/journal/journal-entry-store";
import { formatPlannerDate } from "../features/life-pie/life-pie-store";
import { decodeMoneyStore } from "../features/money-quick/money-quick-store";
import { decodePlannedValues } from "../features/planned-actual/planned-actual";
import { ACTIVITY_LOG_KEY, decodeTasks } from "../features/tasks/tasks";

const DEFAULT_PROMPTS = [
  "What keeps slipping in my plan?",
  "Which task should I move to tomorrow?",
  "What should I do next if I only do one thing?",
  "Which task needs to be broken down?",
  "What pattern is strongest this week?"
] as const;

const GOOD_DAY_PROMPTS = [
  "What should I use my good energy on today?",
  "What is the highest-value thing to finish today?",
  "Where do I usually make the most progress?",
  "What pattern is strongest this week?"
] as const;

const LOW_ENERGY_PROMPTS = [
  "I'm tired. Can you cut today down?",
  "Which task should I move to tomorrow?",
  "What is the smallest useful version of today?",
  "What can I ignore for now?"
] as const;

export function suggestedMascotPrompts(dayState: DayStateId): readonly string[] {
  if (dayState === "good") return GOOD_DAY_PROMPTS;
  if (dayState === "tired" || dayState === "overwhelmed") return LOW_ENERGY_PROMPTS;
  return DEFAULT_PROMPTS;
}

function recentTaskHistory(metrics: ReturnType<typeof buildDashboardInsightMetricsFromStore>) {
  return metrics.dailySummaries.slice(-7).map((summary) => ({
    completedCount: summary.completedCount,
    completedHours: summary.completedHours,
    dateKey: summary.dateKey,
    eveningHours: summary.eveningHours,
    plannedCount: summary.plannedCount,
    plannedHours: summary.plannedHours,
    unfinishedLabels: summary.unfinishedLabels.slice(0, 5),
    unscheduledCount: summary.unscheduledCount
  }));
}

function mascotMoneyState(store: PlannerStore, referenceDate: Date) {
  const state = decodeMoneyStore(store, referenceDate);
  return {
    categories: state.categories.slice(0, 8).map((category) => ({
      budgetCents: category.adjustedBudgetCents,
      id: category.id,
      kind: category.kind,
      name: category.name,
      remainingCents: category.remainingCents,
      spentCents: category.spentCents
    })),
    month: {
      availableWeekCents: state.month.availableWeekCents,
      flexibleBudgetCents: state.month.flexibleBudgetCents,
      flexibleRemainingCents: state.month.flexibleRemainingCents,
      flexibleSpentCents: state.month.flexibleSpentCents,
      projectedTotalCents: state.month.projectedTotalCents,
      spentCents: state.month.spentCents,
      targetCents: state.month.targetCents
    },
    vendors: state.vendors.slice(0, 5).map((vendor) => ({
      count: vendor.count,
      spentCents: vendor.spentCents,
      topCategoryId: vendor.topCategoryId,
      vendor: vendor.vendor
    }))
  };
}

export function buildMascotContext(store: PlannerStore, referenceDate: Date) {
  const currentDateKey = formatPlannerDate(referenceDate);
  const metrics = buildDashboardInsightMetricsFromStore(store, referenceDate);
  const insights = deriveDashboardInsights(metrics);
  return {
    activityLog: decodeActivityLog(store[ACTIVITY_LOG_KEY]),
    currentDateKey,
    dayState: decodeDayState(store, currentDateKey),
    insights,
    journalEntries: journalEntries(store).slice(0, 5).map(({ content, date, title }) => ({
      content,
      date,
      title
    })),
    metrics,
    moneyState: mascotMoneyState(store, referenceDate),
    plannedHours: decodePlannedValues(store, referenceDate),
    recentTaskHistory: recentTaskHistory(metrics),
    skate: {},
    todayTasks: decodeTasks(
      store[`hivePlanner.dailyTasks.${currentDateKey}`],
      `${currentDateKey}T00:00:00.000Z`
    ),
    topInsight: selectTopDashboardInsight(insights)
  };
}

export type MascotContext = ReturnType<typeof buildMascotContext>;
