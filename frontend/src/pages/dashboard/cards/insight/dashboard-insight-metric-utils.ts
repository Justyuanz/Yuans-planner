const DAY_MS = 24 * 60 * 60 * 1000;

export function finiteNonNegative(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function roundMetric(value: unknown, digits = 2): number {
  const precision = 10 ** digits;
  return Math.round(finiteNonNegative(value) * precision) / precision;
}

export function sumMetrics(values: readonly unknown[]): number {
  return values.reduce<number>((total, value) => total + finiteNonNegative(value), 0);
}

export function averageMetrics(values: readonly unknown[]): number {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length === 0 ? 0 : sumMetrics(numbers) / numbers.length;
}

function parseDateKey(dateKey: string): Date | null {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (parts.length !== 3 || !year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function isValidDateKey(dateKey: string): boolean {
  return parseDateKey(dateKey) !== null;
}

export function taskMetricWindowDateKeys(endDateKey: string, lookbackDays: number): string[] {
  const endDate = parseDateKey(endDateKey);
  if (endDate === null) {
    return [];
  }
  const days = Math.max(1, Number(lookbackDays) || 14);
  return Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;
    const date = new Date(endDate.getTime() - offset * DAY_MS);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  });
}
