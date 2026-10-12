import { useMemo } from "react";

import type { PlannerStore } from "../../../../api/planner-store";
import { buildMoneyPacing } from "./money-pacing";

interface MoneyPacingCardProps {
  store: PlannerStore;
  today: Date;
}

interface MoneyBarRowsProps {
  rows: ReturnType<typeof buildMoneyPacing>["categories"];
}

function MoneyBarRows({ rows }: MoneyBarRowsProps) {
  return (
    <div className="money-bar-list">
      {rows.map((row) => (
        <div className="money-bar-row" key={row.label}>
          <div className="money-bar-head">
            <span>{row.label}</span>
            <span>{row.formattedValue}</span>
          </div>
          <div className="money-bar-track"><span style={{ width: `${row.fillPercent}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function MoneyPacingCard({ store, today }: MoneyPacingCardProps) {
  const model = useMemo(() => buildMoneyPacing(store, today), [store, today]);

  return (
    <>
      <div className="section-head">
        <div>
          <h3>Pace and projection</h3>
          <p className="small-note">The goal is clarity, not guilt. Let the pace explain what changed.</p>
        </div>
      </div>
      <div className="money-progress-list" id="moneyProgressList">
        {model.progress.map((card) => (
          <div className={card.className} key={card.title}>
            <strong className="chart-title">{card.title}</strong>
            <div className="money-progress-copy">
              <span>{card.spentLabel}</span>
              <span>{card.remainingLabel}</span>
              <span>{card.usedLabel}</span>
            </div>
            <div className="money-progress-track">
              <span style={{ width: `${card.fillPercent}%` }} />
            </div>
            {card.estimate !== null && (
              <div className="money-estimate-block">
                <div className="money-bar-head">
                  <span>Estimated spending</span>
                  <span>{card.estimate.formattedValue}</span>
                </div>
                <div className="money-bar-track">
                  <span style={{ width: `${card.estimate.fillPercent}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="chart-stack" id="moneyCharts">
        <div className="mini-chart money-chart-card">
          <strong className="chart-title">Remaining by category</strong>
          <MoneyBarRows rows={model.categories} />
        </div>
        <details className="mini-chart money-chart-card money-chart-dropdown">
          <summary className="money-chart-summary">
            <strong className="chart-title">Monthly spending over time</strong>
            <span>Show up to 12 months</span>
          </summary>
          <MoneyBarRows rows={model.history} />
        </details>
      </div>
    </>
  );
}
