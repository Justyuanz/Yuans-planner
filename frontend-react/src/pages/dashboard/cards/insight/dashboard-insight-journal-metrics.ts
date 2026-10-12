import { isRecord } from "../../../../shared/is-record";
import {
  averageMetrics,
  isValidDateKey,
  roundMetric,
  taskMetricWindowDateKeys
} from "./dashboard-insight-metric-utils";
import { selectTaskSummaryWindow, type DailyTaskSummary } from "./dashboard-insight-task-summaries";

interface InsightJournalEntry {
  content: string;
  date: string;
  energy: string;
  title: string;
}

const LOW_ENERGY_STATES = new Set(["empty", "low"]);

function normalizeJournalEntries(value: unknown): InsightJournalEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.date !== "string"
      || !isValidDateKey(candidate.date)) {
      return [];
    }
    const tracker = isRecord(candidate.tracker) ? candidate.tracker : {};
    return [{
      content: typeof candidate.content === "string" ? candidate.content : "",
      date: candidate.date,
      energy: typeof tracker.energy === "string" ? tracker.energy.trim().toLowerCase() : "",
      title: typeof candidate.title === "string" ? candidate.title.trim() : ""
    }];
  });
}

function journalLengthsByDate(value: unknown, dates: readonly string[]): Map<string, number> {
  const allowed = new Set(dates);
  const lengths = new Map<string, number>();
  normalizeJournalEntries(value).forEach((entry) => {
    if (!allowed.has(entry.date)) {
      return;
    }
    lengths.set(entry.date, (entry.title ? entry.title.length + 1 : 0) + entry.content.trim().length);
  });
  return lengths;
}

export function calculateJournalBehaviorPattern(
  summaries: readonly DailyTaskSummary[],
  journalEntries: unknown,
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const lengths = journalLengthsByDate(journalEntries, window.map(({ dateKey }) => dateKey));
  const overloadedLengths: number[] = [];
  const regularLengths: number[] = [];
  let overloadedDays = 0;
  let regularDays = 0;
  let overloadedJournalDays = 0;
  let regularJournalDays = 0;
  window.forEach((summary) => {
    const length = lengths.get(summary.dateKey);
    const overloaded = summary.plannedCount >= 5 || summary.plannedHours >= 6;
    if (overloaded) {
      overloadedDays += 1;
      if (length !== undefined) {
        overloadedJournalDays += 1;
        overloadedLengths.push(length);
      }
    } else {
      regularDays += 1;
      if (length !== undefined) {
        regularJournalDays += 1;
        regularLengths.push(length);
      }
    }
  });
  return {
    overloadedAverageLength: roundMetric(averageMetrics(overloadedLengths), 0),
    overloadedDays,
    overloadedJournalingRate: overloadedDays
      ? roundMetric(overloadedJournalDays / overloadedDays, 2) : 0,
    regularAverageLength: roundMetric(averageMetrics(regularLengths), 0),
    regularDays,
    regularJournalingRate: regularDays ? roundMetric(regularJournalDays / regularDays, 2) : 0,
    sampleSize: window.length
  };
}

export function calculateEnergyCrashPattern(
  summaries: readonly DailyTaskSummary[],
  journalEntries: unknown,
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const summariesByDate = new Map(window.map((summary) => [summary.dateKey, summary]));
  const allowedDates = new Set(taskMetricWindowDateKeys(endDateKey, lookbackDays));
  const lowEvening: number[] = [];
  const otherEvening: number[] = [];
  const lowPlanned: number[] = [];
  const otherPlanned: number[] = [];
  const lowUnfinished: number[] = [];
  const otherUnfinished: number[] = [];
  const lowEnergyDates: string[] = [];
  let sampleSize = 0;

  normalizeJournalEntries(journalEntries).forEach((entry) => {
    const previousDate = taskMetricWindowDateKeys(entry.date, 2)[0];
    const previous = previousDate === undefined ? undefined : summariesByDate.get(previousDate);
    if (!allowedDates.has(entry.date) || previous === undefined || !entry.energy) {
      return;
    }
    sampleSize += 1;
    const unfinished = previous.plannedCount - previous.completedCount;
    if (LOW_ENERGY_STATES.has(entry.energy)) {
      lowEnergyDates.push(entry.date);
      lowEvening.push(previous.eveningHours);
      lowPlanned.push(previous.plannedHours);
      lowUnfinished.push(unfinished);
    } else {
      otherEvening.push(previous.eveningHours);
      otherPlanned.push(previous.plannedHours);
      otherUnfinished.push(unfinished);
    }
  });

  const lowEveningAverage = averageMetrics(lowEvening);
  const otherEveningAverage = averageMetrics(otherEvening);
  const lowPlannedAverage = averageMetrics(lowPlanned);
  const otherPlannedAverage = averageMetrics(otherPlanned);
  const lowUnfinishedAverage = averageMetrics(lowUnfinished);
  const otherUnfinishedAverage = averageMetrics(otherUnfinished);
  return {
    lowEnergyDates: lowEnergyDates.slice(-4),
    lowEnergyDays: lowEvening.length,
    lowEnergyPreviousEveningHours: roundMetric(lowEveningAverage, 2),
    lowEnergyPreviousPlannedHours: roundMetric(lowPlannedAverage, 2),
    lowEnergyPreviousUnfinishedCount: roundMetric(lowUnfinishedAverage, 2),
    otherDays: otherEvening.length,
    otherPreviousEveningHours: roundMetric(otherEveningAverage, 2),
    otherPreviousPlannedHours: roundMetric(otherPlannedAverage, 2),
    otherPreviousUnfinishedCount: roundMetric(otherUnfinishedAverage, 2),
    previousEveningDifference: roundMetric(lowEveningAverage - otherEveningAverage, 2),
    previousPlannedHoursDifference: roundMetric(lowPlannedAverage - otherPlannedAverage, 2),
    previousUnfinishedDifference: roundMetric(lowUnfinishedAverage - otherUnfinishedAverage, 2),
    sampleSize
  };
}
