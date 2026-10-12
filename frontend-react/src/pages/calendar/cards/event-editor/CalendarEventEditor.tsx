import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import {
  CALENDAR_CATEGORY_ORDER,
  calendarCategoryMeta,
  normalizeCalendarCategory
} from "@/shared/calendar-event-store";
import {
  calendarEditorEvents,
  calendarEventDraft,
  deleteCalendarEvent,
  emptyCalendarEventDraft,
  saveCalendarEvent,
  type CalendarEventDraft
} from "./calendar-event-editor";
import { buildCalendarWeek, previewCalendarActivity } from "../week/calendar-week";
import { humanDate } from "@/shared/planner-date";

export interface CalendarEditorRequest {
  eventId: string | null;
  focus: "start" | "title";
  revision: number;
}

interface CalendarEventEditorProps {
  editRequest: CalendarEditorRequest;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  onSavedDate: (date: string) => void;
  selectedDate: string;
  store: PlannerStore;
}

function formatLoad(value: number): string {
  const amount = Math.abs(value);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
}

function defaultEffort(category: string): string {
  return ["Skate", "Gym"].includes(normalizeCalendarCategory(category)) ? "demanding" : "standard";
}

function resetDraft(date: string, category: string): CalendarEventDraft {
  return {
    ...emptyCalendarEventDraft(date),
    category,
    effort: defaultEffort(category)
  };
}

// The editor reads the value of a date input, so it parses by fixed character
// positions rather than splitting on dashes. Only the label is shared.
function humanEditorDate(date: string): string {
  return humanDate(new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  ));
}

function guidance(store: PlannerStore, date: string): string {
  const day = buildCalendarWeek(store, date, date).days.find((candidate) => candidate.date === date);
  if (day?.type.id === "recovery") {
    return "Recovery Day: a quieter stay-home day still has room for study, chores, guitar, and personal care. Keep skate or gym to 30 minutes or less.";
  }
  if (day?.type.id === "high") {
    if (day.remainingLoad <= 0) return "High-Intensity Day: this is for your biggest blocks. Today is full, so only move, shorten, or remove something.";
    if (day.remainingLoad <= 2) return "High-Intensity Day: use it for big work, training, or school. You still have room, but only for a smaller extra block.";
    return "High-Intensity Day: use this for your biggest work, skate, gym, or school blocks.";
  }
  if ((day?.remainingLoad ?? 0) <= 0) return "Normal Day: one real main block plus smaller supporting things. This plan is already at capacity.";
  if ((day?.remainingLoad ?? 0) <= 1) return "Normal Day: one main block is enough. The rest of today should stay light.";
  return "Normal Day: aim for one real main block and one or two smaller supporting blocks.";
}

function newEventId(): string {
  return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CalendarEventEditor({
  editRequest,
  onPersist,
  onSavedDate,
  selectedDate,
  store
}: CalendarEventEditorProps) {
  const requestedDraft = editRequest.eventId === null
    ? null
    : calendarEventDraft(store, editRequest.eventId, selectedDate);
  const [activityPickerOpen, setActivityPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => requestedDraft ?? emptyCalendarEventDraft(selectedDate));
  const [editingEventId, setEditingEventId] = useState(requestedDraft === null ? "" : editRequest.eventId ?? "");
  const [formHint, setFormHint] = useState(requestedDraft === null
    ? `Selected: ${selectedDate}`
    : "Edit this block to move, shorten, or change it.");
  const startRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const events = calendarEditorEvents(store, selectedDate);
  const day = buildCalendarWeek(store, selectedDate, selectedDate).days
    .find((candidate) => candidate.date === selectedDate);
  const eventDate = draft.date || selectedDate;
  const preview = useMemo(() => previewCalendarActivity(store, eventDate, draft, editingEventId), [
    draft,
    editingEventId,
    eventDate,
    store
  ]);

  useLayoutEffect(() => {
    if (editRequest.revision === 0) return;
    (editRequest.focus === "title" ? titleRef.current : startRef.current)?.focus();
  }, [editRequest.focus, editRequest.revision]);

  function updateDraft<K extends keyof CalendarEventDraft>(key: K, value: CalendarEventDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startEditing(eventId: string): void {
    const nextDraft = calendarEventDraft(store, eventId, selectedDate);
    if (nextDraft === null) return;
    setEditingEventId(eventId);
    setDraft(nextDraft);
    setActivityPickerOpen(false);
    setFormHint("Edit this block to move, shorten, or change it.");
    titleRef.current?.focus();
  }

  function saveEvent(): void {
    if (draft.reminderMinutes > 0 && !draft.startTime) {
      setFormHint("Pick a start time to send a Telegram reminder.");
      startRef.current?.focus();
      return;
    }
    if (!preview.allowed) {
      setFormHint(preview.reason);
      startRef.current?.focus();
      return;
    }
    const wasEditing = Boolean(editingEventId);
    onPersist(saveCalendarEvent(store, { ...draft, date: eventDate }, editingEventId, new Date().toISOString(), newEventId()));
    onSavedDate(eventDate);
    setEditingEventId("");
    setActivityPickerOpen(false);
    setDraft(resetDraft(eventDate, draft.category));
    setFormHint(`${wasEditing ? "Updated " : "Saved for "}${humanEditorDate(eventDate)}.`);
  }

  function removeEvent(eventId: string, title: string): void {
    if (!window.confirm(`Delete "${title}"?`)) return;
    onPersist(deleteCalendarEvent(store, eventId));
    if (editingEventId === eventId) {
      setEditingEventId("");
      setDraft(resetDraft(selectedDate, draft.category));
      setFormHint("Event deleted.");
    }
  }

  const previewText = draft.reminderOnly
    ? "Reminder-only item = 0 load hours. It does not use your day budget."
    : preview.candidateMinutes <= 0
      ? "Add a valid start and end time to see this activity's load."
      : `${preview.candidateMinutes} min ${calendarCategoryMeta(draft.category).shortLabel} · ${draft.effort === "easy" ? "Easy" : draft.effort === "demanding" ? "Demanding" : "Standard"} = ${formatLoad(preview.candidateLoad)} load hours. Would become ${formatLoad(preview.projectedLoad)} / ${formatLoad(preview.capacityLoad)}.${preview.allowed ? ` ${formatLoad(preview.remainingLoad)} left.` : ` ${preview.reason}`}`;

  return (
    <>
      <div className="section-head">
        <h2 id="selectedDateHeading">{humanEditorDate(selectedDate)}</h2>
        <p className="small-note" id="selectedDateHint">{guidance(store, selectedDate)}</p>
      </div>
      <ul className="selected-events" id="selectedDateEvents" aria-label="Selected date events">
        {events.length === 0 ? (
          <li className="selected-event empty">No activities on this day yet.</li>
        ) : events.map((event) => (
          <li className={`selected-event ${event.categoryClass}`} key={event.id} onClick={(clickEvent) => {
            if (!(clickEvent.target as Element).closest("button")) startEditing(event.id);
          }}>
            <div className="selected-event-title">{event.title}</div>
            <span className={`tag ${event.categoryClass}`}>{event.categoryLabel}</span>
            {event.note && <p className="selected-event-note">{event.note}</p>}
            <div className="selected-event-actions">
              <button className="secondary-button" onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                startEditing(event.id);
              }} type="button">Move or shorten</button>
              <button className="secondary-button quiet-danger" onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                removeEvent(event.id, event.title);
              }} type="button">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="selected-day-actions">
        <button className="primary-button" id="plannerAddActivityButton" onClick={() => setActivityPickerOpen((open) => !open)} type="button">Add activity</button>
        <span className="hint" id="plannerDayStatusHint">{day?.capacityHint}</span>
      </div>
      <section className="planner-activity-picker" id="plannerActivityPicker" hidden={!activityPickerOpen}>
        <div className="section-head"><div><h3>Choose an activity</h3><p className="small-note" id="plannerActivityPickerHint">Choose a category, then set its time and effort. Your exact load shows before you save.</p></div></div>
        <div className="planner-activity-options" id="plannerActivityOptions">
          {CALENDAR_CATEGORY_ORDER.map((category) => {
            const meta = calendarCategoryMeta(category);
            return (
              <button className={`planner-activity-option ${meta.className}`} key={category} onClick={() => {
                setEditingEventId("");
                setDraft({
                  ...emptyCalendarEventDraft(selectedDate),
                  category,
                  effort: defaultEffort(category),
                  endTime: "11:00",
                  startTime: "10:00"
                });
                setActivityPickerOpen(false);
                setFormHint(`Add a time block for ${meta.label}.`);
                titleRef.current?.focus();
              }} type="button">{meta.label}</button>
            );
          })}
        </div>
      </section>
      <form className="event-form" id="eventForm" onSubmit={(event) => {
        event.preventDefault();
        saveEvent();
      }}>
        <div className="form-row"><label htmlFor="eventCategory">Activity</label><select id="eventCategory" name="eventCategory" value={draft.category} onChange={(event) => {
          const category = event.target.value;
          setDraft((current) => ({ ...current, category, effort: defaultEffort(category) }));
        }}>{CALENDAR_CATEGORY_ORDER.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div className="form-row"><label htmlFor="eventEffort">Effort</label><select id="eventEffort" name="eventEffort" value={draft.effort} onChange={(event) => updateDraft("effort", event.target.value)}><option value="easy">Easy</option><option value="standard">Standard</option><option value="demanding">Demanding</option></select></div>
        <div className="form-row"><label htmlFor="eventTitle">Name</label><input id="eventTitle" name="eventTitle" type="text" maxLength={120} autoComplete="off" placeholder="Meet somebody, Kontula skate, call clinic..." ref={titleRef} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></div>
        <div className="form-row"><label htmlFor="eventDate">Date</label><input id="eventDate" name="eventDate" type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} /></div>
        <div className="form-row"><label htmlFor="eventStartTime">Start time</label><input id="eventStartTime" name="eventStartTime" type="text" inputMode="numeric" autoComplete="off" placeholder="13:00" ref={startRef} value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} /></div>
        <div className="form-row"><label htmlFor="eventEndTime">End time</label><input id="eventEndTime" name="eventEndTime" type="text" inputMode="numeric" autoComplete="off" placeholder="14:30" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} /></div>
        <div className="form-row"><label htmlFor="eventReminder">Telegram reminder</label><select id="eventReminder" name="eventReminder" value={draft.reminderMinutes} onChange={(event) => updateDraft("reminderMinutes", Number(event.target.value))}><option value="0">No reminder</option><option value="5">Remind me 5 min before</option><option value="10">Remind me 10 min before</option><option value="15">Remind me 15 min before</option><option value="30">Remind me 30 min before</option></select></div>
        <div className="form-row planner-reminder-row"><label className="planner-checkbox" htmlFor="eventReminderOnly"><input id="eventReminderOnly" name="eventReminderOnly" type="checkbox" checked={draft.reminderOnly} onChange={(event) => updateDraft("reminderOnly", event.target.checked)} /><span>Reminder-only item. Costs 0 load hours.</span></label></div>
        <p className={`planner-load-preview${!draft.reminderOnly && preview.candidateMinutes > 0 && !preview.allowed ? " is-over" : ""}`} id="plannerLoadPreview" aria-live="polite">{previewText}</p>
        <div className="form-row"><label htmlFor="eventNote">Optional note</label><textarea id="eventNote" name="eventNote" maxLength={220} placeholder="Optional detail for this block." value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} /></div>
        <div className="form-actions"><button className="primary-button" type="submit" id="eventSaveButton">{editingEventId ? "Update activity" : "Save activity"}</button><span className="hint" id="formHint">{formHint}</span></div>
      </form>
    </>
  );
}
