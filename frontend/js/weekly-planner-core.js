(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.YuanWeeklyPlannerCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY_TYPES = [
    { id: "recovery", label: "Recovery Day", shortLabel: "Recovery", className: "recovery-day", capacityLoad: 4.5 },
    { id: "normal", label: "Normal Day", shortLabel: "Normal", className: "normal-day", capacityLoad: 7 },
    { id: "high", label: "High-Intensity Day", shortLabel: "High-Intensity", className: "high-day", capacityLoad: 9 }
  ];
  DAY_TYPES.forEach(function (type) { type.capacityPoints = type.capacityLoad; });

  const CATEGORY_ORDER = ["Study/school", "Finnish", "Transcendence", "Mobile Development", "Portfolio / Job Prep", "Skate", "Gym", "Cooking", "Chores/groceries", "Social", "Guitar", "Personal"];
  var CATEGORY_META = {
    "Study/school": { label: "Study/school", shortLabel: "Study", className: "study-block", loadMultiplier: 1 },
    "Finnish": { label: "Finnish", shortLabel: "Finnish", className: "finnish-block", loadMultiplier: 1 },
    "Transcendence": { label: "Transcendence", shortLabel: "Transcendence", className: "transcendence-block", loadMultiplier: 1 },
    "Mobile Development": { label: "Mobile Development", shortLabel: "Mobile Dev", className: "mobile-development-block", loadMultiplier: 1 },
    "Portfolio / Job Prep": { label: "Portfolio / Job Prep", shortLabel: "Portfolio", className: "portfolio-job-prep-block", loadMultiplier: 1 },
    "Skate": { label: "Skate", shortLabel: "Skate", className: "skate-block", loadMultiplier: 1.2 },
    "Gym": { label: "Gym", shortLabel: "Gym", className: "gym-block", loadMultiplier: 1.3 },
    "Cooking": { label: "Cooking", shortLabel: "Cooking", className: "cooking-block", loadMultiplier: 0.75 },
    "Chores/groceries": { label: "Chores/groceries", shortLabel: "Chores", className: "chores-block", loadMultiplier: 0.75 },
    "Social": { label: "Social", shortLabel: "Social", className: "social-block", loadMultiplier: 0.75 },
    "Guitar": { label: "Guitar", shortLabel: "Guitar", className: "guitar-block", loadMultiplier: 0.75 },
    "Personal": { label: "Personal", shortLabel: "Personal", className: "personal-block", loadMultiplier: 0.75 }
  };
  var EFFORT_META = {
    easy: { id: "easy", label: "Easy", multiplier: 0.75 },
    standard: { id: "standard", label: "Standard", multiplier: 1 },
    demanding: { id: "demanding", label: "Demanding", multiplier: 1.25 }
  };
  var PHYSICAL_CATEGORIES = ["Skate", "Gym"];

  function round(value) { return Math.round((Number(value) || 0) * 100) / 100; }
  function pad(value) { return String(value).padStart(2, "0"); }

  function normalizeClock(value) {
    var text = String(value || "").trim();
    var amPmMatch = text.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
    var match = text.match(/^(\d{1,2}):(\d{2})$/);
    var hours = 0;
    var minutes = 0;
    if (amPmMatch) {
      hours = Number(amPmMatch[1]);
      minutes = amPmMatch[2] ? Number(amPmMatch[2]) : 0;
      if (hours < 1 || hours > 12 || minutes > 59) return "";
      if (hours === 12) hours = 0;
      if (amPmMatch[3].charAt(0).toLowerCase() === "p") hours += 12;
    } else if (match) {
      hours = Number(match[1]);
      minutes = Number(match[2]);
    } else {
      return "";
    }
    if (hours > 23 || minutes > 59) return "";
    return pad(hours) + ":" + pad(minutes);
  }

  function clockToMinutes(value) {
    var normalized = normalizeClock(value);
    if (!normalized) return null;
    var parts = normalized.split(":");
    return (Number(parts[0]) * 60) + Number(parts[1]);
  }

  function durationMinutes(startTime, endTime) {
    var start = clockToMinutes(startTime);
    var end = clockToMinutes(endTime);
    return start === null || end === null || end <= start ? 0 : end - start;
  }

  function normalizeCategory(category) {
    var text = String(category || "").trim();
    if (CATEGORY_META[text]) return text;
    if (["Study deadline", "Home study", "School study"].indexOf(text) !== -1) return "Study/school";
    if (text === "Chore") return "Chores/groceries";
    return "Personal";
  }

  function categoryMeta(category) { return CATEGORY_META[normalizeCategory(category)] || CATEGORY_META.Personal; }
  function defaultEffortForCategory(category) { return PHYSICAL_CATEGORIES.indexOf(normalizeCategory(category)) !== -1 ? "demanding" : "standard"; }
  function normalizeEffort(effort, category) {
    var id = String(effort || "").trim().toLowerCase();
    return EFFORT_META[id] ? id : defaultEffortForCategory(category);
  }
  function effortMeta(effort, category) { return EFFORT_META[normalizeEffort(effort, category)]; }

  function rawLoadForActivity(category, minutes, effort) {
    var safeMinutes = Math.max(0, Number(minutes) || 0);
    if (!safeMinutes) return 0;
    return (safeMinutes / 60) * categoryMeta(category).loadMultiplier * effortMeta(effort, category).multiplier;
  }
  function loadForActivity(category, minutes, effort) { return round(rawLoadForActivity(category, minutes, effort)); }
  function pointsForDuration(minutes) { return round(Math.max(0, Number(minutes) || 0) / 60); }
  function pointsForActivity(category, minutes, effort) { return loadForActivity(category, minutes, effort); }

  function dayTypeById(id) {
    var normalized = String(id || "").trim();
    if (normalized === "study") normalized = "normal";
    if (normalized === "skate") normalized = "high";
    if (normalized === "rest" || normalized === "personal") normalized = "recovery";
    return DAY_TYPES.filter(function (type) { return type.id === normalized; })[0] || DAY_TYPES[1];
  }

  function defaultWeekPlan(weekKey) {
    return { week: String(weekKey || ""), isConfigured: false, days: new Array(7).fill(null).map(function () { return { type: "normal" }; }) };
  }
  function normalizeWeekPlan(value, weekKey) {
    var fallback = defaultWeekPlan(weekKey);
    var source = value && typeof value === "object" ? value : {};
    var days = Array.isArray(source.days) ? source.days : fallback.days;
    return {
      week: String(weekKey || source.week || ""),
      isConfigured: source.isConfigured === undefined ? Array.isArray(source.days) : Boolean(source.isConfigured),
      days: fallback.days.map(function (day, index) { return { type: dayTypeById(days[index] && days[index].type).id }; })
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
    if (counts.recovery < 1) errors.push("At least one Recovery Day is required.");
    if (counts.high > 2) errors.push("You can only have up to two High-Intensity Days.");
    return { valid: !errors.length, errors: errors, counts: counts };
  }
  function canChangeDayType(weekPlan, dayIndex, nextTypeId) {
    var plan = normalizeWeekPlan(weekPlan, weekPlan && weekPlan.week);
    var current = dayTypeById(plan.days[dayIndex] && plan.days[dayIndex].type);
    var next = dayTypeById(nextTypeId);
    var counts = countDayTypes(plan);
    if (current.id === "recovery" && next.id !== "recovery" && counts.recovery === 1) return { allowed: false, reason: "Keep one Recovery Day protected before changing this one." };
    if (current.id !== "high" && next.id === "high" && counts.high >= 2) return { allowed: false, reason: "Two High-Intensity Days is the weekly maximum." };
    return { allowed: true, reason: "" };
  }

  function normalizeActivity(activity) {
    var source = activity && typeof activity === "object" ? activity : {};
    var category = normalizeCategory(source.category);
    var reminderOnly = Boolean(source.reminderOnly);
    var startTime = normalizeClock(source.startTime);
    var endTime = normalizeClock(source.endTime);
    var minutes = durationMinutes(startTime, endTime);
    var effort = normalizeEffort(source.effort, category);
    var rawLoad = reminderOnly ? 0 : rawLoadForActivity(category, minutes, effort);
    var load = round(rawLoad);
    return {
      id: source.id || "", title: String(source.title || categoryMeta(category).shortLabel || "").trim(), category: category,
      effort: effort, startTime: startTime, endTime: endTime, minutes: minutes, rawLoad: rawLoad, load: load, points: load, reminderOnly: reminderOnly
    };
  }
  function normalizeActivities(activities) {
    return (Array.isArray(activities) ? activities : []).map(normalizeActivity).filter(function (activity) {
      return Boolean(activity.title) && (activity.reminderOnly || (activity.startTime && activity.endTime && activity.minutes > 0));
    }).sort(function (left, right) {
      var leftMinutes = clockToMinutes(left.startTime);
      var rightMinutes = clockToMinutes(right.startTime);
      if (leftMinutes === null && rightMinutes === null) return String(left.title).localeCompare(String(right.title));
      if (leftMinutes === null) return 1;
      if (rightMinutes === null) return -1;
      return leftMinutes - rightMinutes;
    });
  }
  function switchLoadForCount(activityCount) { return Math.max(0, Number(activityCount) - 3) * 0.25; }
  function daySummary(dayTypeId, activities) {
    var type = dayTypeById(dayTypeId);
    var normalized = normalizeActivities(activities);
    var activityLoad = round(normalized.reduce(function (sum, activity) { return sum + activity.rawLoad; }, 0));
    var contextSwitchLoad = round(switchLoadForCount(normalized.filter(function (activity) { return !activity.reminderOnly; }).length));
    var usedLoad = round(activityLoad + contextSwitchLoad);
    var remainingLoad = round(type.capacityLoad - usedLoad);
    var status = remainingLoad < 0 ? "Over planned" : remainingLoad === 0 ? "Day full" : "Space left";
    return {
      dayType: type, activities: normalized, activityLoad: activityLoad, contextSwitchLoad: contextSwitchLoad,
      usedLoad: usedLoad, capacityLoad: type.capacityLoad, remainingLoad: remainingLoad,
      usedPoints: usedLoad, capacityPoints: type.capacityLoad, remainingPoints: remainingLoad,
      recommendedMaxMinutes: null, status: status, canAddActivity: remainingLoad > 0
    };
  }
  function recoveryRule(candidate) {
    var normalized = normalizeActivity(candidate);
    if (normalized.reminderOnly) return { allowed: true, reason: "" };
    if (PHYSICAL_CATEGORIES.indexOf(normalized.category) !== -1 && normalized.minutes > 30) return { allowed: false, reason: "Recovery Day keeps skate and gym to 30 minutes or less." };
    return { allowed: true, reason: "" };
  }
  function previewActivityLoad(dayTypeId, activities, candidate) {
    var current = daySummary(dayTypeId, activities);
    var normalized = normalizeActivity(candidate);
    var physicalRule = dayTypeById(dayTypeId).id === "recovery" ? recoveryRule(normalized) : { allowed: true, reason: "" };
    var projected = daySummary(dayTypeId, current.activities.concat([normalized]));
    var allowed = normalized.reminderOnly || (physicalRule.allowed && projected.remainingLoad >= 0);
    var reason = "";
    if (!physicalRule.allowed) reason = physicalRule.reason;
    if (!normalized.reminderOnly && physicalRule.allowed && projected.remainingLoad < 0) reason = "This would be " + round(Math.abs(projected.remainingLoad)) + " load hours over the " + projected.capacityLoad + " load-hour budget.";
    return { current: current, candidate: normalized, projected: projected, allowed: allowed, reason: reason };
  }
  function canAddActivity(dayTypeId, activities, candidate) {
    var normalized = normalizeActivity(candidate);
    if (!normalized.title) return { allowed: false, reason: "Add a name for this item." };
    if (normalized.reminderOnly) {
      if ((normalized.startTime && !normalized.endTime) || (!normalized.startTime && normalized.endTime)) return { allowed: false, reason: "Pick both a start and end time, or leave both blank." };
      return { allowed: true, reason: "" };
    }
    if (!normalized.startTime || !normalized.endTime || !normalized.minutes) {
      if (clockToMinutes(normalized.startTime) !== null && clockToMinutes(normalized.endTime) !== null) return { allowed: false, reason: "End time needs to be after start time." };
      return { allowed: false, reason: "Pick a valid start and end time." };
    }
    var preview = previewActivityLoad(dayTypeId, activities, normalized);
    return { allowed: preview.allowed, reason: preview.reason || "" };
  }
  function dayTypeChangeAllowed(weekPlan, dayIndex, nextTypeId, activities) {
    var typeResult = canChangeDayType(weekPlan, dayIndex, nextTypeId);
    if (!typeResult.allowed) return typeResult;
    if (dayTypeById(nextTypeId).id !== "recovery") return { allowed: true, reason: "" };
    var invalidPhysical = normalizeActivities(activities).some(function (activity) { return !recoveryRule(activity).allowed; });
    return invalidPhysical ? { allowed: false, reason: "Shorten skate or gym to 30 minutes before making this a Recovery Day." } : { allowed: true, reason: "" };
  }
  function categoryOptions() {
    return CATEGORY_ORDER.map(function (category) {
      var meta = categoryMeta(category);
      return { category: category, label: meta.label, className: meta.className, disabled: false, reason: "", recommended: false };
    });
  }

  return {
    CATEGORY_ORDER: CATEGORY_ORDER.slice(), DAY_TYPES: DAY_TYPES.slice(), EFFORT_META: EFFORT_META,
    canAddActivity: canAddActivity, categoryMeta: categoryMeta, categoryOptions: categoryOptions, countDayTypes: countDayTypes,
    daySummary: daySummary, dayTypeById: dayTypeById, dayTypeChangeAllowed: dayTypeChangeAllowed,
    defaultEffortForCategory: defaultEffortForCategory, defaultWeekPlan: defaultWeekPlan, durationMinutes: durationMinutes,
    effortMeta: effortMeta, loadForActivity: loadForActivity, normalizeActivities: normalizeActivities, normalizeActivity: normalizeActivity,
    normalizeCategory: normalizeCategory, normalizeEffort: normalizeEffort, normalizeWeekPlan: normalizeWeekPlan,
    pointsForActivity: pointsForActivity, pointsForDuration: pointsForDuration, previewActivityLoad: previewActivityLoad,
    recommendedMaxMinutes: function () { return null; }, switchLoadForCount: switchLoadForCount, validateWeekPlan: validateWeekPlan
  };
}));
