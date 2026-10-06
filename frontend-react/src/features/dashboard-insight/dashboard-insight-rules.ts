import { isRecord } from "../../shared/is-record";
import type { DashboardInsightAction } from "./dashboard-insight";

export interface DashboardInsight {
  actions: readonly DashboardInsightAction[];
  id: string;
  mode: "focus" | "reality";
  priority: number;
  sampleSize: number;
  title: string;
  why: string;
}

type Metrics = Record<string, unknown>;
type Metric = Record<string, unknown>;
type InsightRule = (metrics: Metrics) => DashboardInsight | null;

const MIN_SAMPLE = 4;
const CROSS_DOMAIN_GROUP_MIN = 3;
const HIGH_EDIT_FOOD_SPEND_DELTA_CENTS = 800;
const JOURNAL_LENGTH_DELTA_CHARS = 40;
const LATE_STUDY_COMPLETION_DELTA = 0.2;
const SIMPLE_MORNING_COMPLETION_DELTA = 0.2;
const LOW_ENERGY_EVENING_DELTA = 1;

const PLAN_ACTIONS = [
  action("review_planned_hours", "Review planned hours"),
  action("focus_today_tasks", "Focus today's tasks")
] as const;

const FOCUS_ACTIONS = [
  action("focus_today_tasks", "Focus today's tasks"),
  action("review_planned_hours", "Review planned hours")
] as const;

const MONEY_ACTIONS = [
  action("open_money_view", "Open money view"),
  action("pause_extra_spending", "Pause extra spending")
] as const;

const REDUCE_AND_CLARIFY_ACTIONS = [
  action("focus_today_tasks", "Lighten today's task load"),
  action("make_one_task_concrete", "Make one task concrete")
] as const;

function action(id: string, label: string): DashboardInsightAction {
  return { id, label };
}

function metric(metrics: Metrics, key: string): Metric | null {
  const value = metrics[key];
  return isRecord(value) ? value : null;
}

function number(metricValue: Metric, key: string): number {
  return Number(metricValue[key]);
}

function round(value: unknown, digits = 1): number {
  const precision = 10 ** digits;
  return Math.round((Number(value) || 0) * precision) / precision;
}

function hasSample(metricValue: Metric): boolean {
  return number(metricValue, "sampleSize") >= MIN_SAMPLE;
}

function insight(
  id: string,
  mode: DashboardInsight["mode"],
  priority: number,
  title: string,
  why: string,
  actions: readonly DashboardInsightAction[],
  sampleSize: unknown
): DashboardInsight {
  return {
    actions: actions.map(({ id: actionId, label }) => ({ id: actionId, label })),
    id,
    mode,
    priority,
    sampleSize: Number(sampleSize) || 0,
    title,
    why
  };
}

function morningOverrunRule(metrics: Metrics): DashboardInsight | null {
  const overrun = metric(metrics, "morningOverrun");
  if (overrun === null || !hasSample(overrun)) {
    return null;
  }
  if (number(overrun, "averageOverrun") < 0.75
    || number(overrun, "actualAverage") <= number(overrun, "plannedAverage")) {
    return null;
  }
  return insight(
    "morning_overrun",
    "reality",
    95,
    "Your mornings are usually taking longer than planned.",
    `Across ${String(overrun.sampleSize)} recent days, morning blocks averaged ${round(overrun.plannedAverage)}h planned and ${round(overrun.actualAverage)}h in practice.`,
    PLAN_ACTIONS,
    overrun.sampleSize
  );
}

function taskOverpackingRule(metrics: Metrics): DashboardInsight | null {
  const averages = metric(metrics, "dailyTaskAverages");
  const today = metric(metrics, "todaySummary");
  if (averages === null || today === null || !hasSample(averages)) {
    return null;
  }
  const plannedCount = number(today, "plannedCount");
  if (plannedCount < 4 || plannedCount < number(averages, "completedAverage") + 1.5) {
    return null;
  }
  return insight(
    "task_overpacking",
    "reality",
    90,
    "Today may be holding more tasks than you usually finish.",
    `You planned ${plannedCount} tasks today, while your recent completion average is ${round(averages.completedAverage)} tasks.`,
    FOCUS_ACTIONS,
    averages.sampleSize
  );
}

function eveningOverloadRule(metrics: Metrics): DashboardInsight | null {
  const load = metric(metrics, "eveningLoad");
  if (load === null || !hasSample(load)) {
    return null;
  }
  const hours = number(load, "latestEveningHours");
  const taskCount = number(load, "latestEveningTaskCount");
  if (hours < 2.5 && taskCount < 3) {
    return null;
  }
  return insight(
    "evening_overload",
    "reality",
    88,
    "A lot of today's plan is stacked into the evening.",
    `Today's evening load is ${round(hours)}h across ${taskCount} tasks, compared with a recent average of ${round(load.averageEveningHours)}h.`,
    PLAN_ACTIONS,
    load.sampleSize
  );
}

function moneySpentRule(metrics: Metrics): DashboardInsight | null {
  const money = metric(metrics, "moneySummary");
  if (!money?.available) {
    return null;
  }
  if (number(money, "flexibleRemainingCents") >= 0 && number(money, "availableWeekCents") >= 0) {
    return null;
  }
  return insight(
    "too_much_money_spent",
    "reality",
    82,
    "Spending is pressing on this week's room a bit.",
    "The weekly flexible buffer is below zero, and the current month is running tighter than usual.",
    MONEY_ACTIONS,
    money.sampleSize
  );
}

function vagueTaskRule(metrics: Metrics): DashboardInsight | null {
  const vague = metric(metrics, "vagueTaskFriction");
  if (vague === null || !hasSample(vague)) {
    return null;
  }
  const openCount = number(vague, "vagueOpenCount");
  if (openCount < 2
    && number(vague, "vagueCompletionRate") >= number(vague, "specificCompletionRate")) {
    return null;
  }
  return insight(
    "vague_task_friction",
    "focus",
    80,
    "A few open tasks still look too vague to start cleanly.",
    `${openCount} open tasks use broad labels, and vague tasks have been completed less often than timed or specific ones lately.`,
    [action("make_one_task_concrete", "Make one task concrete"), FOCUS_ACTIONS[0]],
    vague.sampleSize
  );
}

function realityBaselineRule(metrics: Metrics): DashboardInsight | null {
  const hours = metric(metrics, "hourGapAverages");
  const today = metric(metrics, "todaySummary");
  if (hours === null || today === null || !hasSample(hours)) {
    return null;
  }
  const plannedHours = number(today, "plannedHours");
  if (plannedHours < number(hours, "completedAverage") + 1.5) {
    return null;
  }
  return insight(
    "reality_baseline_warning",
    "reality",
    84,
    "Today's planned hours are above your recent working baseline.",
    `You planned ${round(plannedHours)}h today. Recent completed days have averaged about ${round(hours.completedAverage)}h.`,
    PLAN_ACTIONS,
    hours.sampleSize
  );
}

function simpleMorningRule(metrics: Metrics): DashboardInsight | null {
  const pattern = metric(metrics, "simpleMorningCorrelation");
  if (pattern === null || !hasSample(pattern)) {
    return null;
  }
  if (number(pattern, "simpleMorningDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "complexMorningDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "completionRateDifference") < SIMPLE_MORNING_COMPLETION_DELTA) {
    return null;
  }
  return insight(
    "simple_morning_completion_boost",
    "focus",
    79,
    "Simpler mornings have tended to support better task completion.",
    `Recent simple-morning days finished about ${round(number(pattern, "simpleMorningCompletionRate") * 100, 0)}% of planned tasks, compared with ${round(number(pattern, "complexMorningCompletionRate") * 100, 0)}% on more crowded mornings.`,
    [action("review_planned_hours", "Protect a simpler morning"), action("focus_today_tasks", "Keep the first block small")],
    pattern.sampleSize
  );
}

function lowEnergyRule(metrics: Metrics): DashboardInsight | null {
  const pattern = metric(metrics, "energyCrashPattern");
  if (pattern === null || !hasSample(pattern)) {
    return null;
  }
  if (number(pattern, "lowEnergyDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "otherDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "previousEveningDifference") < LOW_ENERGY_EVENING_DELTA) {
    return null;
  }
  return insight(
    "low_energy_after_heavy_evening",
    "focus",
    83,
    "Low-energy days have often come after heavier evenings.",
    `On recent tracked days, low-energy check-ins followed about ${round(pattern.lowEnergyPreviousEveningHours, 1)}h of evening tasks the day before, compared with ${round(pattern.otherPreviousEveningHours, 1)}h before steadier days.`,
    [action("review_planned_hours", "Protect tomorrow night"), action("focus_today_tasks", "Make the next day lighter")],
    pattern.sampleSize
  );
}

function foodSpendingRule(metrics: Metrics): DashboardInsight | null {
  const pattern = metric(metrics, "foodSpendingOnHighEditDays");
  if (pattern === null || !hasSample(pattern)) {
    return null;
  }
  if (number(pattern, "highEditDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "lowerEditDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "averageFoodDifferenceCents") < HIGH_EDIT_FOOD_SPEND_DELTA_CENTS) {
    return null;
  }
  return insight(
    "food_spending_on_high_edit_days",
    "reality",
    78,
    "Food spending has tended to run higher on high-edit days.",
    `Across ${String(pattern.sampleSize)} recent days, food spending averaged about EUR ${round(number(pattern, "highEditAverageFoodCents") / 100, 2)} on higher-edit days and EUR ${round(number(pattern, "lowerEditAverageFoodCents") / 100, 2)} on calmer ones.`,
    [action("open_money_view", "Open money view"), action("focus_today_tasks", "Reduce planner churn")],
    pattern.sampleSize
  );
}

function lateStudyRule(metrics: Metrics): DashboardInsight | null {
  const pattern = metric(metrics, "lateStudyCorrelation");
  if (pattern === null || !hasSample(pattern)) {
    return null;
  }
  if (number(pattern, "lateStudyDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "otherDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "completionRateDifference") < LATE_STUDY_COMPLETION_DELTA) {
    return null;
  }
  return insight(
    "late_study_completion_dip",
    "reality",
    77,
    "Late study blocks have been lining up with lower completion.",
    `Recent days with late study blocks finished about ${round(number(pattern, "lateStudyCompletionRate") * 100, 0)}% of planned tasks, compared with ${round(number(pattern, "otherCompletionRate") * 100, 0)}% on other days.`,
    PLAN_ACTIONS,
    pattern.sampleSize
  );
}

function journalBehaviorRule(metrics: Metrics): DashboardInsight | null {
  const pattern = metric(metrics, "journalBehaviorOnOverloadedDays");
  if (pattern === null || !hasSample(pattern)) {
    return null;
  }
  if (number(pattern, "overloadedDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "regularDays") < CROSS_DOMAIN_GROUP_MIN
    || number(pattern, "regularAverageLength") - number(pattern, "overloadedAverageLength")
      < JOURNAL_LENGTH_DELTA_CHARS) {
    return null;
  }
  return insight(
    "journal_behavior_on_overloaded_days",
    "focus",
    74,
    "Journal check-ins tend to get shorter on overloaded days.",
    `On overloaded days, recent journal entries averaged about ${round(pattern.overloadedAverageLength, 0)} characters compared with ${round(pattern.regularAverageLength, 0)} on lighter days.`,
    REDUCE_AND_CLARIFY_ACTIONS,
    pattern.sampleSize
  );
}

const RULES: readonly InsightRule[] = [
  morningOverrunRule,
  taskOverpackingRule,
  eveningOverloadRule,
  moneySpentRule,
  vagueTaskRule,
  realityBaselineRule,
  simpleMorningRule,
  lowEnergyRule,
  foodSpendingRule,
  lateStudyRule,
  journalBehaviorRule
];

export function deriveDashboardInsights(value: unknown): DashboardInsight[] {
  if (!isRecord(value)) {
    return [];
  }
  return RULES.flatMap((rule) => {
    const result = rule(value);
    return result === null ? [] : [result];
  }).sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
}

export function selectTopDashboardInsight(
  insights: readonly DashboardInsight[]
): DashboardInsight | null {
  return insights[0] ?? null;
}
