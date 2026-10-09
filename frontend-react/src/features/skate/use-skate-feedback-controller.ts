import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import {
  dispatchSkateHeroAction,
  type SkateHeroAction,
  type SkateHeroState
} from "./skate-hero-bridge";
import type { SkateRoadmapLogRequest } from "./skate-roadmap";
import {
  buildSkateSessionSave,
  feedbackIntensityForDate,
  humanSkateDate,
  type SkateFeedbackRequest,
  type SkateFeedbackValue,
  type SkateSessionHeroSnapshot
} from "./skate-session-feedback";

interface SkateFeedbackControllerOptions {
  heroState: SkateHeroState | null;
  onHeroStateChange: Dispatch<SetStateAction<SkateHeroState | null>>;
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore | null;
  todayKey: string;
}

function elapsedSessionSeconds(startedAt: string, nowMs = Date.now()): number {
  const timestamp = Date.parse(startedAt);
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((nowMs - timestamp) / 1000)) : 0;
}

function sessionDurationMinutes(startedAt: string): number {
  return Math.max(1, Math.round(elapsedSessionSeconds(startedAt) / 60));
}

function timerLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function runningState(state: SkateHeroState, startedAt: string): SkateHeroState {
  return {
    ...state,
    finishDisabled: false,
    sessionHint: `Skate session running · ${timerLabel(elapsedSessionSeconds(startedAt))}`,
    startDisabled: true
  };
}

function heroSnapshot(state: SkateHeroState): SkateSessionHeroSnapshot {
  return {
    attemptBudget: state.attemptBudget,
    benchmarkLabel: state.benchmarkLabel,
    benchmarkVisible: state.benchmarkVisible,
    blockLabel: state.blockLabel,
    flowFocus: state.flowFocus,
    mainFocus: state.mainFocus
  };
}

export function useSkateFeedbackController({
  heroState,
  onHeroStateChange,
  onPersist,
  store,
  todayKey
}: SkateFeedbackControllerOptions) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [request, setRequest] = useState<SkateFeedbackRequest | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStartedAt === null) return;
    const timer = window.setInterval(() => {
      onHeroStateChange((state) => state === null ? null : runningState(state, sessionStartedAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onHeroStateChange, sessionStartedAt]);

  const claimDialog = useCallback((mount: HTMLDialogElement) => {
    mount.dataset.reactOwned = "true";
    mount.replaceChildren();
    setDialog(mount);
  }, []);

  const syncHeroState = useCallback((state: SkateHeroState) => {
    onHeroStateChange(sessionStartedAt === null ? state : runningState(state, sessionStartedAt));
  }, [onHeroStateChange, sessionStartedAt]);

  const openFeedback = useCallback((next: Omit<SkateFeedbackRequest, "intensity" | "revision"> & {
    intensity?: SkateRoadmapLogRequest["intensity"];
  }) => {
    if (store === null || heroState === null || dialog === null) return;
    const intensity = next.intensity ?? feedbackIntensityForDate(
      store,
      next.dateKey,
      todayKey,
      heroState.intensity
    );
    setRequest((current) => ({
      ...next,
      intensity,
      revision: (current?.revision ?? 0) + 1
    }));
    onHeroStateChange((state) => state === null ? null : { ...state, sessionHint: next.hint });
  }, [dialog, heroState, onHeroStateChange, store, todayKey]);

  const handleHeroAction = useCallback((action: SkateHeroAction, frame: HTMLIFrameElement) => {
    if (action.action === "start-session") {
      const startedAt = new Date().toISOString();
      setSessionStartedAt(startedAt);
      onHeroStateChange((state) => state === null ? null : {
        ...state,
        finishDisabled: false,
        sessionHint: "Skate session started. Go get the reps.",
        startDisabled: true
      });
      return;
    }
    if (action.action === "finish-session") {
      if (sessionStartedAt === null) {
        onHeroStateChange((state) => state === null ? null : {
          ...state,
          sessionHint: "No session is running yet. Use \"Log past session\" if you just want to save missed skate time."
        });
        return;
      }
      openFeedback({
        dateKey: todayKey,
        durationMinutes: sessionDurationMinutes(sessionStartedAt),
        hint: "Session ready to save for today."
      });
      return;
    }
    if (action.action === "log-session") {
      openFeedback({
        dateKey: todayKey,
        durationMinutes: 45,
        hint: "Logging a skate session without the timer is okay too."
      });
      return;
    }
    dispatchSkateHeroAction(frame, action);
  }, [onHeroStateChange, openFeedback, sessionStartedAt, todayKey]);

  const openRoadmapLog = useCallback((roadmapRequest: SkateRoadmapLogRequest) => {
    openFeedback({
      dateKey: roadmapRequest.dateKey,
      durationMinutes: roadmapRequest.durationMinutes,
      hint: `Logging for ${humanSkateDate(roadmapRequest.dateKey)}.`,
      intensity: roadmapRequest.intensity
    });
  }, [openFeedback]);

  const saveFeedback = useCallback((feedback: SkateFeedbackValue) => {
    if (store === null || heroState === null || dialog === null) return;
    const now = new Date();
    const result = buildSkateSessionSave(store, feedback, {
      hero: heroSnapshot(heroState),
      nowIso: now.toISOString(),
      sessionId: `skate-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      sessionStartedAt,
      todayKey
    });
    onPersist(result.writes);
    setSessionStartedAt(null);
    setRequest(null);
    dialog.close();
    onHeroStateChange((state) => state === null ? null : {
      ...state,
      finishDisabled: true,
      sessionHint: result.message,
      startDisabled: false
    });
  }, [dialog, heroState, onHeroStateChange, onPersist, sessionStartedAt, store, todayKey]);

  const intensityForDate = useCallback((dateKey: string) => feedbackIntensityForDate(
    store ?? {},
    dateKey,
    todayKey,
    heroState?.intensity
  ), [heroState?.intensity, store, todayKey]);

  return {
    cancelFeedback: () => setRequest(null),
    claimDialog,
    dialog,
    handleHeroAction,
    intensityForDate,
    openRoadmapLog,
    request,
    saveFeedback,
    syncHeroState
  };
}
