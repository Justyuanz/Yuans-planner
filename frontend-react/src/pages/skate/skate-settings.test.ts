import { describe, expect, it } from "vitest";

import {
  buildSkateSettingsWrites,
  SKATE_CURRENT_SESSION_STORAGE_KEY,
  SKATE_SETTINGS_STORAGE_KEY
} from "./skate-settings";

describe("Skate settings persistence", () => {
  it("preserves compatible fields while synchronizing intensity to the current session", () => {
    const writes = buildSkateSettingsWrites({
      [SKATE_CURRENT_SESSION_STORAGE_KEY]: JSON.stringify({ customSession: true, plannedIntensity: "blue" }),
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 15,
        customSetting: "keep",
        extraRestDayOfWeek: null,
        intensityByDate: { "2026-09-13": "blue", custom: "keep" },
        restDayOfWeek: 0
      })
    }, "2026-09-14", { action: "set-intensity", value: "green" });

    expect(writes).toHaveLength(2);
    expect(JSON.parse(writes[0]!.value)).toEqual({
      currentProgramDay: 15,
      customSetting: "keep",
      extraRestDayOfWeek: null,
      intensityByDate: {
        "2026-09-13": "blue",
        "2026-09-14": "green",
        custom: "keep"
      },
      restDayOfWeek: 0
    });
    expect(JSON.parse(writes[1]!.value)).toEqual({
      customSession: true,
      plannedIntensity: "green"
    });
  });

  it("clamps program days and removes an extra rest day that duplicates the primary", () => {
    const store = {
      [SKATE_SETTINGS_STORAGE_KEY]: JSON.stringify({
        currentProgramDay: 15,
        extraRestDayOfWeek: 2,
        restDayOfWeek: 0,
        untouched: 1
      })
    };

    const restWrite = buildSkateSettingsWrites(
      store,
      "2026-09-14",
      { action: "set-rest-day", value: "2" }
    )[0]!;
    const lowDayWrite = buildSkateSettingsWrites(
      store,
      "2026-09-14",
      { action: "set-current-day", value: "" }
    )[0]!;
    const highDayWrite = buildSkateSettingsWrites(
      store,
      "2026-09-14",
      { action: "set-current-day", value: "999" }
    )[0]!;

    expect(JSON.parse(restWrite.value)).toMatchObject({
      extraRestDayOfWeek: null,
      restDayOfWeek: 2,
      untouched: 1
    });
    expect(JSON.parse(lowDayWrite.value) as unknown).toEqual(expect.objectContaining({
      currentProgramDay: 1
    }));
    expect(JSON.parse(highDayWrite.value) as unknown).toEqual(expect.objectContaining({
      currentProgramDay: 60
    }));
  });

  it("normalizes invalid extra rest-day choices against the current primary day", () => {
    const write = buildSkateSettingsWrites({
      [SKATE_SETTINGS_STORAGE_KEY]: "not json"
    }, "2026-09-14", { action: "set-extra-rest-day", value: "0" })[0]!;

    expect(JSON.parse(write.value)).toEqual({
      currentProgramDay: 1,
      extraRestDayOfWeek: null,
      intensityByDate: {},
      restDayOfWeek: 0
    });
  });
});
