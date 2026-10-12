import { useEffect, useState } from "react";

import type { GuitarSessionFeedback } from "./guitar-session-persistence";
import type { GuitarSessionDialogRequest } from "./guitar-session";

interface GuitarSessionDialogProps {
  dialog: HTMLDialogElement;
  onCancel: () => void;
  onSave: (feedback: GuitarSessionFeedback) => void;
  request: GuitarSessionDialogRequest;
}

export function GuitarSessionDialog({
  dialog,
  onCancel,
  onSave,
  request
}: GuitarSessionDialogProps) {
  const [duration, setDuration] = useState(String(request.durationMinutes));
  const [note, setNote] = useState("");

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
      id="guitarSessionForm"
      method="dialog"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const durationInput = form.querySelector<HTMLInputElement>("#guitarDurationMinutes");
        const noteInput = form.querySelector<HTMLTextAreaElement>("#guitarSessionNote");
        onSave({
          durationMinutes: Number(durationInput?.value) || 30,
          note: noteInput?.value.trim() ?? note.trim()
        });
      }}
    >
      <div className="section-head">
        <h2>Finish Guitar session</h2>
        <p className="small-note">Save the real time and the one useful thing you worked on.</p>
      </div>
      <label className="form-row" htmlFor="guitarDurationMinutes">
        <span>Actual session minutes</span>
        <input
          id="guitarDurationMinutes"
          inputMode="numeric"
          max="600"
          min="1"
          placeholder="30"
          step="1"
          type="number"
          value={duration}
          onChange={(event) => setDuration(event.currentTarget.value)}
        />
      </label>
      <label className="form-row" htmlFor="guitarSessionNote">
        <span>What moved forward?</span>
        <textarea
          id="guitarSessionNote"
          maxLength={220}
          placeholder="Cleaner chord switch, steadier rhythm, one better verse, one pattern that finally stuck..."
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
      </label>
      <div className="form-actions">
        <button className="primary-button" type="submit">Save session</button>
        <button className="secondary-button" id="cancelGuitarSession" type="button" onClick={cancel}>
          Not now
        </button>
      </div>
    </form>
  );
}
