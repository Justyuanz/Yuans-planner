import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import { GUITAR_FOCUS_STORAGE_KEY, GUITAR_NEXT_STEP_STORAGE_KEY } from "./guitar-goal";
import {
  buildGuitarSessionModel,
  GUITAR_SESSIONS_STORAGE_KEY,
  GUITAR_TARGET_STORAGE_KEY,
  guitarSessionDurationMinutes
} from "./guitar-session";

const TODAY = new Date(2026, 8, 14);

describe("buildGuitarSessionModel", () => {
  it("reproduces weekly totals, practice copy, and newest-first history", () => {
    const model = buildGuitarSessionModel({
      [GUITAR_FOCUS_STORAGE_KEY]: "Clean chord changes",
      [GUITAR_NEXT_STEP_STORAGE_KEY]: "Play the bridge slowly",
      [GUITAR_TARGET_STORAGE_KEY]: "4",
      [GUITAR_SESSIONS_STORAGE_KEY]: JSON.stringify([
        {
          durationHours: 0.5,
          finishedAt: "2026-09-14T11:00:00.000Z",
          focus: "Clean chord changes",
          note: "Chord switch"
        },
        {
          durationHours: "0.75",
          finishedAt: "2026-09-15T18:00:00.000Z",
          focus: "Fingerstyle",
          nextStep: "Slow bridge"
        },
        {
          durationHours: 1,
          finishedAt: "2026-09-10T16:00:00.000Z",
          nextStep: "Old practice"
        }
      ])
    }, TODAY, null, Date.parse("2026-09-14T18:00:00.000Z"));

    expect(model.summary).toEqual([
      { label: "This week", value: "2 / 4" },
      { label: "Weekly target", value: "4" },
      { label: "Minutes played", value: "75 min" },
      { label: "Average session", value: "38 min" }
    ]);
    expect(model.plan).toBe("This week: 75 / 120 min. 2 more sessions and about 45 min to hit the target. Practice next: Play the bridge slowly. Current focus: Clean chord changes.");
    expect(model.history).toEqual([
      {
        date: "Tue Sep 15",
        minutes: 45,
        note: "Fingerstyle",
        title: "Fingerstyle · Slow bridge"
      },
      {
        date: "Mon Sep 14",
        minutes: 30,
        note: "Chord switch",
        title: "Clean chord changes"
      },
      {
        date: "Thu Sep 10",
        minutes: 60,
        note: "Old practice",
        title: "Old practice"
      }
    ]);
  });

  it("keeps the timer transient and switches to reached-target copy", () => {
    const store: PlannerStore = {
      [GUITAR_FOCUS_STORAGE_KEY]: "Rhythm",
      [GUITAR_NEXT_STEP_STORAGE_KEY]: "One clean verse",
      [GUITAR_TARGET_STORAGE_KEY]: "1",
      [GUITAR_SESSIONS_STORAGE_KEY]: JSON.stringify([{
        durationHours: 0.25,
        finishedAt: "2026-09-14T11:00:00.000Z"
      }])
    };

    const stopped = buildGuitarSessionModel(store, TODAY, null, 0);
    expect(stopped.plan).toBe("Weekly target reached. Keep the good part going. Current focus: Rhythm. Small practice: One clean verse.");
    expect(stopped.status).toBe("No active Guitar session.");
    expect(stopped.startDisabled).toBe(false);
    expect(stopped.finishDisabled).toBe(true);

    const running = buildGuitarSessionModel(
      store,
      TODAY,
      "2026-09-14T17:00:00.000Z",
      Date.parse("2026-09-14T18:01:02.000Z")
    );
    expect(running.status).toBe("Guitar session running · 1:01:02");
    expect(running.plan).toBe("Session is live. Stay with Rhythm and save the real result after.");
    expect(running.hint).toBe("Finish when you stop. If a Guitar task exists today, the time can land there.");
    expect(running.startDisabled).toBe(true);
    expect(running.finishDisabled).toBe(false);
  });

  it("uses shipped target fallbacks and safely ignores malformed session entries", () => {
    const malformedValues = [undefined, "", "0", "not-a-number"];
    malformedValues.forEach((value) => {
      const store: PlannerStore = value === undefined
        ? {}
        : { [GUITAR_TARGET_STORAGE_KEY]: value };
      expect(buildGuitarSessionModel(store, TODAY, null, 0).summary[0]?.value).toBe("0 / 4");
    });
    expect(buildGuitarSessionModel({
      [GUITAR_TARGET_STORAGE_KEY]: "-3"
    }, TODAY, null, 0).summary[0]?.value).toBe("0 / 1");

    const model = buildGuitarSessionModel({
      [GUITAR_SESSIONS_STORAGE_KEY]: JSON.stringify([
        null,
        "legacy-value",
        { finishedAt: "bad", durationHours: 4 },
        { finishedAt: "2026-09-14T10:00:00Z", note: { old: true }, durationHours: "bad" }
      ])
    }, TODAY, null, 0, "Saved message");
    expect(model.summary[0]?.value).toBe("1 / 4");
    expect(model.summary[2]?.value).toBe("0 min");
    expect(model.history).toEqual([{
      date: "Mon Sep 14",
      minutes: 0,
      note: "Saved session",
      title: ""
    }]);
    expect(model.hint).toBe("Saved message");
  });

  it("uses a Monday-Sunday week at the Sunday boundary", () => {
    const model = buildGuitarSessionModel({
      [GUITAR_SESSIONS_STORAGE_KEY]: JSON.stringify([
        { finishedAt: "2026-09-14T10:00:00Z", durationHours: 0.5 },
        { finishedAt: "2026-09-20T10:00:00Z", durationHours: 0.5 },
        { finishedAt: "2026-09-21T10:00:00Z", durationHours: 1 }
      ])
    }, new Date(2026, 8, 20), null, 0);

    expect(model.summary[0]?.value).toBe("2 / 4");
    expect(model.summary[2]?.value).toBe("60 min");
  });
});

describe("guitarSessionDurationMinutes", () => {
  it("rounds elapsed time and never returns less than one minute", () => {
    const start = "2026-09-14T17:00:00.000Z";
    expect(guitarSessionDurationMinutes(start, Date.parse("2026-09-14T17:00:10.000Z"))).toBe(1);
    expect(guitarSessionDurationMinutes(start, Date.parse("2026-09-14T17:29:31.000Z"))).toBe(30);
    expect(guitarSessionDurationMinutes("bad", Date.now())).toBe(1);
  });
});
