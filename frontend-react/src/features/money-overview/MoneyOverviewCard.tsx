import { useMemo } from "react";

import type { PlannerStore } from "../../api/planner-store";
import { buildMoneyOverview } from "./money-overview";

interface MoneyOverviewCardProps {
  store: PlannerStore;
  today: Date;
}

export function MoneyOverviewCard({ store, today }: MoneyOverviewCardProps) {
  const model = useMemo(() => buildMoneyOverview(store, today), [store, today]);

  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="moneyHeading">Money planner</h2>
          <p className="small-note">
            Keep the money visible enough that your brain does not have to hold it all.
          </p>
        </div>
        <div className="date-pill" id="moneyMonthLabel">{model.monthLabel}</div>
      </div>
      <div className="money-overview-grid" id="moneyOverviewGrid">
        {model.stats.map((stat) => (
          <div className={stat.className} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.formattedValue}</strong>
            <span>{stat.note}</span>
          </div>
        ))}
      </div>
    </>
  );
}
