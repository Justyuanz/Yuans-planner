import { describe, expect, it } from "vitest";

import {
  buildMascotPositionWrite,
  decodeMascotPosition,
  moveMascotDrag,
  type MascotDragStart
} from "./mascot-position";

describe("decodeMascotPosition", () => {
  it("restores legacy numeric and numeric-string coordinates", () => {
    expect(decodeMascotPosition('{"x":"18.5","y":-12}')).toEqual({ x: 18.5, y: -12 });
  });

  it.each([undefined, "", "not-json", "null", "[]"])(
    "uses the origin for malformed compatibility data: %s",
    (value) => {
      expect(decodeMascotPosition(value)).toEqual({ x: 0, y: 0 });
    }
  );
});

describe("moveMascotDrag", () => {
  const start: MascotDragStart = {
    moved: false,
    pointerId: 7,
    pointerX: 100,
    pointerY: 80,
    positionX: 15,
    positionY: -10
  };

  it("adds pointer movement to the position where the drag began", () => {
    expect(moveMascotDrag(start, { x: 124, y: 94 })).toEqual({
      moved: true,
      position: { x: 39, y: 4 }
    });
  });

  it("crosses the click-suppression boundary only above five total pixels", () => {
    expect(moveMascotDrag(start, { x: 103, y: 82 }).moved).toBe(false);
    expect(moveMascotDrag(start, { x: 104, y: 82 }).moved).toBe(true);
    expect(moveMascotDrag({ ...start, moved: true }, { x: 100, y: 80 }).moved).toBe(true);
  });
});

describe("buildMascotPositionWrite", () => {
  it("writes the exact legacy storage key and document shape", () => {
    expect(buildMascotPositionWrite({ x: 39, y: 4 })).toEqual({
      key: "hivePlanner.mascot.position",
      value: '{"x":39,"y":4}'
    });
  });
});
