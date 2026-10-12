export const TASK_REMINDERS = [
  [0, "No reminder"],
  [5, "Remind me 5 min before"],
  [10, "Remind me 10 min before"],
  [15, "Remind me 15 min before"],
  [30, "Remind me 30 min before"]
] as const;

export function makeTaskRelatedId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
