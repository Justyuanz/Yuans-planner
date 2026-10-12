import { describe, expect, it } from "vitest";

import { formatTimer, leadingTimeMinutes } from "./planner-time";

// This matrix is the one the four previous implementations were characterized
// against; every one of them agreed on all of it before being merged.
describe("leadingTimeMinutes", () => {
  it("reads the common label shapes", () => {
    expect(leadingTimeMinutes("09:00 Send invoice")).toEqual(540);
    expect(leadingTimeMinutes("9:00 x")).toEqual(540);
    expect(leadingTimeMinutes("0900 x")).toEqual(540);
    expect(leadingTimeMinutes("09:00")).toEqual(540);
    expect(leadingTimeMinutes("9")).toEqual(540);
    expect(leadingTimeMinutes("09 x")).toEqual(540);
    expect(leadingTimeMinutes("1 Task")).toEqual(60);
    expect(leadingTimeMinutes("14:30 Final")).toEqual(870);
  });

  it("stops at a dash, so a range reads as its start time", () => {
    expect(leadingTimeMinutes("09:00-10:30 x")).toEqual(540);
    expect(leadingTimeMinutes("10:00–11:00 x")).toEqual(600);
  });

  it("covers both ends of the clock", () => {
    expect(leadingTimeMinutes("0:00 x")).toEqual(0);
    expect(leadingTimeMinutes("23:59 x")).toEqual(1439);
  });

  it("ignores leading whitespace", () => {
    expect(leadingTimeMinutes("\t09:00 x")).toEqual(540);
    expect(leadingTimeMinutes("  09:00 x")).toEqual(540);
  });

  it("returns null when the label does not start with a time", () => {
    expect(leadingTimeMinutes("Call the dentist")).toBeNull();
    expect(leadingTimeMinutes("Deep work 09:00")).toBeNull();
    expect(leadingTimeMinutes("")).toBeNull();
    expect(leadingTimeMinutes("   ")).toBeNull();
  });

  it("returns null for an out-of-range clock", () => {
    expect(leadingTimeMinutes("24:00 x")).toBeNull();
    expect(leadingTimeMinutes("25:00 x")).toBeNull();
    expect(leadingTimeMinutes("09:70 x")).toBeNull();
  });

  it("requires a two-digit minute and a separator", () => {
    expect(leadingTimeMinutes("9:5 x")).toBeNull();
    expect(leadingTimeMinutes("09:00Deep")).toBeNull();
  });

  // A date key starts with digits, so it parses as a time. The surfaces relied
  // on this, since a label is never a date key in practice.
  it("reads a leading date key as a time, as the previous copies did", () => {
    expect(leadingTimeMinutes("2026-09-14 note")).toEqual(1226);
  });
});

// The two previous copies produced identical output for all 43,201 finite
// second values checked, and differed only on a non-finite input, which the
// task timer cannot produce because its seconds come from a clamped range.
describe("formatTimer", () => {
  it("formats under an hour without padding the minutes", () => {
    expect(formatTimer(0)).toEqual("0:00");
    expect(formatTimer(9)).toEqual("0:09");
    expect(formatTimer(309)).toEqual("5:09");
    expect(formatTimer(3599)).toEqual("59:59");
  });

  it("adds an hour segment and pads the minutes above an hour", () => {
    expect(formatTimer(3600)).toEqual("1:00:00");
    expect(formatTimer(3909)).toEqual("1:05:09");
    expect(formatTimer(86399)).toEqual("23:59:59");
    expect(formatTimer(90000)).toEqual("25:00:00");
  });

  it("floors fractions and clamps negatives to zero", () => {
    expect(formatTimer(59.9)).toEqual("0:59");
    expect(formatTimer(-1)).toEqual("0:00");
    expect(formatTimer(-3600)).toEqual("0:00");
  });

  it("reads a non-finite duration as zero instead of rendering NaN", () => {
    expect(formatTimer(Number.NaN)).toEqual("0:00");
    expect(formatTimer(Number.POSITIVE_INFINITY)).toEqual("0:00");
  });
});
