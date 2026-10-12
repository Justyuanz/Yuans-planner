import { useMemo } from "react";

import type { PlannerStore } from "@/api/planner-store";
import { buildMoneyVendors } from "./money-vendors";

interface MoneyVendorsCardProps {
  store: PlannerStore;
  today: Date;
}

export function MoneyVendorsCard({ store, today }: MoneyVendorsCardProps) {
  const model = useMemo(() => buildMoneyVendors(store, today), [store, today]);

  return (
    <>
      <div className="section-head">
        <div>
          <h3>Vendors</h3>
          <p className="small-note">
            See who gets the money, how often, and what category they usually land in.
          </p>
        </div>
      </div>
      <div id="moneyVendorList">
        <div className="money-vendor-list">
          {model.rows.length === 0 ? (
            <div className="money-vendor-row">
              <strong>No vendors yet</strong>
              <span>Transactions with vendor names will build this automatically.</span>
            </div>
          ) : model.rows.map((row) => (
            <div className="money-vendor-row" key={row.vendor}>
              <div className="money-vendor-head">
                <strong>{row.vendor}</strong>
                <span>{row.detail}</span>
              </div>
              <div className="money-vendor-metrics">
                <strong>{row.formattedSpent}</strong>
                <span>Prev month {row.formattedPreviousMonthSpent}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
