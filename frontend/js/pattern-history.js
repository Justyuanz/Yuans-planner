(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanPatternHistory = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MODE_LABELS = {
    reality: "Reality checks",
    focus: "Focus friction",
    money: "Money patterns"
  };
  var MODE_ORDER = ["reality", "focus", "money"];

  function round(value, digits) {
    var precision = Math.pow(10, digits == null ? 1 : digits);
    return Math.round((Number(value) || 0) * precision) / precision;
  }

  function formatPercent(value) {
    return String(Math.round((Number(value) || 0) * 100)) + "%";
  }

  function formatDate(dateKey) {
    var text = String(dateKey || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    return text;
  }

  function formatRangeLabel(currentDateKey, lookbackDays) {
    var end = formatDate(currentDateKey);
    var span = Math.max(1, Number(lookbackDays) || 14);
    return "Last " + span + " days through " + end;
  }

  function evidenceForInsight(insight, metrics) {
    var safeInsight = insight || {};
    var safeMetrics = metrics || {};

    if (safeInsight.id === "morning_overrun" && safeMetrics.morningOverrun) {
      return [
        "Recent sample: " + safeMetrics.morningOverrun.sampleSize + " days.",
        "Planned mornings averaged " + round(safeMetrics.morningOverrun.plannedAverage) + "h.",
        "Actual mornings averaged " + round(safeMetrics.morningOverrun.actualAverage) + "h."
      ];
    }
    if (safeInsight.id === "task_overpacking" && safeMetrics.dailyTaskAverages && safeMetrics.todaySummary) {
      return [
        "Today's plan holds " + safeMetrics.todaySummary.plannedCount + " tasks.",
        "Recent completion average is " + round(safeMetrics.dailyTaskAverages.completedAverage) + " tasks/day.",
        "Recent planned average is " + round(safeMetrics.dailyTaskAverages.plannedAverage) + " tasks/day."
      ];
    }
    if (safeInsight.id === "evening_overload" && safeMetrics.eveningLoad) {
      return [
        "Today's evening load is " + round(safeMetrics.eveningLoad.latestEveningHours) + "h.",
        "That is spread across " + safeMetrics.eveningLoad.latestEveningTaskCount + " tasks tonight.",
        "Recent evening average is " + round(safeMetrics.eveningLoad.averageEveningHours) + "h."
      ];
    }
    if (safeInsight.id === "too_much_money_spent" && safeMetrics.moneySummary) {
      return [
        "Weekly flexible room: " + safeMetrics.moneySummary.availableWeekLabel + ".",
        "Monthly flexible room: " + safeMetrics.moneySummary.flexibleRemainingLabel + "."
      ];
    }
    if (safeInsight.id === "vague_task_friction" && safeMetrics.vagueTaskFriction) {
      return [
        safeMetrics.vagueTaskFriction.vagueOpenCount + " open tasks still look broad.",
        "Vague task completion rate: " + formatPercent(safeMetrics.vagueTaskFriction.vagueCompletionRate) + ".",
        "Specific task completion rate: " + formatPercent(safeMetrics.vagueTaskFriction.specificCompletionRate) + "."
      ];
    }
    if (safeInsight.id === "reality_baseline_warning" && safeMetrics.hourGapAverages && safeMetrics.todaySummary) {
      return [
        "Today's plan adds up to " + round(safeMetrics.todaySummary.plannedHours) + "h.",
        "Recent completed average is " + round(safeMetrics.hourGapAverages.completedAverage) + "h/day.",
        "Recent planned average is " + round(safeMetrics.hourGapAverages.plannedAverage) + "h/day."
      ];
    }
    if (safeInsight.id === "food_spending_on_high_edit_days" && safeMetrics.foodSpendingOnHighEditDays) {
      return [
        "Higher-edit days: " + safeMetrics.foodSpendingOnHighEditDays.highEditDays + ".",
        "Food average on high-edit days: EUR " + round(safeMetrics.foodSpendingOnHighEditDays.highEditAverageFoodCents / 100, 2) + ".",
        "Food average on calmer days: EUR " + round(safeMetrics.foodSpendingOnHighEditDays.lowerEditAverageFoodCents / 100, 2) + "."
      ];
    }
    if (safeInsight.id === "journal_behavior_on_overloaded_days" && safeMetrics.journalBehaviorOnOverloadedDays) {
      return [
        "Overloaded days sampled: " + safeMetrics.journalBehaviorOnOverloadedDays.overloadedDays + ".",
        "Average journal length on overloaded days: " + round(safeMetrics.journalBehaviorOnOverloadedDays.overloadedAverageLength, 0) + " chars.",
        "Average journal length on lighter days: " + round(safeMetrics.journalBehaviorOnOverloadedDays.regularAverageLength, 0) + " chars."
      ];
    }
    if (safeInsight.id === "late_study_completion_dip" && safeMetrics.lateStudyCorrelation) {
      return [
        "Late-study days sampled: " + safeMetrics.lateStudyCorrelation.lateStudyDays + ".",
        "Completion on late-study days: " + round(safeMetrics.lateStudyCorrelation.lateStudyCompletionRate * 100, 0) + "%.",
        "Completion on other days: " + round(safeMetrics.lateStudyCorrelation.otherCompletionRate * 100, 0) + "%."
      ];
    }
    if (safeInsight.id === "simple_morning_completion_boost" && safeMetrics.simpleMorningCorrelation) {
      return [
        "Simple mornings sampled: " + safeMetrics.simpleMorningCorrelation.simpleMorningDays + ".",
        "Completion on simple-morning days: " + round(safeMetrics.simpleMorningCorrelation.simpleMorningCompletionRate * 100, 0) + "%.",
        "Completion on crowded-morning days: " + round(safeMetrics.simpleMorningCorrelation.complexMorningCompletionRate * 100, 0) + "%."
      ];
    }
    return safeInsight.why ? [safeInsight.why] : [];
  }

  function buildPatternHistoryModel(options) {
    var insights = Array.isArray(options && options.insights) ? options.insights : [];
    var metrics = options && options.metrics ? options.metrics : {};
    var groupsByMode = {};

    insights.forEach(function (item) {
      if (!item || !item.mode) {
        return;
      }
      if (!groupsByMode[item.mode]) {
        groupsByMode[item.mode] = [];
      }
      groupsByMode[item.mode].push({
        id: item.id,
        title: item.title,
        summary: item.why,
        priority: Number(item.priority) || 0,
        sampleSize: Number(item.sampleSize) || 0,
        actions: Array.isArray(item.actions) ? item.actions.slice(0, 2) : [],
        evidence: evidenceForInsight(item, metrics)
      });
    });

    var groups = Object.keys(groupsByMode).sort(function (left, right) {
      return MODE_ORDER.indexOf(left) - MODE_ORDER.indexOf(right);
    }).map(function (mode) {
      return {
        mode: mode,
        title: MODE_LABELS[mode] || mode,
        items: groupsByMode[mode].sort(function (a, b) {
          return b.priority - a.priority || String(a.id).localeCompare(String(b.id));
        })
      };
    }).filter(function (group) {
      return group.items.length > 0;
    });

    return {
      isEmpty: groups.length === 0,
      rangeLabel: formatRangeLabel(options && options.currentDateKey, options && options.lookbackDays),
      groups: groups
    };
  }

  return {
    buildPatternHistoryModel: buildPatternHistoryModel
  };
}));
