import type { MascotContext } from "./mascot-context";
import {
  broadMascotTasks,
  buildMascotSnippets,
  classifyMascotQuestion,
  concreteMascotTask,
  formatMascotClock,
  formatMascotHours,
  mascotTaskLabel,
  openMascotTasks,
  parseMascotTaskTime,
  relevantMascotSnippets,
  summarizeTaskShifts,
  type MascotIntent,
  type MascotSnippet
} from "./mascot-local-retrieval";

export { classifyMascotQuestion } from "./mascot-local-retrieval";

export interface MascotLocalReply {
  answer: string;
  evidence: string[];
  intent: MascotIntent;
  source: "local";
}

function snippetEvidence(snippets: readonly MascotSnippet[], limit = 2): string[] {
  return snippets.slice(0, limit).map(({ detail }) => detail);
}

function nextStepReply(context: MascotContext): string {
  const task = concreteMascotTask(context);
  if (task) {
    const size = task.hours ? ` and it is sized at ${formatMascotHours(task.hours)}` : "";
    return `Do "${mascotTaskLabel(task)}" next. It is the clearest unfinished task on your list right now${size}.`;
  }
  const counts = new Map<string, number>();
  context.recentTaskHistory.forEach(({ unfinishedLabels }) => unfinishedLabels.forEach((label) => {
    const key = label.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }));
  const repeated = [...counts].sort((left, right) => right[1] - left[1])[0];
  if (repeated && repeated[1] >= 2) {
    return `If you only do one thing, make it "${repeated[0]}" as one short 25-minute block. It keeps reappearing, so the best next move is to make it small enough to finally finish.`;
  }
  const topInsight = context.insights[0];
  if (topInsight) {
    const action = topInsight.actions[0]?.label ?? "take the smallest useful step";
    return `${topInsight.title} I would start with: ${action}.`;
  }
  return "The clearest next move is probably the smallest specific task you can finish without more planning.";
}

function moveTaskReply(context: MascotContext): string {
  const tasks = openMascotTasks(context);
  const candidate = [...tasks].reverse().find((task) => {
    const minutes = parseMascotTaskTime(task.label);
    return minutes === null || minutes >= 18 * 60;
  }) ?? tasks.at(-1);
  return candidate
    ? `Move "${mascotTaskLabel(candidate)}" to tomorrow first. It looks like the least urgent fit for today and it will reduce clutter faster than rewriting the whole list.`
    : "I do not see a strong move candidate yet. If today still feels crowded, move the least specific or latest task to tomorrow first.";
}

function breakdownReply(context: MascotContext): string {
  const broadTask = broadMascotTasks(context)[0];
  if (broadTask) {
    return `"${mascotTaskLabel(broadTask)}" is the best task to shrink. Turn it into one setup step, one 25-minute work step, and one tiny closing note.`;
  }
  const task = concreteMascotTask(context);
  return task
    ? `"${mascotTaskLabel(task)}" is already clearer than most. Keep it as-is and make another task smaller instead.`
    : "I do not see a clear broad task right now. Ask me again after you add today's open tasks.";
}

function morningReply(context: MascotContext): string | null {
  const shifts = summarizeTaskShifts(context);
  if (shifts.latestLaterMove) {
    const move = shifts.latestLaterMove;
    return `"${move.label}" got pushed later from ${formatMascotClock(move.before)} to ${formatMascotClock(move.after)}. You have moved tasks later ${shifts.laterMoveCount} times recently, so your first planned block is probably starting too early for your real morning.`;
  }
  const overrun = context.metrics.morningOverrun;
  if (overrun.sampleSize < 4 || overrun.averageOverrun <= 0) return null;
  const planned = formatMascotHours(overrun.plannedAverage);
  const actual = formatMascotHours(overrun.actualAverage);
  return `Your mornings have been taking about ${actual}, even though you usually plan about ${planned}. A more realistic fix is to protect a ${actual} morning block or move your first serious task later.`;
}

function avoidanceReply(context: MascotContext): string {
  const shifts = summarizeTaskShifts(context);
  if (shifts.latestLaterMove) {
    const move = shifts.latestLaterMove;
    return `The clearest avoidance signal is rescheduling. "${move.label}" was pushed later from ${formatMascotClock(move.before)} to ${formatMascotClock(move.after)}, and you have done that ${shifts.laterMoveCount} times recently.`;
  }
  const broadTask = broadMascotTasks(context)[0];
  if (broadTask) {
    return `The thing you are most likely avoiding is "${mascotTaskLabel(broadTask)}" because it is still too broad. Break it into one visible action before you add anything else.`;
  }
  const carryover = context.metrics.carryoverIndicators;
  if (carryover.sampleSize >= 4 && carryover.carryoverRate > 0.15) {
    return `The friction looks less like one vague task and more like carryover. About ${Math.round(carryover.carryoverRate * 100)}% of unfinished tasks have been rolling forward, so the better move is to cut today's list instead of rewriting it again.`;
  }
  const task = concreteMascotTask(context);
  return task
    ? `I do not see one obviously vague task right now. If you feel stuck, start with "${mascotTaskLabel(task)}" and ignore the rest until it is done.`
    : "I do not see a clear avoidance target yet. The safer read is that you may need a smaller list, not more analysis.";
}

function patternReply(context: MascotContext): string {
  const patterns: string[] = [];
  if (summarizeTaskShifts(context).laterMoveCount > 0) {
    patterns.push("you keep moving some tasks later after planning them earlier");
  }
  const { dailyTaskAverages, morningOverrun } = context.metrics;
  if (morningOverrun.sampleSize >= 4 && morningOverrun.averageOverrun > 0) {
    patterns.push("your mornings are usually longer than planned");
  }
  if (dailyTaskAverages.sampleSize >= 4
    && dailyTaskAverages.completedAverage < dailyTaskAverages.plannedAverage) {
    patterns.push("you plan more tasks than you finish");
  }
  return patterns.length
    ? `The clearest pattern I see is that ${patterns.join(", and ")}.`
    : "The clearest pattern I see is that your planner has useful data, but there is not enough consistent evidence yet for a sharper conclusion.";
}

function skateReply(context: MascotContext): string {
  const recentGreenCount = context.skate.recentSessions.slice(0, 4)
    .filter(({ intensity }) => intensity === "green").length;
  const supportMinutes = context.skate.supportThisWeek.reduce((sum, item) => sum + item.minutes, 0);
  const hasRecoverySupport = context.skate.supportThisWeek.some(({ type }) =>
    ["Yoga", "Stretch", "Recovery"].includes(type)
  );
  if (recentGreenCount >= 3 && !hasRecoverySupport && supportMinutes < 45) {
    return `Make today Blue or keep it very light. You already have ${recentGreenCount} green sessions in the last four logs and this week does not show much recovery support yet.`;
  }
  const plan = context.skate.todayPlan;
  return `Today's skate plan is already narrow: ${plan.mainFocus}. Keep the 30-minute block to "${plan.skateiq}" and let ${plan.flow} be the optional easy finish.`;
}

export function answerMascotQuestion(question: string, context: MascotContext): MascotLocalReply {
  const allSnippets = buildMascotSnippets(context);
  const selected = relevantMascotSnippets(question, allSnippets);
  const evidence = snippetEvidence(selected.snippets, 3);
  const base = { evidence, intent: selected.intent, source: "local" } as const;

  if (selected.intent === "morning") {
    const answer = morningReply(context);
    if (answer) return { ...base, answer };
  }
  if (selected.intent === "money" && context.metrics.moneySummary.available) {
    return { ...base, answer: "Your money pattern looks tight enough right now that a small pause before extra spending would probably help more than another budget tweak." };
  }
  if (selected.intent === "skate") {
    return { ...base, answer: skateReply(context) };
  }
  if (selected.intent === "move_task") return { ...base, answer: moveTaskReply(context) };
  if (selected.intent === "breakdown") return { ...base, answer: breakdownReply(context) };
  if (selected.intent === "avoidance") return { ...base, answer: avoidanceReply(context) };
  if (selected.intent === "journal" && selected.snippets.length > 0) {
    return {
      ...base,
      answer: "Your recent journal notes give a few clues, but I want to stay honest: I can point to what you wrote more easily than I can infer a deep mood pattern yet.",
      evidence: selected.snippets.map(({ detail, title }) => `${title}: ${detail}`)
    };
  }
  if (selected.intent === "next_step") {
    return { ...base, answer: nextStepReply(context), evidence: snippetEvidence(selected.snippets) };
  }
  if (selected.intent === "reality" && context.metrics.hourGapAverages.sampleSize >= 4) {
    return { ...base, answer: "Your recent baseline suggests your real working capacity is lower than your most ambitious plans. Planning around the completed average would likely feel steadier.", evidence: snippetEvidence(selected.snippets) };
  }
  if ((selected.intent === "patterns" || selected.intent === "general") && selected.snippets.length > 0) {
    return { ...base, answer: patternReply(context) };
  }
  return {
    answer: "I do not have enough evidence to answer that specifically yet. Ask me about mornings, overload, money, patterns, or what to do next, and I will answer from your planner data.",
    evidence: [],
    intent: classifyMascotQuestion(question),
    source: "local"
  };
}
