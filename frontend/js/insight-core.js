(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanInsightCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MORNING_END = 12 * 60;
  var EVENING_START = 18 * 60;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var FOOD_CATEGORY_IDS = ["groceries", "eating-out", "resq"];
  var HIGH_EDIT_DAY_THRESHOLD = 3;
  var OVERLOADED_TASK_THRESHOLD = 5;
  var OVERLOADED_HOUR_THRESHOLD = 6;
  var SIMPLE_MORNING_TASK_LIMIT = 1;
  var SIMPLE_MORNING_HOUR_LIMIT = 1.5;
  var COMPLEX_MORNING_TASK_THRESHOLD = 2;
  var COMPLEX_MORNING_HOUR_THRESHOLD = 2.5;
  var LOW_ENERGY_STATES = ["empty", "low"];

  function finiteNonNegative(value) {
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function parseTaskTimeMinutes(label) {
    var text = String(label || "").trim();
    var match = text.match(/^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/);
    if (!match) {
      return null;
    }
    var hours = Number(match[1]);
    var minutes = match[2] ? Number(match[2]) : 0;
    if (hours > 23 || minutes > 59) {
      return null;
    }
    return (hours * 60) + minutes;
  }

  function effectiveTaskHours(task) {
    if (!task || typeof task !== "object") {
      return 0;
    }
    var timerSeconds = finiteNonNegative(task.timerSeconds);
    if (timerSeconds > 0) {
      return round(timerSeconds / 3600, 2);
    }
    return finiteNonNegative(task.hours);
  }

  function round(value, digits) {
    var precision = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(finiteNonNegative(value) * precision) / precision;
  }

  function sum(values) {
    return (Array.isArray(values) ? values : []).reduce(function (total, value) {
      return total + finiteNonNegative(value);
    }, 0);
  }

  function average(values) {
    var safeValues = (Array.isArray(values) ? values : []).filter(function (value) {
      return Number.isFinite(Number(value));
    }).map(Number);
    if (!safeValues.length) {
      return 0;
    }
    return sum(safeValues) / safeValues.length;
  }

  function parseDateKey(dateKey) {
    var parts = String(dateKey || "").split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isValidDateKey(dateKey) {
    return Boolean(parseDateKey(dateKey));
  }

  function compareDateKeys(a, b) {
    return String(a || "").localeCompare(String(b || ""));
  }

  function normalizeTaskLabel(label) {
    return String(label || "")
      .replace(/^(\d{1,2})(?::?(\d{2}))?(?:\s*[-–]\s*(\d{1,2})(?::?(\d{2}))?)?\s*/, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function normalizeTaskMap(taskMap) {
    var safeMap = taskMap && typeof taskMap === "object" ? taskMap : {};
    return Object.keys(safeMap).reduce(function (map, dateKey) {
      if (!isValidDateKey(dateKey)) {
        return map;
      }
      map[dateKey] = Array.isArray(safeMap[dateKey]) ? safeMap[dateKey].filter(function (task) {
        return task && typeof task === "object";
      }) : [];
      return map;
    }, {});
  }

  function normalizeJournalEntries(entries) {
    return (Array.isArray(entries) ? entries : []).map(function (entry) {
      if (!entry || typeof entry !== "object" || !isValidDateKey(entry.date)) {
        return null;
      }
      var tracker = entry.tracker && typeof entry.tracker === "object" ? entry.tracker : {};
      return {
        date: entry.date,
        title: String(entry.title || "").trim(),
        content: String(entry.content || ""),
        tracker: {
          energy: typeof tracker.energy === "string" ? tracker.energy.trim().toLowerCase() : "",
          focus: typeof tracker.focus === "string" ? tracker.focus.trim().toLowerCase() : "",
          context: typeof tracker.context === "string" ? tracker.context.trim() : ""
        }
      };
    }).filter(Boolean);
  }

  function normalizeMoneyTransactions(transactions) {
    return (Array.isArray(transactions) ? transactions : []).map(function (entry) {
      if (!entry || typeof entry !== "object" || !isValidDateKey(entry.date)) {
        return null;
      }
      return {
        date: entry.date,
        amountCents: finiteNonNegative(entry.amountCents),
        categoryId: String(entry.categoryId || "")
      };
    }).filter(function (entry) {
      return entry && entry.amountCents > 0;
    });
  }

  function taskLooksStudy(task) {
    var label = normalizeTaskLabel(task && task.label);
    var activity = String(task && task.activity || "").toLowerCase();
    if (["transcendence", "mobiledevelopment", "portfoliojobprep"].indexOf(activity) !== -1) {
      return true;
    }
    return /\b(study|transcendence|mobile development|portfolio|job prep|exam|revision|read notes|review)\b/.test(label);
  }

  function buildDailySummaries(taskMap) {
    var safeMap = normalizeTaskMap(taskMap);
    return Object.keys(safeMap).sort(compareDateKeys).map(function (dateKey) {
      var tasks = safeMap[dateKey];
      var summary = {
        dateKey: dateKey,
        tasks: tasks.slice(),
        plannedCount: tasks.length,
        completedCount: 0,
        plannedHours: 0,
        completedHours: 0,
        unscheduledCount: 0,
        morningCount: 0,
        morningPlannedHours: 0,
        morningCompletedHours: 0,
        eveningCount: 0,
        eveningHours: 0,
        lateStudyCount: 0,
        allLabels: [],
        unfinishedLabels: []
      };

      tasks.forEach(function (task) {
        var hours = effectiveTaskHours(task);
        var timeValue = parseTaskTimeMinutes(task.label);
        summary.plannedHours += hours;
        if (task.done) {
          summary.completedCount += 1;
          summary.completedHours += hours;
        }
        if (timeValue === null) {
          summary.unscheduledCount += 1;
        } else {
          if (timeValue < MORNING_END) {
            summary.morningCount += 1;
            summary.morningPlannedHours += hours;
            if (task.done) {
              summary.morningCompletedHours += hours;
            }
          }
          if (timeValue >= EVENING_START) {
            summary.eveningCount += 1;
            summary.eveningHours += hours;
            if (taskLooksStudy(task)) {
              summary.lateStudyCount += 1;
            }
          }
        }
        if (!task.done) {
          var normalizedLabel = normalizeTaskLabel(task.label);
          if (normalizedLabel) {
            summary.unfinishedLabels.push(normalizedLabel);
          }
        }
        var anyLabel = normalizeTaskLabel(task.label);
        if (anyLabel) {
          summary.allLabels.push(anyLabel);
        }
      });

      summary.plannedHours = round(summary.plannedHours, 2);
      summary.completedHours = round(summary.completedHours, 2);
      summary.morningPlannedHours = round(summary.morningPlannedHours, 2);
      summary.morningCompletedHours = round(summary.morningCompletedHours, 2);
      summary.eveningHours = round(summary.eveningHours, 2);
      return summary;
    });
  }

  function windowDateKeys(endDateKey, lookbackDays) {
    var endDate = parseDateKey(endDateKey);
    if (!endDate) {
      return [];
    }
    var days = Math.max(1, Number(lookbackDays) || 14);
    var keys = [];
    for (var offset = days - 1; offset >= 0; offset -= 1) {
      var date = new Date(endDate.getTime() - (offset * DAY_MS));
      keys.push([
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-"));
    }
    return keys;
  }

  function selectWindowSummaries(summaries, endDateKey, lookbackDays, includeCurrentDay) {
    var keyed = {};
    (Array.isArray(summaries) ? summaries : []).forEach(function (summary) {
      keyed[summary.dateKey] = summary;
    });
    return windowDateKeys(endDateKey, lookbackDays).reduce(function (items, dateKey) {
      if (!includeCurrentDay && dateKey === endDateKey) {
        return items;
      }
      if (keyed[dateKey]) {
        items.push(keyed[dateKey]);
      }
      return items;
    }, []);
  }

  function calculateDailyTaskAverages(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    return {
      sampleSize: window.length,
      plannedAverage: round(average(window.map(function (summary) { return summary.plannedCount; })), 2),
      completedAverage: round(average(window.map(function (summary) { return summary.completedCount; })), 2)
    };
  }

  function calculateHourGapAverages(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var plannedAverage = average(window.map(function (summary) { return summary.plannedHours; }));
    var completedAverage = average(window.map(function (summary) { return summary.completedHours; }));
    return {
      sampleSize: window.length,
      plannedAverage: round(plannedAverage, 2),
      completedAverage: round(completedAverage, 2),
      averageGap: round(plannedAverage - completedAverage, 2)
    };
  }

  function calculateMorningOverrun(summaries, activityLog, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var taskDatesInWindow = {};
    window.forEach(function (summary) {
      taskDatesInWindow[summary.dateKey] = true;
    });

    var firstPositiveMorningHoursByTask = {};
    (Array.isArray(activityLog) ? activityLog : []).forEach(function (entry) {
      if (!entry || entry.entityType !== "task" || entry.field !== "hours" || !taskDatesInWindow[entry.dateKey]) {
        return;
      }
      var timeValue = parseTaskTimeMinutes((entry.meta && entry.meta.label) || "");
      if (timeValue === null || timeValue >= MORNING_END) {
        return;
      }
      var afterValue = Number(entry.after);
      if (!(afterValue > 0)) {
        return;
      }
      if (firstPositiveMorningHoursByTask[entry.entityId] == null) {
        firstPositiveMorningHoursByTask[entry.entityId] = afterValue;
      }
    });

    var plannedValues = Object.keys(firstPositiveMorningHoursByTask).map(function (taskId) {
      return firstPositiveMorningHoursByTask[taskId];
    });
    var actualValues = window.map(function (summary) {
      return summary.morningCompletedHours || summary.morningPlannedHours;
    }).filter(function (value) {
      return value > 0;
    });

    var plannedAverage = average(plannedValues);
    var actualAverage = average(actualValues);
    return {
      sampleSize: Math.min(plannedValues.length || actualValues.length, actualValues.length || plannedValues.length),
      plannedAverage: round(plannedAverage, 2),
      actualAverage: round(actualAverage, 2),
      averageOverrun: round(actualAverage - plannedAverage, 2)
    };
  }

  function calculateEveningLoad(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, true);
    return {
      sampleSize: window.length,
      averageEveningTaskCount: round(average(window.map(function (summary) { return summary.eveningCount; })), 2),
      averageEveningHours: round(average(window.map(function (summary) { return summary.eveningHours; })), 2),
      latestEveningTaskCount: window.length ? window[window.length - 1].eveningCount : 0,
      latestEveningHours: window.length ? window[window.length - 1].eveningHours : 0
    };
  }

  function calculateEditFrequency(activityLog, endDateKey, lookbackDays) {
    var validDates = windowDateKeys(endDateKey, lookbackDays).reduce(function (map, dateKey) {
      map[dateKey] = true;
      return map;
    }, {});
    var countsByDate = {};
    (Array.isArray(activityLog) ? activityLog : []).forEach(function (entry) {
      if (!entry || !validDates[entry.dateKey]) {
        return;
      }
      if (["task_created", "task_updated", "task_deleted", "planned_hours_updated"].indexOf(entry.action) === -1) {
        return;
      }
      countsByDate[entry.dateKey] = (countsByDate[entry.dateKey] || 0) + 1;
    });
    var counts = Object.keys(validDates).sort(compareDateKeys).map(function (dateKey) {
      return countsByDate[dateKey] || 0;
    });
    return {
      sampleSize: counts.length,
      averageEditsPerDay: round(average(counts), 2),
      latestEditCount: counts.length ? counts[counts.length - 1] : 0
    };
  }

  function calculateCarryoverIndicators(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var futureLabels = {};
    for (var i = window.length - 1; i >= 0; i -= 1) {
      var summary = window[i];
      var carriedForward = 0;
      summary.unfinishedLabels.forEach(function (label) {
        if (futureLabels[label]) {
          carriedForward += 1;
        }
      });
      summary._carriedForwardCount = carriedForward;
      summary.allLabels.forEach(function (label) {
        futureLabels[label] = true;
      });
    }

    var unfinishedTotal = sum(window.map(function (summary) {
      return summary.unfinishedLabels.length;
    }));
    var carriedForwardTotal = sum(window.map(function (summary) {
      return summary._carriedForwardCount || 0;
    }));
    return {
      sampleSize: window.length,
      unfinishedTotal: unfinishedTotal,
      carriedForwardTotal: carriedForwardTotal,
      carryoverRate: unfinishedTotal ? round(carriedForwardTotal / unfinishedTotal, 2) : 0
    };
  }

  function calculateUnscheduledTaskCounts(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, true);
    return {
      sampleSize: window.length,
      averageUnscheduledCount: round(average(window.map(function (summary) { return summary.unscheduledCount; })), 2),
      latestUnscheduledCount: window.length ? window[window.length - 1].unscheduledCount : 0
    };
  }

  function looksVague(label) {
    var text = normalizeTaskLabel(label);
    if (!text) {
      return false;
    }
    if (text.split(" ").length >= 4) {
      return false;
    }
    return [
      "study",
      "work",
      "admin",
      "transcendence",
      "mobile development",
      "portfolio",
      "guitar",
      "skate",
      "project",
      "review"
    ].indexOf(text) !== -1;
  }

  function calculateVagueTaskFriction(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, true);
    var vagueTasks = [];
    var specificTasks = [];
    var latest = window.length ? window[window.length - 1] : null;

    window.forEach(function (summary) {
      summary.tasks.forEach(function (task) {
        var bucket = looksVague(task.label) ? vagueTasks : specificTasks;
        bucket.push(Boolean(task.done) ? 1 : 0);
      });
    });

    return {
      sampleSize: window.length,
      vagueOpenCount: latest ? latest.tasks.filter(function (task) {
        return !task.done && looksVague(task.label);
      }).length : 0,
      vagueCompletionRate: vagueTasks.length ? round(sum(vagueTasks) / vagueTasks.length, 2) : 0,
      specificCompletionRate: specificTasks.length ? round(sum(specificTasks) / specificTasks.length, 2) : 0
    };
  }

  function calculateMoneySummary(moneyState) {
    if (!moneyState || !moneyState.month) {
      return {
        available: false,
        sampleSize: 0,
        flexibleRemainingCents: 0,
        availableWeekCents: 0,
        flexibleRemainingLabel: "",
        availableWeekLabel: ""
      };
    }
    return {
      available: true,
      sampleSize: 1,
      flexibleRemainingCents: Number(moneyState.month.flexibleRemainingCents) || 0,
      availableWeekCents: Number(moneyState.month.availableWeekCents) || 0,
      flexibleRemainingLabel: typeof moneyState.month.flexibleRemaining === "string"
        ? moneyState.month.flexibleRemaining
        : String(moneyState.month.flexibleRemainingCents || 0),
      availableWeekLabel: typeof moneyState.month.availableWeek === "string"
        ? moneyState.month.availableWeek
        : String(moneyState.month.availableWeekCents || 0)
    };
  }

  function countsByDateFromActivity(activityLog, endDateKey, lookbackDays, allowedActions) {
    var validDates = windowDateKeys(endDateKey, lookbackDays).reduce(function (map, dateKey) {
      map[dateKey] = true;
      return map;
    }, {});
    return (Array.isArray(activityLog) ? activityLog : []).reduce(function (map, entry) {
      if (!entry || !validDates[entry.dateKey]) {
        return map;
      }
      if (allowedActions && allowedActions.indexOf(entry.action) === -1) {
        return map;
      }
      map[entry.dateKey] = (map[entry.dateKey] || 0) + 1;
      return map;
    }, {});
  }

  function foodSpendByDate(transactions, dateKeys) {
    var allowed = {};
    (Array.isArray(dateKeys) ? dateKeys : []).forEach(function (dateKey) {
      allowed[dateKey] = true;
    });
    return normalizeMoneyTransactions(transactions).reduce(function (map, entry) {
      if (!allowed[entry.date] || FOOD_CATEGORY_IDS.indexOf(entry.categoryId) === -1) {
        return map;
      }
      map[entry.date] = (map[entry.date] || 0) + entry.amountCents;
      return map;
    }, {});
  }

  function journalStatsByDate(entries, dateKeys) {
    var allowed = {};
    (Array.isArray(dateKeys) ? dateKeys : []).forEach(function (dateKey) {
      allowed[dateKey] = true;
    });
    return normalizeJournalEntries(entries).reduce(function (map, entry) {
      if (!allowed[entry.date]) {
        return map;
      }
      var length = (entry.title ? entry.title.length + 1 : 0) + entry.content.trim().length;
      map[entry.date] = {
        hasEntry: true,
        length: length
      };
      return map;
    }, {});
  }

  function calculateFoodSpendingOnHighEditDays(summaries, activityLog, transactions, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var dateKeys = window.map(function (summary) { return summary.dateKey; });
    var edits = countsByDateFromActivity(activityLog, endDateKey, lookbackDays, [
      "task_created", "task_updated", "task_deleted", "planned_hours_updated"
    ]);
    var foodByDate = foodSpendByDate(transactions, dateKeys);
    var highEdit = [];
    var lowerEdit = [];

    dateKeys.forEach(function (dateKey) {
      var foodCents = foodByDate[dateKey] || 0;
      if ((edits[dateKey] || 0) >= HIGH_EDIT_DAY_THRESHOLD) {
        highEdit.push(foodCents);
      } else {
        lowerEdit.push(foodCents);
      }
    });

    var highAverage = average(highEdit);
    var lowAverage = average(lowerEdit);
    return {
      sampleSize: window.length,
      highEditDays: highEdit.length,
      lowerEditDays: lowerEdit.length,
      highEditAverageFoodCents: Math.round(highAverage),
      lowerEditAverageFoodCents: Math.round(lowAverage),
      averageFoodDifferenceCents: Math.round(highAverage - lowAverage)
    };
  }

  function calculateJournalBehaviorOnOverloadedDays(summaries, journalEntries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var dateKeys = window.map(function (summary) { return summary.dateKey; });
    var journalByDate = journalStatsByDate(journalEntries, dateKeys);
    var overloadedLengths = [];
    var regularLengths = [];
    var overloadedJournalDays = 0;
    var regularJournalDays = 0;
    var overloadedDays = 0;
    var regularDays = 0;

    window.forEach(function (summary) {
      var journal = journalByDate[summary.dateKey] || null;
      var overloaded = summary.plannedCount >= OVERLOADED_TASK_THRESHOLD || summary.plannedHours >= OVERLOADED_HOUR_THRESHOLD;
      if (overloaded) {
        overloadedDays += 1;
        if (journal && journal.hasEntry) {
          overloadedJournalDays += 1;
          overloadedLengths.push(journal.length);
        }
      } else {
        regularDays += 1;
        if (journal && journal.hasEntry) {
          regularJournalDays += 1;
          regularLengths.push(journal.length);
        }
      }
    });

    return {
      sampleSize: window.length,
      overloadedDays: overloadedDays,
      regularDays: regularDays,
      overloadedJournalingRate: overloadedDays ? round(overloadedJournalDays / overloadedDays, 2) : 0,
      regularJournalingRate: regularDays ? round(regularJournalDays / regularDays, 2) : 0,
      overloadedAverageLength: round(average(overloadedLengths), 0),
      regularAverageLength: round(average(regularLengths), 0)
    };
  }

  function completionRate(summary) {
    if (!summary || !summary.plannedCount) {
      return 0;
    }
    return (Number(summary.completedCount) || 0) / summary.plannedCount;
  }

  function calculateLateStudyCorrelation(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var lateStudyRates = [];
    var otherRates = [];

    window.forEach(function (summary) {
      if ((summary.lateStudyCount || 0) > 0) {
        lateStudyRates.push(completionRate(summary));
      } else {
        otherRates.push(completionRate(summary));
      }
    });

    var lateRate = average(lateStudyRates);
    var otherRate = average(otherRates);
    return {
      sampleSize: window.length,
      lateStudyDays: lateStudyRates.length,
      otherDays: otherRates.length,
      lateStudyCompletionRate: round(lateRate, 2),
      otherCompletionRate: round(otherRate, 2),
      completionRateDifference: round(otherRate - lateRate, 2)
    };
  }

  function calculateSimpleMorningCorrelation(summaries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var simpleRates = [];
    var complexRates = [];

    window.forEach(function (summary) {
      var isSimple = summary.morningCount <= SIMPLE_MORNING_TASK_LIMIT && summary.morningPlannedHours <= SIMPLE_MORNING_HOUR_LIMIT;
      var isComplex = summary.morningCount >= COMPLEX_MORNING_TASK_THRESHOLD || summary.morningPlannedHours >= COMPLEX_MORNING_HOUR_THRESHOLD;
      if (isSimple) {
        simpleRates.push(completionRate(summary));
      } else if (isComplex) {
        complexRates.push(completionRate(summary));
      }
    });

    var simpleRate = average(simpleRates);
    var complexRate = average(complexRates);
    return {
      sampleSize: window.length,
      simpleMorningDays: simpleRates.length,
      complexMorningDays: complexRates.length,
      simpleMorningCompletionRate: round(simpleRate, 2),
      complexMorningCompletionRate: round(complexRate, 2),
      completionRateDifference: round(simpleRate - complexRate, 2)
    };
  }

  function calculateEnergyCrashPattern(summaries, journalEntries, endDateKey, lookbackDays) {
    var window = selectWindowSummaries(summaries, endDateKey, lookbackDays, false);
    var summaryByDate = {};
    window.forEach(function (summary) {
      summaryByDate[summary.dateKey] = summary;
    });
    var windowDates = windowDateKeys(endDateKey, lookbackDays).reduce(function (map, dateKey) {
      map[dateKey] = true;
      return map;
    }, {});
    var lowEnergyPreviousEveningHours = [];
    var otherPreviousEveningHours = [];
    var lowEnergyPreviousPlannedHours = [];
    var otherPreviousPlannedHours = [];
    var lowEnergyPreviousUnfinished = [];
    var otherPreviousUnfinished = [];
    var lowEnergyDates = [];
    var consideredDays = 0;

    normalizeJournalEntries(journalEntries).forEach(function (entry) {
      var tracker = entry.tracker || {};
      var previousDate = windowDateKeys(entry.date, 2)[0];
      var previousSummary = summaryByDate[previousDate];
      if (!windowDates[entry.date] || !previousSummary || !tracker.energy) {
        return;
      }
      consideredDays += 1;
      if (LOW_ENERGY_STATES.indexOf(tracker.energy) !== -1) {
        lowEnergyDates.push(entry.date);
        lowEnergyPreviousEveningHours.push(previousSummary.eveningHours || 0);
        lowEnergyPreviousPlannedHours.push(previousSummary.plannedHours || 0);
        lowEnergyPreviousUnfinished.push((previousSummary.plannedCount || 0) - (previousSummary.completedCount || 0));
      } else {
        otherPreviousEveningHours.push(previousSummary.eveningHours || 0);
        otherPreviousPlannedHours.push(previousSummary.plannedHours || 0);
        otherPreviousUnfinished.push((previousSummary.plannedCount || 0) - (previousSummary.completedCount || 0));
      }
    });

    return {
      sampleSize: consideredDays,
      lowEnergyDays: lowEnergyPreviousEveningHours.length,
      otherDays: otherPreviousEveningHours.length,
      lowEnergyPreviousEveningHours: round(average(lowEnergyPreviousEveningHours), 2),
      otherPreviousEveningHours: round(average(otherPreviousEveningHours), 2),
      lowEnergyPreviousPlannedHours: round(average(lowEnergyPreviousPlannedHours), 2),
      otherPreviousPlannedHours: round(average(otherPreviousPlannedHours), 2),
      lowEnergyPreviousUnfinishedCount: round(average(lowEnergyPreviousUnfinished), 2),
      otherPreviousUnfinishedCount: round(average(otherPreviousUnfinished), 2),
      previousEveningDifference: round(average(lowEnergyPreviousEveningHours) - average(otherPreviousEveningHours), 2),
      previousPlannedHoursDifference: round(average(lowEnergyPreviousPlannedHours) - average(otherPreviousPlannedHours), 2),
      previousUnfinishedDifference: round(average(lowEnergyPreviousUnfinished) - average(otherPreviousUnfinished), 2),
      lowEnergyDates: lowEnergyDates.slice(-4)
    };
  }

  function buildMetrics(options) {
    var taskMap = options && options.taskMap ? options.taskMap : {};
    var activityLog = Array.isArray(options && options.activityLog) ? options.activityLog : [];
    var moneyState = options && options.moneyState ? options.moneyState : null;
    var moneyTransactions = Array.isArray(options && options.moneyTransactions) ? options.moneyTransactions : [];
    var journalEntries = Array.isArray(options && options.journalEntries) ? options.journalEntries : [];
    var currentDateKey = String((options && options.currentDateKey) || "");
    var lookbackDays = Math.max(1, Number(options && options.lookbackDays) || 14);
    var summaries = buildDailySummaries(taskMap);
    var todaySummary = summaries.find(function (summary) {
      return summary.dateKey === currentDateKey;
    }) || {
      dateKey: currentDateKey,
      plannedCount: 0,
      completedCount: 0,
      plannedHours: 0,
      completedHours: 0,
      unscheduledCount: 0,
      morningPlannedHours: 0,
      morningCompletedHours: 0,
      eveningCount: 0,
      eveningHours: 0,
      unfinishedLabels: []
    };

    return {
      currentDateKey: currentDateKey,
      lookbackDays: lookbackDays,
      dailySummaries: summaries,
      todaySummary: todaySummary,
      dailyTaskAverages: calculateDailyTaskAverages(summaries, currentDateKey, lookbackDays),
      hourGapAverages: calculateHourGapAverages(summaries, currentDateKey, lookbackDays),
      morningOverrun: calculateMorningOverrun(summaries, activityLog, currentDateKey, lookbackDays),
      eveningLoad: calculateEveningLoad(summaries, currentDateKey, lookbackDays),
      editFrequency: calculateEditFrequency(activityLog, currentDateKey, lookbackDays),
      carryoverIndicators: calculateCarryoverIndicators(summaries, currentDateKey, lookbackDays),
      unscheduledTaskCounts: calculateUnscheduledTaskCounts(summaries, currentDateKey, lookbackDays),
      vagueTaskFriction: calculateVagueTaskFriction(summaries, currentDateKey, lookbackDays),
      moneySummary: calculateMoneySummary(moneyState),
      foodSpendingOnHighEditDays: calculateFoodSpendingOnHighEditDays(summaries, activityLog, moneyTransactions, currentDateKey, lookbackDays),
      journalBehaviorOnOverloadedDays: calculateJournalBehaviorOnOverloadedDays(summaries, journalEntries, currentDateKey, lookbackDays),
      lateStudyCorrelation: calculateLateStudyCorrelation(summaries, currentDateKey, lookbackDays),
      simpleMorningCorrelation: calculateSimpleMorningCorrelation(summaries, currentDateKey, lookbackDays),
      energyCrashPattern: calculateEnergyCrashPattern(summaries, journalEntries, currentDateKey, lookbackDays)
    };
  }

  return {
    buildDailySummaries: buildDailySummaries,
    buildMetrics: buildMetrics,
    calculateCarryoverIndicators: calculateCarryoverIndicators,
    calculateDailyTaskAverages: calculateDailyTaskAverages,
    calculateEditFrequency: calculateEditFrequency,
    calculateEnergyCrashPattern: calculateEnergyCrashPattern,
    calculateEveningLoad: calculateEveningLoad,
    calculateFoodSpendingOnHighEditDays: calculateFoodSpendingOnHighEditDays,
    calculateHourGapAverages: calculateHourGapAverages,
    calculateJournalBehaviorOnOverloadedDays: calculateJournalBehaviorOnOverloadedDays,
    calculateLateStudyCorrelation: calculateLateStudyCorrelation,
    calculateMorningOverrun: calculateMorningOverrun,
    calculateMoneySummary: calculateMoneySummary,
    calculateSimpleMorningCorrelation: calculateSimpleMorningCorrelation,
    calculateUnscheduledTaskCounts: calculateUnscheduledTaskCounts,
    calculateVagueTaskFriction: calculateVagueTaskFriction,
    effectiveTaskHours: effectiveTaskHours,
    normalizeTaskLabel: normalizeTaskLabel,
    parseTaskTimeMinutes: parseTaskTimeMinutes,
    selectWindowSummaries: selectWindowSummaries,
    windowDateKeys: windowDateKeys
  };
}));
