import { useEffect, useMemo, useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import {
  ACTIVITY_DEFINITIONS,
  type ActivityDefinition
} from "../activity-categories";
import {
  ACTIVITY_LOG_KEY,
  buildTaskWrites,
  decodeHiddenTaskIds,
  decodeTasks,
  displayTaskLabel,
  elapsedTaskSeconds,
  hoursFromSeconds,
  normalizeScheduledTime,
  type PlannerTask,
  type TaskLogAction
} from "./tasks";
import { TaskEditor } from "./TaskEditor";
import { makeTaskRelatedId } from "./task-options";
import { formatTimer } from "../planner-time";

const OTHER_ACTIVITY = ACTIVITY_DEFINITIONS.find(({ id }) => id === "other")!;

interface TasksProps {
  dateKey: string;
  onUndoAgentAction?: () => void;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
}


export function TaskList({ dateKey, onPersist, onUndoAgentAction, store }: TasksProps) {
  const taskKey = `hivePlanner.dailyTasks.${dateKey}`;
  const tasks = useMemo(() => decodeTasks(store[taskKey], `${dateKey}T00:00:00.000Z`), [dateKey, store, taskKey]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const hiddenTaskIds = useMemo(
    () => decodeHiddenTaskIds(store["hivePlanner.agent.uiState"], dateKey),
    [dateKey, store]
  );
  const visibleTasks = showHidden
    ? tasks
    : tasks.filter(({ id }) => !hiddenTaskIds.includes(id));

  useEffect(() => {
    if (!tasks.some(({ timerStartedAt }) => timerStartedAt !== null)) return;
    const initialTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [tasks]);

  function persist(
    nextTasks: readonly PlannerTask[],
    action: TaskLogAction,
    taskId: string,
    before: unknown,
    after: unknown,
    field = ""
  ): void {
    const timestamp = new Date().toISOString();
    onPersist(buildTaskWrites({
      action,
      after,
      before,
      dateKey,
      existingLog: store[ACTIVITY_LOG_KEY],
      field,
      logId: makeTaskRelatedId("activity"),
      taskId,
      tasks: nextTasks,
      timestamp
    }));
  }

  function replaceTask(taskId: string, update: (task: PlannerTask) => PlannerTask): [PlannerTask, PlannerTask[]] {
    const before = tasks.find(({ id }) => id === taskId);
    if (!before) throw new Error(`Task ${taskId} is missing`);
    return [before, tasks.map((task) => task.id === taskId ? update(task) : task)];
  }

  if (tasks.length === 0) {
    return <p className="empty">Clear day. Add only what actually matters today.</p>;
  }

  return (
    <>
      {hiddenTaskIds.length > 0 && (
        <div className="agent-focus-banner">
          <strong>Focus mode is on.</strong>
          <span>{hiddenTaskIds.length} tasks are hidden to lower the noise.</span>
          <div className="agent-focus-actions">
            <button className="secondary-button" onClick={() => setShowHidden((shown) => !shown)} type="button">
              {showHidden ? "Hide extra tasks" : "Show hidden tasks"}
            </button>
            <button className="secondary-button" onClick={onUndoAgentAction} type="button">
              Undo last agent change
            </button>
          </div>
        </div>
      )}
      <ul className="task-list">
      {visibleTasks.map((task) => {
        const activity: ActivityDefinition = ACTIVITY_DEFINITIONS.find(({ id }) => id === task.activity)
          ?? OTHER_ACTIVITY;
        const tracksTime = activity.trackTime !== false;
        const elapsedSeconds = elapsedTaskSeconds(task, nowMs);
        const effectiveHours = task.timerStartedAt || task.timerSeconds > 0
          ? hoursFromSeconds(elapsedSeconds) : task.hours;
        const isEditing = editingTaskId === task.id;
        return (
          <li className="task" key={task.id}>
            <div className={`task-card ${activity.className}${task.done ? " done" : ""}${isEditing ? " is-editing" : ""}`}>
              <input
                checked={task.done}
                className="task-check"
                id={`task-${task.id}`}
                onChange={(event) => {
                  const [before, nextTasks] = replaceTask(task.id, (current) => ({ ...current, done: event.target.checked }));
                  persist(nextTasks, "task_done_changed", task.id, before.done, event.target.checked, "done");
                }}
                type="checkbox"
              />
              <div className="task-content" tabIndex={0}>
                {isEditing ? (
                  <TaskEditor
                    onCancel={() => setEditingTaskId(null)}
                    onSave={(nextTask, keepEditing) => {
                      const before = task;
                      const normalized: PlannerTask = {
                        ...nextTask,
                        label: nextTask.label.trim() || before.label,
                        scheduledTime: normalizeScheduledTime(nextTask.scheduledTime)
                      };
                      const nextTasks = tasks.map((candidate) => candidate.id === task.id ? normalized : candidate);
                      persist(nextTasks, "task_updated", task.id, before, normalized, "task");
                      setEditingTaskId(keepEditing ? task.id : null);
                    }}
                    task={task}
                  />
                ) : (
                  <>
                    <button className="task-title-button" onClick={() => setEditingTaskId(task.id)} type="button">
                      <span className="task-title">{displayTaskLabel(task)}</span>
                    </button>
                    <span className={`activity-badge ${activity.className}`}>{activity.shortLabel}</span>
                  </>
                )}
              </div>
              <div className={`task-hours${tracksTime ? "" : " is-passive"}`}>
                {tracksTime ? (
                  <>
                    <label htmlFor={`task-hours-${task.id}`}>Hours</label>
                    <input
                      id={`task-hours-${task.id}`}
                      inputMode="decimal"
                      max="24"
                      min="0"
                      onChange={(event) => {
                        const hours = Math.min(24, Math.max(0, Number(event.target.value) || 0));
                        const [before, nextTasks] = replaceTask(task.id, (current) => ({
                          ...current,
                          hours,
                          timerSeconds: Math.round(hours * 3600),
                          timerStartedAt: null
                        }));
                        persist(nextTasks, "task_updated", task.id, before.hours, hours, "hours");
                      }}
                      placeholder="0"
                      step="0.01"
                      type="number"
                      value={effectiveHours || ""}
                    />
                    <span className="timer-readout" data-timer-id={task.id}>{formatTimer(elapsedSeconds)}</span>
                    <div className="timer-controls">
                      <button
                        className="timer-button"
                        onClick={() => {
                          const running = task.timerStartedAt !== null;
                          const [before, nextTasks] = replaceTask(task.id, (current) => running ? {
                            ...current,
                            hours: hoursFromSeconds(elapsedSeconds),
                            timerSeconds: elapsedSeconds,
                            timerStartedAt: null
                          } : {
                            ...current,
                            timerSeconds: elapsedSeconds,
                            timerStartedAt: new Date().toISOString()
                          });
                          const after = nextTasks.find(({ id }) => id === task.id);
                          persist(nextTasks, running ? "task_timer_paused" : "task_timer_started", task.id,
                            running ? elapsedSeconds : before.timerSeconds,
                            running ? elapsedSeconds : after?.timerStartedAt ?? "");
                        }}
                        type="button"
                      >{task.timerStartedAt ? "Pause" : "Start"}</button>
                      <button
                        className="timer-button end"
                        onClick={() => {
                          const [, nextTasks] = replaceTask(task.id, (current) => ({
                            ...current,
                            done: true,
                            hours: hoursFromSeconds(elapsedSeconds),
                            timerSeconds: elapsedSeconds,
                            timerStartedAt: null
                          }));
                          persist(nextTasks, "task_timer_ended", task.id, elapsedSeconds, elapsedSeconds);
                        }}
                        type="button"
                      >End</button>
                    </div>
                  </>
                ) : <span>Other task</span>}
              </div>
              <button
                aria-label={`Delete ${task.label}`}
                className="task-delete"
                onClick={() => {
                  persist(tasks.filter(({ id }) => id !== task.id), "task_deleted", task.id, task, null);
                  if (editingTaskId === task.id) setEditingTaskId(null);
                }}
                type="button"
              >×</button>
            </div>
          </li>
        );
      })}
      </ul>
    </>
  );
}
