import { describe, expect, it } from "vitest";

import {
  finalizeMascotReply,
  proposeMascotActionSuggestions,
  type MascotActionContext
} from "./mascot-action-suggestions";

function task(id: string, label: string, hours = 0.5, done = false) {
  return { done, hours, id, label };
}

function actionContext(overrides: Partial<MascotActionContext> = {}): MascotActionContext {
  return {
    carryoverRate: 0,
    dayState: "okay",
    recentTaskHistory: [],
    todayTasks: [],
    ...overrides
  };
}

describe("proposeMascotActionSuggestions", () => {
  it("prioritizes moving the latest suitable task when the question asks directly", () => {
    const suggestions = proposeMascotActionSuggestions(
      "Which task should I move to tomorrow?",
      actionContext({
        todayTasks: [
          task("deep-work", "09 Deep work", 1),
          task("email", "19 Email cleanup")
        ]
      })
    );

    expect(suggestions[0]).toEqual({
      id: "move_one_task",
      label: "Move one task to tomorrow",
      suggestion: "move \"19 Email cleanup\" to tomorrow"
    });
  });

  it("prioritizes simplification for one-thing questions with high carryover", () => {
    const suggestions = proposeMascotActionSuggestions(
      "What should I do next if I only do one thing?",
      actionContext({
        carryoverRate: 0.25,
        todayTasks: [
          task("deep-work", "09 Deep work", 1),
          task("admin", "11 Admin"),
          task("review", "14 Review")
        ]
      })
    );

    expect(suggestions[0]?.id).toBe("simplify_today");
    expect(suggestions[0]?.suggestion).toBe("cut today to a 3-task version");
  });

  it("returns no suggestion when there is no eligible unfinished work", () => {
    const suggestions = proposeMascotActionSuggestions(
      "What should I do next?",
      actionContext({ todayTasks: [task("done", "Finished task", 0.5, true)] })
    );

    expect(suggestions).toEqual([]);
  });

  it("keeps only the two highest-value suggestions in stable legacy order", () => {
    const suggestions = proposeMascotActionSuggestions(
      "I'm tired. Can you cut today down?",
      actionContext({
        dayState: "tired",
        todayTasks: [
          task("deep-work", "09 Deep work", 1),
          task("admin", "11 Admin"),
          task("review", "14 Review"),
          task("email", "19 Email cleanup")
        ]
      })
    );

    expect(suggestions.map(({ id }) => id)).toEqual(["simplify_today", "keep_top_three"]);
  });
});

describe("finalizeMascotReply", () => {
  it.each(["openai", "local"])("appends the best suggestion to a %s reply", (source) => {
    const reply = finalizeMascotReply(
      "I'm tired. Can you cut today down?",
      { answer: "Grounded reply", evidence: ["Planner evidence"], source },
      actionContext({
        dayState: "tired",
        todayTasks: [task("invoice", "11 Send invoice")]
      })
    );

    expect(reply).toEqual({
      answer: "Grounded reply Useful next step: cut today to a 2-task version.",
      evidence: ["Planner evidence"],
      source
    });
  });

  it("does not duplicate a suggestion already included by the answer", () => {
    const reply = finalizeMascotReply(
      "Move something to tomorrow",
      {
        answer: "Useful next step: move the email to tomorrow.",
        evidence: [],
        source: "openai"
      },
      actionContext({ todayTasks: [task("email", "19 Email cleanup")] })
    );

    expect(reply.answer).toBe("Useful next step: move the email to tomorrow.");
  });

  it("uses the legacy fallback when an answer is blank", () => {
    const reply = finalizeMascotReply("Hello", { answer: "   " }, actionContext());

    expect(reply).toEqual({
      answer: "I do not have a solid answer yet.",
      evidence: [],
      source: "local"
    });
  });
});
