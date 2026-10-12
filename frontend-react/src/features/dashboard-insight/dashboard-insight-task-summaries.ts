import { isRecord } from "../../shared/is-record";
import {
  finiteNonNegative,
  isValidDateKey,
  roundMetric,
  taskMetricWindowDateKeys
} from "./dashboard-insight-metric-utils";
import { leadingTimeMinutes } from "../../shared/planner-time";

const MORNING_END_MINUTES = 12 * 60;
const EVENING_START_MINUTES = 18 * 60;
const STUDY_ACTIVITY_IDS = new Set(["transcendence", "mobiledevelopment", "portfoliojobprep"]);

export type InsightTask = Record<string, unknown>;

export interface DailyTaskSummary {
  allLabels: string[];
  completedCount: number;
  completedHours: number;
  dateKey: string;
  eveningCount: number;
  eveningHours: number;
  lateStudyCount: number;
  morningCompletedHours: number;
  morningCount: number;
  morningPlannedHours: number;
  plannedCount: number;
  plannedHours: number;
  tasks: InsightTask[];
  unfinishedLabels: string[];
  unscheduledCount: number;
}

function taskText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" && value !== 0 ? String(value) : "";
}

export function parseTaskTimeMinutes(label: unknown): number | null {
  return leadingTimeMinutes(taskText(label));
}

export function normalizeInsightTaskLabel(label: unknown): string {
  return taskText(label)
    .replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?)?\s*/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function effectiveTaskHours(task: InsightTask): number {
  const timerSeconds = finiteNonNegative(task.timerSeconds);
  return timerSeconds > 0 ? roundMetric(timerSeconds / 3600, 2) : finiteNonNegative(task.hours);
}

function taskLooksLikeStudy(task: InsightTask): boolean {
  const activity = typeof task.activity === "string" ? task.activity.toLowerCase() : "";
  if (STUDY_ACTIVITY_IDS.has(activity)) {
    return true;
  }
  return /\b(study|transcendence|mobile development|portfolio|job prep|exam|revision|read notes|review)\b/
    .test(normalizeInsightTaskLabel(task.label));
}

function emptySummary(dateKey: string, tasks: InsightTask[]): DailyTaskSummary {
  return {
    allLabels: [],
    completedCount: 0,
    completedHours: 0,
    dateKey,
    eveningCount: 0,
    eveningHours: 0,
    lateStudyCount: 0,
    morningCompletedHours: 0,
    morningCount: 0,
    morningPlannedHours: 0,
    plannedCount: tasks.length,
    plannedHours: 0,
    tasks: [...tasks],
    unfinishedLabels: [],
    unscheduledCount: 0
  };
}

function summarizeTasks(dateKey: string, tasks: InsightTask[]): DailyTaskSummary {
  const summary = emptySummary(dateKey, tasks);
  tasks.forEach((task) => {
    const hours = effectiveTaskHours(task);
    const time = parseTaskTimeMinutes(task.label);
    const done = Boolean(task.done);
    summary.plannedHours += hours;
    if (done) {
      summary.completedCount += 1;
      summary.completedHours += hours;
    }
    if (time === null) {
      summary.unscheduledCount += 1;
    } else if (time < MORNING_END_MINUTES) {
      summary.morningCount += 1;
      summary.morningPlannedHours += hours;
      if (done) {
        summary.morningCompletedHours += hours;
      }
    }
    if (time !== null && time >= EVENING_START_MINUTES) {
      summary.eveningCount += 1;
      summary.eveningHours += hours;
      if (taskLooksLikeStudy(task)) {
        summary.lateStudyCount += 1;
      }
    }
    const label = normalizeInsightTaskLabel(task.label);
    if (label) {
      summary.allLabels.push(label);
      if (!done) {
        summary.unfinishedLabels.push(label);
      }
    }
  });
  summary.plannedHours = roundMetric(summary.plannedHours, 2);
  summary.completedHours = roundMetric(summary.completedHours, 2);
  summary.morningPlannedHours = roundMetric(summary.morningPlannedHours, 2);
  summary.morningCompletedHours = roundMetric(summary.morningCompletedHours, 2);
  summary.eveningHours = roundMetric(summary.eveningHours, 2);
  return summary;
}

export function buildDailyTaskSummaries(taskMap: unknown): DailyTaskSummary[] {
  if (!isRecord(taskMap)) {
    return [];
  }
  return Object.keys(taskMap).filter(isValidDateKey).sort().map((dateKey) => {
    const candidates = taskMap[dateKey];
    const tasks = Array.isArray(candidates) ? candidates.filter(isRecord) : [];
    return summarizeTasks(dateKey, tasks);
  });
}

export function selectTaskSummaryWindow(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number,
  includeCurrentDay: boolean
): DailyTaskSummary[] {
  const summariesByDate = new Map(summaries.map((summary) => [summary.dateKey, summary]));
  return taskMetricWindowDateKeys(endDateKey, lookbackDays).flatMap((dateKey) => {
    if (!includeCurrentDay && dateKey === endDateKey) {
      return [];
    }
    const summary = summariesByDate.get(dateKey);
    return summary === undefined ? [] : [summary];
  });
}
