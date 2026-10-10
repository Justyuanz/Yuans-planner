import { createPortal } from "react-dom";
import { useCallback, useMemo, useState } from "react";

import { persistPlannerWrites } from "../../app/planner-persistence";
import { PlannerShell } from "../../app/PlannerShell";
import { useDirectPlannerPage } from "../../app/use-direct-planner-page";
import { usePlannerStore } from "../../app/use-planner-store";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { SkateBodySupportCard } from "./SkateBodySupportCard";
import { SkateFeedbackDialog } from "./SkateFeedbackDialog";
import { SkateHeroCard } from "./SkateHeroCard";
import { SkateRoadmapCard } from "./SkateRoadmapCard";
import { SkateTrainingPlanCard } from "./SkateTrainingPlanCard";
import { buildSkateHeroState } from "./skate-hero";
import { buildSkateSettingsWrites, type SkateHeroSettingsAction } from "./skate-settings";
import { buildSkateTrainingPlanState } from "./skate-training-plan";
import { useSkateFeedbackController } from "./use-skate-feedback-controller";

interface SkatePageProps {
  today: Date;
}

export function SkatePage({ today }: SkatePageProps) {
  const plannerStore = usePlannerStore();
  const store = plannerStore.status === "ready" ? plannerStore.store : null;
  useDirectPlannerPage(store !== null);
  const todayKey = formatPlannerDate(today);
  const [initialNowMs] = useState(() => Date.now());
  const heroState = useMemo(
    () => store === null ? null : buildSkateHeroState(store, today, initialNowMs),
    [initialNowMs, store, today]
  );
  const trainingPlan = useMemo(
    () => store === null ? null : buildSkateTrainingPlanState(store, today),
    [store, today]
  );
  const saveSetting = useCallback((action: SkateHeroSettingsAction) => {
    if (store !== null) {
      persistPlannerWrites(buildSkateSettingsWrites(store, todayKey, action));
    }
  }, [store, todayKey]);
  const feedback = useSkateFeedbackController({
    heroState,
    onPersist: persistPlannerWrites,
    onSettingsAction: saveSetting,
    store,
    todayKey
  });
  const claimDialog = feedback.claimDialog;
  const dialogRef = useCallback((dialog: HTMLDialogElement | null) => {
    if (dialog !== null) claimDialog(dialog);
  }, [claimDialog]);

  if (store === null || feedback.heroState === null || trainingPlan === null) {
    return <div className="planner-loading">Loading planner…</div>;
  }

  return (
    <>
      <PlannerShell activeView="skateView" store={store} today={today}>
        <section className="view active" id="skateView" aria-labelledby="skateHeading">
          <div className="skate-page">
            <article className="panel skate-hero-card">
              <div className="panel-inner">
                <SkateHeroCard onAction={feedback.handleHeroAction} state={feedback.heroState} />
              </div>
            </article>

            <article className="panel skate-trends-card">
              <div className="panel-inner">
                <SkateRoadmapCard onLogDate={feedback.openRoadmapLog} store={store} today={today} />
              </div>
            </article>

            <article className="panel body-log-card">
              <div className="panel-inner">
                <SkateBodySupportCard onPersist={persistPlannerWrites} store={store} today={today} />
              </div>
            </article>

            <article className="panel skate-session-card">
              <div className="panel-inner">
                <SkateTrainingPlanCard state={trainingPlan} />
              </div>
            </article>
          </div>
        </section>
      </PlannerShell>

      <dialog className="feedback-dialog" id="skateFeedbackDialog" ref={dialogRef} />
      {feedback.dialog !== null && feedback.request !== null && createPortal(
        <SkateFeedbackDialog
          dialog={feedback.dialog}
          intensityForDate={feedback.intensityForDate}
          key={feedback.request.revision}
          onCancel={feedback.cancelFeedback}
          onSave={feedback.saveFeedback}
          request={feedback.request}
        />,
        feedback.dialog
      )}
    </>
  );
}
