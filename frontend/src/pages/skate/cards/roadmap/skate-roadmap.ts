import type { PlannerStore } from "@/api/planner-store";
import { isRecord } from "@/shared/is-record";
import { normalizeSkateIntensity, type SkateIntensity } from "@/pages/skate/skate-intensity";
import { addDays, humanDate, startOfLocalDay, toDateKey } from "@/shared/planner-date";

export const SKATE_SESSIONS_STORAGE_KEY = "hivePlanner.skate.sessions";

const EMPTY_MESSAGE = "Roadmap starts on Saturday, August 29, 2026. Dots appear after the season begins and stay visible as the history grows.";
const SKATE_SEASON_START = new Date(2026, 7, 29);
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

interface StoredSkateSession {
  dateKey: string;
  durationMinutes: number;
  intensity: SkateIntensity;
  label: string;
}

export interface SkateRoadmapDay {
  ariaLabel: string;
  dateKey: string;
  durationMinutes: number;
  intensity: SkateIntensity | "empty";
  selectedIntensity: SkateIntensity | null;
  sessionCount: number;
  title: string;
}

export interface SkateRoadmapLogRequest {
  dateKey: string;
  durationMinutes: number;
  intensity: SkateIntensity | null;
}

export interface SkateRoadmapMonth {
  column: number;
  label: string;
}

export interface SkateRoadmapModel {
  columnCount: number;
  days: SkateRoadmapDay[];
  emptyMessage: string | null;
  leadingBlanks: number;
  months: SkateRoadmapMonth[];
}

function dateFromKey(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return toDateKey(date) === value ? date : null;
}

function sessionDateKey(session: Readonly<Record<string, unknown>>): string {
  const explicitDate = dateFromKey(session.dateKey);
  if (explicitDate !== null) return toDateKey(explicitDate);
  const finishedAt = typeof session.finishedAt === "string" ? session.finishedAt : "";
  const date = new Date(finishedAt);
  return Number.isFinite(date.getTime()) ? toDateKey(date) : "";
}

function sessionLabel(session: Readonly<Record<string, unknown>>): string {
  if (typeof session.mainFocus === "string" && session.mainFocus) return session.mainFocus;
  if (typeof session.focus === "string" && session.focus) return session.focus;
  return "Saved session";
}

function sessionDurationMinutes(value: unknown): number {
  return Math.max(1, Math.round((Number(value) || 0) * 60));
}

function decodeSessions(rawValue: string | undefined): StoredSkateSession[] {
  try {
    const parsed: unknown = rawValue === undefined ? [] : JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      if (!isRecord(candidate) || !candidate.finishedAt) return [];
      const dateKey = sessionDateKey(candidate);
      if (!dateKey) return [];
      return [{
        dateKey,
        durationMinutes: sessionDurationMinutes(candidate.durationHours),
        intensity: normalizeSkateIntensity(candidate.intensity),
        label: sessionLabel(candidate)
      }];
    });
  } catch {
    return [];
  }
}




function sessionsByDate(store: PlannerStore): Map<string, StoredSkateSession[]> {
  const grouped = new Map<string, StoredSkateSession[]>();
  decodeSessions(store[SKATE_SESSIONS_STORAGE_KEY]).forEach((session) => {
    const sessions = grouped.get(session.dateKey) ?? [];
    sessions.push(session);
    grouped.set(session.dateKey, sessions);
  });
  return grouped;
}

function roadmapDay(date: Date, sessions: StoredSkateSession[]): SkateRoadmapDay {
  const dateLabel = humanDate(date);
  const latest = sessions.at(-1) ?? null;
  const sessionCount = sessions.length;
  return {
    ariaLabel: `${dateLabel}${sessionCount > 0
      ? ` · ${sessionCount} skate session${sessionCount === 1 ? "" : "s"}`
      : " · no logged session"}`,
    dateKey: toDateKey(date),
    durationMinutes: latest?.durationMinutes ?? 45,
    intensity: latest?.intensity ?? "empty",
    selectedIntensity: latest?.intensity ?? null,
    sessionCount,
    title: latest === null ? dateLabel : `${dateLabel} · ${latest.intensity.toUpperCase()} · ${latest.label}`
  };
}

export function buildSkateRoadmapModel(store: PlannerStore, referenceDate: Date): SkateRoadmapModel {
  const end = startOfLocalDay(referenceDate);
  const start = startOfLocalDay(SKATE_SEASON_START);
  if (end < start) {
    return { columnCount: 0, days: [], emptyMessage: EMPTY_MESSAGE, leadingBlanks: 0, months: [] };
  }

  const groupedSessions = sessionsByDate(store);
  const leadingBlanks = start.getDay();
  const days: SkateRoadmapDay[] = [];
  const months: SkateRoadmapMonth[] = [];
  let cursor = start;
  let previousMonth = "";

  while (cursor <= end) {
    const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    if (monthKey !== previousMonth) {
      months.push({
        column: Math.floor((leadingBlanks + days.length) / 7) + 1,
        label: MONTH_NAMES[cursor.getMonth()]!.slice(0, 3)
      });
      previousMonth = monthKey;
    }
    const dateKey = toDateKey(cursor);
    days.push(roadmapDay(cursor, groupedSessions.get(dateKey) ?? []));
    cursor = addDays(cursor, 1);
  }

  return {
    columnCount: Math.ceil((leadingBlanks + days.length) / 7),
    days,
    emptyMessage: null,
    leadingBlanks,
    months
  };
}
