import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import {
  buildMoneyQuick,
  buildMoneyTransactionUpdate,
  moneyImpactMessage,
  parseAmountToCents,
  suggestMoneyCategory
} from "./money-quick";

const TODAY = new Date(2026, 8, 14);

describe("Money quick model", () => {
  it("matches legacy defaults, ordering, shortcuts, and remaining amounts", () => {
    const model = buildMoneyQuick({}, TODAY);

    expect(model.summary).toEqual([
      { className: "money-mini-stat", label: "Remaining this week", formattedValue: "€107.45" },
      { className: "money-mini-stat", label: "Remaining this month", formattedValue: "€261.11" }
    ]);
    expect(model.paceBadge).toBe("On pace");
    expect(model.categories.map((category) => [category.id, category.name])).toEqual([
      ["groceries", "Groceries"], ["therapy", "Therapy"], ["fun", "Fun"],
      ["eating-out", "Eating out"], ["resq", "ResQ"], ["health", "Health"],
      ["hsl", "HSL"], ["contact-lenses", "Lenses"], ["other", "Other"],
      ["pets", "Pets"], ["rent", "Rent"], ["skate-school", "Skate"],
      ["subscriptions", "Subscriptions"]
    ]);
    expect(model.shortcuts).toEqual([
      { id: "groceries", name: "Groceries", formattedWeeklyBudget: "€30.00" },
      { id: "therapy", name: "Therapy", formattedWeeklyBudget: "€28.00" },
      { id: "eating-out", name: "Eating out", formattedWeeklyBudget: "€8.75" },
      { id: "other", name: "Other", formattedWeeklyBudget: "€4.03" }
    ]);
  });

  it("normalizes malformed values and preserves custom category calculations", () => {
    const store: PlannerStore = {
      "hivePlanner.money.settings": JSON.stringify({
        categories: [
          { id: "groceries", name: "Food", kind: "flex", budgetCents: 10_000, weeklyBudgetCents: 2_500 },
          { id: "future", name: "Future", kind: "flex", budgetCents: 5_000 }
        ],
        transfers: [
          { id: "move", fromCategoryId: "future", toCategoryId: "groceries", amountCents: 1_000 }
        ],
        futureRoot: { preserve: true }
      }),
      "hivePlanner.money.transactions": JSON.stringify([
        null,
        { id: "zero", date: "2026-09-14", amountCents: 0, categoryId: "groceries" },
        { id: "food", date: "2026-09-14", amountCents: 2_000, categoryId: "groceries" },
        { id: "future", date: "2026-09-14", amountCents: 500, categoryId: "future" },
        { id: "old", date: "2026-08-31", amountCents: 9_999, categoryId: "groceries" }
      ])
    };

    const model = buildMoneyQuick(store, TODAY);
    expect(model.categories.some((category) => category.id === "future")).toBe(true);
    expect(model.summary).toEqual([
      { className: "money-mini-stat", label: "Remaining this week", formattedValue: "€109.55" },
      { className: "money-mini-stat", label: "Remaining this month", formattedValue: "€266.11" }
    ]);
    expect(buildMoneyQuick({
      "hivePlanner.money.settings": "bad-json",
      "hivePlanner.money.transactions": "{}"
    }, TODAY)).toEqual(buildMoneyQuick({}, TODAY));
  });
});

describe("Money quick inputs and persistence", () => {
  it("parses legacy euro-style amounts and rejects invalid or over-precise input", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents("12,50")).toBe(1250);
    expect(parseAmountToCents("€1,300")).toBe(130_000);
    expect(parseAmountToCents("12.345")).toBe(1_234_500);
    expect(parseAmountToCents("oops")).toBeNull();
  });

  it("uses default and remembered vendor rules in stored order", () => {
    expect(suggestMoneyCategory({}, "Wolt Market Kamppi")).toBe("groceries");
    expect(suggestMoneyCategory({}, "Apple Services")).toBe("subscriptions");
    expect(suggestMoneyCategory({}, "Unknown merchant")).toBe("");
    expect(suggestMoneyCategory({
      "hivePlanner.money.vendorRules": JSON.stringify([
        { id: "specific", match: "wolt market", categoryId: "eating-out" },
        { id: "general", match: "wolt", categoryId: "groceries" }
      ])
    }, "Wolt Market Kamppi")).toBe("eating-out");
    expect(suggestMoneyCategory({ "hivePlanner.money.vendorRules": "[]" }, "Wolt")).toBe("");
  });

  it("creates compatible writes while retaining unknown stored record fields", () => {
    const store: PlannerStore = {
      "hivePlanner.money.transactions": JSON.stringify([
        { id: "old", date: "2026-09-13", amountCents: 100, categoryId: "other", future: true }
      ]),
      "hivePlanner.money.vendorRules": JSON.stringify([
        { id: "known", match: "shop", categoryId: "fun", futureRule: true }
      ]),
      "hivePlanner.activityLog": JSON.stringify([
        {
          id: "older", timestamp: "2026-09-13T08:00:00.000Z", action: "task_created",
          entityType: "task", entityId: "task-1", dateKey: "2026-09-13", field: "",
          before: null, after: { label: "Keep" }, meta: {}, unknown: "legacy normalizer removes this"
        }
      ])
    };

    const update = buildMoneyTransactionUpdate(store, {
      amountCents: 1250,
      categoryId: "groceries",
      vendor: " Shop "
    }, TODAY, {
      activityId: "activity-fixed",
      timestamp: "2026-09-14T09:00:00.000Z",
      transactionId: "txn-fixed",
      vendorRuleId: "vendor-fixed"
    });

    expect(update.transaction).toEqual({
      id: "txn-fixed", date: "2026-09-14", amountCents: 1250,
      categoryId: "groceries", vendor: "Shop", note: "",
      createdAt: "2026-09-14T09:00:00.000Z"
    });
    expect(JSON.parse(update.nextStore["hivePlanner.money.transactions"] ?? "[]")).toEqual([
      update.transaction,
      { id: "old", date: "2026-09-13", amountCents: 100, categoryId: "other", future: true }
    ]);
    expect(JSON.parse(update.nextStore["hivePlanner.money.vendorRules"] ?? "[]")).toEqual([
      { id: "known", match: "shop", categoryId: "groceries", futureRule: true }
    ]);
    expect(JSON.parse(update.nextStore["hivePlanner.activityLog"] ?? "[]")).toEqual([
      {
        id: "older", timestamp: "2026-09-13T08:00:00.000Z", action: "task_created",
        entityType: "task", entityId: "task-1", dateKey: "2026-09-13", field: "",
        before: null, after: { label: "Keep" }, meta: {}
      },
      {
        id: "activity-fixed", timestamp: "2026-09-14T09:00:00.000Z",
        action: "money_transaction_created", entityType: "money_transaction",
        entityId: "txn-fixed", dateKey: "2026-09-14", field: "", before: null,
        after: update.transaction, meta: { amountCents: 1250, categoryId: "groceries" }
      }
    ]);
    expect(update.writes.map((write) => write.key)).toEqual([
      "hivePlanner.money.transactions",
      "hivePlanner.activityLog",
      "hivePlanner.money.vendorRules"
    ]);

    const before = buildMoneyQuick(store, TODAY);
    const after = buildMoneyQuick(update.nextStore, TODAY);
    expect(moneyImpactMessage(before, after, update.transaction)).toBe(
      "Saved €12.50 to Groceries. This week's remaining changed by €5.18. Groceries now has €107.50 left this month and about €30.00 for the week. This week now has €101.92 left and this month has €1,286.50 left."
    );
  });
});
