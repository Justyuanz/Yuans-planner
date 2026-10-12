import { useMemo } from "react";

import type { PlannerStore } from "../../../../api/planner-store";
import { buildEnergyTrail } from "./energy-trail";

interface EnergyTrailCardProps {
  onOpenJournalDate: (date: string) => void;
  store: PlannerStore;
  today: Date;
}

export function EnergyTrailCard({ onOpenJournalDate, store, today }: EnergyTrailCardProps) {
  const model = useMemo(() => buildEnergyTrail(store, today), [store, today]);

  return (
    <>
      <div className="section-head">
        <div>
          <h3>Energy trail</h3>
          <p className="small-note">Recent check-ins so shutdown days stop disappearing into blur.</p>
        </div>
      </div>
      <div className="state-trail-list" id="energyTrailList" aria-live="polite">
        {model.items.length === 0 ? (
          <p className="pattern-history-empty">
            Start with one tiny check-in. Your recent energy trail will show up here.
          </p>
        ) : model.items.map((item, index) => (
          <button
            className="state-trail-item"
            key={`${item.id}:${index}`}
            onClick={() => onOpenJournalDate(item.date)}
            type="button"
          >
            <div className="state-trail-head">
              <strong>{item.dateLabel}</strong>
              <span className="state-trail-chips">{item.summary}</span>
            </div>
            {item.context && <p className="state-trail-context">{item.context}</p>}
          </button>
        ))}
      </div>
      <p className="state-pattern-note" id="energyPatternNote">{model.patternText}</p>
    </>
  );
}
