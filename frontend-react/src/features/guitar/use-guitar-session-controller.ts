import { useCallback, useEffect, useMemo, useState } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../api/planner-store";
import {
  buildGuitarSessionModel,
  guitarSessionDurationMinutes,
  type GuitarSessionDialogRequest
} from "./guitar-session";
import {
  buildGuitarSessionSave,
  type GuitarSessionFeedback
} from "./guitar-session-persistence";

interface GuitarSessionControllerOptions {
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore | null;
  today: Date;
  todayKey: string;
}

export function useGuitarSessionController({
  onPersist,
  store,
  today,
  todayKey
}: GuitarSessionControllerOptions) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [request, setRequest] = useState<GuitarSessionDialogRequest | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStartedAt === null) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt]);

  const model = useMemo(() => store === null ? null : buildGuitarSessionModel(
    store,
    today,
    sessionStartedAt,
    nowMs,
    hint
  ), [hint, nowMs, sessionStartedAt, store, today]);

  const claimDialog = useCallback((mount: HTMLDialogElement) => {
    mount.dataset.reactOwned = "true";
    mount.replaceChildren();
    setDialog(mount);
  }, []);

  const startSession = useCallback(() => {
    const startedAt = new Date().toISOString();
    setNowMs(Date.parse(startedAt));
    setHint(null);
    setSessionStartedAt(startedAt);
  }, []);

  const finishSession = useCallback(() => {
    if (sessionStartedAt === null || dialog === null) return;
    setRequest((current) => ({
      durationMinutes: guitarSessionDurationMinutes(sessionStartedAt, Date.now()),
      revision: (current?.revision ?? 0) + 1
    }));
  }, [dialog, sessionStartedAt]);

  const saveSession = useCallback((feedback: GuitarSessionFeedback) => {
    if (store === null || sessionStartedAt === null || dialog === null) return;
    const now = new Date();
    const result = buildGuitarSessionSave(store, feedback, {
      nowIso: now.toISOString(),
      sessionId: `guitar-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      sessionStartedAt,
      todayKey
    });
    onPersist(result.writes);
    setHint(result.message);
    setRequest(null);
    setSessionStartedAt(null);
    dialog.close();
  }, [dialog, onPersist, sessionStartedAt, store, todayKey]);

  return {
    cancelSession: () => setRequest(null),
    claimDialog,
    dialog,
    finishSession,
    model,
    request,
    saveSession,
    startSession
  };
}
