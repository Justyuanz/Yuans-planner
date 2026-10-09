import { useEffect, useRef, useState } from "react";

import type { SkateIntensity } from "./skate-intensity";
import type { SkateFeedbackRequest, SkateFeedbackValue } from "./skate-session-feedback";

interface SkateFeedbackDialogProps {
  dialog: HTMLDialogElement;
  intensityForDate: (dateKey: string) => SkateIntensity;
  onCancel: () => void;
  onSave: (feedback: SkateFeedbackValue) => void;
  request: SkateFeedbackRequest;
}

const CONFIDENCE_LABELS = ["scared", "hesitant", "normal", "confident", "very free"] as const;
const PROGRESS_LABELS = ["stuck", "small win", "moving", "solid", "breakthrough"] as const;
const INTENSITIES = ["blue", "yellow", "green"] as const;

interface ScaleProps {
  labels: readonly string[];
  legend: string;
  name: string;
  onChange: (value: number) => void;
  value: number;
}

function FeedbackScale({ labels, legend, name, onChange, value }: ScaleProps) {
  return (
    <fieldset className="scale-field">
      <legend>{legend}</legend>
      <div className="scale-options">
        {labels.map((label, index) => {
          const optionValue = index + 1;
          return (
            <label className="scale-option" key={label}>
              <input
                checked={value === optionValue}
                name={name}
                type="radio"
                value={optionValue}
                onChange={() => onChange(optionValue)}
              />
              <span>{optionValue} {label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SkateFeedbackDialog({
  dialog,
  intensityForDate,
  onCancel,
  onSave,
  request
}: SkateFeedbackDialogProps) {
  const [confidence, setConfidence] = useState(3);
  const [dateKey, setDateKey] = useState(request.dateKey);
  const [duration, setDuration] = useState(String(request.durationMinutes));
  const [improvedNote, setImprovedNote] = useState("");
  const [intensity, setIntensity] = useState(request.intensity);
  const [nextFocusNote, setNextFocusNote] = useState("");
  const [progressToday, setProgressToday] = useState(3);
  const confidenceRef = useRef(confidence);
  const intensityRef = useRef(intensity);
  const progressTodayRef = useRef(progressToday);

  useEffect(() => {
    if (!dialog.open) dialog.showModal();
  }, [dialog]);

  function cancel(): void {
    dialog.close();
    onCancel();
  }

  return (
    <form
      className="feedback-panel"
      id="skateFeedbackForm"
      method="dialog"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const dateInput = form.querySelector<HTMLInputElement>("#skateSessionDate");
        const durationInput = form.querySelector<HTMLInputElement>("#skateDurationMinutes");
        const improvedInput = form.querySelector<HTMLTextAreaElement>("#skateImprovedNote");
        const nextInput = form.querySelector<HTMLTextAreaElement>("#skateNextFocusNote");
        onSave({
          confidence: confidenceRef.current,
          dateKey: dateInput?.value ?? dateKey,
          durationMinutes: Number(durationInput?.value) || 45,
          improvedNote: improvedInput?.value.trim() ?? improvedNote.trim(),
          intensity: intensityRef.current,
          nextFocusNote: nextInput?.value.trim() ?? nextFocusNote.trim(),
          progressToday: progressTodayRef.current
        });
      }}
    >
      <div className="section-head">
        <h2>Quick check-in</h2>
        <p className="small-note">Capture what changed, not a diary entry.</p>
      </div>
      <label className="form-row" htmlFor="skateDurationMinutes">
        <span>Actual session minutes</span>
        <input
          id="skateDurationMinutes"
          inputMode="numeric"
          max="600"
          min="1"
          placeholder="45"
          step="1"
          type="number"
          value={duration}
          onChange={(event) => setDuration(event.currentTarget.value)}
        />
      </label>
      <label className="form-row" htmlFor="skateSessionDate">
        <span>Session date</span>
        <input
          id="skateSessionDate"
          type="date"
          value={dateKey}
          onChange={(event) => {
            const nextDate = event.currentTarget.value;
            setDateKey(nextDate);
            const nextIntensity = intensityForDate(nextDate);
            intensityRef.current = nextIntensity;
            setIntensity(nextIntensity);
          }}
        />
      </label>
      <fieldset className="scale-field">
        <legend>Session intensity</legend>
        <div className="skate-intensity-toggle" id="skateFeedbackIntensity" aria-label="Session intensity">
          {INTENSITIES.map((option) => (
            <button
              aria-pressed={intensity === option}
              className={intensity === option ? "active" : undefined}
              data-intensity={option}
              key={option}
              type="button"
              onClick={() => {
                intensityRef.current = option;
                setIntensity(option);
              }}
            >
              {option[0]?.toUpperCase()}{option.slice(1)}
            </button>
          ))}
        </div>
        <p className="small-note">Choose the color for this session’s roadmap day.</p>
      </fieldset>
      <div className="feedback-scales">
        <FeedbackScale
          labels={CONFIDENCE_LABELS}
          legend="Confidence today"
          name="confidence"
          value={confidence}
          onChange={(value) => {
            confidenceRef.current = value;
            setConfidence(value);
          }}
        />
        <FeedbackScale
          labels={PROGRESS_LABELS}
          legend="Progress today"
          name="progressToday"
          value={progressToday}
          onChange={(value) => {
            progressTodayRef.current = value;
            setProgressToday(value);
          }}
        />
      </div>
      <label className="form-row" htmlFor="skateImprovedNote">
        <span>What improved today?</span>
        <textarea
          id="skateImprovedNote"
          maxLength={220}
          placeholder="What clicked, landed, or felt less awkward today?"
          value={improvedNote}
          onChange={(event) => setImprovedNote(event.currentTarget.value)}
        />
      </label>
      <label className="form-row" htmlFor="skateNextFocusNote">
        <span>What should I focus on next session?</span>
        <textarea
          id="skateNextFocusNote"
          maxLength={220}
          placeholder="What is the one adjustment or trick future-you should come back to?"
          value={nextFocusNote}
          onChange={(event) => setNextFocusNote(event.currentTarget.value)}
        />
      </label>
      <div className="form-actions">
        <button className="primary-button" type="submit">Save session</button>
        <button className="secondary-button" id="cancelSkateFeedback" type="button" onClick={cancel}>
          Not now
        </button>
      </div>
    </form>
  );
}
