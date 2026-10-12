import { describe, expect, it } from "vitest";

import {
  addDays,
  dateFromKey,
  dateKeyFromValue,
  humanDate,
  humanDateFromKey,
  startOfLocalDay,
  strictDateKey,
  toDateKey
} from "./planner-date";

describe("startOfLocalDay", () => {
  it("drops the time component and keeps the local calendar day", () => {
    const result = startOfLocalDay(new Date(2026, 8, 14, 23, 45, 30, 500));
    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual([2026, 8, 14]);
    expect([result.getHours(), result.getMinutes(), result.getSeconds(), result.getMilliseconds()])
      .toEqual([0, 0, 0, 0]);
  });
});

describe("addDays", () => {
  it("steps whole local days across month and year boundaries", () => {
    expect(humanDate(addDays(new Date(2026, 8, 14), 1))).toEqual("Tue Sep 15");
    expect(humanDate(addDays(new Date(2026, 8, 14), -1))).toEqual("Sun Sep 13");
    expect(humanDate(addDays(new Date(2026, 8, 30), 1))).toEqual("Thu Oct 1");
    expect(humanDate(addDays(new Date(2026, 11, 31), 1))).toEqual("Fri Jan 1");
    // 1 Jan 2026 is a Thursday, so the day before is Wednesday 31 Dec 2025.
    expect(humanDate(addDays(new Date(2026, 0, 1), -1))).toEqual("Wed Dec 31");
  });

  it("keeps a leap day reachable", () => {
    expect(humanDate(addDays(new Date(2024, 1, 28), 1))).toEqual("Thu Feb 29");
  });

  it("drops any time component, like the surfaces that used it", () => {
    const result = addDays(new Date(2026, 8, 14, 18, 30), 0);
    expect(result.getHours()).toEqual(0);
  });
});

describe("humanDate", () => {
  it("renders the short Planner label", () => {
    expect(humanDate(new Date(2026, 8, 14))).toEqual("Mon Sep 14");
    expect(humanDate(new Date(2026, 0, 1))).toEqual("Thu Jan 1");
    expect(humanDate(new Date(2026, 11, 31))).toEqual("Thu Dec 31");
  });

  it("renders empty parts for an invalid date instead of throwing", () => {
    expect(humanDate(new Date(Number.NaN))).toEqual("  NaN");
  });
});

describe("dateFromKey and humanDateFromKey", () => {
  it("reads a stored key as a local date", () => {
    expect(humanDateFromKey("2026-09-14")).toEqual("Mon Sep 14");
    expect(humanDateFromKey("2026-01-01")).toEqual("Thu Jan 1");
    expect(humanDateFromKey("2026-12-31")).toEqual("Thu Dec 31");
  });

  it("accepts unpadded parts", () => {
    expect(humanDateFromKey("2026-9-4")).toEqual("Fri Sep 4");
  });

  // These malformed cases are pinned because the surfaces that share this
  // helper relied on exactly this tolerance before it was extracted.
  it("defaults a missing day to the first of the month", () => {
    expect(humanDateFromKey("2026-09")).toEqual("Tue Sep 1");
  });

  it("treats an empty key as the first day of year zero", () => {
    expect(humanDateFromKey("")).toEqual("Mon Jan 1");
  });

  it("renders empty parts for an unparseable key", () => {
    expect(humanDateFromKey("nonsense")).toEqual("  NaN");
  });

  it("lets out-of-range parts roll over the way Date does", () => {
    expect(humanDateFromKey("2026-13-45")).toEqual("Sun Feb 14");
    expect(humanDateFromKey("0000-00-00")).toEqual("Thu Nov 30");
  });

  it("returns a local date object callers can shift", () => {
    expect(humanDate(addDays(dateFromKey("2026-09-14"), 7))).toEqual("Mon Sep 21");
  });
});

describe("toDateKey", () => {
  it("pads the month and day but not the year", () => {
    expect(toDateKey(new Date(2026, 8, 14))).toEqual("2026-09-14");
    expect(toDateKey(new Date(2026, 0, 1))).toEqual("2026-01-01");
    expect(toDateKey(new Date(2026, 11, 31))).toEqual("2026-12-31");
  });

  it("ignores any time component", () => {
    expect(toDateKey(new Date(2026, 8, 14, 23, 59, 59))).toEqual("2026-09-14");
  });

  it("round-trips with dateFromKey", () => {
    expect(toDateKey(dateFromKey("2026-09-14"))).toEqual("2026-09-14");
  });
});

describe("dateKeyFromValue", () => {
  it("reads a stored timestamp or date string", () => {
    expect(dateKeyFromValue("2026-09-14T10:30:00.000Z")).toMatch(/^2026-09-1[45]$/);
    expect(dateKeyFromValue("2026-09-14")).toMatch(/^2026-09-1[34]$/);
  });

  it("returns an empty key for anything unparseable", () => {
    expect(dateKeyFromValue("nonsense")).toEqual("");
    expect(dateKeyFromValue("")).toEqual("");
    expect(dateKeyFromValue(null)).toEqual("");
    expect(dateKeyFromValue(undefined)).toEqual("");
    expect(dateKeyFromValue({})).toEqual("");
    expect(dateKeyFromValue([])).toEqual("");
  });
});

describe("strictDateKey", () => {
  it("accepts a real calendar day", () => {
    expect(strictDateKey("2026-09-14")).toEqual("2026-09-14");
    expect(strictDateKey("2024-02-29")).toEqual("2024-02-29");
  });

  it("rejects a day that would roll over into the next month", () => {
    expect(strictDateKey("2026-02-31")).toEqual("");
    expect(strictDateKey("2025-02-29")).toEqual("");
    expect(strictDateKey("2026-04-31")).toEqual("");
  });

  it("rejects out-of-range, unpadded, and non-string values", () => {
    for (const value of ["2026-13-01", "2026-00-10", "2026-09-00", "2026-9-4", "", "nonsense", null, undefined, 20260914, {}]) {
      expect(strictDateKey(value)).toEqual("");
    }
  });

  it("rejects a timestamp, because only a bare key is a valid day", () => {
    expect(strictDateKey("2026-09-14T10:00:00Z")).toEqual("");
  });
});
