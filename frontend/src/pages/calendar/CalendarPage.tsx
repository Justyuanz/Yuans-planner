import { useEffect, useMemo, useState } from "react";

import { persistPlannerWrites } from "@/app/planner-persistence";
import { PlannerShell } from "@/app/PlannerShell";
import { useDirectPlannerPage } from "@/app/use-direct-planner-page";
import { usePlannerStore } from "@/app/use-planner-store";
import { toDateKey } from "@/shared/planner-date";
import { buildCalendarTaskReconciliation } from "@/shared/tasks/calendar-task-reconciliation";
import { makeTaskRelatedId } from "@/shared/tasks/task-options";
import { CalendarEventEditor, type CalendarEditorRequest } from "./cards/event-editor/CalendarEventEditor";
import { MonthlyCalendarCard } from "./cards/month/MonthlyCalendarCard";
import { dateFromKey, shiftMonth } from "./cards/month/calendar-month";
import { WeeklyPlannerCard } from "./cards/week/WeeklyPlannerCard";

interface CalendarPageProps {
  today: Date;
}

function shiftedDate(dateKey: string, days: number): string {
  const date = dateFromKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function CalendarPage({ today }: CalendarPageProps) {
  const plannerStore = usePlannerStore();
  const store = plannerStore.status === "ready" ? plannerStore.store : null;
  useDirectPlannerPage(store !== null);
  const todayKey = toDateKey(today);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [expandedDate, setExpandedDate] = useState("");
  const [cursorDate, setCursorDate] = useState(() => toDateKey(
    new Date(today.getFullYear(), today.getMonth(), 1)
  ));
  const [editorRequest, setEditorRequest] = useState<CalendarEditorRequest>({
    eventId: null,
    focus: "start",
    revision: 0
  });
  const taskReconciliation = useMemo(() => store === null ? null
    : buildCalendarTaskReconciliation(store, todayKey, () => ({
      createdAt: new Date().toISOString(),
      id: makeTaskRelatedId("calendar-task")
    })), [store, todayKey]);

  useEffect(() => {
    if (taskReconciliation?.write !== null && taskReconciliation?.write !== undefined) {
      persistPlannerWrites([taskReconciliation.write]);
    }
  }, [taskReconciliation]);

  if (store === null) {
    return <div className="planner-loading">Loading planner…</div>;
  }

  function selectDate(date: string, requestFocus: boolean): void {
    setSelectedDate(date);
    setExpandedDate(date);
    const selected = dateFromKey(date);
    setCursorDate(toDateKey(new Date(selected.getFullYear(), selected.getMonth(), 1)));
    if (requestFocus) {
      setEditorRequest((current) => ({ eventId: null, focus: "start", revision: current.revision + 1 }));
    }
  }

  const readyStore = store;
  const editor = (
    <article
      className="panel event-editor-card inline-day-editor"
      id="eventEditorCard"
      style={{ flex: "0 0 auto", maxWidth: "none", width: "100%" }}
    >
      <div className="panel-inner">
        <CalendarEventEditor
          editRequest={editorRequest}
          key={`${selectedDate}:${editorRequest.revision}`}
          onPersist={persistPlannerWrites}
          onSavedDate={(date) => selectDate(date, false)}
          selectedDate={selectedDate}
          store={readyStore}
        />
      </div>
    </article>
  );

  return (
    <PlannerShell store={readyStore} today={today}>
      <section className="view active" id="calendarView" aria-labelledby="calendarHeading" style={{ width: "100%" }}>
        <div className="calendar-shell" style={{ display: "flex", flexDirection: "column", gap: 26, maxWidth: "none", width: "100%" }}>
          <article className="panel weekly-planner-card" style={{ flex: "0 0 auto", maxWidth: "none", width: "100%" }}>
            <div className="panel-inner">
              <WeeklyPlannerCard
                editorContent={editor}
                expandedDate={expandedDate}
                onCollapseDay={() => setExpandedDate("")}
                onNavigateWeek={(amount) => {
                  const date = shiftedDate(selectedDate, amount * 7);
                  setSelectedDate(date);
                  const selected = dateFromKey(date);
                  setCursorDate(toDateKey(new Date(selected.getFullYear(), selected.getMonth(), 1)));
                }}
                onPersist={persistPlannerWrites}
                onSelectDay={(date, expanded) => {
                  setSelectedDate(date);
                  setExpandedDate(expanded ? date : "");
                  const selected = dateFromKey(date);
                  setCursorDate(toDateKey(new Date(selected.getFullYear(), selected.getMonth(), 1)));
                }}
                selectedDate={selectedDate}
                store={readyStore}
              />
            </div>
          </article>
          <article className="panel monthly-calendar-card" style={{ flex: "0 0 auto", maxWidth: "none", width: "100%" }}>
            <div className="panel-inner monthly-calendar-inner">
              <MonthlyCalendarCard
                cursorDate={cursorDate}
                onEditEvent={(eventId, date) => {
                  selectDate(date, false);
                  setEditorRequest((current) => ({
                    eventId,
                    focus: "title",
                    revision: current.revision + 1
                  }));
                }}
                onSelectDate={(date) => selectDate(date, true)}
                onShiftMonth={(amount) => setCursorDate(toDateKey(shiftMonth(dateFromKey(cursorDate), amount)))}
                selectedDate={selectedDate}
                store={readyStore}
                today={today}
              />
            </div>
          </article>
        </div>
      </section>
    </PlannerShell>
  );
}
