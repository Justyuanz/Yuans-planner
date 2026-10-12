export const SKATE_INTENSITIES = ["blue", "yellow", "green"] as const;

export type SkateIntensity = typeof SKATE_INTENSITIES[number];

export interface SkateIntensityMeta {
  attempts: string;
  description: string;
  effort: string;
  id: SkateIntensity;
  label: string;
  tone: string;
}

export const SKATE_INTENSITY_META: Record<SkateIntensity, SkateIntensityMeta> = {
  blue: {
    attempts: "0-5 focused attempts",
    description: "Cruise, carve, balance work, and skip serious trick volume.",
    effort: "1-3/10",
    id: "blue",
    label: "Blue",
    tone: "Recovery/control day"
  },
  yellow: {
    attempts: "10-20 focused attempts",
    description: "One main trick, stop while form still looks clean.",
    effort: "4-6/10",
    id: "yellow",
    label: "Yellow",
    tone: "Normal technical day"
  },
  green: {
    attempts: "20-30 focused attempts",
    description: "Small sets with real rests, then finish with fun skating.",
    effort: "6-8/10",
    id: "green",
    label: "Green",
    tone: "Focused session"
  }
};

export function isSkateIntensity(value: unknown): value is SkateIntensity {
  return typeof value === "string" && SKATE_INTENSITIES.some((intensity) => intensity === value);
}

export function normalizeSkateIntensity(
  value: unknown,
  fallback: SkateIntensity = "yellow"
): SkateIntensity {
  return isSkateIntensity(value) ? value : fallback;
}
