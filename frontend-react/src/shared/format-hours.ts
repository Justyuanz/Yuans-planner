// Renders an hour count the way every Planner surface shows it: a whole
// number where it is one, two decimals otherwise, and 0h for a non-finite
// value rather than NaNh.

export function formatHours(value: number): string {
  const hours = Number.isFinite(value) ? value : 0;
  if (Math.abs(hours - Math.round(hours)) < 0.001) {
    return `${Math.round(hours)}h`;
  }
  return `${Math.round(hours * 100) / 100}h`;
}
