import { averageMetrics, roundMetric } from "./dashboard-insight-metric-utils";
import { selectTaskSummaryWindow, type DailyTaskSummary } from "./dashboard-insight-task-summaries";

function completionRate(summary: DailyTaskSummary): number {
  return summary.plannedCount ? summary.completedCount / summary.plannedCount : 0;
}

export function calculateLateStudyCorrelation(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const lateStudyRates: number[] = [];
  const otherRates: number[] = [];
  window.forEach((summary) => {
    (summary.lateStudyCount > 0 ? lateStudyRates : otherRates).push(completionRate(summary));
  });
  const lateRate = averageMetrics(lateStudyRates);
  const otherRate = averageMetrics(otherRates);
  return {
    completionRateDifference: roundMetric(otherRate - lateRate, 2),
    lateStudyCompletionRate: roundMetric(lateRate, 2),
    lateStudyDays: lateStudyRates.length,
    otherCompletionRate: roundMetric(otherRate, 2),
    otherDays: otherRates.length,
    sampleSize: window.length
  };
}

export function calculateSimpleMorningCorrelation(
  summaries: readonly DailyTaskSummary[],
  endDateKey: string,
  lookbackDays: number
) {
  const window = selectTaskSummaryWindow(summaries, endDateKey, lookbackDays, false);
  const simpleRates: number[] = [];
  const complexRates: number[] = [];
  window.forEach((summary) => {
    const simple = summary.morningCount <= 1 && summary.morningPlannedHours <= 1.5;
    const complex = summary.morningCount >= 2 || summary.morningPlannedHours >= 2.5;
    if (simple) {
      simpleRates.push(completionRate(summary));
    } else if (complex) {
      complexRates.push(completionRate(summary));
    }
  });
  const simpleRate = averageMetrics(simpleRates);
  const complexRate = averageMetrics(complexRates);
  return {
    completionRateDifference: roundMetric(simpleRate - complexRate, 2),
    complexMorningCompletionRate: roundMetric(complexRate, 2),
    complexMorningDays: complexRates.length,
    sampleSize: window.length,
    simpleMorningCompletionRate: roundMetric(simpleRate, 2),
    simpleMorningDays: simpleRates.length
  };
}
