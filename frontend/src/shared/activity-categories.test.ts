import { describe, expect, it } from "vitest";

import {
  ACTIVITY_DEFINITIONS,
  migratePlannedActivityValues,
  normalizeActivityId
} from "./activity-categories";

describe("activity category compatibility", () => {
  it("exposes the production tracked categories in their legacy display order", () => {
    expect(ACTIVITY_DEFINITIONS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "transcendence", label: "Transcendence" },
      { id: "mobileDevelopment", label: "Mobile Development" },
      { id: "portfolioJobPrep", label: "Portfolio / Job Prep" },
      { id: "skate", label: "Skate" },
      { id: "gym", label: "Gym" },
      { id: "guitar", label: "Guitar" },
      { id: "other", label: "Other" }
    ]);
  });

  it.each([
    ["cpp", "transcendence"],
    ["fso", "transcendence"],
    ["python", "mobileDevelopment"],
    ["lc", "portfolioJobPrep"],
    ["p90x3", "gym"],
    ["guitar", "guitar"],
    ["future", "other"],
    [undefined, "other"]
  ])("normalizes %s to %s", (stored, expected) => {
    expect(normalizeActivityId(stored)).toBe(expected);
  });

  it("combines old and new planned hours while preserving unrelated fields", () => {
    expect(migratePlannedActivityValues({
      cpp: 2,
      fso: 3,
      transcendence: 4,
      python: "1.5",
      mobileDevelopment: 2,
      lc: 1,
      portfolioJobPrep: 0.5,
      p90x3: 2,
      gym: 1,
      futureActivity: { preserve: true },
      note: "keep me"
    })).toEqual({
      transcendence: 9,
      mobileDevelopment: 3.5,
      portfolioJobPrep: 1.5,
      gym: 3,
      futureActivity: { preserve: true },
      note: "keep me"
    });
  });
});
