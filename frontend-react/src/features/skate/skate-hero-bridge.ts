import { isSkateIntensity, type SkateIntensity } from "./skate-intensity";

export const SKATE_HERO_ACTION_EVENT = "hive-planner-skate-hero-action";
export const SKATE_HERO_STATE_EVENT = "hive-planner-skate-hero-state";

export type { SkateIntensity } from "./skate-intensity";

export interface SkateHeroState {
  attemptBudget: string;
  benchmarkLabel: string;
  benchmarkVisible: boolean;
  blockLabel: string;
  boardHours: string;
  currentDay: string;
  dayCount: string;
  extraRestDay: string;
  finishDisabled: boolean;
  flowFocus: string;
  heroSubtitle: string;
  intensity: SkateIntensity;
  intensityDescription: string;
  intensityEffort: string;
  mainFocus: string;
  phaseBadge: string;
  restDay: string;
  sessionDaysCount: string;
  sessionHint: string;
  skateiqBlock: string;
  settingsNote: string;
  startDisabled: boolean;
  weekCount: string;
}

export type SkateHeroAction =
  | { action: "finish-session" | "log-session" | "start-session" }
  | { action: "set-current-day"; value: string }
  | { action: "set-extra-rest-day"; value: string }
  | { action: "set-intensity"; value: SkateIntensity }
  | { action: "set-rest-day"; value: string };

const TEXT_IDS = {
  attemptBudget: "skateAttemptBudget",
  benchmarkLabel: "skateBenchmarkLabel",
  blockLabel: "skateBlockLabel",
  boardHours: "skateBoardHours",
  dayCount: "skateDayCount",
  flowFocus: "skateFlowFocus",
  heroSubtitle: "skateHeroSubtitle",
  intensityDescription: "skateIntensityDescription",
  intensityEffort: "skateIntensityEffort",
  mainFocus: "skateMainFocus",
  phaseBadge: "skatePhaseBadge",
  sessionDaysCount: "skateSessionDaysCount",
  sessionHint: "skateSessionHint",
  skateiqBlock: "skateSkateiqBlock",
  settingsNote: "skateSettingsNote",
  weekCount: "skateWeekCount"
} as const;

function selectedIntensity(document: Document): SkateIntensity {
  const value = document.querySelector<HTMLElement>("#skateIntensityToggle [data-intensity].active")
    ?.dataset.intensity;
  return isSkateIntensity(value) ? value : "yellow";
}

export function skateHeroStateFromDocument(document: Document): SkateHeroState | null {
  const currentDay = document.querySelector<HTMLInputElement>("#skateCurrentDay");
  const extraRestDay = document.querySelector<HTMLSelectElement>("#skateExtraRestDay");
  const finish = document.querySelector<HTMLButtonElement>("#finishSkateSession");
  const restDay = document.querySelector<HTMLSelectElement>("#skateRestDay");
  const start = document.querySelector<HTMLButtonElement>("#startSkateSession");
  const benchmark = document.querySelector<HTMLElement>("#skateBenchmarkChip");
  if (currentDay === null || extraRestDay === null || finish === null || restDay === null
    || start === null || benchmark === null) return null;
  const text = Object.fromEntries(Object.entries(TEXT_IDS).map(([key, id]) => [
    key,
    document.getElementById(id)?.textContent ?? ""
  ])) as Record<keyof typeof TEXT_IDS, string>;
  return {
    ...text,
    benchmarkVisible: !benchmark.hidden,
    currentDay: currentDay.value,
    extraRestDay: extraRestDay.value,
    finishDisabled: finish.disabled,
    intensity: selectedIntensity(document),
    restDay: restDay.value,
    startDisabled: start.disabled
  };
}

export function skateHeroStateFromEvent(event: Event): SkateHeroState | null {
  const detail: unknown = "detail" in event ? (event as CustomEvent<unknown>).detail : null;
  if (typeof detail !== "object" || detail === null) return null;
  const candidate = detail as Partial<SkateHeroState>;
  const textKeys = Object.keys(TEXT_IDS) as (keyof typeof TEXT_IDS)[];
  if (textKeys.some((key) => typeof candidate[key] !== "string")
    || typeof candidate.benchmarkVisible !== "boolean"
    || typeof candidate.currentDay !== "string"
    || typeof candidate.extraRestDay !== "string"
    || typeof candidate.finishDisabled !== "boolean"
    || !isSkateIntensity(candidate.intensity)
    || typeof candidate.restDay !== "string"
    || typeof candidate.startDisabled !== "boolean") return null;
  return candidate as SkateHeroState;
}

export function dispatchSkateHeroAction(frame: HTMLIFrameElement, detail: SkateHeroAction): void {
  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (frameDocument === null || frameWindow === null) return;
  const event = frameDocument.createEvent("CustomEvent");
  event.initCustomEvent(SKATE_HERO_ACTION_EVENT, false, false, detail);
  frameWindow.dispatchEvent(event);
}
