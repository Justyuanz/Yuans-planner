import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PlannerStore } from "../../../../api/planner-store";
import {
  buildJournalEditorDraft,
  buildJournalEntryUpdate,
  JOURNAL_ENERGY_OPTIONS,
  JOURNAL_FOCUS_OPTIONS,
  longJournalDate,
  type JournalEditorDraft,
  type JournalEntryUpdate
} from "./journal-editor";

interface JournalEditorCardProps {
  meditation: ReactNode;
  onPersist: (update: JournalEntryUpdate) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
  store: PlannerStore;
  todayDate: string;
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function JournalEditorCard({
  meditation,
  onPersist,
  onSelectDate,
  selectedDate,
  store,
  todayDate
}: JournalEditorCardProps) {
  const [draft, setDraft] = useState<JournalEditorDraft>(() => buildJournalEditorDraft(store, selectedDate));
  const draftRef = useRef(draft);
  const minutesRef = useRef<HTMLInputElement>(null);

  function save(nextDraft: JournalEditorDraft): void {
    const update = buildJournalEntryUpdate(store, selectedDate, nextDraft, {
      activityId: randomId("activity"),
      entryId: randomId("journal"),
      timestamp: new Date().toISOString()
    });
    if (update !== null) onPersist(update);
  }

  function updateDraft(nextDraft: JournalEditorDraft, persist = true): void {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    if (persist) save(nextDraft);
  }

  useEffect(() => {
    const input = minutesRef.current;
    if (input === null) return;
    function saveMinutes(): void {
      save({ ...draftRef.current, durationMinutes: input?.value ?? "" });
    }
    // Legacy saves this field on change, while the text fields save on every input.
    input.addEventListener("change", saveMinutes);
    return () => input.removeEventListener("change", saveMinutes);
  });

  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="journalHeading">Feeling corner</h2>
          <p className="small-note">A gentle place to hold how today felt.</p>
        </div>
        <div className="journal-head-actions">
          <button className="secondary-button" id="journalTodayButton" onClick={() => onSelectDate(todayDate)} type="button">
            Today
          </button>
          <input
            aria-label="Journal date"
            id="journalDate"
            onChange={(event) => onSelectDate(event.currentTarget.value || todayDate)}
            type="date"
            value={selectedDate}
          />
        </div>
      </div>

      {meditation}

      <div className="journal-paper">
        <div className="journal-paper-top">
          <div>
            <p className="journal-kicker">Dear diary</p>
            <strong className="journal-date-label" id="journalDateLabel">{longJournalDate(selectedDate)}</strong>
          </div>
        </div>

        <label className="journal-minutes" htmlFor="journalMinutes">
          Minutes journaling <span className="small-note">Optional · saved to Mind for this date</span>
          <input
            id="journalMinutes"
            max={1440}
            min={0}
            onInput={(event) => updateDraft({
              ...draftRef.current,
              durationMinutes: event.currentTarget.value
            }, false)}
            placeholder="0"
            ref={minutesRef}
            step={1}
            type="number"
            value={draft.durationMinutes}
          />
        </label>

        <section className="state-tracker-card" aria-labelledby="stateTrackerHeading">
          <div className="section-head compact">
            <div>
              <h3 id="stateTrackerHeading">State tracker</h3>
              <p className="small-note">A tiny check-in for the days when your brain needs help remembering what happened.</p>
            </div>
          </div>
          <div className="state-tracker-grid">
            <div className="state-tracker-group">
              <strong>Energy</strong>
              <div className="tracker-chip-row" id="journalEnergyOptions">
                {JOURNAL_ENERGY_OPTIONS.map((option) => (
                  <button
                    className={`tracker-chip${draft.tracker.energy === option.id ? " is-active" : ""}`}
                    data-energy-state={option.id}
                    key={option.id}
                    onClick={() => updateDraft({
                      ...draftRef.current,
                      tracker: { ...draftRef.current.tracker, energy: option.id }
                    })}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="state-tracker-group">
              <strong>Focus</strong>
              <div className="tracker-chip-row" id="journalFocusOptions">
                {JOURNAL_FOCUS_OPTIONS.map((option) => (
                  <button
                    className={`tracker-chip${draft.tracker.focus === option.id ? " is-active" : ""}`}
                    data-focus-state={option.id}
                    key={option.id}
                    onClick={() => updateDraft({
                      ...draftRef.current,
                      tracker: { ...draftRef.current.tracker, focus: option.id }
                    })}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="form-row state-context-row" htmlFor="journalStateContext">
            <span>What seems connected to this state?</span>
            <input
              autoComplete="off"
              id="journalStateContext"
              maxLength={180}
              onChange={(event) => updateDraft({
                ...draftRef.current,
                tracker: { ...draftRef.current.tracker, context: event.currentTarget.value }
              })}
              placeholder="Late night, too many hard tasks, conflict, travel, not enough food, social overload..."
              value={draft.tracker.context}
            />
          </label>
        </section>

        <label className="form-row journal-title-row" htmlFor="journalTitle">
          <span>What was most present?</span>
          <input
            autoComplete="off"
            id="journalTitle"
            maxLength={90}
            onChange={(event) => updateDraft({ ...draftRef.current, title: event.currentTarget.value })}
            placeholder="A quiet title for the feeling"
            value={draft.title}
          />
        </label>

        <label className="form-row journal-entry-row" htmlFor="journalContent">
          <span className="sr-only">Journal entry</span>
          <textarea
            id="journalContent"
            maxLength={6000}
            onChange={(event) => updateDraft({ ...draftRef.current, content: event.currentTarget.value })}
            placeholder="What felt heavy, light, distant, or steady today?"
            value={draft.content}
          />
        </label>
      </div>
    </>
  );
}
