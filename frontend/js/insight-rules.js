(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanInsightRules = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MIN_SAMPLE = 4;
  var CROSS_DOMAIN_GROUP_MIN = 3;
  var HIGH_EDIT_FOOD_SPEND_DELTA_CENTS = 800;
  var JOURNAL_LENGTH_DELTA_CHARS = 40;
  var LATE_STUDY_COMPLETION_DELTA = 0.2;
  var SIMPLE_MORNING_COMPLETION_DELTA = 0.2;
  var PLAN_ACTIONS = [
    action("review_planned_hours", "Review planned hours"),
    action("focus_today_tasks", "Focus today's tasks")
  ];
  var FOCUS_ACTIONS = [
    action("focus_today_tasks", "Focus today's tasks"),
    action("review_planned_hours", "Review planned hours")
  ];
  var MONEY_ACTIONS = [
    action("open_money_view", "Open money view"),
    action("pause_extra_spending", "Pause extra spending")
  ];
  var REDUCE_AND_CLARIFY_ACTIONS = [
    action("focus_today_tasks", "Lighten today's task load"),
    action("make_one_task_concrete", "Make one task concrete")
  ];

  function round(value, digits) {
    var precision = Math.pow(10, digits == null ? 1 : digits);
    return Math.round((Number(value) || 0) * precision) / precision;
  }

  function hasSample(sampleSize) {
    return Number(sampleSize) >= MIN_SAMPLE;
  }

  function insight(id, mode, priority, title, why, actions, sampleSize) {
    return {
      id: id,
      mode: mode,
      priority: priority,
      title: title,
      why: why,
      actions: cloneActions(actions),
      sampleSize: Number(sampleSize) || 0
    };
  }

  function action(id, label) {
    return {
      id: id,
      label: label
    };
  }

  function cloneActions(actions) {
    return (Array.isArray(actions) ? actions : []).map(function (item) {
      return {
        id: item.id,
        label: item.label
      };
    });
  }

  function ruleMorningOverrun(metrics) {
    var overrun = metrics && metrics.morningOverrun;
    if (!overrun || !hasSample(overrun.sampleSize)) {
      return null;
    }
    if (overrun.averageOverrun < 0.75 || overrun.actualAverage <= overrun.plannedAverage) {
      return null;
    }
    return insight(
      "morning_overrun",
      "reality",
      95,
      "Your mornings are usually taking longer than planned.",
      "Across " + overrun.sampleSize + " recent days, morning blocks averaged " + round(overrun.plannedAverage) + "h planned and " + round(overrun.actualAverage) + "h in practice.",
      PLAN_ACTIONS,
      overrun.sampleSize
    );
  }

  function ruleTaskOverpacking(metrics) {
    var taskAverages = metrics && metrics.dailyTaskAverages;
    var todaySummary = metrics && metrics.todaySummary;
    if (!taskAverages || !todaySummary || !hasSample(taskAverages.sampleSize)) {
      return null;
    }
    if (todaySummary.plannedCount < 4) {
      return null;
    }
    if (todaySummary.plannedCount < taskAverages.completedAverage + 1.5) {
      return null;
    }
    return insight(
      "task_overpacking",
      "reality",
      90,
      "Today may be holding more tasks than you usually finish.",
      "You planned " + todaySummary.plannedCount + " tasks today, while your recent completion average is " + round(taskAverages.completedAverage) + " tasks.",
      FOCUS_ACTIONS,
      taskAverages.sampleSize
    );
  }

  function ruleEveningOverload(metrics) {
    var eveningLoad = metrics && metrics.eveningLoad;
    if (!eveningLoad || !hasSample(eveningLoad.sampleSize)) {
      return null;
    }
    if (eveningLoad.latestEveningHours < 2.5 && eveningLoad.latestEveningTaskCount < 3) {
      return null;
    }
    return insight(
      "evening_overload",
      "reality",
      88,
      "A lot of today's plan is stacked into the evening.",
      "Today's evening load is " + round(eveningLoad.latestEveningHours) + "h across " + eveningLoad.latestEveningTaskCount + " tasks, compared with a recent average of " + round(eveningLoad.averageEveningHours) + "h.",
      PLAN_ACTIONS,
      eveningLoad.sampleSize
    );
  }

  function ruleTooMuchMoneySpent(metrics) {
    var moneySummary = metrics && metrics.moneySummary;
    if (!moneySummary || !moneySummary.available) {
      return null;
    }
    if (moneySummary.flexibleRemainingCents >= 0 && moneySummary.availableWeekCents >= 0) {
      return null;
    }
    return insight(
      "too_much_money_spent",
      "reality",
      82,
      "Spending is pressing on this week's room a bit.",
      "The weekly flexible buffer is below zero, and the current month is running tighter than usual.",
      MONEY_ACTIONS,
      moneySummary.sampleSize
    );
  }

  function ruleVagueTaskFriction(metrics) {
    var vagueTasks = metrics && metrics.vagueTaskFriction;
    if (!vagueTasks || !hasSample(vagueTasks.sampleSize)) {
      return null;
    }
    if (vagueTasks.vagueOpenCount < 2 && vagueTasks.vagueCompletionRate >= vagueTasks.specificCompletionRate) {
      return null;
    }
    return insight(
      "vague_task_friction",
      "focus",
      80,
      "A few open tasks still look too vague to start cleanly.",
      vagueTasks.vagueOpenCount + " open tasks use broad labels, and vague tasks have been completed less often than timed or specific ones lately.",
      [action("make_one_task_concrete", "Make one task concrete"), FOCUS_ACTIONS[0]],
      vagueTasks.sampleSize
    );
  }

  function ruleRealityBaselineWarning(metrics) {
    var hours = metrics && metrics.hourGapAverages;
    var todaySummary = metrics && metrics.todaySummary;
    if (!hours || !todaySummary || !hasSample(hours.sampleSize)) {
      return null;
    }
    if (todaySummary.plannedHours < hours.completedAverage + 1.5) {
      return null;
    }
    return insight(
      "reality_baseline_warning",
      "reality",
      84,
      "Today's planned hours are above your recent working baseline.",
      "You planned " + round(todaySummary.plannedHours) + "h today. Recent completed days have averaged about " + round(hours.completedAverage) + "h.",
      PLAN_ACTIONS,
      hours.sampleSize
    );
  }

  function ruleFoodSpendingOnHighEditDays(metrics) {
    var pattern = metrics && metrics.foodSpendingOnHighEditDays;
    if (!pattern || !hasSample(pattern.sampleSize)) {
      return null;
    }
    if (pattern.highEditDays < CROSS_DOMAIN_GROUP_MIN || pattern.lowerEditDays < CROSS_DOMAIN_GROUP_MIN) {
      return null;
    }
    if (pattern.averageFoodDifferenceCents < HIGH_EDIT_FOOD_SPEND_DELTA_CENTS) {
      return null;
    }
    return insight(
      "food_spending_on_high_edit_days",
      "reality",
      78,
      "Food spending has tended to run higher on high-edit days.",
      "Across " + pattern.sampleSize + " recent days, food spending averaged about EUR " + round(pattern.highEditAverageFoodCents / 100, 2) + " on higher-edit days and EUR " + round(pattern.lowerEditAverageFoodCents / 100, 2) + " on calmer ones.",
      [action("open_money_view", "Open money view"), action("focus_today_tasks", "Reduce planner churn")],
      pattern.sampleSize
    );
  }

  function ruleJournalBehaviorOnOverloadedDays(metrics) {
    var pattern = metrics && metrics.journalBehaviorOnOverloadedDays;
    if (!pattern || !hasSample(pattern.sampleSize)) {
      return null;
    }
    if (pattern.overloadedDays < CROSS_DOMAIN_GROUP_MIN || pattern.regularDays < CROSS_DOMAIN_GROUP_MIN) {
      return null;
    }
    if ((pattern.regularAverageLength - pattern.overloadedAverageLength) < JOURNAL_LENGTH_DELTA_CHARS) {
      return null;
    }
    return insight(
      "journal_behavior_on_overloaded_days",
      "focus",
      74,
      "Journal check-ins tend to get shorter on overloaded days.",
      "On overloaded days, recent journal entries averaged about " + round(pattern.overloadedAverageLength, 0) + " characters compared with " + round(pattern.regularAverageLength, 0) + " on lighter days.",
      REDUCE_AND_CLARIFY_ACTIONS,
      pattern.sampleSize
    );
  }

  function ruleLateStudyCorrelation(metrics) {
    var pattern = metrics && metrics.lateStudyCorrelation;
    if (!pattern || !hasSample(pattern.sampleSize)) {
      return null;
    }
    if (pattern.lateStudyDays < CROSS_DOMAIN_GROUP_MIN || pattern.otherDays < CROSS_DOMAIN_GROUP_MIN) {
      return null;
    }
    if (pattern.completionRateDifference < LATE_STUDY_COMPLETION_DELTA) {
      return null;
    }
    return insight(
      "late_study_completion_dip",
      "reality",
      77,
      "Late study blocks have been lining up with lower completion.",
      "Recent days with late study blocks finished about " + round(pattern.lateStudyCompletionRate * 100, 0) + "% of planned tasks, compared with " + round(pattern.otherCompletionRate * 100, 0) + "% on other days.",
      PLAN_ACTIONS,
      pattern.sampleSize
    );
  }

  function ruleSimpleMorningCorrelation(metrics) {
    var pattern = metrics && metrics.simpleMorningCorrelation;
    if (!pattern || !hasSample(pattern.sampleSize)) {
      return null;
    }
    if (pattern.simpleMorningDays < CROSS_DOMAIN_GROUP_MIN || pattern.complexMorningDays < CROSS_DOMAIN_GROUP_MIN) {
      return null;
    }
    if (pattern.completionRateDifference < SIMPLE_MORNING_COMPLETION_DELTA) {
      return null;
    }
    return insight(
      "simple_morning_completion_boost",
      "focus",
      79,
      "Simpler mornings have tended to support better task completion.",
      "Recent simple-morning days finished about " + round(pattern.simpleMorningCompletionRate * 100, 0) + "% of planned tasks, compared with " + round(pattern.complexMorningCompletionRate * 100, 0) + "% on more crowded mornings.",
      [action("review_planned_hours", "Protect a simpler morning"), action("focus_today_tasks", "Keep the first block small")],
      pattern.sampleSize
    );
  }

  function deriveInsights(metrics) {
    return [
      ruleMorningOverrun(metrics),
      ruleTaskOverpacking(metrics),
      ruleEveningOverload(metrics),
      ruleTooMuchMoneySpent(metrics),
      ruleVagueTaskFriction(metrics),
      ruleRealityBaselineWarning(metrics),
      ruleSimpleMorningCorrelation(metrics),
      ruleFoodSpendingOnHighEditDays(metrics),
      ruleLateStudyCorrelation(metrics),
      ruleJournalBehaviorOnOverloadedDays(metrics)
    ].filter(Boolean).sort(function (a, b) {
      return b.priority - a.priority || String(a.id).localeCompare(String(b.id));
    });
  }

  function selectTopInsight(insights) {
    return Array.isArray(insights) && insights.length ? insights[0] : null;
  }

  return {
    deriveInsights: deriveInsights,
    selectTopInsight: selectTopInsight
  };
}));
