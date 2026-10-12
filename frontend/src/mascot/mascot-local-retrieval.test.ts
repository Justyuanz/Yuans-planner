import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import { buildMascotContext, type MascotContext } from "./mascot-context";
import { buildMascotSnippets } from "./mascot-local-retrieval";

const REFERENCE_DATE = new Date(2026, 8, 14, 12);

function context(store: PlannerStore = {}): MascotContext {
  return buildMascotContext(store, REFERENCE_DATE);
}

describe("buildMascotSnippets", () => {
  it("combines the top insight with grounded morning, money, and journal evidence", () => {
    const base = context();
    const snippets = buildMascotSnippets({
      ...base,
      insights: [{
        actions: [],
        id: "morning_overrun",
        mode: "reality",
        priority: 95,
        sampleSize: 5,
        title: "Your mornings are taking longer than planned.",
        why: "Recent mornings averaged 1.1h planned and 2.8h in practice."
      }],
      journalEntries: [{
        content: "Morning got away from me again.",
        date: "2026-09-13",
        title: "Heavy day"
      }],
      metrics: {
        ...base.metrics,
        moneySummary: {
          available: true,
          availableWeekCents: -1200,
          availableWeekLabel: "-$12",
          flexibleRemainingCents: 8400,
          flexibleRemainingLabel: "$84",
          sampleSize: 1
        },
        morningOverrun: {
          actualAverage: 2.8,
          averageOverrun: 1.7,
          plannedAverage: 1.1,
          sampleSize: 5
        }
      }
    });

    expect(snippets[0]?.id).toBe("top-insight");
    expect(snippets.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "journal-0",
      "money",
      "morning-overrun"
    ]));
  });

  it("hides vague-task evidence when no broad task is open", () => {
    const base = context({
      "hivePlanner.dailyTasks.2026-09-14": JSON.stringify([{
        done: false,
        hours: 0.5,
        id: "review",
        label: "09 Review notes"
      }])
    });
    const snippets = buildMascotSnippets({
      ...base,
      metrics: {
        ...base.metrics,
        vagueTaskFriction: {
          sampleSize: 5,
          specificCompletionRate: 0.8,
          vagueCompletionRate: 0.2,
          vagueOpenCount: 0
        }
      }
    });

    expect(snippets.some(({ id }) => id === "vague-task")).toBe(false);
  });
});
