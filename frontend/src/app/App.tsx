import { RouterProvider } from "react-router";

import { plannerRouter } from "./planner-router";
import { PlannerStoreProvider } from "./PlannerStoreProvider";

export function App() {
  return (
    // Keep the data load outside the router so changing pages does not load it again.
    <PlannerStoreProvider>
      <RouterProvider router={plannerRouter} />
    </PlannerStoreProvider>
  );
}
