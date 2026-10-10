import { useEffect, useMemo, useRef, useState } from "react";

import type { PlannerStore } from "../../api/planner-store";
import { navigateToPlannerView } from "../../app/planner-navigation";
import { persistPlannerWrites } from "../../app/planner-persistence";
import { PlannerShell } from "../../app/PlannerShell";
import { useDirectPlannerPage } from "../../app/use-direct-planner-page";
import { usePlannerStore } from "../../app/use-planner-store";
import { DayStateOptions } from "../day-state/DayStateOptions";
import { decodeDayState } from "../day-state/day-state";
import { buildDayStateWrites } from "../day-state/day-state-persistence";
import { DashboardInsightCard } from "../dashboard-insight/DashboardInsightCard";
import { applyDashboardInsightAction, type DashboardInsightActionTarget } from "../dashboard-insight/dashboard-insight-actions";
import { buildDashboardInsightFromStore, buildDashboardInsightHistoryFromStore } from "../dashboard-insight/dashboard-insight-store";
import { EnergyTrailCard } from "../energy-trail/EnergyTrailCard";
import { LifePieCard } from "../life-pie/LifePieCard";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { MoneyQuickCard } from "../money-quick/MoneyQuickCard";
import { PatternHistoryDialog } from "../pattern-history/PatternHistoryDialog";
import { PlannedActualCard } from "../planned-actual/PlannedActualCard";
import { TaskProgressBanner } from "../task-progress/TaskProgressBanner";
import { buildTaskProgressModel } from "../task-progress/task-progress";
import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { buildAgentUndoWrites } from "../tasks/agent-undo";
import { buildCalendarTaskReconciliation } from "../tasks/calendar-task-reconciliation";
import { makeTaskRelatedId } from "../tasks/task-options";
import { TodayIntention } from "../today-intention/TodayIntention";
import { buildTodayIntentionModel } from "../today-intention/today-intention";
import { WeeklyGoalsCard } from "../weekly-goals/WeeklyGoalsCard";
import {
  decodeWeeklyGoals,
  encodeWeeklyGoalUpdate,
  WEEKLY_GOALS_STORAGE_KEY,
  type WeeklyGoalId
} from "../weekly-goals/weekly-goals";

interface DashboardPageProps {
  today: Date;
}

function directActionTarget(today: Date): DashboardInsightActionTarget {
  return {
    focusTodayTaskInput: () => document.getElementById("taskTitle")?.focus(),
    openMoneyView: () => navigateToPlannerView("moneyView", today),
    scrollToPlannedHours: () => document.getElementById("plannedMount")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
  };
}

function TasksCard({ store, today }: { store: PlannerStore; today: Date }) {
  const todayKey = formatPlannerDate(today);
  return (
    <article className="panel tasks-card">
      <div className="panel-inner">
        <div className="section-head"><h2>Today's tasks</h2><p className="small-note" id="weekKeyLabel" /></div>
        <div className="intention-block" aria-label="Today's intention">
          <TodayIntention model={buildTodayIntentionModel(store, today)} />
        </div>
        <div className="day-state-strip" aria-label="How today feels">
          <strong>How does today feel?</strong>
          <div className="day-state-options" id="dayStateOptions">
            <DayStateOptions
              activeState={decodeDayState(store, todayKey)}
              onSelect={(state) => persistPlannerWrites(buildDayStateWrites(store, todayKey, state, {
                activityId: makeTaskRelatedId("activity"),
                timestamp: new Date().toISOString()
              }))}
            />
          </div>
        </div>
        <div className="day-banner"><TaskProgressBanner model={buildTaskProgressModel(store, todayKey)} /></div>
        <div id="tasksMount">
          <TaskList
            dateKey={todayKey}
            onPersist={persistPlannerWrites}
            onUndoAgentAction={() => persistPlannerWrites(buildAgentUndoWrites(store, {
              activityId: makeTaskRelatedId("activity"),
              timestamp: new Date().toISOString()
            }).writes)}
            store={store}
          />
        </div>
        <form className="task-form" id="taskForm">
          <TaskForm dateKey={todayKey} onPersist={persistPlannerWrites} store={store} />
        </form>
      </div>
    </article>
  );
}

export function DashboardPage({ today }: DashboardPageProps) {
  const plannerStore = usePlannerStore();
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  useDirectPlannerPage(loadedStore !== null);
  const todayKey = formatPlannerDate(today);
  const [initialNowMs] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const reconciliation = useMemo(() => loadedStore === null ? null
    : buildCalendarTaskReconciliation(loadedStore, todayKey, () => ({
      createdAt: new Date().toISOString(),
      id: makeTaskRelatedId("calendar-task")
    })), [loadedStore, todayKey]);
  const store = useMemo(() => loadedStore === null || reconciliation === null
    ? loadedStore
    : { ...loadedStore, [`hivePlanner.dailyTasks.${todayKey}`]: JSON.stringify(reconciliation.tasks) },
  [loadedStore, reconciliation, todayKey]);

  useEffect(() => {
    if (reconciliation?.write) persistPlannerWrites([reconciliation.write]);
  }, [reconciliation]);

  if (store === null) return <div className="planner-loading">Loading planner…</div>;

  const readyStore = store;
  const insight = buildDashboardInsightFromStore(readyStore, today);
  const history = buildDashboardInsightHistoryFromStore(readyStore, today);
  const actionTarget = directActionTarget(today);
  function applyAction(actionId: string): void {
    applyDashboardInsightAction(actionTarget, actionId);
  }
  function saveWeeklyGoal(goalId: WeeklyGoalId, text: string): void {
    persistPlannerWrites([{
      key: WEEKLY_GOALS_STORAGE_KEY,
      value: encodeWeeklyGoalUpdate(readyStore, goalId, text)
    }]);
  }

  return (
    <PlannerShell activeView="todayView" store={readyStore} today={today}>
      <section className="view active" id="todayView" aria-labelledby="todayHeading">
        <div className="today-dashboard">
          <div className="planner-main">
            <article className="panel goals-card"><div className="panel-inner">
              <div className="section-head"><h2 id="todayHeading">Weekly goals</h2><p className="small-note">Keep these until they feel done.</p></div>
              <div className="goal-list" id="weeklyGoals">
                <WeeklyGoalsCard goals={decodeWeeklyGoals(readyStore)} onGoalChange={saveWeeklyGoal} />
              </div>
            </div></article>
            <article className="panel money-quick-card"><div className="panel-inner">
              <MoneyQuickCard onPersist={persistPlannerWrites} store={readyStore} today={today} />
            </div></article>
            <TasksCard store={readyStore} today={today} />
          </div>
          <aside className="planner-side">
            <article className="panel life-card"><div className="panel-inner">
              <LifePieCard initialNowMs={initialNowMs} store={readyStore} today={today} />
            </div></article>
            <article className="panel planned-card"><div className="panel-inner">
              <PlannedActualCard initialNowMs={initialNowMs} onPersist={persistPlannerWrites} store={readyStore} today={today} />
            </div></article>
            <article className="panel insight-card" id="dashboardInsightCard"><div className="panel-inner">
              <DashboardInsightCard
                model={insight}
                onAction={applyAction}
                onOpenHistory={() => {
                  setHistoryRevision((revision) => revision + 1);
                  dialogRef.current?.showModal();
                }}
              />
            </div></article>
            <article className="panel state-history-card"><div className="panel-inner">
              <EnergyTrailCard
                onOpenJournalDate={(date) => navigateToPlannerView("journalView", date)}
                store={readyStore}
                today={today}
              />
            </div></article>
          </aside>
        </div>
      </section>
      <dialog className="feedback-dialog pattern-history-dialog" id="patternHistoryDialog" ref={dialogRef}>
        <PatternHistoryDialog key={historyRevision} model={history} onAction={applyAction} />
      </dialog>
    </PlannerShell>
  );
}
