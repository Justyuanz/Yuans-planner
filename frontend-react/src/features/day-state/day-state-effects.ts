import type { DayStateId } from "./day-state";

export const DAY_STATE_EFFECTS_EVENT = "hive-planner-day-state-effects";

export function refreshLegacyDayStateEffects(
  frame: HTMLIFrameElement,
  dateKey: string,
  state: DayStateId
): void {
  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument;
  if (frameWindow === null || frameDocument === null) {
    return;
  }

  // Create the event in the iframe realm so native EventTarget checks accept it.
  const event = frameDocument.createEvent("CustomEvent");
  event.initCustomEvent(DAY_STATE_EFFECTS_EVENT, false, false, { dateKey, state });
  frameWindow.dispatchEvent(event);
}
