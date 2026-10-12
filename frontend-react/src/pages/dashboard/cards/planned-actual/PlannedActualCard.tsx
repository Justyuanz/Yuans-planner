import { useEffect, useMemo, useRef, useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../../../api/planner-store";
import type { PlannedActualRow } from "./planned-actual";
import {
  ACTIVITY_LOG_KEY,
  applyPlannedInput,
  appendPlannedActivityLog,
  buildPlannedActual,
  decodePlannedValues,
  plannedStorageKey,
  type PlannedActivityId,
  type PlannedGroupId,
  type PlannedValues
} from "./planned-actual";

interface PlannedActualCardProps {
  initialNowMs: number;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
  today: Date;
}

interface PlannedInputProps {
  onCommit: () => void;
  onValueInput: (activityId: PlannedActivityId, value: string, groupId: PlannedGroupId) => void;
  row: PlannedActualRow;
  value: string;
  groupId: PlannedGroupId;
}

function PlannedInput({ groupId, onCommit, onValueInput, row, value }: PlannedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    // React maps onChange to input; listen natively so totals refresh only on legacy's change event.
    input.addEventListener("change", onCommit);
    return () => input.removeEventListener("change", onCommit);
  }, [onCommit]);

  return (
    <input
      id={`planned-${row.id}`}
      inputMode="decimal"
      max="168"
      min="0"
      name={`planned-${row.id}`}
      onInput={(event) => onValueInput(row.id, event.currentTarget.value, groupId)}
      placeholder="0"
      ref={inputRef}
      step="0.25"
      type="number"
      value={value}
    />
  );
}

function activityId(): string {
  return `activity-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function plannedInputValue(values: PlannedValues, id: PlannedActivityId): string {
  const value = values[id];
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" && value ? String(value) : "";
}

export function PlannedActualCard({ initialNowMs, onPersist, store, today }: PlannedActualCardProps) {
  const storageKey = plannedStorageKey(today);
  const initialValues = useMemo(() => decodePlannedValues(store, today), [store, today]);
  const [draftValues, setDraftValues] = useState<PlannedValues>(initialValues);
  const [committedValues, setCommittedValues] = useState<PlannedValues>(initialValues);
  const [nowMs, setNowMs] = useState(initialNowMs);
  const draftRef = useRef(draftValues);
  const storedActivityLog = store[ACTIVITY_LOG_KEY];
  const activityLogRef = useRef(storedActivityLog);

  useEffect(() => {
    activityLogRef.current = storedActivityLog;
  }, [storedActivityLog]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const model = useMemo(() => buildPlannedActual({
    ...store,
    [storageKey]: JSON.stringify(committedValues)
  }, today, nowMs), [committedValues, nowMs, storageKey, store, today]);

  function persistInput(activityIdValue: PlannedActivityId, value: string, groupId: PlannedGroupId): void {
    const update = applyPlannedInput(draftRef.current, activityIdValue, value);
    draftRef.current = update.values;
    setDraftValues(update.values);
    const plannedValue = JSON.stringify(update.values);
    const activityLogValue = appendPlannedActivityLog(activityLogRef.current, {
      activityId: activityIdValue,
      after: update.after,
      before: update.before,
      groupId,
      id: activityId(),
      timestamp: new Date().toISOString(),
      weekKey: model.weekKey
    });
    activityLogRef.current = activityLogValue;
    onPersist([
      { key: model.storageKey, value: plannedValue },
      { key: ACTIVITY_LOG_KEY, value: activityLogValue }
    ]);
  }

  function commitValues(): void {
    setCommittedValues({ ...draftRef.current });
  }

  return (
    <>
      <div className="section-head">
        <h3>Planned vs actual</h3>
        <p className="small-note" id="plannedWeekLabel">{model.weekKey}</p>
      </div>
      <div className="planned-grid" id="plannedMount">
        {model.groups.map((group) => (
          <div className="planned-group" key={group.id}>
            <div className="planned-title">
              <strong>{group.label}</strong>
              <span>Planned {group.formattedPlanned} · Actual {group.formattedActual}</span>
            </div>
            <div className="soft-progress">
              <div className="soft-progress-title">
                <strong>{group.label} progress</strong>
                <span>{group.progressDone} / {group.progressTarget || "soft"}</span>
              </div>
              <div className="soft-progress-track">
                <span style={{ width: `${group.progressWidth}%` }} />
              </div>
            </div>
            {group.rows.map((row) => (
              <label className={`planned-row ${row.className}`} key={row.id}>
                <strong>{row.shortLabel}</strong>
                <PlannedInput
                  groupId={group.id}
                  onCommit={commitValues}
                  onValueInput={persistInput}
                  row={row}
                  value={plannedInputValue(draftValues, row.id)}
                />
                <span>{row.formattedActual}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
