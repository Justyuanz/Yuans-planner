import { describe, expect, it } from "vitest";

import { plannerDateFromSearch } from "./planner-navigation";

describe("plannerDateFromSearch", () => {
  it("uses a valid date query and falls back for invalid calendar dates", () => {
    const fallback = new Date(2026, 0, 2);

    expect(plannerDateFromSearch("?date=2026-09-13", fallback)).toEqual(new Date(2026, 8, 13));
    expect(plannerDateFromSearch("?date=2026-02-31", fallback)).toEqual(fallback);
    expect(plannerDateFromSearch("?date=not-a-date", fallback)).toEqual(fallback);
  });
});
