import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { buildMoneyOverview } from "./money-overview";

describe("Money overview model", () => {
  it("matches the legacy month label, week range, amounts, and card classes", () => {
    expect(buildMoneyOverview({}, new Date(2026, 8, 14))).toEqual({
      monthLabel: "September 2026",
      stats: [
        {
          className: "money-mini-stat",
          formattedValue: "€107.45",
          label: "Remaining this week",
          note: "2026-09-14 to 2026-09-20"
        },
        {
          className: "money-mini-stat",
          formattedValue: "€261.11",
          label: "Flexible money left",
          note: "Adjustable spending."
        }
      ]
    });
  });

  it("clips the displayed week to the current month", () => {
    expect(buildMoneyOverview({}, new Date(2026, 8, 1)).stats[0]).toMatchObject({
      formattedValue: "€52.20",
      note: "2026-09-01 to 2026-09-06"
    });
    expect(buildMoneyOverview({}, new Date(2026, 8, 30)).stats[0]).toMatchObject({
      formattedValue: "€261.11",
      note: "2026-09-28 to 2026-09-30"
    });
  });

  it("preserves negative treatment and ignores malformed or out-of-month transactions", () => {
    const store: PlannerStore = {
      "hivePlanner.money.transactions": JSON.stringify([
        null,
        { id: "zero", date: "2026-09-14", amountCents: 0, categoryId: "groceries" },
        { id: "current", date: "2026-09-14", amountCents: 30_000, categoryId: "groceries" },
        { id: "old", date: "2026-08-31", amountCents: 99_999, categoryId: "groceries" }
      ])
    };

    expect(buildMoneyOverview(store, new Date(2026, 8, 14)).stats).toEqual([
      {
        className: "money-mini-stat is-negative",
        formattedValue: "-€38.89",
        label: "Remaining this week",
        note: "2026-09-14 to 2026-09-20"
      },
      {
        className: "money-mini-stat is-negative",
        formattedValue: "-€38.89",
        label: "Flexible money left",
        note: "Adjustable spending."
      }
    ]);
    expect(buildMoneyOverview({
      "hivePlanner.money.settings": "bad-json",
      "hivePlanner.money.transactions": "{}"
    }, new Date(2026, 8, 14))).toEqual(buildMoneyOverview({}, new Date(2026, 8, 14)));
  });

  it("includes compatible custom category settings and transfers", () => {
    const store: PlannerStore = {
      "hivePlanner.money.settings": JSON.stringify({
        categories: [
          { id: "groceries", name: "Food", kind: "flex", budgetCents: 10_000 },
          { id: "future", name: "Future", kind: "flex", budgetCents: 5_000 }
        ],
        transfers: [
          { fromCategoryId: "future", toCategoryId: "groceries", amountCents: 1_000 }
        ]
      }),
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "food", date: "2026-09-14", amountCents: 2_000, categoryId: "groceries" },
        { id: "future", date: "2026-09-14", amountCents: 500, categoryId: "future" }
      ])
    };

    expect(buildMoneyOverview(store, new Date(2026, 8, 14)).stats.map((stat) => stat.formattedValue)).toEqual([
      "€109.55",
      "€266.11"
    ]);
  });
});
