export const SKATE_INTENSITIES = ["blue", "yellow", "green"] as const;

export type SkateIntensity = typeof SKATE_INTENSITIES[number];

export function isSkateIntensity(value: unknown): value is SkateIntensity {
  return typeof value === "string" && SKATE_INTENSITIES.some((intensity) => intensity === value);
}

export function normalizeSkateIntensity(
  value: unknown,
  fallback: SkateIntensity = "yellow"
): SkateIntensity {
  return isSkateIntensity(value) ? value : fallback;
}
