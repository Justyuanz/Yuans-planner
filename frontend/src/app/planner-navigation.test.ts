import { describe, expect, it } from "vitest";

import {
  plannerDateForRoute,
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

  it("keeps the Dashboard URL date-free", () => {
    expect(plannerLocation("todayView", new Date(2026, 8, 13))).toEqual({
      pathname: "/",
      search: ""
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

describe("plannerDateForRoute", () => {
  it("uses the current day for the Dashboard unless previewing a date", () => {
    const currentDate = new Date(2026, 9, 19);

    expect(plannerDateForRoute("/", "?date=2026-10-18", currentDate)).toBe(currentDate);
    expect(plannerDateForRoute("/", "?preview=1&date=2026-10-18", currentDate))
      .toEqual(new Date(2026, 9, 18));
    expect(plannerDateForRoute("/journal", "?date=2026-10-18", currentDate))
      .toEqual(new Date(2026, 9, 18));
  });
});
