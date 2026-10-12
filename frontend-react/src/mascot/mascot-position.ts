import type { PlannerStoreWrite } from "../api/planner-store";
import { isRecord } from "../shared/is-record";

export const MASCOT_POSITION_STORAGE_KEY = "hivePlanner.mascot.position";

export interface MascotPosition {
  x: number;
  y: number;
}

export interface MascotDragStart {
  moved: boolean;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface MascotDragMove {
  moved: boolean;
  position: MascotPosition;
}

const ORIGIN: MascotPosition = { x: 0, y: 0 };

function legacyCoordinate(value: unknown): number {
  const coordinate = Number(value);
  return coordinate || 0;
}

export function decodeMascotPosition(value: string | undefined): MascotPosition {
  if (!value) return { ...ORIGIN };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return { ...ORIGIN };
    return {
      x: legacyCoordinate(parsed.x),
      y: legacyCoordinate(parsed.y)
    };
  } catch {
    return { ...ORIGIN };
  }
}

export function moveMascotDrag(
  start: MascotDragStart,
  pointer: PointerPosition
): MascotDragMove {
  const position = {
    x: start.positionX + pointer.x - start.pointerX,
    y: start.positionY + pointer.y - start.pointerY
  };
  const distance = Math.abs(position.x - start.positionX) + Math.abs(position.y - start.positionY);
  return {
    moved: start.moved || distance > 5,
    position
  };
}

export function buildMascotPositionWrite(position: MascotPosition): PlannerStoreWrite {
  return {
    key: MASCOT_POSITION_STORAGE_KEY,
    value: JSON.stringify(position)
  };
}
