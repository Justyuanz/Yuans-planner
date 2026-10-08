import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import { dateFromKey } from "./calendar-month";
import { buildCalendarWeek, recoveryTypeChangeReason } from "./calendar-week";
import {
  CALENDAR_DAY_TYPES,
  calendarWeekTypeChangeReason,
  calendarWeekWrite,
  updateCalendarWeekType,
  validateCalendarWeek,
  type CalendarDayTypeId,
  type CalendarWeekPlan
} from "./calendar-week-store";

interface WeeklyPlannerCardProps {
  editorCard: HTMLElement;
  expandedDate: string;
  onCollapseDay: () => void;
  onNavigateWeek: (amount: -1 | 1) => void;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  onSelectDay: (date: string, expanded: boolean) => void;
  selectedDate: string;
  store: PlannerStore;
}

interface LegacyEditorMountProps {
  editorCard: HTMLElement;
}

function LegacyEditorMount({ editorCard }: LegacyEditorMountProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const mount = mountRef.current;
    editorRef.current = editorCard;
    const editor = editorRef.current;
    const originalParent = editor.parentElement;
    if (mount === null || originalParent === null) return;
    editor.hidden = false;
    editor.classList.add("inline-day-editor");
    mount.appendChild(editor);
    return () => {
      editor.hidden = true;
      editor.classList.remove("inline-day-editor");
      originalParent.appendChild(editor);
    };
  }, [editorCard]);
  return <div className="legacy-event-editor-mount" ref={mountRef} />;
}

function clickedInteractiveElement(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as { closest?: (selector: string) => Element | null };
  return typeof target.closest === "function"
    && target.closest("button, input, select, textarea, label, form") !== null;
}

export function WeeklyPlannerCard({
  editorCard,
  expandedDate,
  onCollapseDay,
  onNavigateWeek,
  onPersist,
  onSelectDay,
  selectedDate,
  store
}: WeeklyPlannerCardProps) {
  const model = buildCalendarWeek(store, selectedDate, expandedDate);
  const [setupDraft, setSetupDraft] = useState<CalendarWeekPlan | null>(null);
  const [setupHint, setSetupHint] = useState("");
  const label = setupHint || model.label;

  function changeDayType(dayIndex: number, date: string, nextType: CalendarDayTypeId): void {
    if (setupDraft === null) return;
    const weeklyReason = calendarWeekTypeChangeReason(setupDraft, dayIndex, nextType);
    const recoveryReason = nextType === "recovery" ? recoveryTypeChangeReason(store, date) : "";
    const reason = weeklyReason || recoveryReason;
    if (reason) {
      setSetupHint(reason);
      return;
    }
    setSetupHint("");
    setSetupDraft(updateCalendarWeekType(setupDraft, dayIndex, nextType));
  }

  function closeSetup(): void {
    setSetupDraft(null);
    setSetupHint("");
  }

  return (
    <>
      <div className="section-head">
        <div className="calendar-section-head">
          <h2 id="calendarHeading">Weekly planner</h2>
          <p className="small-note" id="weeklyPlannerLabel">{label}</p>
        </div>
        <div className="week-controls" aria-label="Week controls">
          <button className="secondary-button" id="setWeekButton" onClick={() => {
            setSetupDraft(model.plan);
            setSetupHint("");
          }} type="button">Set week</button>
          <button className="icon-button" id="prevWeek" aria-label="Previous week" onClick={() => onNavigateWeek(-1)} type="button">‹</button>
          <button className="icon-button" id="nextWeek" aria-label="Next week" onClick={() => onNavigateWeek(1)} type="button">›</button>
        </div>
      </div>
      <div id="weeklyPlannerMount">
        {setupDraft === null ? model.days.map((day) => (
          <section
            className={day.className}
            key={day.date}
            onClick={(event) => {
              if (!clickedInteractiveElement(event)) onSelectDay(day.date, !day.expanded);
            }}
          >
            <div className="week-day-header">
              <div><strong>{day.dayLabel}</strong><span>{day.humanDate}</span></div>
              <span className={`progress-pill day-type-pill ${day.type.className}`}>{day.type.shortLabel}</span>
              {day.expanded && (
                <button
                  aria-label={`Collapse ${day.dayLabel}`}
                  className="planner-collapse-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCollapseDay();
                  }}
                  type="button"
                >Minimize</button>
              )}
            </div>
            <div className="week-day-status"><strong>{day.status}</strong><span>{day.capacityHint}</span></div>
            <div className="week-day-summary">
              {day.activities.length === 0
                ? <span className="week-day-part-empty">No activities yet.</span>
                : day.activities.map((activity, index) => (
                  <span className={`week-event-button ${activity.categoryClass}`} key={`${activity.shortLabel}:${index}`}>
                    {activity.shortLabel}
                  </span>
                ))}
            </div>
            {day.expanded && <LegacyEditorMount editorCard={editorCard} />}
          </section>
        )) : (
          <section className="week-setup-card">
            <div className="week-setup-header">
              <strong>Plan the week first</strong>
              <span>Choose Recovery, Normal, or High-Intensity for each day.</span>
            </div>
            {model.days.map((day, index) => (
              <div className="week-setup-row" key={day.date}>
                <strong>{day.dayLabel}</strong><span>{day.humanDate}</span>
                <div className="week-setup-options">
                  {CALENDAR_DAY_TYPES.map((type) => (
                    <button
                      className={`day-state-chip${setupDraft.days[index]?.type === type.id ? " is-active" : ""}`}
                      key={type.id}
                      onClick={() => changeDayType(index, day.date, type.id)}
                      type="button"
                    >{type.shortLabel}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="week-setup-footer">
              <button
                className="primary-button"
                disabled={!validateCalendarWeek(setupDraft).valid}
                onClick={() => {
                  onPersist([calendarWeekWrite(setupDraft, dateFromKey(selectedDate))]);
                  closeSetup();
                }}
                type="button"
              >Save week</button>
              <button className="secondary-button" onClick={closeSetup} type="button">Cancel</button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
