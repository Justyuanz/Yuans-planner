(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanMoneyCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY_MS = 24 * 60 * 60 * 1000;
  var moneyFormatter = typeof Intl !== "undefined"
    ? new Intl.NumberFormat("en-FI", { style: "currency", currency: "EUR" })
    : null;

  var defaultCategoryDefinitions = [
    { id: "rent", name: "Rent", kind: "fixed", budgetCents: 77800, protected: true },
    { id: "therapy", name: "Therapy", kind: "fixed", budgetCents: 14000, protected: true },
    { id: "hsl", name: "HSL", kind: "fixed", budgetCents: 7390, protected: true },
    { id: "contact-lenses", name: "Lenses", kind: "fixed", budgetCents: 4400, protected: true },
    { id: "subscriptions", name: "Subscriptions", kind: "fixed", budgetCents: 299, protected: true },
    { id: "pets", name: "Pets", kind: "fixed", budgetCents: 0, protected: true },
    { id: "groceries", name: "Groceries", kind: "flex", budgetCents: 12000, protected: false, weeklyBudgetCents: 3000 },
    { id: "eating-out", name: "Eating out", kind: "flex", budgetCents: 3500, protected: false, weeklyBudgetCents: 875 },
    { id: "resq", name: "ResQ", kind: "flex", budgetCents: 2000, protected: false, weeklyBudgetCents: 500 },
    { id: "health", name: "Health", kind: "flex", budgetCents: 2500, protected: false, weeklyBudgetCents: 625 },
    { id: "fun", name: "Fun", kind: "flex", budgetCents: 2500, protected: false, weeklyBudgetCents: 625 },
    { id: "skate-school", name: "Skate", kind: "flex", budgetCents: 2000, protected: false, weeklyBudgetCents: 500 },
    { id: "other", name: "Other", kind: "flex", budgetCents: 1611, protected: false, weeklyBudgetCents: 403 }
  ];

  var defaultVendorRulesList = [
    { id: "vendor-wolt", match: "wolt", categoryId: "groceries" },
    { id: "vendor-resq", match: "resq", categoryId: "resq" },
    { id: "vendor-hsl", match: "hsl", categoryId: "hsl" },
    { id: "vendor-apple", match: "apple", categoryId: "subscriptions" },
    { id: "vendor-therapy", match: "therapy", categoryId: "therapy" }
  ];

  function cloneDate(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function startOfWeek(value) {
    var date = cloneDate(value);
    var offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return date;
  }

  function endOfWeek(value) {
    var date = startOfWeek(value);
    date.setDate(date.getDate() + 6);
    return date;
  }

  function startOfMonth(value) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  function endOfMonth(value) {
    return new Date(value.getFullYear(), value.getMonth() + 1, 0);
  }

  function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  function minDate(a, b) {
    return a <= b ? a : b;
  }

  function maxDate(a, b) {
    return a >= b ? a : b;
  }

  function daysBetweenInclusive(start, end) {
    var safeStart = cloneDate(start);
    var safeEnd = cloneDate(end);
    return Math.floor((safeEnd - safeStart) / DAY_MS) + 1;
  }

  function toDateKey(value) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseDateKey(value) {
    var parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfPreviousMonth(value) {
    return new Date(value.getFullYear(), value.getMonth() - 1, 1);
  }

  function monthKey(value) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0")
    ].join("-");
  }

  function cents(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.round(number);
  }

  function clampFloorCents(dividend, divisor) {
    if (!divisor) {
      return 0;
    }
    return Math.floor(dividend / divisor);
  }

  function deriveWeeklyBudgetCents(monthlyBudgetCents, referenceDate) {
    return clampFloorCents(
      cents(monthlyBudgetCents),
      Math.max(1, Math.ceil(daysBetweenInclusive(startOfMonth(referenceDate), endOfMonth(referenceDate)) / 7))
    );
  }

  function parseAmountToCents(value) {
    var raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    var compact = raw.replace(/[€\s]/g, "");
    var hasDot = compact.indexOf(".") !== -1;
    var hasComma = compact.indexOf(",") !== -1;
    var normalized = compact;

    if (hasDot && hasComma) {
      normalized = compact.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      normalized = /,\d{1,2}$/.test(compact)
        ? compact.replace(",", ".")
        : compact.replace(/,/g, "");
    } else if (hasDot && !/\.\d{1,2}$/.test(compact)) {
      normalized = compact.replace(/\./g, "");
    }

    if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
      return null;
    }
    return Math.round(Number(normalized) * 100);
  }

  function formatCents(value) {
    var amount = cents(value) / 100;
    if (!moneyFormatter) {
      return "EUR " + amount.toFixed(2);
    }
    return moneyFormatter.format(amount);
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function makeId(prefix) {
    return String(prefix || "money") + "-" + Math.random().toString(36).slice(2, 10);
  }

  function defaultSettings() {
    return {
      monthlyTargetCents: 130000,
      categories: defaultCategoryDefinitions.map(function (category) {
        return Object.assign({}, category);
      }),
      transfers: [],
      notes: {
        averages: [
          { id: "avg-groceries", label: "Groceries", valueCents: 30200 },
          { id: "avg-eating-out", label: "Eating out", valueCents: 5550 },
          { id: "avg-resq", label: "ResQ", valueCents: 2650 },
          { id: "avg-fixed", label: "Fixed baseline", valueCents: 103889 }
        ]
      }
    };
  }

  function defaultVendorRules() {
    return defaultVendorRulesList.map(function (rule) {
      return Object.assign({}, rule);
    });
  }

  function normalizeSettings(settings) {
    var source = settings && typeof settings === "object" ? settings : {};
    var defaults = defaultSettings();
    var categoriesById = {};
    defaults.categories.forEach(function (category) {
      categoriesById[category.id] = category;
    });
    var provided = Array.isArray(source.categories) ? source.categories : [];
    provided.forEach(function (category) {
      if (!category || !category.id) {
        return;
      }
      categoriesById[category.id] = Object.assign({}, categoriesById[category.id] || {}, category, {
        budgetCents: cents(category.budgetCents),
        weeklyBudgetCents: category.weeklyBudgetCents == null ? null : cents(category.weeklyBudgetCents),
        protected: Boolean(category.protected),
        kind: category.kind === "fixed" ? "fixed" : "flex"
      });
    });

    return {
      monthlyTargetCents: cents(source.monthlyTargetCents || defaults.monthlyTargetCents),
      categories: Object.keys(categoriesById).map(function (id) {
        return Object.assign({}, categoriesById[id]);
      }),
      transfers: normalizeTransfers(source.transfers),
      notes: Object.assign({}, defaults.notes, source.notes || {})
    };
  }

  function normalizeTransfers(transfers) {
    return (Array.isArray(transfers) ? transfers : []).map(function (transfer) {
      return {
        id: transfer && transfer.id ? String(transfer.id) : makeId("transfer"),
        fromCategoryId: transfer && transfer.fromCategoryId ? String(transfer.fromCategoryId) : "",
        toCategoryId: transfer && transfer.toCategoryId ? String(transfer.toCategoryId) : "",
        amountCents: Math.max(0, cents(transfer && transfer.amountCents)),
        note: transfer && transfer.note ? String(transfer.note) : "",
        createdAt: transfer && transfer.createdAt ? String(transfer.createdAt) : new Date().toISOString()
      };
    }).filter(function (transfer) {
      return transfer.fromCategoryId && transfer.toCategoryId && transfer.fromCategoryId !== transfer.toCategoryId && transfer.amountCents > 0;
    });
  }

  function normalizeVendorRules(rules) {
    var list = Array.isArray(rules) ? rules : defaultVendorRules();
    return list.map(function (rule) {
      return {
        id: rule && rule.id ? String(rule.id) : makeId("rule"),
        match: normalizeText(rule && rule.match),
        categoryId: rule && rule.categoryId ? String(rule.categoryId) : ""
      };
    }).filter(function (rule) {
      return rule.match && rule.categoryId;
    });
  }

  function normalizeTransactions(transactions) {
    return (Array.isArray(transactions) ? transactions : []).map(function (entry) {
      return {
        id: entry && entry.id ? String(entry.id) : makeId("txn"),
        date: entry && entry.date ? String(entry.date) : toDateKey(new Date()),
        amountCents: Math.max(0, cents(entry && entry.amountCents)),
        categoryId: entry && entry.categoryId ? String(entry.categoryId) : "other",
        vendor: entry && entry.vendor ? String(entry.vendor).trim() : "",
        note: entry && entry.note ? String(entry.note).trim() : "",
        createdAt: entry && entry.createdAt ? String(entry.createdAt) : new Date().toISOString()
      };
    }).filter(function (entry) {
      return entry.amountCents > 0 && entry.date;
    }).sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date))
        || String(b.createdAt).localeCompare(String(a.createdAt))
        || String(b.id).localeCompare(String(a.id));
    });
  }

  function categorizeVendor(vendor, rules) {
    var normalizedVendor = normalizeText(vendor);
    if (!normalizedVendor) {
      return "";
    }
    var match = normalizeVendorRules(rules).find(function (rule) {
      return normalizedVendor.indexOf(rule.match) !== -1;
    });
    return match ? match.categoryId : "";
  }

  function monthTransactions(transactions, referenceDate) {
    var key = monthKey(referenceDate);
    return normalizeTransactions(transactions).filter(function (entry) {
      return String(entry.date).slice(0, 7) === key;
    });
  }

  function transactionsBetween(transactions, start, end) {
    var startKey = toDateKey(start);
    var endKey = toDateKey(end);
    return normalizeTransactions(transactions).filter(function (entry) {
      return entry.date >= startKey && entry.date <= endKey;
    });
  }

  function summariseCategories(settings, transactions, referenceDate) {
    var currentMonthKey = monthKey(referenceDate);
    var monthEntries = normalizeTransactions(transactions).filter(function (entry) {
      return String(entry.date).slice(0, 7) === currentMonthKey;
    });
    var categories = normalizeSettings(settings).categories;
    var spentByCategory = {};
    var transfersIn = {};
    var transfersOut = {};
    var safeSettings = normalizeSettings(settings);

    monthEntries.forEach(function (entry) {
      spentByCategory[entry.categoryId] = (spentByCategory[entry.categoryId] || 0) + entry.amountCents;
    });
    safeSettings.transfers.forEach(function (transfer) {
      transfersOut[transfer.fromCategoryId] = (transfersOut[transfer.fromCategoryId] || 0) + transfer.amountCents;
      transfersIn[transfer.toCategoryId] = (transfersIn[transfer.toCategoryId] || 0) + transfer.amountCents;
    });

    return categories.map(function (category) {
      var spent = spentByCategory[category.id] || 0;
      var movedIn = transfersIn[category.id] || 0;
      var movedOut = transfersOut[category.id] || 0;
      var adjustedBudget = category.budgetCents + movedIn - movedOut;
      var remaining = adjustedBudget - spent;
      var weeklyBudget = category.weeklyBudgetCents != null
        ? category.weeklyBudgetCents
        : deriveWeeklyBudgetCents(category.budgetCents, referenceDate);
      return {
        id: category.id,
        name: category.name,
        kind: category.kind,
        protected: Boolean(category.protected),
        budgetCents: category.budgetCents,
        weeklyBudgetCents: weeklyBudget,
        adjustedBudgetCents: adjustedBudget,
        transferInCents: movedIn,
        transferOutCents: movedOut,
        spentCents: spent,
        remainingCents: remaining
      };
    });
  }

  function weeklyTrendData(transactions, referenceDate) {
    var end = endOfWeek(referenceDate);
    var rows = [];

    for (var offset = 5; offset >= 0; offset -= 1) {
      var weekEnd = addDays(end, offset * -7);
      var weekStart = addDays(weekEnd, -6);
      var entries = transactionsBetween(transactions, weekStart, weekEnd);
      rows.push({
        label: toDateKey(weekStart).slice(5) + " - " + toDateKey(weekEnd).slice(5),
        spentCents: entries.reduce(function (sum, entry) { return sum + entry.amountCents; }, 0)
      });
    }

    return rows;
  }

  function monthlyTotalsData(transactions) {
    var rowsByMonth = {};

    normalizeTransactions(transactions).forEach(function (entry) {
      var key = String(entry.date).slice(0, 7);
      rowsByMonth[key] = (rowsByMonth[key] || 0) + entry.amountCents;
    });

    return Object.keys(rowsByMonth).sort().map(function (key) {
      return {
        key: key,
        label: key.slice(2).replace("-", "/"),
        spentCents: rowsByMonth[key]
      };
    });
  }

  function vendorSummary(transactions, referenceDate, previous) {
    var baseDate = previous ? startOfPreviousMonth(referenceDate) : referenceDate;
    var entries = monthTransactions(transactions, baseDate);
    var rowsByVendor = {};

    entries.forEach(function (entry) {
      var name = String(entry.vendor || "").trim();
      if (!name) {
        return;
      }
      if (!rowsByVendor[name]) {
        rowsByVendor[name] = {
          vendor: name,
          spentCents: 0,
          count: 0,
          categoryIds: {}
        };
      }
      rowsByVendor[name].spentCents += entry.amountCents;
      rowsByVendor[name].count += 1;
      rowsByVendor[name].categoryIds[entry.categoryId] = (rowsByVendor[name].categoryIds[entry.categoryId] || 0) + 1;
    });

    return Object.keys(rowsByVendor).map(function (name) {
      var entry = rowsByVendor[name];
      var topCategoryId = Object.keys(entry.categoryIds).sort(function (a, b) {
        return entry.categoryIds[b] - entry.categoryIds[a];
      })[0] || "";
      return {
        vendor: name,
        spentCents: entry.spentCents,
        count: entry.count,
        averageCents: clampFloorCents(entry.spentCents, Math.max(1, entry.count)),
        topCategoryId: topCategoryId
      };
    }).sort(function (a, b) {
      return b.spentCents - a.spentCents || a.vendor.localeCompare(b.vendor);
    });
  }

  function calculateState(options) {
    var safeOptions = options && typeof options === "object" ? options : {};
    var referenceDate = safeOptions.referenceDate instanceof Date ? cloneDate(safeOptions.referenceDate) : new Date();
    var settings = normalizeSettings(safeOptions.settings);
    var transactions = normalizeTransactions(safeOptions.transactions);
    var categorySummary = summariseCategories(settings, transactions, referenceDate);
    var monthStart = startOfMonth(referenceDate);
    var monthEnd = endOfMonth(referenceDate);
    var weekStart = maxDate(startOfWeek(referenceDate), monthStart);
    var weekEnd = minDate(endOfWeek(referenceDate), monthEnd);
    var elapsedDays = daysBetweenInclusive(monthStart, referenceDate);
    var remainingMonthDays = daysBetweenInclusive(referenceDate, monthEnd);
    var remainingWeekDays = daysBetweenInclusive(referenceDate, weekEnd);
    var currentMonthTransactions = transactionsBetween(transactions, monthStart, monthEnd);
    var previousMonthTransactions = monthTransactions(transactions, startOfPreviousMonth(referenceDate));
    var fixedBudget = categorySummary.filter(function (item) { return item.kind === "fixed"; }).reduce(function (sum, item) { return sum + item.adjustedBudgetCents; }, 0);
    var flexBudget = categorySummary.filter(function (item) { return item.kind === "flex"; }).reduce(function (sum, item) { return sum + item.adjustedBudgetCents; }, 0);
    var fixedSpent = categorySummary.filter(function (item) { return item.kind === "fixed"; }).reduce(function (sum, item) { return sum + item.spentCents; }, 0);
    var flexSpent = categorySummary.filter(function (item) { return item.kind === "flex"; }).reduce(function (sum, item) { return sum + item.spentCents; }, 0);
    var totalSpent = currentMonthTransactions.reduce(function (sum, item) { return sum + item.amountCents; }, 0);
    var totalBudget = fixedBudget + flexBudget;
    var flexibleRemaining = flexBudget - flexSpent;
    var monthRemaining = totalBudget - totalSpent;
    var dailyAvailable = clampFloorCents(flexibleRemaining, Math.max(1, remainingMonthDays));
    var weekAvailable = Math.min(flexibleRemaining, dailyAvailable * Math.max(1, remainingWeekDays));
    var projectedFlexible = elapsedDays > 0 ? Math.round((flexSpent / elapsedDays) * daysBetweenInclusive(monthStart, monthEnd)) : 0;
    var projectedTotal = Math.max(fixedBudget, fixedSpent) + projectedFlexible;
    var previousMonthSpent = previousMonthTransactions.reduce(function (sum, item) { return sum + item.amountCents; }, 0);
    var topVendors = vendorSummary(transactions, referenceDate, false);
    var previousVendors = vendorSummary(transactions, referenceDate, true);
    var previousVendorMap = {};
    var monthlyTotalsRows = monthlyTotalsData(transactions);

    previousVendors.forEach(function (vendor) {
      previousVendorMap[vendor.vendor] = vendor;
    });

    return {
      settings: settings,
      transactions: transactions,
      month: {
        key: monthKey(referenceDate),
        targetCents: totalBudget,
        spentCents: totalSpent,
        remainingCents: monthRemaining,
        fixedBudgetCents: fixedBudget,
        flexibleBudgetCents: flexBudget,
        fixedSpentCents: fixedSpent,
        flexibleSpentCents: flexSpent,
        fixedRemainingCents: fixedBudget - fixedSpent,
        flexibleRemainingCents: flexibleRemaining,
        availableTodayCents: dailyAvailable,
        availableWeekCents: weekAvailable,
        projectedTotalCents: projectedTotal,
        previousMonthSpentCents: previousMonthSpent,
        paceDeltaCents: totalSpent - Math.round(totalBudget * (elapsedDays / daysBetweenInclusive(monthStart, monthEnd))),
        averageMonthRows: Array.isArray(settings.notes.averages) ? settings.notes.averages.slice() : [],
        weeklyTrendRows: weeklyTrendData(transactions, referenceDate),
        monthlyTotalsRows: monthlyTotalsRows
      },
      categories: categorySummary.sort(function (a, b) {
        if (a.kind !== b.kind) {
          return a.kind === "fixed" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }),
      vendors: topVendors.map(function (vendor) {
        return Object.assign({}, vendor, {
          previousMonthSpentCents: previousVendorMap[vendor.vendor] ? previousVendorMap[vendor.vendor].spentCents : 0
        });
      }),
      currentWeek: {
        start: toDateKey(weekStart),
        end: toDateKey(weekEnd)
      },
      currentMonth: {
        start: toDateKey(monthStart),
        end: toDateKey(monthEnd)
      }
    };
  }

  return {
    calculateState: calculateState,
    categorizeVendor: categorizeVendor,
    defaultSettings: defaultSettings,
    defaultVendorRules: defaultVendorRules,
    formatCents: formatCents,
    makeId: makeId,
    normalizeSettings: normalizeSettings,
    normalizeTransactions: normalizeTransactions,
    normalizeVendorRules: normalizeVendorRules,
    parseAmountToCents: parseAmountToCents,
    deriveWeeklyBudgetCents: deriveWeeklyBudgetCents
  };
}));
