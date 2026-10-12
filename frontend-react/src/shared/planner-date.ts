// Date helpers shared across Planner surfaces. Parsing and formatting are kept
// apart on purpose: several callers parse stored keys with their own tolerance
// for malformed values, but they all render the same short "Mon Sep 14" label.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

/** Midnight on the same local calendar day, dropping any time component. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Shifts by whole local days, so it steps over daylight-saving changes. */
export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/**
 * The short date label the Planner shows everywhere, for example "Mon Sep 14".
 * An out-of-range date yields empty parts rather than throwing, matching what
 * the surfaces did before this helper was shared.
 */
export function humanDate(date: Date): string {
  const weekday = WEEKDAYS[date.getDay()] ?? "";
  const month = MONTHS[date.getMonth()] ?? "";
  return `${weekday} ${month} ${date.getDate()}`;
}

/**
 * Parses a stored `YYYY-MM-DD` key into a local date. Missing parts fall back
 * to year 0, January and the 1st, which keeps a partial key such as "2026-09"
 * on the first of that month instead of rolling into the previous one.
 */
export function dateFromKey(dateKey: string): Date {
  const parts = dateKey.split("-").map(Number);
  return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

/** The short label for a stored date key, for example "Mon Sep 14". */
export function humanDateFromKey(dateKey: string): string {
  return humanDate(dateFromKey(dateKey));
}

/**
 * Formats a local date as the `YYYY-MM-DD` key the Planner stores. The year is
 * not padded, matching every stored key the application has written.
 */
export function toDateKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

/**
 * Reads a stored timestamp or date string as a local date key, returning "" for
 * anything that is not a parseable string or number.
 */
export function dateKeyFromValue(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? toDateKey(date) : "";
}

/**
 * Accepts only a real calendar day written as `YYYY-MM-DD`, so a rolled-over
 * value such as "2026-02-31" is rejected rather than silently shifted.
 */
export function strictDateKey(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? value
    : "";
}
