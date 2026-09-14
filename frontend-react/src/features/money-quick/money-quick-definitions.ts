export type MoneyCategoryKind = "fixed" | "flex";

export interface MoneyCategory {
  budgetCents: number;
  id: string;
  kind: MoneyCategoryKind;
  name: string;
  protected: boolean;
  weeklyBudgetCents: number | null;
}

export interface MoneyCategoryState extends MoneyCategory {
  adjustedBudgetCents: number;
  remainingCents: number;
  spentCents: number;
}

export interface MoneyTransaction {
  amountCents: number;
  categoryId: string;
  createdAt: string;
  date: string;
  id: string;
  note: string;
  vendor: string;
}

export interface MoneyVendorRule {
  categoryId: string;
  id: string;
  match: string;
}

export const MONEY_SETTINGS_KEY = "hivePlanner.money.settings";
export const MONEY_TRANSACTIONS_KEY = "hivePlanner.money.transactions";
export const MONEY_VENDOR_RULES_KEY = "hivePlanner.money.vendorRules";
export const MONEY_ACTIVITY_LOG_KEY = "hivePlanner.activityLog";

export const DEFAULT_MONEY_IMPACT =
  "Saving a transaction will update the rest of the week and month immediately.";

export const DEFAULT_CATEGORIES: readonly MoneyCategory[] = [
  { id: "rent", name: "Rent", kind: "fixed", budgetCents: 77_800, protected: true, weeklyBudgetCents: null },
  { id: "therapy", name: "Therapy", kind: "fixed", budgetCents: 14_000, protected: true, weeklyBudgetCents: null },
  { id: "hsl", name: "HSL", kind: "fixed", budgetCents: 7_390, protected: true, weeklyBudgetCents: null },
  { id: "contact-lenses", name: "Lenses", kind: "fixed", budgetCents: 4_400, protected: true, weeklyBudgetCents: null },
  { id: "subscriptions", name: "Subscriptions", kind: "fixed", budgetCents: 299, protected: true, weeklyBudgetCents: null },
  { id: "pets", name: "Pets", kind: "fixed", budgetCents: 0, protected: true, weeklyBudgetCents: null },
  { id: "groceries", name: "Groceries", kind: "flex", budgetCents: 12_000, protected: false, weeklyBudgetCents: 3_000 },
  { id: "eating-out", name: "Eating out", kind: "flex", budgetCents: 3_500, protected: false, weeklyBudgetCents: 875 },
  { id: "resq", name: "ResQ", kind: "flex", budgetCents: 2_000, protected: false, weeklyBudgetCents: 500 },
  { id: "health", name: "Health", kind: "flex", budgetCents: 2_500, protected: false, weeklyBudgetCents: 625 },
  { id: "fun", name: "Fun", kind: "flex", budgetCents: 2_500, protected: false, weeklyBudgetCents: 625 },
  { id: "skate-school", name: "Skate", kind: "flex", budgetCents: 2_000, protected: false, weeklyBudgetCents: 500 },
  { id: "other", name: "Other", kind: "flex", budgetCents: 1_611, protected: false, weeklyBudgetCents: 403 }
];

export const DEFAULT_VENDOR_RULES: readonly MoneyVendorRule[] = [
  { id: "vendor-wolt", match: "wolt", categoryId: "groceries" },
  { id: "vendor-resq", match: "resq", categoryId: "resq" },
  { id: "vendor-hsl", match: "hsl", categoryId: "hsl" },
  { id: "vendor-apple", match: "apple", categoryId: "subscriptions" },
  { id: "vendor-therapy", match: "therapy", categoryId: "therapy" }
];
