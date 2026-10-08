import { useMemo, useState } from "react";

import type { PlannerStore } from "../../api/planner-store";
import { persistPlannerWrites } from "../../app/planner-persistence";
import { PlannerShell } from "../../app/PlannerShell";
import { useDirectPlannerPage } from "../../app/use-direct-planner-page";
import { usePlannerStore } from "../../app/use-planner-store";
import { JournalArchiveCard } from "../journal-archive/JournalArchiveCard";
import { JournalEditorCard } from "../journal-editor/JournalEditorCard";
import type { JournalEntryUpdate } from "../journal-editor/journal-editor";
import { formatPlannerDate } from "../life-pie/life-pie-store";
import { MeditationCard } from "../meditation/MeditationCard";

interface JournalPageProps {
  today: Date;
}

interface OptimisticValue {
  baseValue: string | undefined;
  value: string;
}

type OptimisticWrites = Readonly<Record<string, OptimisticValue>>;

function applyOptimisticWrites(store: PlannerStore, writes: OptimisticWrites): PlannerStore {
  return Object.entries(writes).reduce<PlannerStore>((current, [key, write]) => {
    const incoming = store[key];
    return incoming === write.baseValue || incoming === write.value
      ? { ...current, [key]: write.value }
      : current;
  }, store);
}

export function JournalPage({ today }: JournalPageProps) {
  const plannerStore = usePlannerStore();
  const loadedStore = plannerStore.status === "ready" ? plannerStore.store : null;
  const stylesReady = useDirectPlannerPage(loadedStore !== null);
  const [selectedDate, setSelectedDate] = useState(() => formatPlannerDate(today));
  const [initialNowMs] = useState(() => Date.now());
  const [optimisticWrites, setOptimisticWrites] = useState<OptimisticWrites>({});
  const store = useMemo(
    () => loadedStore === null ? null : applyOptimisticWrites(loadedStore, optimisticWrites),
    [loadedStore, optimisticWrites]
  );

  if (store === null || !stylesReady) {
    return <div className="planner-loading">Loading planner…</div>;
  }

  function persistJournalUpdate(update: JournalEntryUpdate): void {
    setOptimisticWrites((current) => update.writes.reduce<OptimisticWrites>(
      (next, write) => ({
        ...next,
        [write.key]: {
          baseValue: current[write.key]?.baseValue ?? loadedStore?.[write.key],
          value: write.value
        }
      }),
      current
    ));
    persistPlannerWrites(update.writes);
  }

  const readyStore = store;
  const todayDate = formatPlannerDate(today);
  return (
    <PlannerShell activeView="journalView" store={readyStore} today={today}>
      <section className="view active" id="journalView" aria-labelledby="journalHeading">
        <div className="journal-page">
          <article className="panel journal-editor-card">
            <div className="panel-inner">
              <JournalEditorCard
                key={selectedDate}
                meditation={(
                  <section className="meditation-card" aria-labelledby="meditationHeading">
                    <MeditationCard
                      initialNowMs={initialNowMs}
                      onPersist={persistPlannerWrites}
                      selectedDate={selectedDate}
                      store={readyStore}
                    />
                  </section>
                )}
                onPersist={persistJournalUpdate}
                onSelectDate={setSelectedDate}
                selectedDate={selectedDate}
                store={readyStore}
                todayDate={todayDate}
              />
            </div>
          </article>

          <aside className="panel journal-archive-card">
            <div className="panel-inner">
              <JournalArchiveCard
                onOpenJournalDate={setSelectedDate}
                selectedDate={selectedDate}
                store={readyStore}
              />
            </div>
          </aside>
        </div>
      </section>
    </PlannerShell>
  );
}
