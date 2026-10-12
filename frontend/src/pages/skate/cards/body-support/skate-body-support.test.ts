import { describe, expect, it } from "vitest";

import {
  BODY_SUPPORT_STORAGE_KEY,
  buildBodySupportModel,
  buildBodySupportUpdate,
  decodeBodySupportLogs
} from "./skate-body-support";

describe("Skate body support model", () => {
  it("aggregates the current Monday-Sunday week with legacy status and sorting rules", () => {
    const store = {
      [BODY_SUPPORT_STORAGE_KEY]: JSON.stringify([
        { date: "2026-09-14", kind: "gym", minutes: 30, name: "Gym", note: "Leg day", status: "done" },
        { date: "2026-09-15", kind: "GYM", minutes: "15", name: "Gym", note: "Second note", status: "modified" },
        { date: "2026-09-16", kind: "yoga", minutes: 20, name: "Yoga", status: "skipped" },
        { date: "2026-09-17", kind: "yoga", minutes: 25, name: "Yoga", status: "unexpected" },
        { date: "2026-09-18", kind: "recovery", minutes: -20, name: "Recovery", status: "done" },
        { date: "2026-09-19", kind: "mystery", minutes: 5, name: "Mystery", status: "done" },
        { date: "2026-09-20", kind: 42, minutes: 5, name: "Gym", status: "done" },
        { date: "2026-09-13", kind: "stretch", minutes: 10, name: "Stretch", status: "done" },
        { date: "invalid", kind: "walk", minutes: 10, name: "Walk", status: "done" },
        null
      ])
    };

    expect(buildBodySupportModel(store, new Date(2026, 8, 14))).toEqual({
      metrics: [
        { count: 2, label: "Gym", minutesLabel: "45 min", note: "Leg day" },
        { count: 2, label: "Other", minutesLabel: "10 min", note: "" },
        { count: 1, label: "Recovery", minutesLabel: "Logged", note: "" },
        { count: 1, label: "Yoga", minutesLabel: "25 min", note: "" }
      ],
      weekLabel: "2026-W38"
    });
  });

  it("handles missing and malformed stored data without inventing metrics", () => {
    expect(buildBodySupportModel({}, new Date(2026, 8, 14)).metrics).toEqual([]);
    expect(buildBodySupportModel({
      [BODY_SUPPORT_STORAGE_KEY]: "not json"
    }, new Date(2026, 8, 14)).metrics).toEqual([]);
    expect(decodeBodySupportLogs(JSON.stringify({ date: "2026-09-14" }))).toEqual([]);
  });

  it("appends a normalized log while preserving compatible unknown stored entries", () => {
    const store = {
      [BODY_SUPPORT_STORAGE_KEY]: JSON.stringify([
        { date: "2026-09-13", name: "Legacy", unknown: { keep: true } },
        "unrecognized-but-preserved"
      ]),
      "hivePlanner.unknown": "keep"
    };
    const update = buildBodySupportUpdate(store, {
      minutes: "-5",
      note: "  ankle mobility  ",
      type: "unknown"
    }, new Date(2026, 8, 14), {
      id: "body-test",
      timestamp: "2026-09-14T12:00:00.000Z"
    });

    expect(update.write.key).toBe(BODY_SUPPORT_STORAGE_KEY);
    expect(JSON.parse(update.write.value)).toEqual([
      { date: "2026-09-13", name: "Legacy", unknown: { keep: true } },
      "unrecognized-but-preserved",
      {
        createdAt: "2026-09-14T12:00:00.000Z",
        date: "2026-09-14",
        id: "body-test",
        kind: "other",
        minutes: 0,
        name: "Other",
        note: "ankle mobility",
        score: 0,
        status: "done"
      }
    ]);
    expect(update.nextStore["hivePlanner.unknown"]).toBe("keep");
  });
});
