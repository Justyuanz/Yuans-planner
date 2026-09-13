import { useState } from "react";
import { createPortal } from "react-dom";

import { WeeklyGoalsCard } from "../features/weekly-goals/WeeklyGoalsCard";
import { decodeWeeklyGoals } from "../features/weekly-goals/weekly-goals";
import { usePlannerStore } from "./use-planner-store";

export function App() {
  const plannerStore = usePlannerStore();
  const [weeklyGoalsMount, setWeeklyGoalsMount] = useState<HTMLElement | null>(null);

  function claimWeeklyGoalsMount(frame: HTMLIFrameElement): void {
    const mount = frame.contentDocument?.getElementById("weeklyGoals");
    if (mount === null || mount === undefined) {
      return;
    }

    // The legacy renderer respects this marker so React remains the sole owner of the boundary.
    mount.dataset.reactOwned = "true";
    setWeeklyGoalsMount(mount);
  }

  const legacyUrl = `/legacy/${window.location.search}`;

  return (
    <>
      <iframe
        className="planner-frame"
        onLoad={(event) => claimWeeklyGoalsMount(event.currentTarget)}
        src={legacyUrl}
        title="Yuan's Planner"
      />
      {plannerStore.status === "ready" && weeklyGoalsMount !== null && (
        createPortal(
          <WeeklyGoalsCard goals={decodeWeeklyGoals(plannerStore.store)} />,
          weeklyGoalsMount
        )
      )}
    </>
  );
}
