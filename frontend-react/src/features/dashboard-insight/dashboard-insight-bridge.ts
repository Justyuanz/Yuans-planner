import { isRecord } from "../../shared/is-record";

export const DASHBOARD_INSIGHT_UPDATED_EVENT = "hive-planner-dashboard-insight-updated";

function bridgeForFrame(frame: HTMLIFrameElement): Record<string, unknown> | null {
  const candidate: unknown = frame.contentWindow?.YuanPlannerDashboardInsightBridge;
  if (!isRecord(candidate)) {
    return null;
  }
  return candidate;
}

function isCallable(value: unknown): value is () => unknown {
  return typeof value === "function";
}

export function undoDashboardAgentAction(frame: HTMLIFrameElement): void {
  const undoAgentAction = bridgeForFrame(frame)?.undoAgentAction;
  if (isCallable(undoAgentAction)) {
    undoAgentAction();
  }
}

declare global {
  interface Window {
    YuanPlannerDashboardInsightBridge?: unknown;
  }
}
