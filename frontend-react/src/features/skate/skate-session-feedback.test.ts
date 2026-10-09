import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../api/planner-store";
import {
  SKATE_COACH_TEMPLATE_STORAGE_KEY,
  SKATE_CURRENT_SESSION_STORAGE_KEY,
  SKATE_SETTINGS_STORAGE_KEY,
  buildSkateSessionSave,
  feedbackIntensityForDate
} from "./skate-session-feedback";
import { SKATE_SESSIONS_STORAGE_KEY } from "./skate-roadmap";

const TODAY_KEY = "2026-09-14";
const TASK_KEY = `hivePlanner.dailyTasks.${TODAY_KEY}`;

function writeValue(result: ReturnType<typeof buildSkateSessionSave>, key: string): unknown {
  const write = result.writes.find((candidate) => candidate.key === key);
  return write === undefined ? undefined : JSON.parse(write.value);
}

const hero = {
  attemptBudget: "10-20 focused attempts",
  benchmarkLabel: "Day 15 benchmark",
  benchmarkVisible: true,
  blockLabel: "Day 15",
  flowFocus: "Choose one direction today.",
  mainFocus: "Benchmark first, then 180."
};

describe("feedbackIntensityForDate", () => {
  it("prefers a date setting, then the latest saved session, then today's hero choice", () => {
    const store: PlannerStore = {
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        intensityByDate: { "2026-09-12": "blue" }
      }),
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T10:00:00Z", intensity: "blue" },
        { dateKey: "2026-09-13", finishedAt: "2026-09-13T12:00:00Z", intensity: "green" }
      ])
    };

    expect(feedbackIntensityForDate(store, "2026-09-12", TODAY_KEY, "green")).toBe("blue");
    expect(feedbackIntensityForDate(store, "2026-09-13", TODAY_KEY, "blue")).toBe("green");
    expect(feedbackIntensityForDate(store, TODAY_KEY, TODAY_KEY, "blue")).toBe("blue");
    expect(feedbackIntensityForDate(store, "2026-09-11", TODAY_KEY, "green")).toBe("yellow");
  });

  it("ignores malformed settings, sessions, dates, and intensities", () => {
    expect(feedbackIntensityForDate({
      [SKATE_SETTINGS_STORAGE_KEY]: "not json",
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([
        null,
        { dateKey: "not-a-date", finishedAt: "bad", intensity: "green" },
        { dateKey: TODAY_KEY, finishedAt: "2026-09-14T12:00:00Z", intensity: "purple" }
      ])
    }, TODAY_KEY, TODAY_KEY, "purple")).toBe("yellow");
  });
});

describe("buildSkateSessionSave", () => {
  it("saves complete feedback, finishes today's matching task, and preserves compatibility fields", () => {
    const store: PlannerStore = {
      [TASK_KEY]: JSON.stringify([{
        activity: "skate",
        done: false,
        hours: 0.25,
        id: "task-skate",
        label: "Evening skate",
        legacyTaskField: "keep",
        timerSeconds: 900,
        timerStartedAt: null
      }]),
      [SKATE_SESSIONS_STORAGE_KEY]: JSON.stringify([{ id: "old", legacySessionField: "keep" }]),
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 15,
        intensityByDate: { "2026-09-13": "blue" },
        unknownSetting: "keep"
      }),
      [SKATE_COACH_TEMPLATE_STORAGE_KEY]: JSON.stringify({
        warmupGroups: [{
          title: "Custom",
          items: [{ id: "custom-warmup", name: "Custom warmup", target: "x2", extra: "keep" }]
        }],
        focusSuggestions: { flat: ["Custom flat"], transition: ["Custom transition"] },
        skillBuilder: { switchItems: ["Custom switch"] }
      }),
      [SKATE_CURRENT_SESSION_STORAGE_KEY]: JSON.stringify({
        expandedStage: "skill",
        focusCards: {
          flat: { goals: [true, false, true], note: "Flat note", status: "learning" },
          transition: { goals: [false, true, false], note: "Transition note", status: "almost-there" }
        },
        plannedIntensity: "blue",
        selectedFlat: "Kickflip",
        selectedTransition: "Axle stall",
        skillChecks: [true],
        warmupChecks: { "custom-warmup": true }
      })
    };

    const result = buildSkateSessionSave(store, {
      confidence: 5,
      dateKey: TODAY_KEY,
      durationMinutes: 45,
      improvedNote: "Cleaner shoulders",
      intensity: "green",
      nextFocusNote: "Commit earlier",
      progressToday: 4
    }, {
      hero,
      nowIso: "2026-09-14T18:00:00.000Z",
      sessionId: "skate-new",
      sessionStartedAt: "2026-09-14T17:10:00.000Z",
      todayKey: TODAY_KEY
    });

    expect(result.linkedTaskLabel).toBe("Evening skate");
    expect(result.message).toBe('Session saved and added to "Evening skate".');
    expect(result.writes.map(({ key }) => key)).toEqual([
      TASK_KEY,
      SKATE_SETTINGS_STORAGE_KEY,
      SKATE_CURRENT_SESSION_STORAGE_KEY,
      SKATE_SESSIONS_STORAGE_KEY
    ]);
    expect(result.savedSession).toMatchObject({
      attemptBudget: hero.attemptBudget,
      benchmarkDone: true,
      benchmarkLabel: hero.benchmarkLabel,
      checked: [true],
      confidence: 5,
      dateKey: TODAY_KEY,
      durationHours: 0.75,
      feedbackNote: "Cleaner shoulders | Commit earlier",
      finishedAt: "2026-09-14T18:00:00.000Z",
      flowFocus: hero.flowFocus,
      focus: "Kickflip · Axle stall",
      id: "skate-new",
      improvedNote: "Cleaner shoulders",
      intensity: "green",
      mainFocus: hero.mainFocus,
      nextFocusNote: "Commit earlier",
      note: "Flat note | Transition note",
      progressToday: 4,
      skateQuality: 4,
      startedAt: "2026-09-14T17:10:00.000Z",
      trackedInTask: true,
      warmups: "Custom warmup"
    });

    expect(writeValue(result, SKATE_SESSIONS_STORAGE_KEY)).toEqual([
      { id: "old", legacySessionField: "keep" },
      result.savedSession
    ]);
    expect(writeValue(result, SKATE_SETTINGS_STORAGE_KEY)).toEqual({
      currentProgramDay: 15,
      intensityByDate: { "2026-09-13": "blue", [TODAY_KEY]: "green" },
      unknownSetting: "keep"
    });
    expect(writeValue(result, TASK_KEY)).toEqual([expect.objectContaining({
      done: true,
      hours: 1,
      legacyTaskField: "keep",
      timerSeconds: 3600,
      timerStartedAt: null
    })]);
    expect(writeValue(result, SKATE_CURRENT_SESSION_STORAGE_KEY)).toMatchObject({
      expandedStage: "warmup",
      plannedIntensity: "yellow",
      selectedFlat: "Custom flat",
      selectedTransition: "Custom transition",
      skillChecks: [false],
      warmupChecks: { "custom-warmup": false }
    });
  });

  it("uses a dated UTC window for retroactive logs and never edits a past task", () => {
    const retroTaskKey = "hivePlanner.dailyTasks.2026-09-02";
    const result = buildSkateSessionSave({
      [retroTaskKey]: JSON.stringify([{ activity: "skate", done: false, label: "Past skate" }])
    }, {
      confidence: 0,
      dateKey: "2026-09-02",
      durationMinutes: 35,
      improvedNote: "  ",
      intensity: "blue",
      nextFocusNote: " Next try ",
      progressToday: 99
    }, {
      hero,
      nowIso: "2026-09-14T18:00:00.000Z",
      sessionId: "retro",
      sessionStartedAt: "2026-09-14T17:00:00.000Z",
      todayKey: TODAY_KEY
    });

    expect(result.writes.some(({ key }) => key === retroTaskKey)).toBe(false);
    expect(result.linkedTaskLabel).toBeNull();
    expect(result.message).toBe("Session saved for Wed Sep 2.");
    expect(result.savedSession).toMatchObject({
      confidence: 3,
      dateKey: "2026-09-02",
      durationHours: 35 / 60,
      finishedAt: "2026-09-02T12:00:00.000Z",
      improvedNote: "",
      nextFocusNote: "Next try",
      progressToday: 5,
      startedAt: "2026-09-02T11:25:00.000Z",
      trackedInTask: false
    });
  });

  it("creates today's Skate task and recovers from malformed stored documents", () => {
    const result = buildSkateSessionSave({
      [TASK_KEY]: "not json",
      [SKATE_SESSIONS_STORAGE_KEY]: "{}",
      [SKATE_SETTINGS_STORAGE_KEY]: "[]",
      [SKATE_COACH_TEMPLATE_STORAGE_KEY]: "not json",
      [SKATE_CURRENT_SESSION_STORAGE_KEY]: "null"
    }, {
      confidence: Number.NaN,
      dateKey: "bad",
      durationMinutes: 0,
      improvedNote: "",
      intensity: "purple",
      nextFocusNote: "",
      progressToday: Number.NaN
    }, {
      hero,
      nowIso: "2026-09-14T18:00:00.000Z",
      sessionId: "generated",
      sessionStartedAt: null,
      todayKey: TODAY_KEY
    });

    expect(result.savedSession).toMatchObject({
      confidence: 3,
      dateKey: TODAY_KEY,
      durationHours: 0.75,
      intensity: "yellow",
      progressToday: 3,
      trackedInTask: true
    });
    expect(writeValue(result, TASK_KEY)).toEqual([expect.objectContaining({
      activity: "skate",
      done: true,
      hours: 0.75,
      label: "Skate session",
      timerSeconds: 2700
    })]);
  });
});
