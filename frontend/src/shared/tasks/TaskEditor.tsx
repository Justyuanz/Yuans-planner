import { useState, type KeyboardEvent } from "react";

import { ACTIVITY_DEFINITIONS, normalizeActivityId } from "../activity-categories";
import { normalizeScheduledTime, type PlannerTask } from "./tasks";

interface TaskEditorProps {
  onCancel: () => void;
  onSave: (task: PlannerTask, keepEditing: boolean) => void;
  task: PlannerTask;
}

export function TaskEditor({ onCancel, onSave, task }: TaskEditorProps) {
  const [draft, setDraft] = useState(task);

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave({ ...draft, label: draft.label.trim() || task.label }, false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  function saveField(nextTask: PlannerTask): void {
    setDraft(nextTask);
    onSave(nextTask, true);
  }

  return (
    <div className="task-editor">
      <input
        aria-label="Task title"
        autoFocus
        className="task-title-input"
        id="taskEditorTitle"
        maxLength={90}
        onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        onBlur={(event) => {
          const editor = event.currentTarget.closest(".task-editor");
          if (!editor?.contains(event.relatedTarget)) {
            onSave({ ...draft, label: draft.label.trim() || task.label }, false);
          }
        }}
        onKeyDown={handleTitleKeyDown}
        placeholder="Task title"
        type="text"
        value={draft.label}
      />
      <input
        aria-label="Scheduled time"
        className="task-category-select task-editor-time"
        id="taskEditorTime"
        inputMode="numeric"
        maxLength={17}
        onChange={(event) => setDraft({ ...draft, scheduledTime: event.target.value })}
        onBlur={() => saveField({ ...draft, scheduledTime: normalizeScheduledTime(draft.scheduledTime) })}
        placeholder="09:30"
        type="text"
        value={draft.scheduledTime}
      />
      <select
        aria-label="Task activity"
        className="task-category-select task-editor-activity"
        id="taskEditorActivity"
        onChange={(event) => saveField({
          ...draft,
          activity: normalizeActivityId(event.target.value)
        })}
        value={draft.activity}
      >
        {ACTIVITY_DEFINITIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </div>
  );
}
