import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import { decodeWeeklyGoals, encodeWeeklyGoalUpdate } from "./weekly-goals";

describe("decodeWeeklyGoals", () => {
  it("maps the legacy object into the three current goal tracks", () => {
    const goals = decodeWeeklyGoals({
      "hivePlanner.weeklyGoals": JSON.stringify({
        study: "Finish one lesson",
        body: "Take a recovery walk",
        mind: "Practice one song",
        futureTrack: "Keep this stored for later"
      })
    });

    expect(goals.map(({ id, label, text }) => ({ id, label, text }))).toEqual([
      { id: "study", label: "Study", text: "Finish one lesson" },
      { id: "body", label: "Body", text: "Take a recovery walk" },
      { id: "mind", label: "Mind", text: "Practice one song" }
    ]);
  });

  const malformedStores: PlannerStore[] = [
    {},
    { "hivePlanner.weeklyGoals": "not-json" },
    { "hivePlanner.weeklyGoals": "[]" },
    { "hivePlanner.weeklyGoals": '{"study":42}' }
  ];

  it.each(malformedStores)("keeps empty goal tracks for missing or malformed legacy data", (store) => {
    expect(decodeWeeklyGoals(store).map((goal) => goal.text)).toEqual(["", "", ""]);
  });
});

describe("encodeWeeklyGoalUpdate", () => {
  it("trims the changed goal and preserves known and unknown stored fields", () => {
    const encoded = encodeWeeklyGoalUpdate({
      "hivePlanner.weeklyGoals": JSON.stringify({
        study: "Old value",
        body: "Recovery walk",
        futureTrack: { preserve: true }
      })
    }, "study", "  Updated value  ");

    expect(JSON.parse(encoded)).toEqual({
      study: "Updated value",
      body: "Recovery walk",
      futureTrack: { preserve: true }
    });
  });

  it("recovers from malformed stored data without changing the requested value", () => {
    expect(encodeWeeklyGoalUpdate(
      { "hivePlanner.weeklyGoals": "not-json" },
      "mind",
      "  Practice slowly  "
    )).toBe('{"mind":"Practice slowly"}');
  });
});
