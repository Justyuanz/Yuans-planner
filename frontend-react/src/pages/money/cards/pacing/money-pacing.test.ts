import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { buildMoneyPacing } from "./money-pacing";

const TODAY = new Date(2026, 8, 14);

describe("Money pacing model", () => {
  it("matches the empty legacy progress, category, and history state", () => {
    const model = buildMoneyPacing({}, TODAY);

    expect(model.progress).toEqual([
      {
        className: "mini-chart money-chart-card money-progress-card",
        estimate: { fillPercent: 80, formattedValue: "€1,038.89" },
        fillPercent: 4,
        remainingLabel: "€1,300.00 remaining",
        spentLabel: "€0.00 spent of €1,300.00",
        title: "Monthly spending",
        usedLabel: "0% used"
      },
      {
        className: "mini-chart money-chart-card money-progress-card",
        estimate: null,
        fillPercent: 4,
        remainingLabel: "€261.11 remaining",
        spentLabel: "€0.00 spent of €261.11",
        title: "Flexible spending",
        usedLabel: "0% used"
      }
    ]);
    expect(model.categories.map((row) => [row.label, row.formattedValue, row.fillPercent])).toEqual([
      ["Eating out", "€35.00", 0],
      ["Fun", "€25.00", 0],
      ["Groceries", "€120.00", 0],
      ["Health", "€25.00", 0],
      ["Other", "€16.11", 0],
      ["ResQ", "€20.00", 0],
      ["Skate", "€20.00", 0]
    ]);
    expect(model.history).toEqual([]);
  });

  it("preserves adjusted budgets, projections, over-budget labels, and clamped bars", () => {
    const store: PlannerStore = {
      "hivePlanner.money.settings": JSON.stringify({
        categories: [
          { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
        ],
        transfers: [
          { id: "cover", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 1_000 }
        ]
      }),
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "rent", date: "2026-09-14", amountCents: 80_000, categoryId: "rent" },
        { id: "groceries", date: "2026-09-13", amountCents: 20_000, categoryId: "groceries" },
        { id: "future", date: "2026-09-12", amountCents: 5_000, categoryId: "future" },
        { id: "august-a", date: "2026-08-31", amountCents: 1_000, categoryId: "fun" },
        { id: "august-b", date: "2026-08-01", amountCents: 500, categoryId: "fun" },
        { id: "july", date: "2026-07-15", amountCents: 500, categoryId: "fun" }
      ])
    };

    const model = buildMoneyPacing(store, TODAY);
    expect(model.progress).toEqual([
      {
        className: "mini-chart money-chart-card money-progress-card",
        estimate: { fillPercent: 100, formattedValue: "€1,574.60" },
        fillPercent: 78,
        remainingLabel: "€300.00 remaining",
        spentLabel: "€1,050.00 spent of €1,350.00",
        title: "Monthly spending",
        usedLabel: "78% used"
      },
      {
        className: "mini-chart money-chart-card money-progress-card",
        estimate: null,
        fillPercent: 80,
        remainingLabel: "€61.11 remaining",
        spentLabel: "€250.00 spent of €311.11",
        title: "Flexible spending",
        usedLabel: "80% used"
      }
    ]);
    expect(model.categories.find((row) => row.label === "Groceries")).toEqual({
      fillPercent: 100,
      formattedValue: "€0.00",
      label: "Groceries"
    });
    expect(model.categories.find((row) => row.label === "Fun")?.formattedValue).toBe("€15.00");
    expect(model.history).toEqual([
      { fillPercent: 100, formattedValue: "€1,050.00", label: "26/09" },
      { fillPercent: 4, formattedValue: "€15.00", label: "26/08" },
      { fillPercent: 4, formattedValue: "€5.00", label: "26/07" }
    ]);
  });

  it("keeps only the newest twelve aggregated month prefixes", () => {
    const transactions = Array.from({ length: 14 }, (_, index) => ({
      amountCents: (index + 1) * 100,
      categoryId: "fun",
      date: `2025-${String(index + 1).padStart(2, "0")}-01`,
      id: `month-${index + 1}`
    }));

    const history = buildMoneyPacing({
      "hivePlanner.money.transactions": JSON.stringify(transactions)
    }, TODAY).history;

    expect(history).toHaveLength(12);
    expect(history[0]?.label).toBe("25/14");
    expect(history.at(-1)?.label).toBe("25/03");
  });

  it("keeps over-budget percentages visible while clamping progress widths", () => {
    const model = buildMoneyPacing({
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "overspend", date: "2026-09-14", amountCents: 200_000, categoryId: "groceries" }
      ])
    }, TODAY);

    expect(model.progress.map((card) => ({
      className: card.className,
      fillPercent: card.fillPercent,
      usedLabel: card.usedLabel
    }))).toEqual([
      {
        className: "mini-chart money-chart-card money-progress-card is-negative",
        fillPercent: 100,
        usedLabel: "154% used"
      },
      {
        className: "mini-chart money-chart-card money-progress-card is-negative",
        fillPercent: 100,
        usedLabel: "766% used"
      }
    ]);
  });
});
