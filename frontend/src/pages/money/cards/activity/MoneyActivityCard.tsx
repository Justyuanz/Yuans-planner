import { useMemo } from "react";

import type { PlannerStore } from "@/api/planner-store";
import { buildMoneyActivity } from "./money-activity";

interface MoneyActivityCardProps {
  store: PlannerStore;
  today: Date;
}

export function MoneyActivityCard({ store, today }: MoneyActivityCardProps) {
  const model = useMemo(() => buildMoneyActivity(store, today), [store, today]);

  return (
    <details className="money-settings-panel">
      <summary className="money-settings-toggle">
        <span>Recent activity</span>
        <span className="hint">Open for the latest transactions.</span>
      </summary>
      <div className="money-settings-body">
        <div className="money-activity-list" id="moneyRecentActivity">
          {model.rows.length === 0 ? (
            <div className="money-vendor-row">
              <strong>No activity yet</strong>
              <span>Your latest spending will show up here.</span>
            </div>
          ) : model.rows.map((row, index) => (
            <div className="money-vendor-row" key={`${row.vendorAndDate}-${index}`}>
              <div className="money-vendor-head">
                <strong>{row.categoryName}</strong>
                <span>{row.vendorAndDate}</span>
              </div>
              <div className="money-vendor-metrics">
                <strong>{row.formattedAmount}</strong>
                <span>{row.categoryName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
