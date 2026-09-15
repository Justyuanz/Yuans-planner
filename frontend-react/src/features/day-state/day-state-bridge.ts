import { isRecord } from "../../shared/is-record";
import type { DayStateId } from "./day-state";

interface DayStateBridge {
  select: (state: DayStateId) => void;
}

function bridgeForFrame(frame: HTMLIFrameElement): DayStateBridge | null {
  const candidate: unknown = frame.contentWindow?.YuanPlannerDayStateBridge;
  if (!isRecord(candidate) || typeof candidate.select !== "function") {
    return null;
  }
  return candidate as unknown as DayStateBridge;
}

export function selectDayState(frame: HTMLIFrameElement, state: DayStateId): void {
  bridgeForFrame(frame)?.select(state);
}

declare global {
  interface Window {
    YuanPlannerDayStateBridge?: unknown;
  }
}
