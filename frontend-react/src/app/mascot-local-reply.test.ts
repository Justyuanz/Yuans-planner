import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import { buildMascotContext } from "./mascot-context";
import { answerMascotQuestion, classifyMascotQuestion } from "./mascot-local-reply";

const TODAY = new Date(2026, 8, 14, 12);
const TODAY_KEY = "2026-09-14";

function context(store: PlannerStore = {}) {
  return buildMascotContext(store, TODAY);
}

describe("answerMascotQuestion", () => {
  it("selects a concrete timed task and returns planner evidence", () => {
    const reply = answerMascotQuestion("What should I do next?", context({
      [`hivePlanner.dailyTasks.${TODAY_KEY}`]: JSON.stringify([
        { done: false, hours: 1.5, id: "broad", label: "Study C++" },
        { done: false, hours: 0.25, id: "invoice", label: "11 Send invoice" }
      ])
    }));

    expect(reply.intent).toBe("next_step");
    expect(reply.answer).toMatch(/Send invoice/);
    expect(reply.evidence).toContain("11 Send invoice (0.3h)");
    expect(reply.source).toBe("local");
  });

  it("uses task-rescheduling evidence for morning guidance", () => {
    const reply = answerMascotQuestion("Why do my mornings run late?", context({
      "hivePlanner.activityLog": JSON.stringify([{
        action: "task_updated",
        after: "11 Morning routine",
        before: "09 Morning routine",
        dateKey: TODAY_KEY,
        entityId: "morning",
        entityType: "task",
        field: "label",
        id: "activity-morning",
        meta: { label: "Morning routine" },
        timestamp: "2026-09-14T08:00:00.000Z"
      }])
    }));

    expect(reply.intent).toBe("morning");
    expect(reply.answer).toMatch(/Morning routine/);
    expect(reply.answer).toMatch(/09:00/);
    expect(reply.answer).toMatch(/11:00/);
    expect(reply.evidence[0]).toMatch(/moved later/);
  });

  it("falls back honestly when normalized context is empty", () => {
    const reply = answerMascotQuestion("hello?", context());

    expect(reply.intent).toBe("general");
    expect(reply.answer).toMatch(/not have enough evidence/i);
    expect(reply.evidence).toEqual([]);
    expect(reply.source).toBe("local");
  });
});

describe("classifyMascotQuestion", () => {
  it("routes the established Sprouty question families", () => {
    expect(classifyMascotQuestion("Why do my mornings run late?")).toBe("morning");
    expect(classifyMascotQuestion("What am I spending too much money on?")).toBe("money");
    expect(classifyMascotQuestion("Which task should I move to tomorrow?")).toBe("move_task");
    expect(classifyMascotQuestion("Which task needs to be broken down?")).toBe("breakdown");
  });
});
