(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanMascotRag = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function round(value, digits) {
    var precision = Math.pow(10, digits == null ? 1 : digits);
    return Math.round((Number(value) || 0) * precision) / precision;
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function previewText(value, limit) {
    var text = String(value || "").replace(/\s+/g, " ").trim();
    var max = Math.max(24, Number(limit) || 100);
    if (text.length <= max) {
      return text;
    }
    return text.slice(0, max - 1).trimEnd() + "…";
  }

  function formatCount(value) {
    return String(Math.round(Number(value) || 0));
  }

  function formatHours(value) {
    var numeric = round(value, 1);
    if (!numeric) {
      return "0h";
    }
    return String(numeric).replace(/\.0$/, "") + "h";
  }

  function taskLabel(task) {
    return previewText(task && task.label, 60);
  }

  function parseLabelTimeMinutes(label) {
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

  function formatClock(minutes) {
    if (minutes === null || minutes === undefined) {
      return "";
    }
    var safe = Math.max(0, Number(minutes) || 0);
    var hours = Math.floor(safe / 60);
    var remainder = safe % 60;
    return String(hours).padStart(2, "0") + ":" + String(remainder).padStart(2, "0");
  }

  function openTasks(options) {
    var tasks = Array.isArray(options && options.todayTasks) ? options.todayTasks : [];
    return tasks.filter(function (task) {
      return task && !task.done;
    });
  }

  function concreteTaskSuggestion(options) {
    var tasks = openTasks(options);
    if (!tasks.length) {
      return null;
    }
    var timedTask = tasks.find(function (task) {
      return /^\d{1,2}(:?\d{2})?/.test(String(task.label || "").trim());
    });
    if (timedTask) {
      return timedTask;
    }
    return tasks.slice().sort(function (a, b) {
      return (Number(a.hours) || 0) - (Number(b.hours) || 0);
    })[0];
  }

  function broadTasks(options) {
    var vagueWords = /\b(study|work|admin|project|journal|practice|plan|organize|clean|prep|review)\b/i;
    return openTasks(options).filter(function (task) {
      var label = String(task.label || "").trim();
      return label && label.split(/\s+/).length <= 3 && vagueWords.test(label);
    });
  }

  function sortNewestFirstByDateKey(items) {
    return (Array.isArray(items) ? items : []).sort(function (a, b) {
      return String(b.dateKey).localeCompare(String(a.dateKey));
    });
  }

  function recentTaskShiftSummary(options) {
    var activityLog = Array.isArray(options && options.activityLog) ? options.activityLog : [];
    var laterMoves = [];
    var growingEstimates = [];

    activityLog.forEach(function (entry) {
      if (!entry || entry.entityType !== "task" || entry.action !== "task_updated") {
        return;
      }
      if (entry.field === "label") {
        var beforeMinutes = parseLabelTimeMinutes(entry.before);
        var afterMinutes = parseLabelTimeMinutes(entry.after);
        if (beforeMinutes !== null && afterMinutes !== null && afterMinutes > beforeMinutes) {
          laterMoves.push({
            entityId: entry.entityId,
            dateKey: entry.dateKey,
            before: beforeMinutes,
            after: afterMinutes,
            label: String(entry.after || entry.before || entry.meta && entry.meta.label || "").trim()
          });
        }
      }
      if (entry.field === "hours") {
        var beforeHours = Number(entry.before) || 0;
        var afterHours = Number(entry.after) || 0;
        if (afterHours > beforeHours + 0.24) {
          growingEstimates.push({
            entityId: entry.entityId,
            dateKey: entry.dateKey,
            before: beforeHours,
            after: afterHours,
            label: String(entry.meta && entry.meta.label || "").trim()
          });
        }
      }
    });

    sortNewestFirstByDateKey(laterMoves);
    sortNewestFirstByDateKey(growingEstimates);

    return {
      laterMoveCount: laterMoves.length,
      latestLaterMove: laterMoves[0] || null,
      growingEstimateCount: growingEstimates.length,
      latestGrowingEstimate: growingEstimates[0] || null
    };
  }

  function classifyQuestion(question) {
    var text = normalizeText(question);
    if (!text) {
      return "general";
    }
    if (/morning|mornings|ready|get ready|late|wake|start/.test(text)) {
      return "morning";
    }
    if (/money|spend|spending|budget|food|grocery/.test(text)) {
      return "money";
    }
    if (/skate|skating|session|intensity|legs|energy|pain|recovery|benchmark|shove|180|ollie|rock and roll|axle/.test(text)) {
      return "skate";
    }
    if (/move.*tomorrow|tomorrow.*move|move to tomorrow/.test(text)) {
      return "move_task";
    }
    if (/break.*down|broken down|needs.*broken|smaller|make.*concrete/.test(text)) {
      return "breakdown";
    }
    if (/avoid|avoiding|procrast|stuck|why can't i start/.test(text)) {
      return "avoidance";
    }
    if (/journal|mood|feel|feeling|emotion/.test(text)) {
      return "journal";
    }
    if (/next|what should i do|what now|overwhelm|overloaded|clarity/.test(text)) {
      return "next_step";
    }
    if (/pattern|notice|lately|about me|myself|habit/.test(text)) {
      return "patterns";
    }
    if (/realistic|capacity|too much|heavy|baseline/.test(text)) {
      return "reality";
    }
    return "general";
  }

  function suggestedPrompts(dayState) {
    if (normalizeText(dayState) === "good") {
      return [
        "What should I use my good energy on today?",
        "What is the highest-value thing to finish today?",
        "Where do I usually make the most progress?",
        "What pattern is strongest this week?"
      ];
    }
    if (normalizeText(dayState) === "tired" || normalizeText(dayState) === "overwhelmed") {
      return [
        "I'm tired. Can you cut today down?",
        "Which task should I move to tomorrow?",
        "What is the smallest useful version of today?",
        "What can I ignore for now?"
      ];
    }
    return [
      "What keeps slipping in my plan?",
      "Which task should I move to tomorrow?",
      "What should I do next if I only do one thing?",
      "Which task needs to be broken down?",
      "What pattern is strongest this week?"
    ];
  }

  function buildRetrieverContext(options) {
    var metrics = options && options.metrics ? options.metrics : {};
    var insights = Array.isArray(options && options.insights) ? options.insights : [];
    var journalEntries = Array.isArray(options && options.journalEntries) ? options.journalEntries : [];
    var skate = options && options.skate ? options.skate : {};
    var snippets = [];

    if (insights.length) {
      snippets.push({
        id: "top-insight",
        tags: ["patterns", "next_step", "reality", "general"],
        title: insights[0].title,
        detail: insights[0].why
      });
    }

    if (metrics.morningOverrun && metrics.morningOverrun.sampleSize >= 4 && metrics.morningOverrun.averageOverrun > 0) {
      snippets.push({
        id: "morning-overrun",
        tags: ["morning", "patterns", "reality"],
        title: "Morning timing",
        detail: "Recent mornings averaged " + round(metrics.morningOverrun.plannedAverage) + "h planned and " + round(metrics.morningOverrun.actualAverage) + "h in practice."
      });
    }

    if (metrics.dailyTaskAverages && metrics.dailyTaskAverages.sampleSize >= 4) {
      snippets.push({
        id: "task-capacity",
        tags: ["patterns", "next_step", "reality", "general"],
        title: "Task capacity",
        detail: "Recent days averaged " + round(metrics.dailyTaskAverages.plannedAverage) + " planned tasks and " + round(metrics.dailyTaskAverages.completedAverage) + " completed tasks."
      });
    }

    if (metrics.carryoverIndicators && metrics.carryoverIndicators.sampleSize >= 4) {
      snippets.push({
        id: "carryover",
        tags: ["avoidance", "patterns"],
        title: "Carryover",
        detail: round(metrics.carryoverIndicators.carryoverRate * 100) + "% of unfinished tasks have reappeared on later days recently."
      });
    }

    if (metrics.vagueTaskFriction && metrics.vagueTaskFriction.sampleSize >= 4 && metrics.vagueTaskFriction.vagueOpenCount > 0) {
      snippets.push({
        id: "vague-task",
        tags: ["avoidance", "next_step", "patterns"],
        title: "Task clarity",
        detail: metrics.vagueTaskFriction.vagueOpenCount + " current tasks still look broad, and vague tasks have been finishing less reliably than specific ones."
      });
    }

    if (metrics.moneySummary && metrics.moneySummary.available) {
      snippets.push({
        id: "money",
        tags: ["money", "patterns", "reality"],
        title: "Money state",
        detail: "Weekly flexible money is " + metrics.moneySummary.availableWeekLabel + " and monthly flexible money is " + metrics.moneySummary.flexibleRemainingLabel + "."
      });
    }

    if (metrics.foodSpendingOnHighEditDays && metrics.foodSpendingOnHighEditDays.highEditDays >= 3 && metrics.foodSpendingOnHighEditDays.lowerEditDays >= 3) {
      snippets.push({
        id: "food-high-edit",
        tags: ["money", "patterns", "general"],
        title: "Food and edit churn",
        detail: "Food spending has been higher on high-edit days than on calmer planning days lately."
      });
    }

    if (metrics.lateStudyCorrelation && metrics.lateStudyCorrelation.lateStudyDays >= 3 && metrics.lateStudyCorrelation.otherDays >= 3) {
      snippets.push({
        id: "late-study",
        tags: ["patterns", "reality", "next_step", "general"],
        title: "Late study pattern",
        detail: "Days with late study blocks have been finishing less of the plan than other days lately."
      });
    }

    if (metrics.simpleMorningCorrelation && metrics.simpleMorningCorrelation.simpleMorningDays >= 3 && metrics.simpleMorningCorrelation.complexMorningDays >= 3) {
      snippets.push({
        id: "simple-morning",
        tags: ["morning", "patterns", "reality", "general"],
        title: "Simple morning pattern",
        detail: "Simpler mornings have been lining up with better task completion lately."
      });
    }

    var shiftSummary = recentTaskShiftSummary(options);
    if (shiftSummary.laterMoveCount > 0 && shiftSummary.latestLaterMove) {
      snippets.push({
        id: "task-shift",
        tags: ["morning", "patterns", "avoidance", "general"],
        title: "Task moved later",
        detail: "\"" + previewText(shiftSummary.latestLaterMove.label, 48) + "\" was moved later from "
          + formatClock(shiftSummary.latestLaterMove.before) + " to " + formatClock(shiftSummary.latestLaterMove.after)
          + ", and that has happened " + formatCount(shiftSummary.laterMoveCount) + " times recently."
      });
    }

    if (shiftSummary.growingEstimateCount > 0 && shiftSummary.latestGrowingEstimate) {
      snippets.push({
        id: "growing-estimate",
        tags: ["morning", "patterns", "reality", "general"],
        title: "Task estimate grew",
        detail: "\"" + previewText(shiftSummary.latestGrowingEstimate.label, 48) + "\" grew from "
          + formatHours(shiftSummary.latestGrowingEstimate.before) + " to " + formatHours(shiftSummary.latestGrowingEstimate.after)
          + " in your edits, and that has happened " + formatCount(shiftSummary.growingEstimateCount) + " times recently."
      });
    }

    journalEntries.slice(0, 3).forEach(function (entry, index) {
      snippets.push({
        id: "journal-" + index,
        tags: ["journal", "patterns", "general"],
        title: entry.title || entry.date,
        detail: previewText(entry.content || entry.title || entry.date, 96)
      });
    });

    openTasks(options).slice(0, 3).forEach(function (task, index) {
      snippets.push({
        id: "open-task-" + index,
        tags: ["next_step", "avoidance", "general"],
        title: "Open task",
        detail: taskLabel(task) + (task.hours ? " (" + formatHours(task.hours) + ")" : "")
      });
    });

    if (skate.todayPlan) {
      snippets.push({
        id: "skate-plan",
        tags: ["skate", "general", "next_step"],
        title: "Today's skate plan",
        detail: skate.todayPlan.phaseWeekLabel + ". " + skate.todayPlan.blockLabel + ". Main focus: " + previewText(skate.todayPlan.mainFocus, 64) + "."
      });
    }

    if (skate.todayState && skate.todayState.selectedIntensity) {
      snippets.push({
        id: "skate-intensity",
        tags: ["skate", "general", "patterns"],
        title: "Today's skate intensity",
        detail: "Today's selected intensity is " + String(skate.todayState.selectedIntensity).toUpperCase() + "."
      });
    }

    (Array.isArray(skate.recentSessions) ? skate.recentSessions : []).slice(0, 4).forEach(function (session, index) {
      snippets.push({
        id: "skate-session-" + index,
        tags: ["skate", "patterns", "general"],
        title: session.date || "Recent skate session",
        detail: String(session.intensity || "yellow").toUpperCase() + " · " + previewText(session.mainFocus || session.flowFocus || "Saved session", 64)
      });
    });

    (Array.isArray(skate.supportThisWeek) ? skate.supportThisWeek : []).slice(0, 4).forEach(function (support, index) {
      snippets.push({
        id: "skate-support-" + index,
        tags: ["skate", "patterns", "general"],
        title: support.type || "Body support",
        detail: (support.minutes ? support.minutes + " min" : "Logged") + (support.note ? " · " + previewText(support.note, 48) : "")
      });
    });

    return snippets;
  }

  function skateAnswer(snippets, options) {
    var skate = options && options.skate ? options.skate : {};
    var todayPlan = skate.todayPlan || null;
    var recentSessions = Array.isArray(skate.recentSessions) ? skate.recentSessions : [];
    var supportThisWeek = Array.isArray(skate.supportThisWeek) ? skate.supportThisWeek : [];
    var recentGreenCount = recentSessions.slice(0, 4).filter(function (session) {
      return normalizeText(session.intensity) === "green";
    }).length;
    var supportMinutes = supportThisWeek.reduce(function (sum, item) {
      return sum + Math.max(0, Number(item.minutes) || 0);
    }, 0);
    var hasRecoverySupport = supportThisWeek.some(function (item) {
      var type = normalizeText(item.type);
      return type === "yoga" || type === "stretch" || type === "recovery";
    });

    if (recentGreenCount >= 3 && !hasRecoverySupport && supportMinutes < 45) {
      return {
        answer: "Make today Blue or keep it very light. You already have " + formatCount(recentGreenCount) + " green sessions in the last four logs and this week does not show much recovery support yet.",
        evidence: snippets.slice(0, 3).map(function (snippet) { return snippet.detail; })
      };
    }
    if (todayPlan) {
      return {
        answer: "Today's skate plan is already narrow: " + previewText(todayPlan.mainFocus, 72) + ". Keep the 30-minute block to \"" + previewText(todayPlan.skateiq, 72) + "\" and let " + previewText(todayPlan.flow, 48) + " be the optional easy finish.",
        evidence: snippets.slice(0, 3).map(function (snippet) { return snippet.detail; })
      };
    }
    return {
      answer: "I do not have enough skate context yet to be precise. Once the skate plan and logs are present, I can answer from them.",
      evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
    };
  }

  function selectRelevantSnippets(question, context) {
    var intent = classifyQuestion(question);
    var snippets = Array.isArray(context) ? context : [];
    var exact = snippets.filter(function (snippet) {
      return snippet.tags.indexOf(intent) !== -1;
    });
    if (exact.length) {
      return { intent: intent, snippets: exact.slice(0, 3) };
    }
    var fallback = snippets.filter(function (snippet) {
      return snippet.tags.indexOf("general") !== -1 || snippet.id === "top-insight";
    });
    return { intent: intent, snippets: fallback.slice(0, 3) };
  }

  function nextStepAnswer(snippets, insights, options) {
    var topInsight = Array.isArray(insights) && insights.length ? insights[0] : null;
    var suggestedTask = concreteTaskSuggestion(options);
    var recentTaskHistory = Array.isArray(options && options.recentTaskHistory) ? options.recentTaskHistory : [];
    var repeatedLabels = {};
    recentTaskHistory.forEach(function (day) {
      (Array.isArray(day && day.unfinishedLabels) ? day.unfinishedLabels : []).forEach(function (label) {
        var key = String(label || "").trim();
        if (!key) {
          return;
        }
        repeatedLabels[key] = (repeatedLabels[key] || 0) + 1;
      });
    });
    var repeatedTarget = "";
    Object.keys(repeatedLabels).forEach(function (label) {
      if (!repeatedTarget || repeatedLabels[label] > repeatedLabels[repeatedTarget]) {
        repeatedTarget = label;
      }
    });
    if (suggestedTask) {
      return {
        answer: "Do \"" + taskLabel(suggestedTask) + "\" next. It is the clearest unfinished task on your list right now" + (suggestedTask.hours ? " and it is sized at " + formatHours(suggestedTask.hours) : "") + ".",
        evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
      };
    }
    if (repeatedTarget && repeatedLabels[repeatedTarget] >= 2) {
      return {
        answer: "If you only do one thing, make it \"" + repeatedTarget + "\" as one short 25-minute block. It keeps reappearing, so the best next move is to make it small enough to finally finish.",
        evidence: snippets.slice(0, 3).map(function (snippet) { return snippet.detail; })
      };
    }
    if (topInsight) {
      var firstAction = topInsight.actions && topInsight.actions[0] ? topInsight.actions[0].label : "take the smallest useful step";
      return {
        answer: topInsight.title + " I would start with: " + firstAction + ".",
        evidence: [topInsight.why].concat(snippets.slice(0, 1).map(function (snippet) { return snippet.detail; })).filter(Boolean)
      };
    }
    return {
      answer: "The clearest next move is probably the smallest specific task you can finish without more planning.",
      evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
    };
  }

  function moveTaskAnswer(snippets, options) {
    var tasks = openTasks(options);
    var eveningCandidate = tasks.slice().reverse().find(function (task) {
      var minutes = parseLabelTimeMinutes(task.label);
      return minutes === null || minutes >= 18 * 60;
    }) || tasks[tasks.length - 1] || null;
    if (eveningCandidate) {
      return {
        answer: "Move \"" + taskLabel(eveningCandidate) + "\" to tomorrow first. It looks like the least urgent fit for today and it will reduce clutter faster than rewriting the whole list.",
        evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
      };
    }
    return {
      answer: "I do not see a strong move candidate yet. If today still feels crowded, move the least specific or latest task to tomorrow first.",
      evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
    };
  }

  function breakdownAnswer(snippets, options) {
    var broadOpenTasks = broadTasks(options);
    if (broadOpenTasks.length) {
      return {
        answer: "\"" + taskLabel(broadOpenTasks[0]) + "\" is the best task to shrink. Turn it into one setup step, one 25-minute work step, and one tiny closing note.",
        evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
      };
    }
    var nextTask = concreteTaskSuggestion(options);
    return {
      answer: nextTask
        ? "\"" + taskLabel(nextTask) + "\" is already clearer than most. Keep it as-is and make another task smaller instead."
        : "I do not see a clear broad task right now. Ask me again after you add today's open tasks.",
      evidence: snippets.slice(0, 2).map(function (snippet) { return snippet.detail; })
    };
  }

  function composeAnswer(question, options) {
    var insights = Array.isArray(options && options.insights) ? options.insights : [];
    var snippets = buildRetrieverContext(options);
    var selected = selectRelevantSnippets(question, snippets);
    var metrics = options && options.metrics ? options.metrics : {};
    var suggestedTask = concreteTaskSuggestion(options);
    var broadOpenTasks = broadTasks(options);
    var shiftSummary = recentTaskShiftSummary(options);

    if (selected.intent === "morning") {
      if (shiftSummary.latestLaterMove) {
        return {
          intent: selected.intent,
          answer: "\"" + previewText(shiftSummary.latestLaterMove.label, 48) + "\" got pushed later from "
            + formatClock(shiftSummary.latestLaterMove.before) + " to " + formatClock(shiftSummary.latestLaterMove.after)
            + ". You have moved tasks later " + formatCount(shiftSummary.laterMoveCount) + " times recently, so your first planned block is probably starting too early for your real morning.",
          evidence: selected.snippets.slice(0, 3).map(function (snippet) { return snippet.detail; })
        };
      }
      if (metrics.morningOverrun && metrics.morningOverrun.sampleSize >= 4 && metrics.morningOverrun.averageOverrun > 0) {
        var plannedMorning = formatHours(metrics.morningOverrun.plannedAverage);
        var actualMorning = formatHours(metrics.morningOverrun.actualAverage);
        return {
          intent: selected.intent,
          answer: "Your mornings have been taking about " + actualMorning + ", even though you usually plan about " + plannedMorning + ". A more realistic fix is to protect a " + actualMorning + " morning block or move your first serious task later.",
          evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
    }

    if (selected.intent === "money") {
      if (metrics.moneySummary && metrics.moneySummary.available) {
        return {
          intent: selected.intent,
          answer: "Your money pattern looks tight enough right now that a small pause before extra spending would probably help more than another budget tweak.",
          evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
    }

    if (selected.intent === "skate") {
      var skateReply = skateAnswer(selected.snippets, options);
      return {
        intent: selected.intent,
        answer: skateReply.answer,
        evidence: skateReply.evidence,
        source: "local"
      };
    }

    if (selected.intent === "move_task") {
      var moveAnswer = moveTaskAnswer(selected.snippets, options);
      return {
        intent: selected.intent,
        answer: moveAnswer.answer,
        evidence: moveAnswer.evidence,
        source: "local"
      };
    }

    if (selected.intent === "breakdown") {
      var smallerAnswer = breakdownAnswer(selected.snippets, options);
      return {
        intent: selected.intent,
        answer: smallerAnswer.answer,
        evidence: smallerAnswer.evidence,
        source: "local"
      };
    }

    if (selected.intent === "avoidance") {
      if (shiftSummary.latestLaterMove) {
        return {
          intent: selected.intent,
          answer: "The clearest avoidance signal is rescheduling. \"" + previewText(shiftSummary.latestLaterMove.label, 48) + "\" was pushed later from "
            + formatClock(shiftSummary.latestLaterMove.before) + " to " + formatClock(shiftSummary.latestLaterMove.after)
            + ", and you have done that " + formatCount(shiftSummary.laterMoveCount) + " times recently.",
          evidence: selected.snippets.slice(0, 3).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
      if (broadOpenTasks.length) {
        return {
          intent: selected.intent,
          answer: "The thing you are most likely avoiding is \"" + taskLabel(broadOpenTasks[0]) + "\" because it is still too broad. Break it into one visible action before you add anything else.",
          evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
      if (metrics.carryoverIndicators && metrics.carryoverIndicators.sampleSize >= 4 && metrics.carryoverIndicators.carryoverRate > 0.15) {
        return {
          intent: selected.intent,
          answer: "The friction looks less like one vague task and more like carryover. About " + formatCount((metrics.carryoverIndicators.carryoverRate || 0) * 100) + "% of unfinished tasks have been rolling forward, so the better move is to cut today's list instead of rewriting it again.",
          evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
      return {
        intent: selected.intent,
        answer: suggestedTask
          ? "I do not see one obviously vague task right now. If you feel stuck, start with \"" + taskLabel(suggestedTask) + "\" and ignore the rest until it is done."
          : "I do not see a clear avoidance target yet. The safer read is that you may need a smaller list, not more analysis.",
        evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
        source: "local"
      };
    }

    if (selected.intent === "journal") {
      if (selected.snippets.length) {
        return {
          intent: selected.intent,
          answer: "Your recent journal notes give a few clues, but I want to stay honest: I can point to what you wrote more easily than I can infer a deep mood pattern yet.",
          evidence: selected.snippets.slice(0, 3).map(function (snippet) {
            return snippet.title + ": " + snippet.detail;
          }),
          source: "local"
        };
      }
    }

    if (selected.intent === "next_step") {
      var nextStep = nextStepAnswer(selected.snippets, insights, options);
      return {
        intent: selected.intent,
        answer: nextStep.answer,
        evidence: nextStep.evidence,
        source: "local"
      };
    }

    if (selected.intent === "reality") {
      if (metrics.hourGapAverages && metrics.hourGapAverages.sampleSize >= 4) {
        return {
          intent: selected.intent,
          answer: "Your recent baseline suggests your real working capacity is lower than your most ambitious plans. Planning around the completed average would likely feel steadier.",
          evidence: selected.snippets.slice(0, 2).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
    }

    if (selected.intent === "patterns" || selected.intent === "general") {
      if (selected.snippets.length) {
        var patternSummary = [];
        if (shiftSummary.laterMoveCount > 0) {
          patternSummary.push("you keep moving some tasks later after planning them earlier");
        }
        if (metrics.morningOverrun && metrics.morningOverrun.sampleSize >= 4 && metrics.morningOverrun.averageOverrun > 0) {
          patternSummary.push("your mornings are usually longer than planned");
        }
        if (metrics.dailyTaskAverages && metrics.dailyTaskAverages.sampleSize >= 4 && metrics.dailyTaskAverages.completedAverage < metrics.dailyTaskAverages.plannedAverage) {
          patternSummary.push("you plan more tasks than you finish");
        }
        return {
          intent: selected.intent,
          answer: patternSummary.length
            ? "The clearest pattern I see is that " + patternSummary.join(", and ") + "."
            : "The clearest pattern I see is that your planner has useful data, but there is not enough consistent evidence yet for a sharper conclusion.",
          evidence: selected.snippets.slice(0, 3).map(function (snippet) { return snippet.detail; }),
          source: "local"
        };
      }
    }

    return {
      intent: selected.intent,
      answer: "I do not have enough evidence to answer that specifically yet. Ask me about mornings, overload, money, patterns, or what to do next, and I will answer from your planner data.",
      evidence: [],
      source: "local"
    };
  }

  return {
    answerMascotQuestion: composeAnswer,
    buildRetrieverContext: buildRetrieverContext,
    classifyQuestion: classifyQuestion,
    selectRelevantSnippets: selectRelevantSnippets,
    suggestedPrompts: suggestedPrompts
  };
}));
