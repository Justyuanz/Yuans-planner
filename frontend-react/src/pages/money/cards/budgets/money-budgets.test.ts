import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { isRecord } from "../../../../shared/is-record";
import { MONEY_SETTINGS_KEY, MONEY_TRANSACTIONS_KEY } from "../../../../shared/money-definitions";
import {
  buildMoneyBudgets,
  buildMoneyCategoryUpdate,
  buildMoneyTransferAddition,
  buildMoneyTransferDeletion
} from "./money-budgets";

const TODAY = new Date(2026, 8, 14);
const SETTINGS = {
  monthlyTargetCents: 999_999,
  categories: [
    {
      id: "groceries",
      name: "Food",
      kind: "flex",
      budgetCents: 12_000,
      weeklyBudgetCents: 3_000,
      protected: false,
      unknownCategory: "keep-category"
    },
    {
      id: "future",
      name: "Future fund",
      kind: "flex",
      budgetCents: 5_000,
      weeklyBudgetCents: null,
      protected: false
    }
  ],
  transfers: [
    {
      id: "cover",
      fromCategoryId: "fun",
      toCategoryId: "groceries",
      amountCents: 1_000,
      note: "cover food",
      createdAt: "2026-09-01T10:00:00.000Z",
      unknownTransfer: "keep-transfer"
    }
  ],
  notes: { averages: [], unknownNote: "keep-note" },
  unknownRoot: "keep-root"
};
const STORE: PlannerStore = {
  [MONEY_SETTINGS_KEY]: JSON.stringify(SETTINGS),
  [MONEY_TRANSACTIONS_KEY]: JSON.stringify([
    { id: "rent", date: "2026-09-14", amountCents: 80_000, categoryId: "rent" },
    { id: "food", date: "2026-09-14", amountCents: 20_000, categoryId: "groceries" },
    { id: "future", date: "2026-09-14", amountCents: 5_000, categoryId: "future" }
  ])
};

function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error("Expected a stored object");
  }
  return parsed;
}

function recordList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected a stored list");
  }
  return value.filter(isRecord);
}

describe("buildMoneyBudgets", () => {
  it("groups alphabetized category rows with adjusted balances and legacy formatting", () => {
    const model = buildMoneyBudgets(STORE, TODAY);

    expect(model.formattedTarget).toBe("1350");
    expect(model.sections.map((section) => ({
      note: section.note,
      rows: section.rows.map((row) => ({
        className: row.className,
        guide: row.guide,
        name: row.name,
        remaining: row.remaining,
        values: [row.monthValue, row.weekValue]
      })),
      title: section.title
    }))).toEqual([
      {
        title: "Fixed",
        note: "Protected baseline. · 6",
        rows: [
          { className: "money-budget-row money-budget-row-fixed", guide: "Guide €14.78 / week", name: "HSL", remaining: "€73.90 left", values: ["73.90", "14.78"] },
          { className: "money-budget-row money-budget-row-fixed", guide: "Guide €8.80 / week", name: "Lenses", remaining: "€44.00 left", values: ["44", "8.80"] },
          { className: "money-budget-row money-budget-row-fixed", guide: "Guide €0.00 / week", name: "Pets", remaining: "€0.00 left", values: ["0", "0"] },
          { className: "money-budget-row money-budget-row-fixed is-negative", guide: "Guide €155.60 / week", name: "Rent", remaining: "-€22.00 left", values: ["778", "155.60"] },
          { className: "money-budget-row money-budget-row-fixed", guide: "Guide €0.59 / week", name: "Subscriptions", remaining: "€2.99 left", values: ["2.99", "0.59"] },
          { className: "money-budget-row money-budget-row-fixed", guide: "Guide €28.00 / week", name: "Therapy", remaining: "€140.00 left", values: ["140", "28"] }
        ]
      },
      {
        title: "Flexible",
        note: "Weekly pace. · 8",
        rows: [
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €8.75 / week", name: "Eating out", remaining: "€35.00 left", values: ["35", "8.75"] },
          { className: "money-budget-row money-budget-row-flex is-negative", guide: "Guide €30.00 / week", name: "Food", remaining: "-€70.00 left", values: ["120", "30"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €6.25 / week", name: "Fun", remaining: "€15.00 left", values: ["25", "6.25"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €10.00 / week", name: "Future fund", remaining: "€0.00 left", values: ["50", "10"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €6.25 / week", name: "Health", remaining: "€25.00 left", values: ["25", "6.25"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €4.03 / week", name: "Other", remaining: "€16.11 left", values: ["16.11", "4.03"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €5.00 / week", name: "ResQ", remaining: "€20.00 left", values: ["20", "5"] },
          { className: "money-budget-row money-budget-row-flex", guide: "Guide €5.00 / week", name: "Skate", remaining: "€20.00 left", values: ["20", "5"] }
        ]
      }
    ]);
    expect(model.flexCategories.map((category) => category.name)).toEqual([
      "Food", "Eating out", "ResQ", "Health", "Fun", "Skate", "Other", "Future fund"
    ]);
    expect(model.transfers).toEqual([
      { amount: "€10.00 moved from Fun", id: "cover", toCategoryName: "Food" }
    ]);
  });

  it("falls back to the complete default setup for malformed stored values", () => {
    const model = buildMoneyBudgets({ [MONEY_SETTINGS_KEY]: "not-json" }, TODAY);

    expect(model.formattedTarget).toBe("1300");
    expect(model.sections.map((section) => section.rows.length)).toEqual([6, 7]);
    expect(model.transfers).toEqual([]);
  });
});

describe("Money budget persistence", () => {
  it("updates a monthly budget and derives its week guide without dropping unknown fields", () => {
    const update = buildMoneyCategoryUpdate(STORE, "groceries", "budgetCents", 13_000, TODAY);
    const settings = parseRecord(update.value);
    const notes = isRecord(settings.notes) ? settings.notes : {};
    const categories = recordList(settings.categories);
    const transfers = recordList(settings.transfers);

    expect(update.key).toBe(MONEY_SETTINGS_KEY);
    expect(settings.unknownRoot).toBe("keep-root");
    expect(notes.unknownNote).toBe("keep-note");
    expect(categories).toHaveLength(14);
    expect(categories.find((category) => category.id === "groceries")).toMatchObject({
      budgetCents: 13_000,
      weeklyBudgetCents: 2_600,
      unknownCategory: "keep-category"
    });
    expect(transfers[0]?.unknownTransfer).toBe("keep-transfer");
  });

  it("updates a week guide independently", () => {
    const update = buildMoneyCategoryUpdate(STORE, "groceries", "weeklyBudgetCents", 925, TODAY);
    const category = recordList(parseRecord(update.value).categories).find(
      (candidate) => candidate.id === "groceries"
    );

    expect(category).toMatchObject({ budgetCents: 12_000, weeklyBudgetCents: 925 });
  });

  it("prepends and deletes transfers while preserving compatible fields", () => {
    const addition = buildMoneyTransferAddition(STORE, {
      amountCents: 1_250,
      fromCategoryId: "fun",
      toCategoryId: "future"
    }, {
      id: "new-transfer",
      timestamp: "2026-09-14T12:00:00.000Z"
    });
    const added = parseRecord(addition.value);
    const addedTransfers = recordList(added.transfers);

    expect(added.unknownRoot).toBe("keep-root");
    expect(addedTransfers).toEqual([
      {
        id: "new-transfer",
        fromCategoryId: "fun",
        toCategoryId: "future",
        amountCents: 1_250,
        note: "",
        createdAt: "2026-09-14T12:00:00.000Z"
      },
      expect.objectContaining({ id: "cover", unknownTransfer: "keep-transfer" })
    ]);

    const deletion = buildMoneyTransferDeletion(
      { ...STORE, [MONEY_SETTINGS_KEY]: addition.value },
      "new-transfer"
    );
    expect(recordList(parseRecord(deletion.value).transfers)).toEqual([
      expect.objectContaining({ id: "cover", unknownTransfer: "keep-transfer" })
    ]);
  });
});
