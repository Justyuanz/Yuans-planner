import { useEffect } from "react";

export function useDirectPlannerPage(dataReady: boolean): void {
  useEffect(() => {
    document.body.classList.add("direct-planner-page");
    return () => {
      document.body.classList.remove("direct-planner-page");
    };
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    document.documentElement.dataset.plannerReady = "true";
    return () => {
      delete document.documentElement.dataset.plannerReady;
    };
  }, [dataReady]);
}
