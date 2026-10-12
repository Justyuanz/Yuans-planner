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

  it("falls back honestly when only the default Skate plan is available", () => {
    const reply = answerMascotQuestion("hello?", context());

    expect(reply.intent).toBe("general");
    expect(reply.answer).toMatch(/not enough consistent evidence/i);
    expect(reply.evidence[0]).toMatch(/Day 1/);
    expect(reply.source).toBe("local");
  });

  it("recommends a Blue skate day after repeated Green sessions without recovery", () => {
    const reply = answerMascotQuestion("How hard should I skate today?", context({
      "hivePlanner.physical.logs": JSON.stringify([
        { date: TODAY_KEY, kind: "gym", minutes: 30, name: "Gym", status: "done" }
      ]),
      "hivePlanner.skate.sessions": JSON.stringify([0, 1, 2].map((index) => ({
        finishedAt: `2026-09-${String(13 - index).padStart(2, "0")}T18:00:00.000Z`,
        intensity: "green",
        mainFocus: `Session ${index + 1}`
      })))
    }));

    expect(reply.intent).toBe("skate");
    expect(reply.answer).toMatch(/Blue|very light/);
    expect(reply.answer).toMatch(/3 green sessions/i);
    expect(reply.evidence.length).toBeGreaterThan(0);
  });

  it("keeps ordinary skate guidance narrowed to the pinned plan", () => {
    const reply = answerMascotQuestion("What should I skate today?", context({
      "hivePlanner.skate.settings": JSON.stringify({ currentProgramDay: 17 })
    }));

    expect(reply.answer).toMatch(/Bowl flow \/ free skate/);
    expect(reply.answer).toMatch(/Full Swing Push/);
    expect(reply.evidence[0]).toMatch(/Day 17/);
  });
});

describe("classifyMascotQuestion", () => {
  it("routes the established Sprouty question families", () => {
    expect(classifyMascotQuestion("Why do my mornings run late?")).toBe("morning");
    expect(classifyMascotQuestion("What am I spending too much money on?")).toBe("money");
    expect(classifyMascotQuestion("What pattern do you notice about me?")).toBe("patterns");
    expect(classifyMascotQuestion("Which task should I move to tomorrow?")).toBe("move_task");
    expect(classifyMascotQuestion("Which task needs to be broken down?")).toBe("breakdown");
  });
});
