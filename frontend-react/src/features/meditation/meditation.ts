import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { MEDITATION_STORAGE_KEY } from "./meditation-definitions";
import { decodeMeditationDocument, meditationMinutesForDate } from "./meditation-store";

export { MEDITATION_STORAGE_KEY } from "./meditation-definitions";

export interface MeditationModel {
  active: boolean;
  countdown: string;
  savedMinutes: number;
  status: string;
}

export interface MeditationUpdate {
  nextStore: PlannerStore;
  write: PlannerStoreWrite;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

function humanDate(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return `${WEEKDAYS[date.getDay()] ?? ""} ${MONTHS[date.getMonth()] ?? ""} ${date.getDate()}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTimer(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`
    : `${minutes}:${pad(remainingSeconds)}`;
}

function updateStore(store: PlannerStore, document: Readonly<Record<string, unknown>>): MeditationUpdate {
  const value = JSON.stringify(document);
  const write = { key: MEDITATION_STORAGE_KEY, value };
  return { nextStore: { ...store, [MEDITATION_STORAGE_KEY]: value }, write };
}

export function buildMeditation(
  store: PlannerStore,
  selectedDate: string,
  nowMs: number
): MeditationModel {
  const document = decodeMeditationDocument(store);
  const savedMinutes = meditationMinutesForDate(document.sessions, selectedDate);
  return {
    active: document.active !== null,
    countdown: document.active === null
      ? "Ready"
      : formatTimer(Math.max(0, Math.ceil((document.active.endsAt - nowMs) / 1000))),
    savedMinutes,
    status: `${savedMinutes} min saved for ${humanDate(selectedDate)}.`
  };
}

export function startMeditation(
  store: PlannerStore,
  rawMinutes: string,
  nowMs: number,
  id: string
): MeditationUpdate | null {
  const document = decodeMeditationDocument(store);
  const minutes = Number(rawMinutes);
  if (document.active !== null || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    return null;
  }
  return updateStore(store, {
    ...document.source,
    active: {
      id,
      minutes,
      dateKey: formatPlannerDate(new Date(nowMs)),
      startedAt: nowMs,
      endsAt: nowMs + minutes * 60_000
    },
    sessions: document.sessions
  });
}

export function cancelMeditation(store: PlannerStore): MeditationUpdate {
  const document = decodeMeditationDocument(store);
  return updateStore(store, {
    ...document.source,
    active: null,
    sessions: document.sessions
  });
}

export function finishMeditation(store: PlannerStore, nowMs: number): MeditationUpdate | null {
  const document = decodeMeditationDocument(store);
  const active = document.active;
  if (active === null || nowMs < active.endsAt) {
    return null;
  }
  return updateStore(store, {
    active: null,
    sessions: [
      ...document.sessions,
      {
        id: active.id,
        dateKey: active.dateKey,
        startedAt: new Date(active.startedAt).toISOString(),
        finishedAt: new Date(active.endsAt).toISOString(),
        durationHours: active.minutes / 60
      }
    ]
  });
}
