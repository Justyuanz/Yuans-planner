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

function frameDocument(frame: HTMLIFrameElement): Document | null {
  return frame.contentDocument;
}

function activateView(document: Document, viewId: string): void {
  document.querySelector<HTMLButtonElement>(`[data-view-target="${viewId}"]`)?.click();
}

export function createDashboardInsightActionTarget(
  frame: HTMLIFrameElement
): DashboardInsightActionTarget {
  return {
    focusTodayTaskInput: () => {
      const document = frameDocument(frame);
      if (document === null) {
        return;
      }
      activateView(document, "todayView");
      // React replaces the form children, so resolve the current input at action time.
      document.getElementById("taskTitle")?.focus();
    },
    openMoneyView: () => {
      const document = frameDocument(frame);
      if (document !== null) {
        activateView(document, "moneyView");
      }
    },
    scrollToPlannedHours: () => {
      frameDocument(frame)?.getElementById("plannedMount")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  };
}

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

export function openDashboardInsightHistory(frame: HTMLIFrameElement): boolean {
  const dialog = frameDocument(frame)?.querySelector<HTMLDialogElement>("#patternHistoryDialog");
  if (dialog === null || dialog === undefined || typeof dialog.showModal !== "function") {
    return false;
  }
  dialog.showModal();
  return true;
}
