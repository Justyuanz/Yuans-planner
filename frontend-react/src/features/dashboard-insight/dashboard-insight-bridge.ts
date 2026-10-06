import { isRecord } from "../../shared/is-record";
import { buildDashboardInsightModel, type DashboardInsightModel } from "./dashboard-insight";
import {
  deriveDashboardInsights,
  selectTopDashboardInsight
} from "./dashboard-insight-rules";
import { buildPatternHistoryModel, type PatternHistoryModel } from "../pattern-history/pattern-history";

export const DASHBOARD_INSIGHT_UPDATED_EVENT = "hive-planner-dashboard-insight-updated";

interface DashboardInsightBridge {
  currentHistory?: () => unknown;
  currentMetrics: () => unknown;
  undoAgentAction?: () => unknown;
}

function bridgeForFrame(frame: HTMLIFrameElement): DashboardInsightBridge | null {
  const candidate: unknown = frame.contentWindow?.YuanPlannerDashboardInsightBridge;
  if (!isRecord(candidate)
    || typeof candidate.currentMetrics !== "function") {
    return null;
  }
  return candidate as unknown as DashboardInsightBridge;
}

export function readDashboardInsight(frame: HTMLIFrameElement): DashboardInsightModel {
  const bridge = bridgeForFrame(frame);
  const insights = deriveDashboardInsights(bridge?.currentMetrics());
  return buildDashboardInsightModel(selectTopDashboardInsight(insights));
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
