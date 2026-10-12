import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { MONEY_SETTINGS_KEY, MONEY_TRANSACTIONS_KEY } from "./money-quick-definitions";
import { decodeMoneyStore } from "./money-quick-store";

function store(settings: unknown, transactions: unknown): PlannerStore {
  return {
    [MONEY_SETTINGS_KEY]: JSON.stringify(settings),
    [MONEY_TRANSACTIONS_KEY]: JSON.stringify(transactions)
  };
}

describe("Money store compatibility", () => {
  it("keeps fixed and flexible spending separate", () => {
    const state = decodeMoneyStore(store({}, [
      { id: "rent", date: "2026-07-02", amountCents: 77_800, categoryId: "rent", vendor: "Landlord" },
      { id: "grocery", date: "2026-07-10", amountCents: 4_200, categoryId: "groceries", vendor: "Wolt" }
    ]), new Date(2026, 6, 15));
    const fixedRemaining = state.categories
      .filter(({ kind }) => kind === "fixed")
      .reduce((sum, category) => sum + category.remainingCents, 0);

    expect(state.month).toMatchObject({
      flexibleRemainingCents: 21_911,
      flexibleSpentCents: 4_200,
      remainingCents: 48_000,
      spentCents: 82_000
    });
    expect(fixedRemaining).toBe(26_089);
  });

  it("applies valid transfers and filters malformed saved records", () => {
    const state = decodeMoneyStore(store({
      transfers: [
        { id: "same", fromCategoryId: "fun", toCategoryId: "fun", amountCents: 500 },
        { id: "zero", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 0 },
        { id: "move", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 1_000 }
      ]
    }, [
      { id: "bad-zero", date: "2026-07-10", amountCents: 0, categoryId: "groceries" },
      { id: "missing-date", amountCents: 1_200, categoryId: "groceries" },
      { id: "grocery", date: "2026-07-20", amountCents: 12_500, categoryId: "groceries" }
    ]), new Date(2026, 6, 20));
    const groceries = state.categories.find(({ id }) => id === "groceries");
    const fun = state.categories.find(({ id }) => id === "fun");

    expect(state.transfers.map(({ id }) => id)).toEqual(["move"]);
    expect(state.transactions.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "missing-date", "grocery"
    ]));
    expect(state.transactions.some(({ id }) => id === "bad-zero")).toBe(false);
    expect(groceries).toMatchObject({ adjustedBudgetCents: 13_000, remainingCents: 500 });
    expect(fun?.adjustedBudgetCents).toBe(1_500);
  });

  it("clips availability to month-end and resets the week at a new month", () => {
    const july = decodeMoneyStore(store({}, [
      { id: "groceries", date: "2026-07-29", amountCents: 6_100, categoryId: "groceries" }
    ]), new Date(2026, 6, 31));
    expect(july.month.availableWeekCents).toBe(july.month.flexibleRemainingCents);

    const august = decodeMoneyStore(store({}, [
      { id: "july-fun", date: "2026-07-31", amountCents: 1_000, categoryId: "fun" },
      { id: "aug-grocery", date: "2026-08-01", amountCents: 2_500, categoryId: "groceries" }
    ]), new Date(2026, 7, 1));
    expect(august.currentWeek).toEqual({ start: "2026-08-01", end: "2026-08-02" });
    expect(august.month).toMatchObject({ spentCents: 2_500, availableWeekCents: 1_522 });
  });

  it("derives weekly guides and retains chronological monthly totals", () => {
    const settings = {
      categories: [{ id: "future", name: "Future", kind: "flex", budgetCents: 3_000 }]
    };
    const transactions = [
      { id: "may", date: "2026-05-10", amountCents: 1_000, categoryId: "fun" },
      { id: "june", date: "2026-06-10", amountCents: 2_000, categoryId: "fun" },
      { id: "july", date: "2026-07-10", amountCents: 3_000, categoryId: "fun" },
      { id: "aug", date: "2026-08-10", amountCents: 4_000, categoryId: "fun" }
    ];
    const august = decodeMoneyStore(store(settings, transactions), new Date(2026, 7, 10));
    const february = decodeMoneyStore(store(settings, []), new Date(2026, 1, 1));

    expect(august.categories.find(({ id }) => id === "future")?.weeklyBudgetCents).toBe(600);
    expect(february.categories.find(({ id }) => id === "future")?.weeklyBudgetCents).toBe(750);
    expect(august.month.monthlyTotalsRows.map(({ key, spentCents }) => [key, spentCents])).toEqual([
      ["2026-05", 1_000],
      ["2026-06", 2_000],
      ["2026-07", 3_000],
      ["2026-08", 4_000]
    ]);
  });
});
