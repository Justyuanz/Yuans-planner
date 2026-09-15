import { isRecord } from "../../shared/is-record";
import { buildDashboardInsightModel, type DashboardInsightModel } from "./dashboard-insight";

export const DASHBOARD_INSIGHT_UPDATED_EVENT = "hive-planner-dashboard-insight-updated";

interface DashboardInsightBridge {
  applyAction: (actionId: string) => void;
  currentInsight: () => unknown;
  openHistory: () => void;
}

function bridgeForFrame(frame: HTMLIFrameElement): DashboardInsightBridge | null {
  const candidate: unknown = frame.contentWindow?.YuanPlannerDashboardInsightBridge;
  if (!isRecord(candidate)
    || typeof candidate.applyAction !== "function"
    || typeof candidate.currentInsight !== "function"
    || typeof candidate.openHistory !== "function") {
    return null;
  }
  return candidate as unknown as DashboardInsightBridge;
}

export function readDashboardInsight(frame: HTMLIFrameElement): DashboardInsightModel {
  const bridge = bridgeForFrame(frame);
  return buildDashboardInsightModel(bridge?.currentInsight());
}

export function applyDashboardInsightAction(frame: HTMLIFrameElement, actionId: string): void {
  bridgeForFrame(frame)?.applyAction(actionId);
}

export function openDashboardInsightHistory(frame: HTMLIFrameElement): void {
  bridgeForFrame(frame)?.openHistory();
}

declare global {
  interface Window {
    YuanPlannerDashboardInsightBridge?: unknown;
  }
}

