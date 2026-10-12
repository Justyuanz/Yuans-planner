import { describe, expect, it } from "vitest";

import { formatHours } from "./format-hours";

describe("formatHours", () => {
  it.each([
    [0, "0h"],
    [1, "1h"],
    [1.236, "1.24h"],
    [Number.NaN, "0h"]
  ])("formats %s as %s", (hours, formatted) => {
    expect(formatHours(hours)).toBe(formatted);
  });
});
