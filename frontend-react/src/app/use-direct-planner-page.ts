import { useEffect, useState } from "react";

export function useDirectPlannerPage(dataReady: boolean): boolean {
  const [stylesReady, setStylesReady] = useState(false);

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
    if (!dataReady || !stylesReady) return;
    document.documentElement.dataset.plannerReady = "true";
    return () => {
      delete document.documentElement.dataset.plannerReady;
    };
  }, [dataReady, stylesReady]);

  return stylesReady;
}
