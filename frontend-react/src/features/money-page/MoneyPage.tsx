import { PlannerShell } from "../../app/PlannerShell";
import { persistPlannerWrites } from "../../app/planner-persistence";
import { useDirectPlannerPage } from "../../app/use-direct-planner-page";
import { usePlannerStore } from "../../app/use-planner-store";
import { MoneyActivityCard } from "../money-activity/MoneyActivityCard";
import { MoneyBudgetsCard } from "../money-budgets/MoneyBudgetsCard";
import { MoneyOverviewCard } from "../money-overview/MoneyOverviewCard";
import { MoneyPacingCard } from "../money-pacing/MoneyPacingCard";
import { MoneyVendorsCard } from "../money-vendors/MoneyVendorsCard";

interface MoneyPageProps {
  today: Date;
}

export function MoneyPage({ today }: MoneyPageProps) {
  const plannerStore = usePlannerStore();
  const store = plannerStore.status === "ready" ? plannerStore.store : null;
  useDirectPlannerPage(store !== null);

  if (store === null) {
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
