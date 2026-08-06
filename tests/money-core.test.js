const test = require("node:test");
const assert = require("node:assert/strict");
const money = require("../frontend/js/money-core.js");

test("parseAmountToCents understands euro-style inputs", function () {
  assert.equal(money.parseAmountToCents("12"), 1200);
  assert.equal(money.parseAmountToCents("12.50"), 1250);
  assert.equal(money.parseAmountToCents("12,50"), 1250);
  assert.equal(money.parseAmountToCents("€1,300"), 130000);
  assert.equal(money.parseAmountToCents("oops"), null);
});

test("categorizeVendor applies remembered vendor rules", function () {
  assert.equal(money.categorizeVendor("Wolt Market Kamppi", money.defaultVendorRules()), "groceries");
  assert.equal(money.categorizeVendor("Apple Services", money.defaultVendorRules()), "subscriptions");
  assert.equal(money.categorizeVendor("Unknown merchant", money.defaultVendorRules()), "");
});

test("calculateState keeps fixed and flexible money separate", function () {
  const settings = money.defaultSettings();
  const state = money.calculateState({
    settings,
    transactions: [
      { id: "rent", date: "2026-07-02", amountCents: 77800, categoryId: "rent", vendor: "Landlord" },
      { id: "grocery", date: "2026-07-10", amountCents: 4200, categoryId: "groceries", vendor: "Wolt" }
    ],
    referenceDate: new Date(2026, 6, 15)
  });

  assert.equal(state.month.spentCents, 82000);
  assert.equal(state.month.fixedSpentCents, 77800);
  assert.equal(state.month.flexibleSpentCents, 4200);
  assert.equal(state.month.fixedRemainingCents, 26089);
  assert.equal(state.month.flexibleRemainingCents, 21911);
});

test("calculateState applies category transfers to cover overspending", function () {
  const settings = money.defaultSettings();
  settings.transfers = [
    { id: "move", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 1000 }
  ];

  const state = money.calculateState({
    settings,
    transactions: [
      { id: "grocery", date: "2026-07-20", amountCents: 12500, categoryId: "groceries", vendor: "K-Market" }
    ],
    referenceDate: new Date(2026, 6, 20)
  });

  const groceries = state.categories.find(function (category) { return category.id === "groceries"; });
  const fun = state.categories.find(function (category) { return category.id === "fun"; });

  assert.equal(groceries.adjustedBudgetCents, 13000);
  assert.equal(groceries.remainingCents, 500);
  assert.equal(fun.adjustedBudgetCents, 1500);
});

test("calculateState builds vendor summary with current and previous month comparison", function () {
  const state = money.calculateState({
    settings: money.defaultSettings(),
    transactions: [
      { id: "prev", date: "2026-06-05", amountCents: 1500, categoryId: "resq", vendor: "ResQ" },
      { id: "current-a", date: "2026-07-01", amountCents: 2400, categoryId: "resq", vendor: "ResQ" },
      { id: "current-b", date: "2026-07-14", amountCents: 2600, categoryId: "resq", vendor: "ResQ" }
    ],
    referenceDate: new Date(2026, 6, 20)
  });

  assert.equal(state.vendors[0].vendor, "ResQ");
  assert.equal(state.vendors[0].spentCents, 5000);
  assert.equal(state.vendors[0].count, 2);
  assert.equal(state.vendors[0].averageCents, 2500);
  assert.equal(state.vendors[0].previousMonthSpentCents, 1500);
});

test("calculateState handles an empty month with stable remaining values", function () {
  const state = money.calculateState({
    settings: money.defaultSettings(),
    transactions: [],
    referenceDate: new Date(2026, 6, 29)
  });

  assert.equal(state.month.spentCents, 0);
  assert.equal(state.month.targetCents, 130000);
  assert.equal(state.month.remainingCents, 130000);
  assert.equal(state.month.projectedTotalCents, 103889);
  assert.equal(state.month.fixedRemainingCents, 103889);
  assert.equal(state.month.flexibleRemainingCents, 26111);
  assert.equal(state.vendors.length, 0);
});

test("deriveWeeklyBudgetCents recalculates weekly guide from monthly budget", function () {
  assert.equal(money.deriveWeeklyBudgetCents(3000, new Date(2026, 7, 1)), 600);
  assert.equal(money.deriveWeeklyBudgetCents(3000, new Date(2026, 1, 1)), 750);
});

test("normalizeTransactions and normalizeSettings filter invalid saved entries", function () {
  const normalizedTransactions = money.normalizeTransactions([
    { id: "bad-zero", date: "2026-07-10", amountCents: 0, categoryId: "groceries" },
    { id: "bad-date", amountCents: 1200, categoryId: "groceries" },
    { id: "ok", date: "2026-07-11", amountCents: 1200, categoryId: "groceries", vendor: "Prisma" }
  ]);
  const normalizedSettings = money.normalizeSettings({
    transfers: [
      { id: "same", fromCategoryId: "fun", toCategoryId: "fun", amountCents: 500 },
      { id: "zero", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 0 },
      { id: "ok", fromCategoryId: "fun", toCategoryId: "groceries", amountCents: 500 }
    ]
  });

  assert.deepEqual(normalizedTransactions.map((entry) => entry.id), ["bad-date", "ok"]);
  assert.deepEqual(normalizedSettings.transfers.map((entry) => entry.id), ["ok"]);
});

test("calculateState keeps daily and weekly availability sensible at month end", function () {
  const state = money.calculateState({
    settings: money.defaultSettings(),
    transactions: [
      { id: "groceries", date: "2026-07-29", amountCents: 6100, categoryId: "groceries", vendor: "Lidl" }
    ],
    referenceDate: new Date(2026, 6, 31)
  });

  assert.equal(state.month.availableTodayCents, state.month.flexibleRemainingCents);
  assert.equal(state.month.availableWeekCents, state.month.flexibleRemainingCents);
});

test("calculateState resets week tracking cleanly at the start of a new month", function () {
  const state = money.calculateState({
    settings: money.defaultSettings(),
    transactions: [
      { id: "july-fun", date: "2026-07-31", amountCents: 1000, categoryId: "fun", vendor: "Cinema" },
      { id: "aug-grocery", date: "2026-08-01", amountCents: 2500, categoryId: "groceries", vendor: "Lidl" }
    ],
    referenceDate: new Date(2026, 7, 1)
  });

  assert.equal(state.currentWeek.start, "2026-08-01");
  assert.equal(state.currentWeek.end, "2026-08-02");
  assert.equal(state.month.spentCents, 2500);
  assert.equal(state.month.availableWeekCents, 1522);
});

test("calculateState keeps long-term monthly totals for the spending trend chart", function () {
  const state = money.calculateState({
    settings: money.defaultSettings(),
    transactions: [
      { id: "may", date: "2026-05-10", amountCents: 1000, categoryId: "fun", vendor: "A" },
      { id: "june", date: "2026-06-10", amountCents: 2000, categoryId: "fun", vendor: "B" },
      { id: "july", date: "2026-07-10", amountCents: 3000, categoryId: "fun", vendor: "C" },
      { id: "aug", date: "2026-08-10", amountCents: 4000, categoryId: "fun", vendor: "D" }
    ],
    referenceDate: new Date(2026, 7, 10)
  });

  assert.deepEqual(
    state.month.monthlyTotalsRows.map((row) => [row.key, row.spentCents]),
    [
      ["2026-05", 1000],
      ["2026-06", 2000],
      ["2026-07", 3000],
      ["2026-08", 4000]
    ]
  );
});
