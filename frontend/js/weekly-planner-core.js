(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanWeeklyPlannerCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY_TYPES = [
    { id: "recovery", label: "Recovery Day", shortLabel: "Recovery", className: "recovery-day", capacityPoints: 0 },
    { id: "normal", label: "Normal Day", shortLabel: "Normal", className: "normal-day", capacityPoints: 4 },
    { id: "high", label: "High-Intensity Day", shortLabel: "High-Intensity", className: "high-day", capacityPoints: 6 }
  ];

  var CATEGORY_ORDER = [
    "Study/school",
    "Skate",
    "Gym",
    "Cooking",
    "Chores/groceries",
    "Social",
    "Guitar",
    "Personal"
  ];

  var CATEGORY_META = {
    "Study/school": { label: "Study/school", shortLabel: "Study", className: "study-block" },
    "Skate": { label: "Skate", shortLabel: "Skate", className: "skate-block" },
    "Gym": { label: "Gym", shortLabel: "Gym", className: "gym-block" },
    "Cooking": { label: "Cooking", shortLabel: "Cooking", className: "cooking-block" },
    "Chores/groceries": { label: "Chores/groceries", shortLabel: "Chores", className: "chores-block" },
    "Social": { label: "Social", shortLabel: "Social", className: "social-block" },
    "Guitar": { label: "Guitar", shortLabel: "Guitar", className: "guitar-block" },
    "Personal": { label: "Personal", shortLabel: "Personal", className: "personal-block" }
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeClock(value) {
    var text = String(value || "").trim();
    var match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return "";
    }
    var hours = Number(match[1]);
    var minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
      return "";
    }
    return pad(hours) + ":" + pad(minutes);
  }

  function clockToMinutes(value) {
    var normalized = normalizeClock(value);
    if (!normalized) {
      return null;
    }
    var parts = normalized.split(":");
    return (Number(parts[0]) * 60) + Number(parts[1]);
  }

  function durationMinutes(startTime, endTime) {
    var start = clockToMinutes(startTime);
    var end = clockToMinutes(endTime);
    if (start === null || end === null || end <= start) {
      return 0;
    }
    return end - start;
  }

  function pointsForDuration(minutes) {
    var safeMinutes = Math.max(0, Number(minutes) || 0);
    if (!safeMinutes) {
      return 0;
    }
    if (safeMinutes <= 30) {
      return 1;
    }
    if (safeMinutes <= 90) {
      return 2;
    }
    return 3;
  }

  function normalizeCategory(category) {
    var text = String(category || "").trim();
    if (CATEGORY_META[text]) {
      return text;
    }
    if (text === "Study deadline" || text === "Home study" || text === "School study") {
      return "Study/school";
    }
    if (text === "Chore") {
      return "Chores/groceries";
    }
    if (text === "Other") {
      return "Personal";
    }
    return "Personal";
  }

  function categoryMeta(category) {
    return CATEGORY_META[normalizeCategory(category)] || CATEGORY_META.Personal;
  }

  function dayTypeById(id) {
    var normalized = String(id || "").trim();
    if (normalized === "study") {
      normalized = "normal";
    } else if (normalized === "skate") {
      normalized = "high";
    } else if (normalized === "rest" || normalized === "personal") {
      normalized = "recovery";
    }
    for (var index = 0; index < DAY_TYPES.length; index += 1) {
      if (DAY_TYPES[index].id === normalized) {
        return DAY_TYPES[index];
      }
    }
    return DAY_TYPES[1];
  }

  function defaultWeekPlan(weekKey) {
    return {
      week: String(weekKey || ""),
      isConfigured: false,
      days: new Array(7).fill(null).map(function () {
        return { type: "normal" };
      })
    };
  }

  function normalizeWeekPlan(value, weekKey) {
    var fallback = defaultWeekPlan(weekKey);
    var source = value && typeof value === "object" ? value : {};
    var days = Array.isArray(source.days) ? source.days : fallback.days;
    return {
      week: String(weekKey || source.week || ""),
      isConfigured: source.isConfigured === undefined ? Array.isArray(source.days) : Boolean(source.isConfigured),
      days: fallback.days.map(function (day, index) {
        return {
          type: dayTypeById(days[index] && days[index].type).id
        };
      })
    };
  }

  function countDayTypes(weekPlan) {
    return normalizeWeekPlan(weekPlan, weekPlan && weekPlan.week).days.reduce(function (counts, day) {
      counts[day.type] = (counts[day.type] || 0) + 1;
      return counts;
    }, { recovery: 0, normal: 0, high: 0 });
  }

  function validateWeekPlan(weekPlan) {
    var counts = countDayTypes(weekPlan);
    var errors = [];
    if (counts.recovery < 1) {
      errors.push("At least one Recovery Day is required.");
    }
    if (counts.high > 2) {
      errors.push("You can only have up to two High-Intensity Days.");
    }
    return {
      valid: errors.length === 0,
      errors: errors,
      counts: counts
    };
  }

  function canChangeDayType(weekPlan, dayIndex, nextTypeId) {
    var plan = normalizeWeekPlan(weekPlan, weekPlan && weekPlan.week);
    var current = dayTypeById(plan.days[dayIndex] && plan.days[dayIndex].type);
    var next = dayTypeById(nextTypeId);
    var counts = countDayTypes(plan);
    if (current.id === "recovery" && next.id !== "recovery" && counts.recovery === 1) {
      return {
        allowed: false,
        reason: "Keep one Recovery Day protected before changing this one."
      };
    }
    if (current.id !== "high" && next.id === "high" && counts.high >= 2) {
      return {
        allowed: false,
        reason: "Two High-Intensity Days is the weekly maximum."
      };
    }
    return { allowed: true, reason: "" };
  }

  function normalizeActivity(activity) {
    var source = activity && typeof activity === "object" ? activity : {};
    var category = normalizeCategory(source.category);
    var startTime = normalizeClock(source.startTime);
    var endTime = normalizeClock(source.endTime);
    var minutes = durationMinutes(startTime, endTime);
    return {
      id: source.id || "",
      title: String(source.title || categoryMeta(category).shortLabel || "").trim(),
      category: category,
      startTime: startTime,
      endTime: endTime,
      minutes: minutes,
      points: pointsForDuration(minutes)
    };
  }

  function normalizeActivities(activities) {
    return (Array.isArray(activities) ? activities : [])
      .map(normalizeActivity)
      .filter(function (activity) {
        return activity.startTime && activity.endTime && activity.minutes > 0;
      })
      .sort(function (left, right) {
        return clockToMinutes(left.startTime) - clockToMinutes(right.startTime);
      });
  }

  function recommendedMaxMinutes(remainingPoints) {
    if (remainingPoints <= 0) {
      return 0;
    }
    if (remainingPoints === 1) {
      return 30;
    }
    if (remainingPoints === 2) {
      return 90;
    }
    return null;
  }

  function recoveryRule(candidate, activities, options) {
    var normalized = normalizeActivity(candidate);
    var streakActive = Boolean(options && options.skateStreakActive);
    var current = normalizeActivities(activities);
    if (!streakActive) {
      return {
        allowed: false,
        reason: "Rest protected."
      };
    }
    if (normalized.category !== "Skate") {
      return {
        allowed: false,
        reason: "Recovery Day only allows a 10-minute Recovery Skate."
      };
    }
    if (normalized.minutes > 10) {
      return {
        allowed: false,
        reason: "Recovery Skate must stay at 10 minutes."
      };
    }
    var existingRecoverySkate = current.some(function (activity) {
      return activity.category === "Skate";
    });
    if (existingRecoverySkate) {
      return {
        allowed: false,
        reason: "Recovery Day already has its one Recovery Skate."
      };
    }
    return { allowed: true, reason: "" };
  }

  function canAddActivity(dayTypeId, activities, candidate, options) {
    var type = dayTypeById(dayTypeId);
    var current = normalizeActivities(activities);
    var summary = daySummary(dayTypeId, current, options);
    var normalized = normalizeActivity(candidate);
    if (!normalized.startTime || !normalized.endTime || !normalized.minutes) {
      return {
        allowed: false,
        reason: "Pick a valid start and end time."
      };
    }
    if (type.id === "recovery") {
      return recoveryRule(normalized, current, options);
    }
    if (summary.remainingPoints <= 0) {
      return {
        allowed: false,
        reason: "Day full."
      };
    }
    if (normalized.points > summary.remainingPoints) {
      return {
        allowed: false,
        reason: recommendedMaxMinutes(summary.remainingPoints) === 30
          ? "Only a short activity fits today."
          : "Only up to 90 minutes fits today."
      };
    }
    return { allowed: true, reason: "" };
  }

  function daySummary(dayTypeId, activities, options) {
    var type = dayTypeById(dayTypeId);
    var normalized = normalizeActivities(activities);
    var usedPoints = normalized.reduce(function (sum, activity) {
      return sum + activity.points;
    }, 0);
    var capacityPoints = type.capacityPoints;
    var remainingPoints = Math.max(0, capacityPoints - usedPoints);
    var status = "Space left";

    if (type.id === "recovery") {
      status = "Rest protected";
    } else if (remainingPoints <= 0) {
      status = "Day full";
    } else if (remainingPoints <= 1) {
      status = "Only light activity fits";
    }

    return {
      dayType: type,
      activities: normalized,
      usedPoints: usedPoints,
      capacityPoints: capacityPoints,
      remainingPoints: remainingPoints,
      recommendedMaxMinutes: recommendedMaxMinutes(remainingPoints),
      status: status,
      canAddActivity: type.id === "recovery"
        ? recoveryRule({ category: "Skate", startTime: "00:00", endTime: "00:10" }, normalized, options).allowed
        : remainingPoints > 0
    };
  }

  function dayTypeChangeAllowed(weekPlan, dayIndex, nextTypeId, activities, options) {
    var typeResult = canChangeDayType(weekPlan, dayIndex, nextTypeId);
    if (!typeResult.allowed) {
      return typeResult;
    }
    var nextType = dayTypeById(nextTypeId);
    if (nextType.id !== "recovery") {
      return { allowed: true, reason: "" };
    }
    var normalized = normalizeActivities(activities);
    var invalid = normalized.some(function (activity) {
      return !recoveryRule(activity, [], options).allowed;
    });
    if (invalid) {
      return {
        allowed: false,
        reason: "Move or remove existing activities before making this a Recovery Day."
      };
    }
    if (normalized.length > 1) {
      return {
        allowed: false,
        reason: "Move or remove existing activities before making this a Recovery Day."
      };
    }
    return { allowed: true, reason: "" };
  }

  function categoryOptions(dayTypeId, activities, options) {
    var type = dayTypeById(dayTypeId);
    var summary = daySummary(type.id, activities, options);
    return CATEGORY_ORDER.map(function (category) {
      var meta = categoryMeta(category);
      var disabled = false;
      var reason = "";
      if (summary.status === "Day full") {
        disabled = true;
        reason = "Day full.";
      } else if (type.id === "recovery") {
        var allowed = recoveryRule({
          category: category,
          startTime: "00:00",
          endTime: category === "Skate" ? "00:10" : "00:30"
        }, activities, options);
        disabled = !allowed.allowed;
        reason = allowed.reason;
      }
      return {
        category: category,
        label: meta.label,
        className: meta.className,
        disabled: disabled,
        reason: reason,
        recommended: !disabled && summary.recommendedMaxMinutes !== null
      };
    }).sort(function (left, right) {
      if (left.disabled !== right.disabled) {
        return left.disabled ? 1 : -1;
      }
      if (left.recommended !== right.recommended) {
        return left.recommended ? -1 : 1;
      }
      return CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
    });
  }

  return {
    CATEGORY_ORDER: CATEGORY_ORDER.slice(),
    DAY_TYPES: DAY_TYPES.slice(),
    canAddActivity: canAddActivity,
    categoryMeta: categoryMeta,
    categoryOptions: categoryOptions,
    countDayTypes: countDayTypes,
    daySummary: daySummary,
    dayTypeById: dayTypeById,
    dayTypeChangeAllowed: dayTypeChangeAllowed,
    defaultWeekPlan: defaultWeekPlan,
    durationMinutes: durationMinutes,
    normalizeActivities: normalizeActivities,
    normalizeActivity: normalizeActivity,
    normalizeCategory: normalizeCategory,
    normalizeWeekPlan: normalizeWeekPlan,
    pointsForDuration: pointsForDuration,
    recommendedMaxMinutes: recommendedMaxMinutes,
    validateWeekPlan: validateWeekPlan
  };
}));
