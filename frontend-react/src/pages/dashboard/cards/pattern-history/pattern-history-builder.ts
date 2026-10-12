import { isRecord } from "@/shared/is-record";
import type { DashboardInsight } from "../insight/dashboard-insight-rules";
import type {
  PatternHistoryItem,
  PatternHistoryModel
} from "./pattern-history";

type Metrics = Record<string, unknown>;
type Metric = Record<string, unknown>;

const MODE_LABELS: Readonly<Record<DashboardInsight["mode"], string>> = {
  focus: "Focus friction",
  reality: "Reality checks"
};
const MODE_ORDER: readonly DashboardInsight["mode"][] = ["reality", "focus"];

function metric(metrics: Metrics, key: string): Metric | null {
  const value = metrics[key];
  return isRecord(value) ? value : null;
}

function value(metricValue: Metric, key: string): unknown {
  return metricValue[key];
}

function round(valueToRound: unknown, digits = 1): number {
  const precision = 10 ** digits;
  return Math.round((Number(valueToRound) || 0) * precision) / precision;
}

function percent(valueToFormat: unknown): string {
  return `${Math.round((Number(valueToFormat) || 0) * 100)}%`;
}

function evidenceForInsight(insight: DashboardInsight, metrics: Metrics): string[] {
  const morning = metric(metrics, "morningOverrun");
  if (insight.id === "morning_overrun" && morning !== null) {
    return [
      `Recent sample: ${String(value(morning, "sampleSize"))} days.`,
      `Planned mornings averaged ${round(value(morning, "plannedAverage"))}h.`,
      `Actual mornings averaged ${round(value(morning, "actualAverage"))}h.`
    ];
  }
  const taskAverages = metric(metrics, "dailyTaskAverages");
  const today = metric(metrics, "todaySummary");
  if (insight.id === "task_overpacking" && taskAverages !== null && today !== null) {
    return [
      `Today's plan holds ${String(value(today, "plannedCount"))} tasks.`,
      `Recent completion average is ${round(value(taskAverages, "completedAverage"))} tasks/day.`,
      `Recent planned average is ${round(value(taskAverages, "plannedAverage"))} tasks/day.`
    ];
  }
  const evening = metric(metrics, "eveningLoad");
  if (insight.id === "evening_overload" && evening !== null) {
    return [
      `Today's evening load is ${round(value(evening, "latestEveningHours"))}h.`,
      `That is spread across ${String(value(evening, "latestEveningTaskCount"))} tasks tonight.`,
      `Recent evening average is ${round(value(evening, "averageEveningHours"))}h.`
    ];
  }
  const money = metric(metrics, "moneySummary");
  if (insight.id === "too_much_money_spent" && money !== null) {
    return [
      `Weekly flexible room: ${String(value(money, "availableWeekLabel"))}.`,
      `Monthly flexible room: ${String(value(money, "flexibleRemainingLabel"))}.`
    ];
  }
  const vague = metric(metrics, "vagueTaskFriction");
  if (insight.id === "vague_task_friction" && vague !== null) {
    return [
      `${String(value(vague, "vagueOpenCount"))} open tasks still look broad.`,
      `Vague task completion rate: ${percent(value(vague, "vagueCompletionRate"))}.`,
      `Specific task completion rate: ${percent(value(vague, "specificCompletionRate"))}.`
    ];
  }
  const hours = metric(metrics, "hourGapAverages");
  if (insight.id === "reality_baseline_warning" && hours !== null && today !== null) {
    return [
      `Today's plan adds up to ${round(value(today, "plannedHours"))}h.`,
      `Recent completed average is ${round(value(hours, "completedAverage"))}h/day.`,
      `Recent planned average is ${round(value(hours, "plannedAverage"))}h/day.`
    ];
  }
  const food = metric(metrics, "foodSpendingOnHighEditDays");
  if (insight.id === "food_spending_on_high_edit_days" && food !== null) {
    return [
      `Higher-edit days: ${String(value(food, "highEditDays"))}.`,
      `Food average on high-edit days: EUR ${round(Number(value(food, "highEditAverageFoodCents")) / 100, 2)}.`,
      `Food average on calmer days: EUR ${round(Number(value(food, "lowerEditAverageFoodCents")) / 100, 2)}.`
    ];
  }
  const journal = metric(metrics, "journalBehaviorOnOverloadedDays");
  if (insight.id === "journal_behavior_on_overloaded_days" && journal !== null) {
    return [
      `Overloaded days sampled: ${String(value(journal, "overloadedDays"))}.`,
      `Average journal length on overloaded days: ${round(value(journal, "overloadedAverageLength"), 0)} chars.`,
      `Average journal length on lighter days: ${round(value(journal, "regularAverageLength"), 0)} chars.`
    ];
  }
  const lateStudy = metric(metrics, "lateStudyCorrelation");
  if (insight.id === "late_study_completion_dip" && lateStudy !== null) {
    return [
      `Late-study days sampled: ${String(value(lateStudy, "lateStudyDays"))}.`,
      `Completion on late-study days: ${round(Number(value(lateStudy, "lateStudyCompletionRate")) * 100, 0)}%.`,
      `Completion on other days: ${round(Number(value(lateStudy, "otherCompletionRate")) * 100, 0)}%.`
    ];
  }
  const morningCorrelation = metric(metrics, "simpleMorningCorrelation");
  if (insight.id === "simple_morning_completion_boost" && morningCorrelation !== null) {
    return [
      `Simple mornings sampled: ${String(value(morningCorrelation, "simpleMorningDays"))}.`,
      `Completion on simple-morning days: ${round(Number(value(morningCorrelation, "simpleMorningCompletionRate")) * 100, 0)}%.`,
      `Completion on crowded-morning days: ${round(Number(value(morningCorrelation, "complexMorningCompletionRate")) * 100, 0)}%.`
    ];
  }
  const energy = metric(metrics, "energyCrashPattern");
  if (insight.id === "low_energy_after_heavy_evening" && energy !== null) {
    return [
      `Low-energy days sampled: ${String(value(energy, "lowEnergyDays"))}.`,
      `Evening hours before low-energy days: ${round(value(energy, "lowEnergyPreviousEveningHours"), 1)}h.`,
      `Evening hours before steadier days: ${round(value(energy, "otherPreviousEveningHours"), 1)}h.`
    ];
  }
  return insight.why ? [insight.why] : [];
}

function historyItem(insight: DashboardInsight, metrics: Metrics): PatternHistoryItem {
  return {
    actions: insight.actions.slice(0, 2).map((action) => ({ ...action })),
    evidence: evidenceForInsight(insight, metrics),
    id: insight.id,
    priority: insight.priority,
    sampleSize: insight.sampleSize,
    summary: insight.why,
    title: insight.title
  };
}

export function buildPatternHistoryFromMetrics(
  insights: readonly DashboardInsight[],
  metrics: Metrics,
  currentDateKey: string,
  requestedLookbackDays = 14
): PatternHistoryModel {
  const lookbackDays = Math.max(1, Number(requestedLookbackDays) || 14);
  const groups = MODE_ORDER.flatMap((mode) => {
    const items = insights.filter((insight) => insight.mode === mode)
      .map((insight) => historyItem(insight, metrics))
      .sort((left, right) => {
        const priorityOrder = right.priority - left.priority;
        return priorityOrder !== 0 ? priorityOrder : left.id.localeCompare(right.id);
      });
    return items.length === 0 ? [] : [{ items, mode, title: MODE_LABELS[mode] }];
  });
  return {
    groups,
    isEmpty: groups.length === 0,
    rangeLabel: `Last ${lookbackDays} days through ${currentDateKey}`
  };
}
