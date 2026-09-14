import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { buildMoneyVendors } from "./money-vendors";

const TODAY = new Date(2026, 8, 14);

describe("Money vendors model", () => {
  it("uses the legacy empty state for missing and malformed records", () => {
    expect(buildMoneyVendors({}, TODAY)).toEqual({ rows: [] });
    expect(buildMoneyVendors({
      "hivePlanner.money.settings": "bad-json",
      "hivePlanner.money.transactions": "{}"
    }, TODAY)).toEqual({ rows: [] });
  });

  it("aggregates the current month and compares exact vendor names with the previous month", () => {
    const store: PlannerStore = {
      "hivePlanner.money.settings": JSON.stringify({
        categories: [
          { id: "groceries", name: "Food", kind: "flex", budgetCents: 12_000 },
          { id: "future", name: "Future fund", kind: "flex", budgetCents: 5_000 }
        ]
      }),
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "market-1", date: "2026-09-14", amountCents: 1_001, categoryId: "groceries", vendor: " Market " },
        { id: "market-2", date: "2026-09-13", amountCents: 500, categoryId: "groceries", vendor: "Market" },
        { id: "market-3", date: "2026-09-12", amountCents: 500, categoryId: "fun", vendor: "Market" },
        { id: "future", date: "2026-09-14", amountCents: 1_900, categoryId: "future", vendor: "Cafe" },
        { id: "unknown", date: "2026-09-14", amountCents: 1_800, categoryId: "missing", vendor: "Alpha" },
        { id: "blank", date: "2026-09-14", amountCents: 9_999, categoryId: "fun", vendor: "  " },
        { id: "previous-market", date: "2026-08-31", amountCents: 700, categoryId: "groceries", vendor: "Market" },
        { id: "previous-lowercase", date: "2026-08-30", amountCents: 555, categoryId: "groceries", vendor: "market" },
        { id: "previous-only", date: "2026-08-29", amountCents: 5_000, categoryId: "fun", vendor: "Old shop" },
        null,
        { id: "zero", date: "2026-09-14", amountCents: 0, categoryId: "fun", vendor: "Ignored" }
      ])
    };

    expect(buildMoneyVendors(store, TODAY).rows).toEqual([
      {
        detail: "Food · 3 visits · avg €6.67",
        formattedPreviousMonthSpent: "€7.00",
        formattedSpent: "€20.01",
        vendor: "Market"
      },
      {
        detail: "Future fund · 1 visits · avg €19.00",
        formattedPreviousMonthSpent: "€0.00",
        formattedSpent: "€19.00",
        vendor: "Cafe"
      },
      {
        detail: "Other · 1 visits · avg €18.00",
        formattedPreviousMonthSpent: "€0.00",
        formattedSpent: "€18.00",
        vendor: "Alpha"
      }
    ]);
  });

  it("sorts by spend then name and keeps only the first eight vendors", () => {
    const vendors = ["Zulu", "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"];
    const transactions = vendors.map((vendor, index) => ({
      amountCents: index < 2 ? 2_000 : 1_900 - index,
      categoryId: "fun",
      date: "2026-09-14",
      id: `vendor-${index}`,
      vendor
    }));

    const rows = buildMoneyVendors({
      "hivePlanner.money.transactions": JSON.stringify(transactions)
    }, TODAY).rows;

    expect(rows).toHaveLength(8);
    expect(rows.map((row) => row.vendor)).toEqual([
      "Alpha", "Zulu", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf"
    ]);
  });
});
