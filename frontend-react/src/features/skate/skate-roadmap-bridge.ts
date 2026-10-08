import type { SkateRoadmapLogRequest } from "./skate-roadmap";

export const SKATE_ROADMAP_ACTION_EVENT = "hive-planner-skate-roadmap-action";

export function dispatchSkateRoadmapLog(
  frame: HTMLIFrameElement,
  request: SkateRoadmapLogRequest
): void {
  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (frameDocument === null || frameWindow === null) return;
  const event = frameDocument.createEvent("CustomEvent");
  event.initCustomEvent(SKATE_ROADMAP_ACTION_EVENT, false, false, {
    action: "log-date",
    ...request
  });
  frameWindow.dispatchEvent(event);
}
