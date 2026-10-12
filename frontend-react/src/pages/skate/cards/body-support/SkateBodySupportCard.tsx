import { useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../../../api/planner-store";
import { makeTaskRelatedId } from "../../../../shared/tasks/task-options";
import {
  BODY_SUPPORT_OPTIONS,
  buildBodySupportModel,
  buildBodySupportUpdate,
  normalizeBodySupportType,
  type BodySupportType
} from "./skate-body-support";

interface SkateBodySupportCardProps {
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
  today: Date;
}

export function SkateBodySupportCard({ onPersist, store, today }: SkateBodySupportCardProps) {
  const model = buildBodySupportModel(store, today);
  const [type, setType] = useState<BodySupportType>("gym");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  function saveBodySupport(): void {
    const update = buildBodySupportUpdate(store, { minutes, note, type }, today, {
      id: makeTaskRelatedId("body"),
      timestamp: new Date().toISOString()
    });
    onPersist([update.write]);
    setType("gym");
    setMinutes("");
    setNote("");
  }

  return (
    <>
      <div className="section-head">
        <h2>Body support</h2>
        <p className="small-note" id="skateWeekLabel">{model.weekLabel}</p>
      </div>
      <form
        className="body-log-form"
        id="bodyLogForm"
        onSubmit={(event) => {
          event.preventDefault();
          saveBodySupport();
        }}
      >
        <label className="form-row" htmlFor="bodyWorkoutType">
          <span>Support type</span>
          <select
            id="bodyWorkoutType"
            value={type}
            onChange={(event) => setType(normalizeBodySupportType(event.target.value))}
          >
            {BODY_SUPPORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="form-row" htmlFor="bodyWorkoutMinutes">
          <span>Minutes</span>
          <input
            id="bodyWorkoutMinutes"
            type="number"
            min="0"
            max="600"
            step="5"
            inputMode="numeric"
            placeholder="30"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
        <label className="form-row body-log-note" htmlFor="bodyWorkoutName">
          <span>Note</span>
          <input
            id="bodyWorkoutName"
            maxLength={80}
            autoComplete="off"
            placeholder="Leg day, Yin yoga, ankle mobility..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button className="secondary-button" type="submit">Save body support</button>
      </form>
      <div className="body-support-metrics" id="skateWeeklyMetrics">
        {model.metrics.length === 0 ? (
          <p className="body-support-empty">Saved body support from this week will appear here.</p>
        ) : model.metrics.map((metric) => (
          <span className="body-support-chip" key={metric.label} title={metric.note || undefined}>
            <strong>{metric.label}</strong>
            <em>{metric.count}x</em>
            <span>{metric.minutesLabel}</span>
          </span>
        ))}
      </div>
    </>
  );
}
