import { isRecord } from "../../shared/is-record";
import { buildPatternHistoryModel, type PatternHistoryModel } from "../pattern-history/pattern-history";

export const DASHBOARD_INSIGHT_UPDATED_EVENT = "hive-planner-dashboard-insight-updated";

interface DashboardInsightBridge {
  currentHistory?: () => unknown;
  undoAgentAction?: () => unknown;
}

function bridgeForFrame(frame: HTMLIFrameElement): DashboardInsightBridge | null {
  const candidate: unknown = frame.contentWindow?.YuanPlannerDashboardInsightBridge;
  if (!isRecord(candidate)) {
    return null;
  }
  return candidate;
}

export function readDashboardInsightHistory(
  frame: HTMLIFrameElement,
  currentDateKey: string
): PatternHistoryModel {
  const bridge = bridgeForFrame(frame);
  return buildPatternHistoryModel(bridge?.currentHistory?.(), currentDateKey);
}

export function undoDashboardAgentAction(frame: HTMLIFrameElement): void {
  bridgeForFrame(frame)?.undoAgentAction?.();
}

declare global {
  interface Window {
    YuanPlannerDashboardInsightBridge?: unknown;
  }
}
