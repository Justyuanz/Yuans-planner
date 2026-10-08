import type { DayStateId } from "../features/day-state/day-state";
import { parseTaskTimeMinutes } from "../features/dashboard-insight/dashboard-insight-task-summaries";
import type { MascotContext } from "./mascot-context";

export type MascotActionId =
  | "adjust_morning_block"
  | "break_task_down"
  | "keep_top_three"
  | "move_one_task"
  | "simplify_today";

export interface MascotActionTask {
  done: boolean;
  hours: number;
  id: string;
  label: string;
}

export interface MascotActionContext {
  carryoverRate: number;
  dayState: DayStateId;
  recentTaskHistory: readonly {
    unfinishedLabels: readonly string[];
  }[];
  todayTasks: readonly MascotActionTask[];
}

export interface MascotActionSuggestion {
  id: MascotActionId;
  label: string;
  suggestion: string;
}

export interface MascotReplyDraft {
  answer?: string;
  evidence?: readonly string[];
  source?: string;
}

export interface FinalizedMascotReply {
  answer: string;
  evidence: string[];
  source: string;
}

export function buildMascotActionContext(context: MascotContext): MascotActionContext {
  return {
    carryoverRate: context.metrics.carryoverIndicators.carryoverRate,
    dayState: context.dayState,
    recentTaskHistory: context.recentTaskHistory,
    todayTasks: context.todayTasks
  };
}

type QuestionIntent = "breakdown" | "general" | "morning" | "move" | "next" | "simplify";

const ACTION_LABELS: Readonly<Record<MascotActionId, string>> = {
  adjust_morning_block: "Push one morning task later",
  break_task_down: "Break one task into smaller steps",
  keep_top_three: "Keep top three visible",
  move_one_task: "Move one task to tomorrow",
  simplify_today: "Simplify today"
};

function unfinishedTasks(tasks: readonly MascotActionTask[]): MascotActionTask[] {
  return tasks.filter(({ done }) => !done);
}

function visibleTaskCount(dayState: DayStateId): number {
  if (dayState === "good") return 4;
  if (dayState === "overwhelmed") return 1;
  if (dayState === "tired" || dayState === "low-focus") return 2;
  return 3;
}

function sortTasksForFocus(tasks: readonly MascotActionTask[]): MascotActionTask[] {
  return [...tasks].sort((left, right) => {
    const leftTime = parseTaskTimeMinutes(left.label);
    const rightTime = parseTaskTimeMinutes(right.label);
    if ((leftTime === null) !== (rightTime === null)) return leftTime === null ? 1 : -1;
    if (leftTime !== rightTime) {
      return (leftTime ?? Number.MAX_SAFE_INTEGER) - (rightTime ?? Number.MAX_SAFE_INTEGER);
    }
    if (left.hours !== right.hours) return left.hours - right.hours;
    return left.label.localeCompare(right.label);
  });
}

function moveCandidate(tasks: readonly MascotActionTask[]): MascotActionTask | null {
  const candidates = sortTasksForFocus(unfinishedTasks(tasks)).reverse();
  return candidates.find(({ label }) => {
    const time = parseTaskTimeMinutes(label);
    return time === null || time >= 18 * 60;
  }) ?? candidates[0] ?? null;
}

function morningTask(tasks: readonly MascotActionTask[]): MascotActionTask | null {
  return sortTasksForFocus(unfinishedTasks(tasks)).find(({ label }) => {
    const time = parseTaskTimeMinutes(label);
    return time !== null && time < 12 * 60;
  }) ?? null;
}

function broadTask(tasks: readonly MascotActionTask[]): MascotActionTask | null {
  const openTasks = unfinishedTasks(tasks);
  return openTasks.find(({ label }) =>
    /\b(study|work|admin|project|journal|practice|plan|organize|clean|prep|review|research)\b/i.test(label)
  ) ?? openTasks[0] ?? null;
}

function recurringTaskLabel(context: MascotActionContext): string {
  const counts = new Map<string, number>();
  context.recentTaskHistory.forEach(({ unfinishedLabels }) => unfinishedLabels.forEach((label) => {
    const trimmed = label.trim();
    if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }));
  let bestLabel = "";
  let bestCount = 0;
  counts.forEach((count, label) => {
    if (count > bestCount) {
      bestLabel = label;
      bestCount = count;
    }
  });
  return bestCount >= 2 ? bestLabel : "";
}

function questionIntent(question: string): QuestionIntent {
  const text = question.trim().toLowerCase();
  if (!text) return "general";
  if (/move|tomorrow|later/.test(text)) return "move";
  if (/break|smaller|concrete/.test(text)) return "breakdown";
  if (/morning|late|get ready|start/.test(text)) return "morning";
  if (/one thing|what next|next|only do one/.test(text)) return "next";
  if (/tired|overwhelm|overloaded|cut today|ignore/.test(text)) return "simplify";
  return "general";
}

function actionCopy(actionId: MascotActionId, context: MascotActionContext): string {
  if (actionId === "simplify_today") {
    return `cut today to a ${visibleTaskCount(context.dayState)}-task version`;
  }
  if (actionId === "keep_top_three") return "keep only the three clearest tasks visible";
  if (actionId === "move_one_task") {
    const candidate = moveCandidate(context.todayTasks);
    return candidate ? `move "${candidate.label}" to tomorrow` : "move one low-priority task to tomorrow";
  }
  if (actionId === "adjust_morning_block") {
    const candidate = morningTask(context.todayTasks);
    return candidate ? `push "${candidate.label}" later` : "push the first serious morning task later";
  }
  const candidate = broadTask(context.todayTasks);
  if (candidate) return `break "${candidate.label}" into smaller steps`;
  const recurringLabel = recurringTaskLabel(context);
  return recurringLabel
    ? `turn "${recurringLabel}" into a smaller starter task`
    : "break one broad task into smaller steps";
}

function suggestion(actionId: MascotActionId, context: MascotActionContext): MascotActionSuggestion {
  return {
    id: actionId,
    label: ACTION_LABELS[actionId],
    suggestion: actionCopy(actionId, context)
  };
}

function availableSuggestions(context: MascotActionContext): Map<MascotActionId, MascotActionSuggestion> {
  const suggestions = new Map<MascotActionId, MascotActionSuggestion>();
  const openTaskCount = unfinishedTasks(context.todayTasks).length;
  const hasHighCarryover = context.carryoverRate >= 0.15;
  if (openTaskCount > 3 || context.dayState === "tired"
    || context.dayState === "overwhelmed" || hasHighCarryover) {
    suggestions.set("simplify_today", suggestion("simplify_today", context));
  }
  if (openTaskCount > 3) {
    suggestions.set("keep_top_three", suggestion("keep_top_three", context));
  }
  if (moveCandidate(context.todayTasks)) {
    suggestions.set("move_one_task", suggestion("move_one_task", context));
  }
  if (morningTask(context.todayTasks)) {
    suggestions.set("adjust_morning_block", suggestion("adjust_morning_block", context));
  }
  if (broadTask(context.todayTasks) || recurringTaskLabel(context)) {
    suggestions.set("break_task_down", suggestion("break_task_down", context));
  }
  return suggestions;
}

export function proposeMascotActionSuggestions(
  question: string,
  context: MascotActionContext
): MascotActionSuggestion[] {
  const available = availableSuggestions(context);
  const prioritized: MascotActionSuggestion[] = [];
  const push = (actionId: MascotActionId): void => {
    const candidate = available.get(actionId);
    if (candidate && !prioritized.some(({ id }) => id === actionId)) prioritized.push(candidate);
  };
  const intent = questionIntent(question);
  const openTaskCount = unfinishedTasks(context.todayTasks).length;

  if (intent === "move") {
    (["move_one_task", "simplify_today", "keep_top_three"] as const).forEach(push);
  } else if (intent === "breakdown") {
    (["break_task_down", "simplify_today", "keep_top_three"] as const).forEach(push);
  } else if (intent === "morning") {
    (["adjust_morning_block", "simplify_today", "move_one_task"] as const).forEach(push);
  } else if (intent === "next") {
    const actionIds = openTaskCount > 1 || context.carryoverRate >= 0.15
      ? (["simplify_today", "keep_top_three", "break_task_down"] as const)
      : (["break_task_down", "move_one_task"] as const);
    actionIds.forEach(push);
  } else if (intent === "simplify" || context.dayState === "tired"
    || context.dayState === "overwhelmed" || context.dayState === "low-focus") {
    (["simplify_today", "keep_top_three", "move_one_task"] as const).forEach(push);
  }

  available.forEach(({ id }) => push(id));
  return prioritized.slice(0, 2);
}

export function finalizeMascotReply(
  question: string,
  response: MascotReplyDraft,
  context: MascotActionContext
): FinalizedMascotReply {
  const bestSuggestion = proposeMascotActionSuggestions(question, context)[0];
  let answer = response.answer?.trim() ?? "";
  if (!answer) answer = "I do not have a solid answer yet.";
  if (bestSuggestion && !answer.toLowerCase().includes("useful next step:")) {
    answer += ` Useful next step: ${bestSuggestion.suggestion || bestSuggestion.label}.`;
  }
  return {
    answer,
    evidence: [...(response.evidence ?? [])],
    source: response.source?.length ? response.source : "local"
  };
}
