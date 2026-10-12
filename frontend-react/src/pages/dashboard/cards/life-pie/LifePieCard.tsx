import { useEffect, useMemo, useState } from "react";

import type { PlannerStore } from "@/api/planner-store";
import type { ActivityPeriod } from "@/shared/activity-totals";
import { LIFE_PIE_PERIODS } from "./life-pie-definitions";
import { buildLifePie } from "./life-pie";

interface LifePieCardProps {
  initialNowMs: number;
  store: PlannerStore;
  today: Date;
}

export function LifePieCard({ initialNowMs, store, today }: LifePieCardProps) {
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const model = useMemo(
    () => buildLifePie(store, period, today, nowMs),
    [nowMs, period, store, today]
  );

  return (
    <>
      <div className="section-head">
        <h3>Life pie</h3>
        <div className="mini-tabs" id="statsPeriodTabs" aria-label="Statistics period">
          {LIFE_PIE_PERIODS.map((option) => (
            <button
              className={`period-button${period === option.id ? " active" : ""}`}
              key={option.id}
              onClick={() => setPeriod(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="life-pie">
        <div
          className="donut"
          id="lifeDonut"
          aria-label={model.ariaLabel}
          style={{ background: model.background }}
        >
          <span id="lifeDonutLabel">{model.formattedTotal}</span>
        </div>
        <div className="pie-summary" id="lifeSummary">
          {model.groups.map((group) => (
            <div className="pie-summary-row" key={group.label}>
              <strong><i className="life-dot" style={{ background: group.color }} />{group.label}</strong>
              <span>{group.summary}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pie-breakdown" id="lifeBreakdown">
        {model.activities.map((activity) => (
          <div className="breakdown-row" key={activity.id}>
            <strong><i className="life-dot" style={{ background: activity.color }} />{activity.label}</strong>
            <span>{activity.summary}</span>
          </div>
        ))}
      </div>
    </>
  );
}
