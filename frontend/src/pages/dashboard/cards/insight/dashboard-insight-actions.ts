export interface DashboardInsightActionTarget {
  focusTodayTaskInput: () => void;
  openMoneyView: () => void;
  scrollToPlannedHours: () => void;
}

type DashboardInsightActionHandler = (target: DashboardInsightActionTarget) => void;

const ACTION_HANDLERS: Readonly<Record<string, DashboardInsightActionHandler>> = {
  focus_today_tasks: (target) => target.focusTodayTaskInput(),
  make_one_task_concrete: (target) => target.focusTodayTaskInput(),
  open_money_view: (target) => target.openMoneyView(),
  pause_extra_spending: (target) => target.openMoneyView(),
  review_planned_hours: (target) => target.scrollToPlannedHours()
};

export function applyDashboardInsightAction(
  target: DashboardInsightActionTarget,
  actionId: string
): boolean {
  const handler = ACTION_HANDLERS[actionId];
  if (handler === undefined) {
    return false;
  }
  handler(target);
  return true;
}
