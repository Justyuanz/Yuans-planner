import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../api/planner-store";
import { buildMascotContext, suggestedMascotPrompts } from "./mascot-context";

const REFERENCE_DATE = new Date(2026, 8, 14, 12);
const TODAY_KEY = "2026-09-14";

describe("suggestedMascotPrompts", () => {
  it("preserves the legacy state-aware prompt choices", () => {
    expect(suggestedMascotPrompts("good")[0]).toMatch(/good energy/i);
    expect(suggestedMascotPrompts("tired")[0]).toMatch(/cut today/i);
    expect(suggestedMascotPrompts("overwhelmed")).toEqual(suggestedMascotPrompts("tired"));
    expect(suggestedMascotPrompts("okay")[0]).toMatch(/slipping/i);
  });
});

describe("buildMascotContext", () => {
  it("builds grounded server context from normalized Planner data", () => {
    const store: PlannerStore = {
      "hivePlanner.activityLog": JSON.stringify([{
        action: "task_updated",
        after: "11 Send invoice",
        before: "09 Send invoice",
        dateKey: TODAY_KEY,
        entityId: "task-today",
        entityType: "task",
        field: "label",
        id: "activity-one",
        meta: { label: "Send invoice" },
        timestamp: "2026-09-14T09:00:00.000Z"
      }]),
      "hivePlanner.dailyTasks.2026-09-13": JSON.stringify([{
        done: false,
        hours: 1,
        id: "task-yesterday",
        label: "Carry this forward"
      }]),
      [`hivePlanner.dailyTasks.${TODAY_KEY}`]: JSON.stringify([{
        done: false,
        hours: 0.5,
        id: "task-today",
        label: "11 Send invoice"
      }]),
      "hivePlanner.dayState": JSON.stringify({ [TODAY_KEY]: "tired" }),
      "hivePlanner.journal.entries": JSON.stringify([{
        content: "Morning felt slower than planned.",
        date: TODAY_KEY,
        id: "journal-today",
        title: "Slow morning"
      }]),
      "hivePlanner.money.settings": JSON.stringify({
        categories: [{ budgetCents: 10000, id: "groceries", kind: "flex", name: "Groceries" }]
      }),
      "hivePlanner.money.transactions": JSON.stringify([{
        amountCents: 2500,
        categoryId: "groceries",
        date: TODAY_KEY,
        id: "transaction-one",
        vendor: "Market"
      }]),
      "hivePlanner.planned.2026-W38": JSON.stringify({ transcendence: 12 })
    };

    const context = buildMascotContext(store, REFERENCE_DATE);

    expect(context.currentDateKey).toBe(TODAY_KEY);
    expect(context.dayState).toBe("tired");
    expect(context.todayTasks).toEqual([
      expect.objectContaining({ id: "task-today", label: "11 Send invoice" })
    ]);
    expect(context.journalEntries).toEqual([
      expect.objectContaining({ date: TODAY_KEY, title: "Slow morning" })
    ]);
    expect(context.activityLog).toEqual([
      expect.objectContaining({ action: "task_updated", entityId: "task-today" })
    ]);
    expect(context.metrics.currentDateKey).toBe(TODAY_KEY);
    expect(context.recentTaskHistory.at(-1)).toEqual(
      expect.objectContaining({ dateKey: TODAY_KEY, plannedCount: 1 })
    );
    expect(context.plannedHours).toEqual({ transcendence: 12 });
    expect(context.moneyState.month).toEqual(expect.objectContaining({ spentCents: 2500 }));
    expect(context.moneyState.categories).toContainEqual(expect.objectContaining({ id: "groceries" }));
    expect(context.skate).toEqual({});
  });

  it("uses stable defaults for malformed compatibility records", () => {
    const context = buildMascotContext({
      "hivePlanner.activityLog": "not-json",
      "hivePlanner.dailyTasks.2026-09-14": "{}",
      "hivePlanner.dayState": "[]",
      "hivePlanner.journal.entries": "false",
      "hivePlanner.money.settings": "bad",
      "hivePlanner.planned.2026-W38": "[]"
    }, REFERENCE_DATE);

    expect(context.dayState).toBe("okay");
    expect(context.todayTasks).toEqual([]);
    expect(context.journalEntries).toEqual([]);
    expect(context.activityLog).toEqual([]);
    expect(context.insights).toEqual([]);
    expect(context.topInsight).toBeNull();
    expect(context.plannedHours).toEqual({});
  });
});
