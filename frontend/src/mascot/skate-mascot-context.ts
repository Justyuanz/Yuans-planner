import type { PlannerStore } from "../api/planner-store";
import { SKATE_PROGRAM } from "../pages/skate/skate-program-data";
import { bodySupportLogsForWeek } from "../pages/skate/cards/body-support/skate-body-support";
import { toDateKey } from "../shared/planner-date";
import { isRecord } from "../shared/is-record";

const SETTINGS_KEY = "hivePlanner.skate.settings";
const SESSIONS_KEY = "hivePlanner.skate.sessions";
const VALID_INTENSITIES = new Set(["blue", "yellow", "green"]);

type SkateIntensity = "blue" | "green" | "yellow";

function storedValue(rawValue: string | undefined): unknown {
  try {
    return rawValue === undefined ? null : JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function intensity(value: unknown, fallback: SkateIntensity = "yellow"): SkateIntensity {
  return typeof value === "string" && VALID_INTENSITIES.has(value)
    ? value as SkateIntensity : fallback;
}

function currentProgramDay(settings: unknown): number {
  if (!isRecord(settings)) return 1;
  const day = Math.round(Number(settings.currentProgramDay) || 1);
  return Math.max(1, Math.min(60, day));
}

function normalizedRestDays(settings: unknown): Set<number> {
  if (!isRecord(settings)) return new Set([0]);
  const primary = Math.round(Number(settings.restDayOfWeek));
  const restDay = Number.isFinite(primary) && primary >= 0 && primary <= 6 ? primary : 0;
  const extra = Math.round(Number(settings.extraRestDayOfWeek));
  return new Set([
    restDay,
    ...(Number.isFinite(extra) && extra >= 0 && extra <= 6 && extra !== restDay ? [extra] : [])
  ]);
}

function planForDate(settings: unknown, referenceDate: Date) {
  const seasonStart = new Date(2026, 7, 29);
  const beforeSeason = referenceDate < seasonStart;
  const dayNumber = beforeSeason ? 1 : currentProgramDay(settings);
  const plan = SKATE_PROGRAM.days.find((day) => day.dayNumber === dayNumber)
    ?? SKATE_PROGRAM.days[0];
  const daysUntilStart = Math.round((seasonStart.getTime() - referenceDate.getTime()) / 86_400_000);
  const title = beforeSeason
    ? daysUntilStart === 1 ? "Program starts tomorrow" : "Program starts soon"
    : normalizedRestDays(settings).has(referenceDate.getDay()) ? "Rest day" : "Today";
  return {
    benchmark: plan.benchmark,
    blockLabel: `Day ${plan.dayNumber}`,
    defaultIntensity: plan.intensity,
    flow: plan.flow,
    mainFocus: plan.mainFocus,
    phaseWeekLabel: `${plan.phase} · Week ${plan.weekNumber}`,
    skateiq: plan.skateiq,
    title
  };
}

function selectedIntensity(settings: unknown, dateKey: string, fallback: SkateIntensity): SkateIntensity {
  if (!isRecord(settings) || !isRecord(settings.intensityByDate)) return fallback;
  return intensity(settings.intensityByDate[dateKey], fallback);
}

function sessionText(session: Record<string, unknown>, key: string): string {
  return typeof session[key] === "string" ? session[key].trim() : "";
}

function recentSessions(rawValue: string | undefined) {
  const parsed = storedValue(rawValue);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isRecord).sort((left, right) =>
    sessionText(right, "finishedAt").localeCompare(sessionText(left, "finishedAt"))
  ).slice(0, 8).map((session) => {
    const finishedAt = sessionText(session, "finishedAt");
    const durationHours = Number(session.durationHours);
    return {
      date: finishedAt ? finishedAt.slice(0, 10) : "",
      durationHours: Number.isFinite(durationHours) ? durationHours : 0,
      flowFocus: sessionText(session, "flowFocus"),
      improvedNote: sessionText(session, "improvedNote"),
      intensity: intensity(session.intensity),
      mainFocus: sessionText(session, "mainFocus") || sessionText(session, "focus"),
      nextFocusNote: sessionText(session, "nextFocusNote")
    };
  });
}

export function buildSkateMascotContext(store: PlannerStore, referenceDate: Date) {
  const settings = storedValue(store[SETTINGS_KEY]);
  const todayPlan = planForDate(settings, referenceDate);
  const dateKey = toDateKey(referenceDate);
  return {
    priorities: SKATE_PROGRAM.priorities.map((priority) => ({ ...priority })),
    recentSessions: recentSessions(store[SESSIONS_KEY]),
    supportThisWeek: bodySupportLogsForWeek(store, referenceDate).map((log) => ({
      date: log.date,
      minutes: log.minutes,
      note: log.note,
      type: log.type
    })),
    todayPlan,
    todayState: {
      selectedIntensity: selectedIntensity(settings, dateKey, todayPlan.defaultIntensity)
    }
  };
}
