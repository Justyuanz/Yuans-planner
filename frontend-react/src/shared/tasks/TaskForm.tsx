import { useCallback, useEffect, useRef, useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import {
  ACTIVITY_DEFINITIONS,
  normalizeActivityId,
  type ActivityId
} from "../activity-categories";
import { makeTaskRelatedId, TASK_REMINDERS } from "./task-options";
import {
  ACTIVITY_LOG_KEY,
  buildTaskWrites,
  decodeTasks,
  normalizeReminderMinutes,
  normalizeScheduledTime,
  type PlannerTask
} from "./tasks";

interface TaskFormProps {
  dateKey: string;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
}

export function TaskForm({ dateKey, onPersist, store }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [activity, setActivity] = useState<ActivityId>("other");
  const taskKey = `hivePlanner.dailyTasks.${dateKey}`;
  const titleRef = useRef<HTMLInputElement>(null);

  const submit = useCallback((): void => {
    const label = title.trim();
    if (!label) {
      titleRef.current?.focus();
      return;
    }
    const timestamp = new Date().toISOString();
    const newTask: PlannerTask = {
      id: makeTaskRelatedId("task"),
      label,
      activity,
      hours: 0,
      timerSeconds: 0,
      timerStartedAt: null,
      done: false,
      createdAt: timestamp,
      sourceEventId: "",
      useSourceEventReminder: false,
      scheduledTime: normalizeScheduledTime(scheduledTime),
      reminderMinutes,
      reminderSentAt: "",
      reminderSentFor: ""
    };
    const tasks = [...decodeTasks(store[taskKey], timestamp), newTask];
    onPersist(buildTaskWrites({
      action: "task_created",
      after: newTask,
      before: null,
      dateKey,
      existingLog: store[ACTIVITY_LOG_KEY],
      field: "",
      logId: makeTaskRelatedId("activity"),
      taskId: newTask.id,
      tasks,
      timestamp
    }));
    setTitle("");
    setScheduledTime("");
    setReminderMinutes(0);
  }, [activity, dateKey, onPersist, reminderMinutes, scheduledTime, store, taskKey, title]);

  useEffect(() => {
    const form = titleRef.current?.closest("form");
    if (!form) return;
    function handleSubmit(event: SubmitEvent): void {
      event.preventDefault();
      submit();
    }
    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [submit]);

  return (
    <>
      <input
        className="task-form-title"
        id="taskTitle"
        maxLength={90}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add the next thing that actually matters"
        ref={titleRef}
        value={title}
      />
      <input
        aria-label="Task time"
        className="task-form-time"
        id="taskTime"
        inputMode="text"
        maxLength={17}
        onChange={(event) => setScheduledTime(event.target.value)}
        placeholder="09:30"
        value={scheduledTime}
      />
      <button className="secondary-button task-form-add" type="submit">Add</button>
      <select
        aria-label="Task Telegram reminder"
        className="task-form-reminder"
        id="taskReminder"
        onChange={(event) => setReminderMinutes(normalizeReminderMinutes(event.target.value))}
        value={reminderMinutes}
      >
        {TASK_REMINDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select
        aria-label="Task activity"
        className="task-form-activity"
        id="taskActivity"
        onChange={(event) => setActivity(normalizeActivityId(event.target.value))}
        value={activity}
      >
        {ACTIVITY_DEFINITIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </>
  );
}
