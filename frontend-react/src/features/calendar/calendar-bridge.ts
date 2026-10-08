export interface CalendarBridgeState {
  cursorDate: string;
  selectedDate: string;
}

export type CalendarNavigation =
  | { action: "edit-event"; eventId: string }
  | { action: "select-date"; date: string }
  | { action: "shift-month"; amount: -1 | 1 };

export const CALENDAR_NAVIGATE_EVENT = "hive-planner-calendar-navigate";
export const CALENDAR_STATE_EVENT = "hive-planner-calendar-state";

export function calendarBridgeStateFromEvent(event: Event): CalendarBridgeState | null {
  // Events created by the iframe have a different CustomEvent constructor.
  const detail: unknown = "detail" in event ? (event as CustomEvent<unknown>).detail : null;
  if (typeof detail !== "object" || detail === null) return null;
  const candidate = detail as Partial<CalendarBridgeState>;
  if (typeof candidate.cursorDate !== "string" || typeof candidate.selectedDate !== "string") return null;
  return { cursorDate: candidate.cursorDate, selectedDate: candidate.selectedDate };
}

export function dispatchCalendarNavigation(
  frame: HTMLIFrameElement,
  detail: CalendarNavigation
): void {
  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument;
  if (frameWindow === null || frameDocument === null) return;
  const event = frameDocument.createEvent("CustomEvent");
  event.initCustomEvent(CALENDAR_NAVIGATE_EVENT, false, false, detail);
  frameWindow.dispatchEvent(event);
}
