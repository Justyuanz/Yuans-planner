import { useState, type KeyboardEvent } from "react";

import { ACTIVITY_DEFINITIONS, normalizeActivityId } from "../activity-categories/activity-categories";
import { TASK_REMINDERS } from "./task-options";
import {
  normalizeReminderMinutes,
  normalizeScheduledTime,
  type PlannerTask
} from "./tasks";

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
        autoFocus
        className="task-title-input"
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
        className="task-category-select task-editor-time"
        inputMode="numeric"
        maxLength={17}
        onChange={(event) => setDraft({ ...draft, scheduledTime: event.target.value })}
        onBlur={() => saveField({ ...draft, scheduledTime: normalizeScheduledTime(draft.scheduledTime) })}
        placeholder="09:30"
        type="text"
        value={draft.scheduledTime}
      />
      <select
        className="task-category-select task-editor-reminder"
        onChange={(event) => saveField({
          ...draft,
          reminderMinutes: normalizeReminderMinutes(event.target.value)
        })}
        value={draft.reminderMinutes}
      >
        {TASK_REMINDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select
        className="task-category-select task-editor-activity"
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
