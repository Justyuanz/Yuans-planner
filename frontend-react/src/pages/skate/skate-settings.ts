import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { isRecord } from "../../shared/is-record";
import type { SkateIntensity } from "./skate-intensity";

export const SKATE_CURRENT_SESSION_STORAGE_KEY = "hivePlanner.skate.currentSession";
export const SKATE_SETTINGS_STORAGE_KEY = "hivePlanner.skate.settings";

export interface SkateSettings {
  currentProgramDay: number;
  extraRestDayOfWeek: number | null;
  intensityByDate: Readonly<Record<string, unknown>>;
  restDayOfWeek: number;
}

export type SkateHeroSettingsAction =
  | { action: "set-current-day"; value: string }
  | { action: "set-extra-rest-day"; value: string }
  | { action: "set-intensity"; value: SkateIntensity }
  | { action: "set-rest-day"; value: string };

function storedRecord(rawValue: string | undefined): Record<string, unknown> {
  try {
    const value: unknown = rawValue === undefined ? null : JSON.parse(rawValue);
    return isRecord(value) ? { ...value } : {};
  } catch {
    return {};
  }
}

export function normalizeSkateProgramDay(value: unknown): number {
  return Math.max(1, Math.min(60, Math.round(Number(value) || 1)));
}

export function normalizeSkateRestDay(value: unknown): number {
  const day = Math.round(Number(value));
  return Number.isFinite(day) && day >= 0 && day <= 6 ? day : 0;
}

export function normalizeExtraSkateRestDay(value: unknown, primaryDay: number): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const day = Math.round(Number(value));
  return Number.isFinite(day) && day >= 0 && day <= 6 && day !== primaryDay ? day : null;
}

export function decodeSkateSettings(rawValue: string | undefined): SkateSettings {
  const value = storedRecord(rawValue);
  const restDayOfWeek = normalizeSkateRestDay(value.restDayOfWeek);
  return {
    currentProgramDay: normalizeSkateProgramDay(value.currentProgramDay),
    extraRestDayOfWeek: normalizeExtraSkateRestDay(value.extraRestDayOfWeek, restDayOfWeek),
    intensityByDate: isRecord(value.intensityByDate) ? value.intensityByDate : {},
    restDayOfWeek
  };
}

function normalizedSettingsRecord(rawValue: string | undefined): Record<string, unknown> {
  const raw = storedRecord(rawValue);
  const settings = decodeSkateSettings(rawValue);
  return {
    ...raw,
    currentProgramDay: settings.currentProgramDay,
    extraRestDayOfWeek: settings.extraRestDayOfWeek,
    intensityByDate: { ...settings.intensityByDate },
    restDayOfWeek: settings.restDayOfWeek
  };
}

export function buildSkateSettingsWrites(
  store: PlannerStore,
  dateKey: string,
  action: SkateHeroSettingsAction
): PlannerStoreWrite[] {
  const settings = normalizedSettingsRecord(store[SKATE_SETTINGS_STORAGE_KEY]);
  const decoded = decodeSkateSettings(JSON.stringify(settings));

  if (action.action === "set-current-day") {
    settings.currentProgramDay = normalizeSkateProgramDay(action.value);
  } else if (action.action === "set-rest-day") {
    const primaryDay = normalizeSkateRestDay(action.value);
    settings.restDayOfWeek = primaryDay;
    settings.extraRestDayOfWeek = normalizeExtraSkateRestDay(
      decoded.extraRestDayOfWeek,
      primaryDay
    );
  } else if (action.action === "set-extra-rest-day") {
    settings.extraRestDayOfWeek = normalizeExtraSkateRestDay(
      action.value,
      decoded.restDayOfWeek
    );
  } else {
    settings.intensityByDate = {
      ...decoded.intensityByDate,
      [dateKey]: action.value
    };
  }

  const writes: PlannerStoreWrite[] = [{
    key: SKATE_SETTINGS_STORAGE_KEY,
    value: JSON.stringify(settings)
  }];
  if (action.action === "set-intensity") {
    writes.push({
      key: SKATE_CURRENT_SESSION_STORAGE_KEY,
      value: JSON.stringify({
        ...storedRecord(store[SKATE_CURRENT_SESSION_STORAGE_KEY]),
        plannedIntensity: action.value
      })
    });
  }
  return writes;
}
