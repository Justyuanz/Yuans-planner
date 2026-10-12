import { describe, expect, it } from "vitest";

import type { PlannerStore } from "../../../../api/planner-store";
import {
  buildMeditation,
  cancelMeditation,
  finishMeditation,
  MEDITATION_STORAGE_KEY,
  startMeditation
} from "./meditation";

const SELECTED_DATE = "2026-09-14";
const NOW_MS = new Date("2026-09-14T09:00:00.000Z").getTime();

function storedState(store: PlannerStore): Record<string, unknown> {
  return JSON.parse(store[MEDITATION_STORAGE_KEY] ?? "{}") as Record<string, unknown>;
}

describe("Meditation model", () => {
  it("renders the legacy ready state for missing and malformed data", () => {
    expect(buildMeditation({}, SELECTED_DATE, NOW_MS)).toEqual({
      active: false,
      countdown: "Ready",
      savedMinutes: 0,
      status: "0 min saved for Mon Sep 14."
    });
    expect(buildMeditation({ [MEDITATION_STORAGE_KEY]: "bad-json" }, SELECTED_DATE, NOW_MS))
      .toEqual(buildMeditation({}, SELECTED_DATE, NOW_MS));
    expect(buildMeditation({ [MEDITATION_STORAGE_KEY]: "[]" }, SELECTED_DATE, NOW_MS))
      .toEqual(buildMeditation({}, SELECTED_DATE, NOW_MS));
    expect(buildMeditation({
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: { id: "bad", minutes: 10, dateKey: SELECTED_DATE, startedAt: 1e30, endsAt: 1e30 },
        sessions: []
      })
    }, SELECTED_DATE, NOW_MS)).toEqual(buildMeditation({}, SELECTED_DATE, NOW_MS));
  });

  it("counts only standalone finished sessions on the selected date", () => {
    const store = {
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: null,
        sessions: [
          { dateKey: SELECTED_DATE, durationHours: 0.25, finishedAt: "2026-09-14T08:00:00Z" },
          { dateKey: SELECTED_DATE, durationHours: 2, finishedAt: "2026-09-14T09:00:00Z", trackedInTask: true },
          { dateKey: SELECTED_DATE, durationHours: -1, finishedAt: "2026-09-14T10:00:00Z" },
          { dateKey: "2026-09-13", durationHours: 0.5, finishedAt: "2026-09-13T08:00:00Z" },
          { dateKey: SELECTED_DATE, durationHours: 1 }
        ]
      })
    };

    expect(buildMeditation(store, SELECTED_DATE, NOW_MS).savedMinutes).toBe(15);
    expect(buildMeditation(store, "2026-09-13", NOW_MS).status)
      .toBe("30 min saved for Sun Sep 13.");
  });

  it("formats active countdowns with the legacy ceiling and timer shape", () => {
    const store = {
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: { id: "active", minutes: 62, dateKey: SELECTED_DATE, startedAt: NOW_MS, endsAt: NOW_MS + 3_601_000 },
        sessions: []
      })
    };

    expect(buildMeditation(store, SELECTED_DATE, NOW_MS).countdown).toBe("1:00:01");
    expect(buildMeditation(store, SELECTED_DATE, NOW_MS + 3_600_001).countdown).toBe("0:01");
  });
});

describe("Meditation persistence", () => {
  it("starts only whole 1–180 minute timers and preserves compatible fields", () => {
    const store: PlannerStore = {
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: null,
        futureRoot: { preserve: true },
        sessions: [{ id: "old", futureSession: true }]
      })
    };

    expect(startMeditation(store, "0", NOW_MS, "new")).toBeNull();
    expect(startMeditation(store, "1.5", NOW_MS, "new")).toBeNull();
    expect(startMeditation(store, "181", NOW_MS, "new")).toBeNull();
    const update = startMeditation(store, "10", NOW_MS, "new");
    expect(update).not.toBeNull();
    expect(storedState(update?.nextStore ?? {})).toEqual({
      active: {
        id: "new",
        minutes: 10,
        dateKey: SELECTED_DATE,
        startedAt: NOW_MS,
        endsAt: NOW_MS + 600_000
      },
      futureRoot: { preserve: true },
      sessions: [{ id: "old", futureSession: true }]
    });
    expect(update?.write.key).toBe(MEDITATION_STORAGE_KEY);
  });

  it("cancels without changing sessions or unknown root fields", () => {
    const store: PlannerStore = {
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: { id: "active", minutes: 10 },
        futureRoot: true,
        sessions: [{ id: "old", futureSession: true }]
      })
    };

    const update = cancelMeditation(store);
    expect(storedState(update.nextStore)).toEqual({
      active: null,
      futureRoot: true,
      sessions: [{ id: "old", futureSession: true }]
    });
  });

  it("finishes an expired timer exactly once using the legacy compact document", () => {
    const store: PlannerStore = {
      [MEDITATION_STORAGE_KEY]: JSON.stringify({
        active: {
          id: "active",
          dateKey: SELECTED_DATE,
          minutes: 15,
          startedAt: NOW_MS - 900_000,
          endsAt: NOW_MS
        },
        futureRoot: "legacy completion removes this",
        sessions: [{ id: "old", futureSession: true }]
      })
    };

    expect(finishMeditation(store, NOW_MS - 1)).toBeNull();
    const update = finishMeditation(store, NOW_MS);
    expect(update).not.toBeNull();
    expect(storedState(update?.nextStore ?? {})).toEqual({
      active: null,
      sessions: [
        { id: "old", futureSession: true },
        {
          id: "active",
          dateKey: SELECTED_DATE,
          startedAt: "2026-09-14T08:45:00.000Z",
          finishedAt: "2026-09-14T09:00:00.000Z",
          durationHours: 0.25
        }
      ]
    });
    expect(finishMeditation(update?.nextStore ?? {}, NOW_MS + 1)).toBeNull();
  });
});
