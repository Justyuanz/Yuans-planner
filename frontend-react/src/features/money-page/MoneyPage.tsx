import { useEffect, useState } from "react";

import type { PlannerStoreWrite } from "../../api/planner-store";
import { putPlannerStoreValue } from "../../api/planner-store";
import { PlannerShell } from "../../app/PlannerShell";
import { usePlannerStore } from "../../app/use-planner-store";
import { MoneyActivityCard } from "../money-activity/MoneyActivityCard";
import { MoneyBudgetsCard } from "../money-budgets/MoneyBudgetsCard";
import { MoneyOverviewCard } from "../money-overview/MoneyOverviewCard";
import { MoneyPacingCard } from "../money-pacing/MoneyPacingCard";
import { MoneyVendorsCard } from "../money-vendors/MoneyVendorsCard";

interface MoneyPageProps {
  today: Date;
}

function persistPlannerWrites(writes: readonly PlannerStoreWrite[]): void {
  writes.forEach(({ key, value }) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // SQLite persistence remains available when browser storage is blocked.
    }
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
    void putPlannerStoreValue(key, value).catch(() => undefined);
  });
}

export function MoneyPage({ today }: MoneyPageProps) {
  const plannerStore = usePlannerStore();
  const [stylesReady, setStylesReady] = useState(false);
  const store = plannerStore.status === "ready" ? plannerStore.store : null;

  useEffect(() => {
    document.body.classList.add("direct-planner-page");
    const stylesheet = document.createElement("link");
    stylesheet.href = "/css/styles.css?v=20260907a";
    stylesheet.rel = "stylesheet";
    stylesheet.addEventListener("load", () => setStylesReady(true));
    document.head.appendChild(stylesheet);
    return () => {
      document.body.classList.remove("direct-planner-page");
      stylesheet.remove();
    };
  }, []);

  useEffect(() => {
    if (store === null || !stylesReady) return;
    document.documentElement.dataset.plannerReady = "true";
    return () => {
      delete document.documentElement.dataset.plannerReady;
    };
  }, [store, stylesReady]);

  if (store === null || !stylesReady) {
    return <div className="planner-loading">Loading planner…</div>;
  }

  return (
    <PlannerShell activeView="moneyView" store={store} today={today}>
      <section className="view active" id="moneyView" aria-labelledby="moneyHeading">
        <div className="money-page">
          <article className="panel money-overview-card"><div className="panel-inner">
            <MoneyOverviewCard store={store} today={today} />
          </div></article>
          <article className="panel money-pacing-card"><div className="panel-inner">
            <MoneyPacingCard store={store} today={today} />
          </div></article>
          <article className="panel money-vendors-card"><div className="panel-inner">
            <MoneyVendorsCard store={store} today={today} />
          </div></article>
          <article className="panel money-activity-card"><div className="panel-inner">
            <MoneyActivityCard store={store} today={today} />
          </div></article>
          <article className="panel money-budget-card"><div className="panel-inner">
            <MoneyBudgetsCard onPersist={persistPlannerWrites} store={store} today={today} />
          </div></article>
        </div>
      </section>
    </PlannerShell>
  );
}
