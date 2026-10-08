export interface CalendarBridgeState {
  cursorDate: string;
  expandedDate: string;
  selectedDate: string;
}

export type CalendarNavigation =
  | { action: "edit-event"; eventId: string }
  | { action: "collapse-day" }
  | { action: "select-date"; date: string }
  | { action: "select-week-day"; date: string; expanded: boolean }
  | { action: "shift-week"; amount: -1 | 1 }
  | { action: "shift-month"; amount: -1 | 1 };

export const CALENDAR_NAVIGATE_EVENT = "hive-planner-calendar-navigate";
export const CALENDAR_STATE_EVENT = "hive-planner-calendar-state";

export function calendarBridgeStateFromEvent(event: Event): CalendarBridgeState | null {
  // Events created by the iframe have a different CustomEvent constructor.
  const detail: unknown = "detail" in event ? (event as CustomEvent<unknown>).detail : null;
  if (typeof detail !== "object" || detail === null) return null;
  const candidate = detail as Partial<CalendarBridgeState>;
  if (typeof candidate.cursorDate !== "string" || typeof candidate.expandedDate !== "string"
    || typeof candidate.selectedDate !== "string") return null;
  return {
    cursorDate: candidate.cursorDate,
    expandedDate: candidate.expandedDate,
    selectedDate: candidate.selectedDate
  };
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
