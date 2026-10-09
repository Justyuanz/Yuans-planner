import { useCallback } from "react";
import { createPortal } from "react-dom";

import { persistPlannerWrites } from "../../app/planner-persistence";
import { PlannerShell } from "../../app/PlannerShell";
import { useDirectPlannerPage } from "../../app/use-direct-planner-page";
import { usePlannerStore } from "../../app/use-planner-store";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { GuitarGoalCard } from "./GuitarGoalCard";
import { GuitarSessionCard } from "./GuitarSessionCard";
import { GuitarSessionDialog } from "./GuitarSessionDialog";
import { buildGuitarGoalModel, buildGuitarGoalWrite } from "./guitar-goal";
import { useGuitarSessionController } from "./use-guitar-session-controller";

interface GuitarPageProps {
  today: Date;
}

export function GuitarPage({ today }: GuitarPageProps) {
  const plannerStore = usePlannerStore();
  const store = plannerStore.status === "ready" ? plannerStore.store : null;
  const stylesReady = useDirectPlannerPage(store !== null);
  const session = useGuitarSessionController({
    onPersist: persistPlannerWrites,
    store,
    today,
    todayKey: formatPlannerDate(today)
  });
  const claimDialog = session.claimDialog;
  const dialogRef = useCallback((dialog: HTMLDialogElement | null) => {
    if (dialog !== null) claimDialog(dialog);
  }, [claimDialog]);

  if (store === null || !stylesReady || session.model === null) {
    return <div className="planner-loading">Loading planner…</div>;
  }

  return (
    <>
      <PlannerShell activeView="guitarView" store={store} today={today}>
        <section className="view active" id="guitarView" aria-labelledby="guitarHeading">
          <div className="guitar-page">
            <article className="panel guitar-goal-card">
              <div className="panel-inner">
                <GuitarGoalCard
                  model={buildGuitarGoalModel(store)}
                  onChange={(field, value) => persistPlannerWrites([
                    buildGuitarGoalWrite(field, value)
                  ])}
                />
              </div>
            </article>

            <article className="panel guitar-session-card">
              <div className="panel-inner">
                <GuitarSessionCard
                  model={session.model}
                  onFinish={session.finishSession}
                  onStart={session.startSession}
                />
              </div>
            </article>
          </div>
        </section>
      </PlannerShell>

      <dialog className="feedback-dialog" id="guitarSessionDialog" ref={dialogRef} />
      {session.dialog !== null && session.request !== null && createPortal(
        <GuitarSessionDialog
          dialog={session.dialog}
          key={session.request.revision}
          onCancel={session.cancelSession}
          onSave={session.saveSession}
          request={session.request}
        />,
        session.dialog
      )}
    </>
  );
}
