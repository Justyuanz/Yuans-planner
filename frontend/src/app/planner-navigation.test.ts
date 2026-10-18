import { describe, expect, it } from "vitest";

import {
  plannerDateFromSearch,
  plannerLocation,
  plannerPathForView
} from "./planner-navigation";

describe("planner routes", () => {
  it("maps each planner view to a stable path", () => {
    expect(plannerPathForView("todayView")).toBe("/");
    expect(plannerPathForView("journalView")).toBe("/journal");
    expect(plannerPathForView("moneyView")).toBe("/money");
    expect(plannerPathForView("calendarView")).toBe("/calendar");
    expect(plannerPathForView("skateView")).toBe("/skate");
    expect(plannerPathForView("guitarView")).toBe("/guitar");
    expect(plannerPathForView("unknownView")).toBeNull();
  });

  it("builds a route while preserving the selected date", () => {
    expect(plannerLocation("calendarView", new Date(2026, 8, 13))).toEqual({
      pathname: "/calendar",
      search: "?date=2026-09-13"
    });
  });
});

describe("plannerDateFromSearch", () => {
  it("uses a valid date query and falls back for invalid calendar dates", () => {
    const fallback = new Date(2026, 0, 2);

    expect(plannerDateFromSearch("?date=2026-09-13", fallback)).toEqual(new Date(2026, 8, 13));
    expect(plannerDateFromSearch("?date=2026-02-31", fallback)).toEqual(fallback);
    expect(plannerDateFromSearch("?date=not-a-date", fallback)).toEqual(fallback);
  });
});
