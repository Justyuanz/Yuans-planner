import { isRecord } from "../../../../shared/is-record";
import {
  averageMetrics,
  roundMetric,
  sumMetrics,
  taskMetricWindowDateKeys
} from "./dashboard-insight-metric-utils";
import {
  buildDailyTaskSummaries,
  normalizeInsightTaskLabel,
  parseTaskTimeMinutes,
  selectTaskSummaryWindow,
  type DailyTaskSummary
} from "./dashboard-insight-task-summaries";

export { buildDailyTaskSummaries, parseTaskTimeMinutes, selectTaskSummaryWindow };

interface BuildDashboardTaskMetricsInput {
  activityLog: unknown;
  currentDateKey: string;
  lookbackDays: number;
  taskMap: unknown;
}

interface SampleAverages {
  completedAverage: number;
  plannedAverage: number;
  sampleSize: number;
}

const EDIT_ACTIONS = new Set([
  "task_created",
  "task_updated",
  "task_deleted",
  "planned_hours_updated"
]);

function averageField(window: readonly DailyTaskSummary[], field: keyof DailyTaskSummary): number {
  return averageMetrics(window.map((summary) => summary[field]));
}

function dailyTaskAverages(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
): SampleAverages {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  return {
    completedAverage: roundMetric(averageField(window, "completedCount"), 2),
    plannedAverage: roundMetric(averageField(window, "plannedCount"), 2),
    sampleSize: window.length
  };
}

function hourGapAverages(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const plannedAverage = averageField(window, "plannedHours");
  const completedAverage = averageField(window, "completedHours");
  return {
    averageGap: roundMetric(plannedAverage - completedAverage, 2),
    completedAverage: roundMetric(completedAverage, 2),
    plannedAverage: roundMetric(plannedAverage, 2),
    sampleSize: window.length
  };
}

function morningOverrun(
  summaries: readonly DailyTaskSummary[],
  activityLog: unknown,
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const dates = new Set(window.map(({ dateKey }) => dateKey));
  const plannedByTask = new Map<string, number>();
  if (Array.isArray(activityLog)) {
    activityLog.filter(isRecord).forEach((entry) => {
      if (entry.entityType !== "task" || entry.field !== "hours"
        || typeof entry.dateKey !== "string" || !dates.has(entry.dateKey)) {
        return;
      }
      const meta = isRecord(entry.meta) ? entry.meta : {};
      const time = parseTaskTimeMinutes(meta.label);
      const after = Number(entry.after);
      if (time === null || time >= 12 * 60 || !(after > 0)) {
        return;
      }
      const taskId = String(entry.entityId);
      if (!plannedByTask.has(taskId)) {
        plannedByTask.set(taskId, after);
      }
    });
  }
  const plannedValues = [...plannedByTask.values()];
  const actualValues = window.map((summary) =>
    summary.morningCompletedHours || summary.morningPlannedHours
  ).filter((value) => value > 0);
  const plannedAverage = averageMetrics(plannedValues);
  const actualAverage = averageMetrics(actualValues);
  return {
    actualAverage: roundMetric(actualAverage, 2),
    averageOverrun: roundMetric(actualAverage - plannedAverage, 2),
    plannedAverage: roundMetric(plannedAverage, 2),
    sampleSize: Math.min(
      plannedValues.length || actualValues.length,
      actualValues.length || plannedValues.length
    )
  };
}

function eveningLoad(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, true);
  const latest = window.at(-1);
  return {
    averageEveningHours: roundMetric(averageField(window, "eveningHours"), 2),
    averageEveningTaskCount: roundMetric(averageField(window, "eveningCount"), 2),
    latestEveningHours: latest?.eveningHours ?? 0,
    latestEveningTaskCount: latest?.eveningCount ?? 0,
    sampleSize: window.length
  };
}

function editFrequency(activityLog: unknown, endDateKey: string, lookbackDays: number) {
  const dates = taskMetricWindowDateKeys(endDateKey, lookbackDays);
  const counts = new Map(dates.map((dateKey) => [dateKey, 0]));
  if (Array.isArray(activityLog)) {
    activityLog.filter(isRecord).forEach((entry) => {
      if (typeof entry.dateKey !== "string" || typeof entry.action !== "string"
        || !counts.has(entry.dateKey) || !EDIT_ACTIONS.has(entry.action)) {
        return;
      }
      counts.set(entry.dateKey, (counts.get(entry.dateKey) ?? 0) + 1);
    });
  }
  const values = [...counts.values()];
  return {
    averageEditsPerDay: roundMetric(averageMetrics(values), 2),
    latestEditCount: values.at(-1) ?? 0,
    sampleSize: values.length
  };
}

function carryoverIndicators(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const futureLabels = new Set<string>();
  const carriedByDate = new Map<string, number>();
  [...window].reverse().forEach((summary) => {
    carriedByDate.set(
      summary.dateKey,
      summary.unfinishedLabels.filter((label) => futureLabels.has(label)).length
    );
    summary.allLabels.forEach((label) => futureLabels.add(label));
  });
  const unfinishedTotal = sumMetrics(window.map(({ unfinishedLabels }) => unfinishedLabels.length));
  const carriedForwardTotal = sumMetrics([...carriedByDate.values()]);
  return {
    carriedForwardTotal,
    carryoverRate: unfinishedTotal ? roundMetric(carriedForwardTotal / unfinishedTotal, 2) : 0,
    sampleSize: window.length,
    unfinishedTotal
  };
}

function unscheduledTaskCounts(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, true);
  return {
    averageUnscheduledCount: roundMetric(averageField(window, "unscheduledCount"), 2),
    latestUnscheduledCount: window.at(-1)?.unscheduledCount ?? 0,
    sampleSize: window.length
  };
}

function looksVague(label: unknown): boolean {
  const text = normalizeInsightTaskLabel(label);
  if (!text || text.split(" ").length >= 4) {
    return false;
  }
  return new Set([
    "study", "work", "admin", "transcendence", "mobile development",
    "portfolio", "guitar", "skate", "project", "review"
  ]).has(text);
}

function vagueTaskFriction(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, true);
  const vague: number[] = [];
  const specific: number[] = [];
  window.forEach((summary) => {
    summary.tasks.forEach((task) => {
      (looksVague(task.label) ? vague : specific).push(task.done ? 1 : 0);
    });
  });
  const latest = window.at(-1);
  return {
    sampleSize: window.length,
    specificCompletionRate: specific.length
      ? roundMetric(sumMetrics(specific) / specific.length, 2) : 0,
    vagueCompletionRate: vague.length ? roundMetric(sumMetrics(vague) / vague.length, 2) : 0,
    vagueOpenCount: latest?.tasks.filter((task) => !task.done && looksVague(task.label)).length ?? 0
  };
}

function emptyTodaySummary(dateKey: string): DailyTaskSummary {
  return {
    allLabels: [], completedCount: 0, completedHours: 0, dateKey,
    eveningCount: 0, eveningHours: 0, lateStudyCount: 0,
    morningCompletedHours: 0, morningCount: 0, morningPlannedHours: 0,
    plannedCount: 0, plannedHours: 0, tasks: [], unfinishedLabels: [], unscheduledCount: 0
  };
}

export function buildDashboardTaskMetrics(input: BuildDashboardTaskMetricsInput) {
  const lookbackDays = Math.max(1, Number(input.lookbackDays) || 14);
  const dailySummaries = buildDailyTaskSummaries(input.taskMap);
  const todaySummary = dailySummaries.find(({ dateKey }) => dateKey === input.currentDateKey)
    ?? emptyTodaySummary(input.currentDateKey);
  return {
    carryoverIndicators: carryoverIndicators(dailySummaries, input.currentDateKey, lookbackDays),
    dailySummaries,
    dailyTaskAverages: dailyTaskAverages(dailySummaries, input.currentDateKey, lookbackDays),
    editFrequency: editFrequency(input.activityLog, input.currentDateKey, lookbackDays),
    eveningLoad: eveningLoad(dailySummaries, input.currentDateKey, lookbackDays),
    hourGapAverages: hourGapAverages(dailySummaries, input.currentDateKey, lookbackDays),
    morningOverrun: morningOverrun(
      dailySummaries,
      input.activityLog,
      input.currentDateKey,
      lookbackDays
    ),
    todaySummary,
    unscheduledTaskCounts: unscheduledTaskCounts(dailySummaries, input.currentDateKey, lookbackDays),
    vagueTaskFriction: vagueTaskFriction(dailySummaries, input.currentDateKey, lookbackDays)
  };
}
