import { describe, expect, it } from "vitest";

import type { PlannerStore } from "@/api/planner-store";
import { GUITAR_FOCUS_STORAGE_KEY, GUITAR_NEXT_STEP_STORAGE_KEY } from "../goal/guitar-goal";
import { buildGuitarSessionSave } from "./guitar-session-persistence";
import { GUITAR_SESSIONS_STORAGE_KEY } from "./guitar-session";

const TODAY_KEY = "2026-09-14";
const TASK_KEY = `hivePlanner.dailyTasks.${TODAY_KEY}`;

function writtenValue(result: ReturnType<typeof buildGuitarSessionSave>, key: string): unknown {
  const write = result.writes.find((candidate) => candidate.key === key);
  return write === undefined ? undefined : JSON.parse(write.value);
}

describe("buildGuitarSessionSave", () => {
  it("appends a compatible session and updates a task without dropping unknown fields", () => {
    const store: PlannerStore = {
      [GUITAR_FOCUS_STORAGE_KEY]: "Arpeggios",
      [GUITAR_NEXT_STEP_STORAGE_KEY]: "Play bar 8 slowly",
      [GUITAR_SESSIONS_STORAGE_KEY]: JSON.stringify([
        null,
        "legacy-session",
        { id: "older", futureSessionField: { preserve: true } }
      ]),
      [TASK_KEY]: JSON.stringify([{
        activity: "guitar",
        done: false,
        futureTaskField: { preserve: true },
        hours: 0.25,
        id: "guitar-task",
        label: "Guitar practice",
        timerSeconds: 900,
        timerStartedAt: null
      }])
    };

    const result = buildGuitarSessionSave(store, {
      durationMinutes: 30,
      note: "  Cleaner transition  "
    }, {
      nowIso: "2026-09-14T18:00:00.000Z",
      sessionId: "guitar-new",
      sessionStartedAt: "2026-09-14T17:30:00.000Z",
      todayKey: TODAY_KEY
    });

    expect(result.linkedTaskLabel).toBe("Guitar practice");
    expect(result.message).toBe('Session saved and added to "Guitar practice".');
    expect(result.writes.map(({ key }) => key)).toEqual([TASK_KEY, GUITAR_SESSIONS_STORAGE_KEY]);
    expect(result.savedSession).toEqual({
      id: "guitar-new",
      focus: "Arpeggios",
      nextStep: "Play bar 8 slowly",
      note: "Cleaner transition",
      durationHours: 0.5,
      trackedInTask: true,
      startedAt: "2026-09-14T17:30:00.000Z",
      finishedAt: "2026-09-14T18:00:00.000Z"
    });
    expect(writtenValue(result, GUITAR_SESSIONS_STORAGE_KEY)).toEqual([
      null,
      "legacy-session",
      { id: "older", futureSessionField: { preserve: true } },
      result.savedSession
    ]);
    expect(writtenValue(result, TASK_KEY)).toEqual([expect.objectContaining({
      done: true,
      futureTaskField: { preserve: true },
      hours: 0.75,
      timerSeconds: 2700,
      timerStartedAt: null
    })]);
  });

  it("recovers from malformed documents and creates the shipped default task", () => {
    const result = buildGuitarSessionSave({
      [GUITAR_SESSIONS_STORAGE_KEY]: "not-json",
      [TASK_KEY]: "{}"
    }, {
      durationMinutes: 0,
      note: ""
    }, {
      nowIso: "2026-09-14T18:00:00.000Z",
      sessionId: "guitar-generated",
      sessionStartedAt: "2026-09-14T17:30:00.000Z",
      todayKey: TODAY_KEY
    });

    expect(result.savedSession).toMatchObject({
      durationHours: 0.5,
      focus: "",
      nextStep: "",
      trackedInTask: true
    });
    expect(result.linkedTaskLabel).toBe("Saved session");
    expect(writtenValue(result, TASK_KEY)).toEqual([expect.objectContaining({
      activity: "guitar",
      done: true,
      hours: 0.5,
      label: "Saved session",
      timerSeconds: 1800
    })]);
  });
});
