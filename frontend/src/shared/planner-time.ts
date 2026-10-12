// Clock parsing shared across Planner surfaces.

// Accepts "09:00", "9:00", "0900" and "9", and stops at whitespace, a dash or
// the end of the text.
const LEADING_TIME_PATTERN = /^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])/;

/**
 * Reads the time a label starts with, as minutes since midnight. So
 * "09:00-10:30 Deep work" reads as 09:00, while "Deep work 09:00" has no
 * leading time. Returns null when there is no leading time, or when the clock
 * values are out of range.
 *
 * Callers coerce their own input to text first. They deliberately disagree on
 * what a numeric value means: the calendar ignores numbers, the insight metrics
 * treat 0 as absent, and the mascot reads any number.
 */
export function leadingTimeMinutes(text: string): number | null {
  const match = LEADING_TIME_PATTERN.exec(text.trim());
  if (match === null) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours > 23 || minutes > 59 ? null : (hours * 60) + minutes;
}

/**
 * Formats a duration as a running clock: "5:09" under an hour, "1:05:09" above
 * it. Negative and fractional values floor to whole seconds from zero, and a
 * non-finite value reads as "0:00" rather than rendering NaN.
 */
export function formatTimer(seconds: number): string {
  const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(remainder)}`
    : `${minutes}:${pad(remainder)}`;
}
