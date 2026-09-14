import type { PlannerStore } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import {
  MEDITATION_STORAGE_KEY,
  type MeditationActiveTimer,
  type MeditationDocument
} from "./meditation-definitions";

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseDocument(store: PlannerStore): unknown {
  const rawValue = store[MEDITATION_STORAGE_KEY];
  if (rawValue === undefined) {
    return null;
  }
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function decodeActive(value: unknown): MeditationActiveTimer | null {
  if (!isRecord(value)) {
    return null;
  }
  const endsAt = finiteNumber(value.endsAt);
  const minutes = finiteNumber(value.minutes);
  const startedAt = finiteNumber(value.startedAt);
  if (endsAt === null || minutes === null || startedAt === null
    || !Number.isFinite(new Date(endsAt).getTime())
    || !Number.isFinite(new Date(startedAt).getTime())) {
    return null;
  }
  return {
    dateKey: typeof value.dateKey === "string" ? value.dateKey : "",
    endsAt,
    id: typeof value.id === "string" ? value.id : "",
    minutes,
    startedAt
  };
}

export function decodeMeditationDocument(store: PlannerStore): MeditationDocument {
  const parsed = parseDocument(store);
  const source = isRecord(parsed) ? parsed : {};
  return {
    active: decodeActive(source.active),
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    source
  };
}

function localDateKey(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatPlannerDate(date) : "";
}

export function meditationMinutesForDate(sessions: readonly unknown[], dateKey: string): number {
  const hours = sessions.reduce<number>((sum, candidate) => {
    if (!isRecord(candidate) || candidate.trackedInTask || !candidate.finishedAt) {
      return sum;
    }
    const sessionDate = typeof candidate.dateKey === "string" && candidate.dateKey
      ? candidate.dateKey
      : localDateKey(candidate.finishedAt);
    const durationHours = finiteNumber(candidate.durationHours) ?? 0;
    return sessionDate === dateKey ? sum + Math.max(0, durationHours) : sum;
  }, 0);
  return Math.round(hours * 60);
}
