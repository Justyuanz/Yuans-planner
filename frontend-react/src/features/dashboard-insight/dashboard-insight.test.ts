import { describe, expect, it } from "vitest";

import { buildDashboardInsightModel } from "./dashboard-insight";
import {
  applyDashboardInsightAction,
  type DashboardInsightActionTarget
} from "./dashboard-insight-actions";

function actionTarget() {
  const calls: string[] = [];
  const target: DashboardInsightActionTarget = {
    focusTodayTaskInput: () => calls.push("focus"),
    openMoneyView: () => calls.push("money"),
    scrollToPlannedHours: () => calls.push("planned")
  };
  return { calls, target };
}

describe("buildDashboardInsightModel", () => {
  it("preserves the legacy quiet state when there is no strong insight", () => {
    expect(buildDashboardInsightModel(null)).toEqual({
      actions: [],
      modeText: "quiet mode",
      title: "No strong pattern needs attention yet.",
      why: "This space will surface patterns when your recent planner data shows something clear, but right now nothing looks urgent or obviously off-track."
    });
  });

  it("formats a valid insight and keeps only two valid actions", () => {
    expect(buildDashboardInsightModel({
      id: "task_overpacking",
      mode: "reality",
      priority: 90,
      sampleSize: 4,
      title: "Today may be holding more tasks than you usually finish.",
      why: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
      actions: [
        { id: "focus_today_tasks", label: "Focus today's tasks" },
        { id: "review_planned_hours", label: "Review planned hours" },
        { id: "ignored", label: "Ignored third action" }
      ]
    })).toEqual({
      actions: [
        { id: "focus_today_tasks", label: "Focus today's tasks" },
        { id: "review_planned_hours", label: "Review planned hours" }
      ],
      modeText: "reality · 4 days",
      title: "Today may be holding more tasks than you usually finish.",
      why: "You planned 4 tasks today, while your recent completion average is 1 tasks."
    });
  });

  it("falls back safely when the bridge returns a malformed insight", () => {
    expect(buildDashboardInsightModel({
      mode: "reality",
      sampleSize: "not-a-number",
      title: "",
      why: "Missing a title",
      actions: [{ id: "focus_today_tasks" }]
    })).toEqual(buildDashboardInsightModel(undefined));
  });
});

describe("applyDashboardInsightAction", () => {
  it.each([
    ["focus_today_tasks", "focus"],
    ["make_one_task_concrete", "focus"],
    ["review_planned_hours", "planned"],
    ["open_money_view", "money"],
    ["pause_extra_spending", "money"]
  ])("routes %s through the matching React action", (actionId, expectedCall) => {
    const { calls, target } = actionTarget();

    expect(applyDashboardInsightAction(target, actionId)).toBe(true);
    expect(calls).toEqual([expectedCall]);
  });

  it("ignores unknown action IDs without changing the page", () => {
    const { calls, target } = actionTarget();

    expect(applyDashboardInsightAction(target, "future_action")).toBe(false);
    expect(calls).toEqual([]);
  });
});
