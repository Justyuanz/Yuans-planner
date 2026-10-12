import type { CSSProperties } from "react";

import type { PlannerStore } from "@/api/planner-store";
import { buildSkateRoadmapModel, type SkateRoadmapLogRequest } from "./skate-roadmap";

interface SkateRoadmapCardProps {
  onLogDate: (request: SkateRoadmapLogRequest) => void;
  store: PlannerStore;
  today: Date;
}

type RoadmapGridStyle = CSSProperties & { "--roadmap-columns": string };

export function SkateRoadmapCard({ onLogDate, store, today }: SkateRoadmapCardProps) {
  const model = buildSkateRoadmapModel(store, today);
  const gridStyle: RoadmapGridStyle = { "--roadmap-columns": String(model.columnCount) };

  return (
    <>
      <div className="section-head">
        <div>
          <h2>Intensity roadmap</h2>
          <p className="small-note">
            Whole-season skate history. Click any day to log a missed session or add another one.
          </p>
        </div>
      </div>
      <div className="skate-roadmap" id="skateTrendCharts">
        {model.emptyMessage !== null ? (
          <p className="body-support-empty">{model.emptyMessage}</p>
        ) : (
          <>
            <div className="skate-roadmap-months">
              {model.months.map((month) => (
                <span
                  className="skate-roadmap-month"
                  key={`${month.label}-${month.column}`}
                  style={{ gridColumn: month.column }}
                >
                  {month.label}
                </span>
              ))}
            </div>
            <div className="skate-roadmap-grid" style={gridStyle}>
              {Array.from({ length: model.leadingBlanks }, (_, index) => (
                <span className="skate-roadmap-spacer" aria-hidden="true" key={`spacer-${index}`} />
              ))}
              {model.days.map((day) => (
                <button
                  aria-label={day.ariaLabel}
                  className={`skate-roadmap-day intensity-${day.intensity}`}
                  key={day.dateKey}
                  title={day.title}
                  type="button"
                  onClick={() => onLogDate({
                    dateKey: day.dateKey,
                    durationMinutes: day.durationMinutes,
                    intensity: day.selectedIntensity
                  })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
