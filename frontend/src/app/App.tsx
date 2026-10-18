import { RouterProvider } from "react-router";

import { plannerRouter } from "./planner-router";

export function App() {
  return <RouterProvider router={plannerRouter} />;
}
