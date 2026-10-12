import type { ActivityLogEntry } from "../shared/activity-log";
import type { PlannerTask } from "../shared/tasks/tasks";
import type { MascotContext } from "./mascot-context";
import { leadingTimeMinutes } from "../shared/planner-time";

export type MascotIntent =
  | "avoidance" | "breakdown" | "general" | "journal" | "money" | "morning"
  | "move_task" | "next_step" | "patterns" | "reality" | "skate";

export interface MascotSnippet {
  detail: string;
  id: string;
  tags: readonly MascotIntent[];
  title: string;
}

export interface TaskShiftSummary {
  growingEstimateCount: number;
  latestGrowingEstimate: { after: number; before: number; label: string } | null;
  laterMoveCount: number;
  latestLaterMove: { after: number; before: number; label: string } | null;
}

function round(value: unknown, digits = 1): number {
  const precision = 10 ** digits;
  return Math.round((Number(value) || 0) * precision) / precision;
}

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function previewText(value: unknown, limit = 100): string {
  const text = textValue(value).replace(/\s+/g, " ").trim();
  const maximum = Math.max(24, Number(limit) || 100);
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1).trimEnd()}…`;
}

export function formatMascotHours(value: unknown): string {
  const numeric = round(value);
  return numeric ? `${String(numeric).replace(/\.0$/, "")}h` : "0h";
}

export function mascotTaskLabel(task: PlannerTask): string {
  return previewText(task.label, 60);
}

export function parseMascotTaskTime(label: unknown): number | null {
  return leadingTimeMinutes(textValue(label));
}

export function formatMascotClock(minutes: number): string {
  const safe = Math.max(0, Number(minutes) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function openMascotTasks(context: MascotContext): PlannerTask[] {
  return context.todayTasks.filter((task) => !task.done);
}

export function concreteMascotTask(context: MascotContext): PlannerTask | null {
  const tasks = openMascotTasks(context);
  return tasks.find((task) => /^\d{1,2}(?::?\d{2})?/.test(task.label.trim()))
    ?? [...tasks].sort((left, right) => left.hours - right.hours)[0]
    ?? null;
}

export function broadMascotTasks(context: MascotContext): PlannerTask[] {
  const vagueWords = /\b(study|work|admin|project|journal|practice|plan|organize|clean|prep|review)\b/i;
  return openMascotTasks(context).filter((task) => {
    const label = task.label.trim();
    return label.split(/\s+/).length <= 3 && vagueWords.test(label);
  });
}

function shiftedLabel(entry: ActivityLogEntry): string {
  const metaLabel = typeof entry.meta.label === "string" ? entry.meta.label : "";
  return (textValue(entry.after) || textValue(entry.before) || metaLabel).trim();
}

export function summarizeTaskShifts(context: MascotContext): TaskShiftSummary {
  const laterMoves: { after: number; before: number; dateKey: string; label: string }[] = [];
  const growingEstimates: { after: number; before: number; dateKey: string; label: string }[] = [];
  context.activityLog.forEach((entry) => {
    if (entry.entityType !== "task" || entry.action !== "task_updated") return;
    if (entry.field === "label") {
      const before = parseMascotTaskTime(entry.before);
      const after = parseMascotTaskTime(entry.after);
      if (before !== null && after !== null && after > before) {
        laterMoves.push({ after, before, dateKey: entry.dateKey, label: shiftedLabel(entry) });
      }
    }
    if (entry.field === "hours") {
      const before = Number(entry.before) || 0;
      const after = Number(entry.after) || 0;
      if (after > before + 0.24) {
        growingEstimates.push({
          after,
          before,
          dateKey: entry.dateKey,
          label: typeof entry.meta.label === "string" ? entry.meta.label.trim() : ""
        });
      }
    }
  });
  laterMoves.sort((left, right) => right.dateKey.localeCompare(left.dateKey));
  growingEstimates.sort((left, right) => right.dateKey.localeCompare(left.dateKey));
  return {
    growingEstimateCount: growingEstimates.length,
    latestGrowingEstimate: growingEstimates[0] ?? null,
    laterMoveCount: laterMoves.length,
    latestLaterMove: laterMoves[0] ?? null
  };
}

export function classifyMascotQuestion(question: string): MascotIntent {
  const text = question.trim().toLowerCase();
  if (/morning|mornings|ready|get ready|late|wake|start/.test(text)) return "morning";
  if (/money|spend|spending|budget|food|grocery/.test(text)) return "money";
  if (/skate|skating|session|intensity|legs|energy|pain|recovery|benchmark|shove|180|ollie|rock and roll|axle/.test(text)) return "skate";
  if (/move.*tomorrow|tomorrow.*move|move to tomorrow/.test(text)) return "move_task";
  if (/break.*down|broken down|needs.*broken|smaller|make.*concrete/.test(text)) return "breakdown";
  if (/avoid|avoiding|procrast|stuck|why can't i start/.test(text)) return "avoidance";
  if (/journal|mood|feel|feeling|emotion/.test(text)) return "journal";
  if (/next|what should i do|what now|overwhelm|overloaded|clarity/.test(text)) return "next_step";
  if (/pattern|notice|lately|about me|myself|habit/.test(text)) return "patterns";
  if (/realistic|capacity|too much|heavy|baseline/.test(text)) return "reality";
  return "general";
}

export function buildMascotSnippets(context: MascotContext): MascotSnippet[] {
  const snippets: MascotSnippet[] = [];
  const { metrics } = context;
  const topInsight = context.insights[0];
  if (topInsight) snippets.push({
    detail: topInsight.why, id: "top-insight",
    tags: ["patterns", "next_step", "reality", "general"], title: topInsight.title
  });
  if (metrics.morningOverrun.sampleSize >= 4 && metrics.morningOverrun.averageOverrun > 0) snippets.push({
    detail: `Recent mornings averaged ${round(metrics.morningOverrun.plannedAverage)}h planned and ${round(metrics.morningOverrun.actualAverage)}h in practice.`,
    id: "morning-overrun", tags: ["morning", "patterns", "reality"], title: "Morning timing"
  });
  if (metrics.dailyTaskAverages.sampleSize >= 4) snippets.push({
    detail: `Recent days averaged ${round(metrics.dailyTaskAverages.plannedAverage)} planned tasks and ${round(metrics.dailyTaskAverages.completedAverage)} completed tasks.`,
    id: "task-capacity", tags: ["patterns", "next_step", "reality", "general"], title: "Task capacity"
  });
  if (metrics.carryoverIndicators.sampleSize >= 4) snippets.push({
    detail: `${round(metrics.carryoverIndicators.carryoverRate * 100)}% of unfinished tasks have reappeared on later days recently.`,
    id: "carryover", tags: ["avoidance", "patterns"], title: "Carryover"
  });
  if (metrics.vagueTaskFriction.sampleSize >= 4 && metrics.vagueTaskFriction.vagueOpenCount > 0) snippets.push({
    detail: `${metrics.vagueTaskFriction.vagueOpenCount} current tasks still look broad, and vague tasks have been finishing less reliably than specific ones.`,
    id: "vague-task", tags: ["avoidance", "next_step", "patterns"], title: "Task clarity"
  });
  if (metrics.moneySummary.available) snippets.push({
    detail: `Weekly flexible money is ${metrics.moneySummary.availableWeekLabel} and monthly flexible money is ${metrics.moneySummary.flexibleRemainingLabel}.`,
    id: "money", tags: ["money", "patterns", "reality"], title: "Money state"
  });
  if (metrics.foodSpendingOnHighEditDays.highEditDays >= 3
    && metrics.foodSpendingOnHighEditDays.lowerEditDays >= 3) snippets.push({
    detail: "Food spending has been higher on high-edit days than on calmer planning days lately.",
    id: "food-high-edit", tags: ["money", "patterns", "general"], title: "Food and edit churn"
  });
  if (metrics.lateStudyCorrelation.lateStudyDays >= 3
    && metrics.lateStudyCorrelation.otherDays >= 3) snippets.push({
    detail: "Days with late study blocks have been finishing less of the plan than other days lately.",
    id: "late-study", tags: ["patterns", "reality", "next_step", "general"], title: "Late study pattern"
  });
  if (metrics.simpleMorningCorrelation.simpleMorningDays >= 3
    && metrics.simpleMorningCorrelation.complexMorningDays >= 3) snippets.push({
    detail: "Simpler mornings have been lining up with better task completion lately.",
    id: "simple-morning", tags: ["morning", "patterns", "reality", "general"], title: "Simple morning pattern"
  });
  const shifts = summarizeTaskShifts(context);
  if (shifts.latestLaterMove) snippets.push({
    detail: `"${previewText(shifts.latestLaterMove.label, 48)}" was moved later from ${formatMascotClock(shifts.latestLaterMove.before)} to ${formatMascotClock(shifts.latestLaterMove.after)}, and that has happened ${Math.round(shifts.laterMoveCount)} times recently.`,
    id: "task-shift", tags: ["morning", "patterns", "avoidance", "general"], title: "Task moved later"
  });
  if (shifts.latestGrowingEstimate) snippets.push({
    detail: `"${previewText(shifts.latestGrowingEstimate.label, 48)}" grew from ${formatMascotHours(shifts.latestGrowingEstimate.before)} to ${formatMascotHours(shifts.latestGrowingEstimate.after)} in your edits, and that has happened ${Math.round(shifts.growingEstimateCount)} times recently.`,
    id: "growing-estimate", tags: ["morning", "patterns", "reality", "general"], title: "Task estimate grew"
  });
  context.journalEntries.slice(0, 3).forEach((entry, index) => snippets.push({
    detail: previewText(entry.content || entry.title || entry.date, 96), id: `journal-${index}`,
    tags: ["journal", "patterns", "general"], title: entry.title || entry.date
  }));
  openMascotTasks(context).slice(0, 3).forEach((task, index) => snippets.push({
    detail: `${mascotTaskLabel(task)}${task.hours ? ` (${formatMascotHours(task.hours)})` : ""}`,
    id: `open-task-${index}`, tags: ["next_step", "avoidance", "general"], title: "Open task"
  }));
  if (context.skate.todayPlan) snippets.push({
    detail: `${context.skate.todayPlan.phaseWeekLabel}. ${context.skate.todayPlan.blockLabel}. Main focus: ${previewText(context.skate.todayPlan.mainFocus, 64)}.`,
    id: "skate-plan", tags: ["skate", "general", "next_step"], title: "Today's skate plan"
  });
  snippets.push({
    detail: `Today's selected intensity is ${context.skate.todayState.selectedIntensity.toUpperCase()}.`,
    id: "skate-intensity", tags: ["skate", "general", "patterns"], title: "Today's skate intensity"
  });
  context.skate.recentSessions.slice(0, 4).forEach((session, index) => snippets.push({
    detail: `${session.intensity.toUpperCase()} · ${previewText(session.mainFocus || session.flowFocus || "Saved session", 64)}`,
    id: `skate-session-${index}`, tags: ["skate", "patterns", "general"],
    title: session.date || "Recent skate session"
  }));
  context.skate.supportThisWeek.slice(0, 4).forEach((support, index) => snippets.push({
    detail: `${support.minutes ? `${support.minutes} min` : "Logged"}${support.note ? ` · ${previewText(support.note, 48)}` : ""}`,
    id: `skate-support-${index}`, tags: ["skate", "patterns", "general"], title: support.type
  }));
  return snippets;
}

export function relevantMascotSnippets(question: string, snippets: readonly MascotSnippet[]) {
  const intent = classifyMascotQuestion(question);
  const exact = snippets.filter((snippet) => snippet.tags.includes(intent));
  const fallback = snippets.filter((snippet) => snippet.tags.includes("general") || snippet.id === "top-insight");
  return { intent, snippets: (exact.length ? exact : fallback).slice(0, 3) };
}
