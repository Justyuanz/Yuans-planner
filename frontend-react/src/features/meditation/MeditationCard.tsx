import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import {
  buildMeditation,
  cancelMeditation,
  finishMeditation,
  MEDITATION_STORAGE_KEY,
  startMeditation,
  type MeditationUpdate
} from "./meditation";

interface MeditationCardProps {
  frame: HTMLIFrameElement;
  initialNowMs: number;
  initialSelectedDate: string;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
}

interface OptimisticMeditation {
  baseValue: string | undefined;
  value: string;
}

function localStore(store: PlannerStore, optimistic: OptimisticMeditation | null): PlannerStore {
  if (optimistic === null) {
    return store;
  }
  const incoming = store[MEDITATION_STORAGE_KEY];
  return incoming === optimistic.baseValue || incoming === optimistic.value
    ? { ...store, [MEDITATION_STORAGE_KEY]: optimistic.value }
    : store;
}

function randomId(): string {
  return `meditation-${Math.random().toString(36).slice(2, 10)}`;
}

export function MeditationCard({
  frame,
  initialNowMs,
  initialSelectedDate,
  onPersist,
  store
}: MeditationCardProps) {
  const [duration, setDuration] = useState("10");
  const [nowMs, setNowMs] = useState(initialNowMs);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [completionNotice, setCompletionNotice] = useState(false);
  const [optimistic, setOptimistic] = useState<OptimisticMeditation | null>(null);
  const effectiveStore = useMemo(() => localStore(store, optimistic), [optimistic, store]);
  const model = useMemo(
    () => buildMeditation(effectiveStore, selectedDate, nowMs),
    [effectiveStore, nowMs, selectedDate]
  );

  function applyUpdate(update: MeditationUpdate): void {
    setOptimistic((current) => ({
      baseValue: current?.baseValue ?? store[MEDITATION_STORAGE_KEY],
      value: update.write.value
    }));
    onPersist([update.write]);
  }

  useEffect(() => {
    function syncSelectedDate(): void {
      const input = frame.contentDocument?.querySelector<HTMLInputElement>("#journalDate");
      if (input?.value) {
        setSelectedDate(input.value);
      }
    }
    const frameWindow = frame.contentWindow;
    frameWindow?.addEventListener("change", syncSelectedDate);
    frameWindow?.addEventListener("click", syncSelectedDate);
    return () => {
      frameWindow?.removeEventListener("change", syncSelectedDate);
      frameWindow?.removeEventListener("click", syncSelectedDate);
    };
  }, [frame]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentNowMs = Date.now();
      const update = finishMeditation(effectiveStore, currentNowMs);
      setNowMs(currentNowMs);
      if (update === null) {
        setCompletionNotice(false);
        return;
      }
      setOptimistic((current) => ({
        baseValue: current?.baseValue ?? store[MEDITATION_STORAGE_KEY],
        value: update.write.value
      }));
      onPersist([update.write]);
      setCompletionNotice(true);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [effectiveStore, onPersist, store]);

  function start(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const update = startMeditation(effectiveStore, duration, Date.now(), randomId());
    if (update !== null) {
      setCompletionNotice(false);
      setNowMs(Date.now());
      applyUpdate(update);
    }
  }

  function cancel(): void {
    setCompletionNotice(false);
    applyUpdate(cancelMeditation(effectiveStore));
  }

  return (
    <>
      <div>
        <h3 id="meditationHeading">A quiet moment</h3>
        <p className="small-note">Meditate today. Completed minutes flow into Mind.</p>
      </div>
      <form className="meditation-controls" id="meditationForm" onSubmit={start}>
        <label htmlFor="meditationMinutes">
          Minutes
          <input
            disabled={model.active}
            id="meditationMinutes"
            max={180}
            min={1}
            onChange={(event) => setDuration(event.currentTarget.value)}
            required
            step={1}
            type="number"
            value={duration}
          />
        </label>
        <output aria-label="Meditation time remaining" id="meditationCountdown">{model.countdown}</output>
        <button className="secondary-button" disabled={model.active} id="startMeditation" type="submit">
          Start
        </button>
        <button className="secondary-button" hidden={!model.active} id="cancelMeditation" onClick={cancel} type="button">
          Cancel
        </button>
      </form>
      <p className="small-note" id="meditationStatus" role="status">
        {completionNotice ? "Meditation complete. Saved to Mind." : model.status}
      </p>
    </>
  );
}
