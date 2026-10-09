import { describe, expect, it } from "vitest";

import {
  buildGuitarGoalModel,
  buildGuitarGoalWrite,
  GUITAR_FOCUS_STORAGE_KEY,
  GUITAR_NEXT_STEP_STORAGE_KEY
} from "./guitar-goal";

describe("buildGuitarGoalModel", () => {
  it("reads the two legacy text values without normalizing them", () => {
    expect(buildGuitarGoalModel({
      [GUITAR_FOCUS_STORAGE_KEY]: "  Barre chords  ",
      [GUITAR_NEXT_STEP_STORAGE_KEY]: "F to C, five clean repeats"
    })).toEqual({
      focus: "  Barre chords  ",
      nextStep: "F to C, five clean repeats"
    });
  });

  it("uses empty values when either legacy key is missing", () => {
    expect(buildGuitarGoalModel({})).toEqual({ focus: "", nextStep: "" });
  });
});

describe("buildGuitarGoalWrite", () => {
  it("maps each field to its compatibility key", () => {
    expect(buildGuitarGoalWrite("focus", "Rhythm")).toEqual({
      key: GUITAR_FOCUS_STORAGE_KEY,
      value: "Rhythm"
    });
    expect(buildGuitarGoalWrite("nextStep", "  Keep spaces  ")).toEqual({
      key: GUITAR_NEXT_STEP_STORAGE_KEY,
      value: "  Keep spaces  "
    });
  });
});
