import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { buildMoneyActivity } from "./money-activity";

const TODAY = new Date(2026, 8, 14);

describe("Money recent activity model", () => {
  it("uses the legacy empty state for missing and malformed transactions", () => {
    expect(buildMoneyActivity({}, TODAY)).toEqual({ rows: [] });
    expect(buildMoneyActivity({
      "hivePlanner.money.settings": "bad-json",
      "hivePlanner.money.transactions": "{}"
    }, TODAY)).toEqual({ rows: [] });
  });

  it("sorts valid rows, uses category and vendor fallbacks, and includes prior months", () => {
    const store: PlannerStore = {
      "hivePlanner.money.settings": JSON.stringify({
        categories: [
          { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000 },
          { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
        ]
      }),
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "old", date: "2026-08-31", createdAt: "2026-08-31T08:00:00.000Z", amountCents: 900, categoryId: "groceries", vendor: "Market" },
        null,
        { id: "zero", date: "2026-09-14", amountCents: 0, categoryId: "future" },
        { id: "unknown", date: "2026-09-14", createdAt: "2026-09-14T08:00:00.000Z", amountCents: 300, categoryId: "missing" },
        { id: "future", date: "2026-09-14", createdAt: "2026-09-14T09:00:00.000Z", amountCents: 999, categoryId: "future", vendor: " Lab " }
      ])
    };

    expect(buildMoneyActivity(store, TODAY).rows).toEqual([
      {
        categoryName: "Future fund",
        formattedAmount: "€9.99",
        vendorAndDate: "Lab · 2026-09-14"
      },
      {
        categoryName: "Other",
        formattedAmount: "€3.00",
        vendorAndDate: "No vendor · 2026-09-14"
      },
      {
        categoryName: "Food",
        formattedAmount: "€9.00",
        vendorAndDate: "Market · 2026-08-31"
      }
    ]);
  });

  it("keeps only the newest eight normalized transactions", () => {
    const transactions = Array.from({ length: 10 }, (_, index) => ({
      amountCents: (index + 1) * 100,
      categoryId: "other",
      createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      id: `transaction-${index + 1}`
    }));

    const rows = buildMoneyActivity({
      "hivePlanner.money.transactions": JSON.stringify(transactions)
    }, TODAY).rows;

    expect(rows).toHaveLength(8);
    expect(rows.map((row) => row.formattedAmount)).toEqual([
      "€10.00", "€9.00", "€8.00", "€7.00", "€6.00", "€5.00", "€4.00", "€3.00"
    ]);
  });
});
