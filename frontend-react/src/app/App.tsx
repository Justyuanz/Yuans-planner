import { WeeklyGoalsCard } from "../features/weekly-goals/WeeklyGoalsCard";
import { decodeWeeklyGoals } from "../features/weekly-goals/weekly-goals";
import { usePlannerStore } from "./use-planner-store";

export function App() {
  const plannerStore = usePlannerStore();

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">React migration preview</p>
        <h1>Yuan&apos;s Planner</h1>
        <p className="hero-copy">
          A small, typed view of the existing planner data. The legacy app remains active while
          features move here one at a time.
        </p>
      </header>

      {plannerStore.status === "loading" && (
        <section className="status-panel" aria-live="polite">
          <span className="status-orb" aria-hidden="true" />
          <p>Loading weekly goals…</p>
        </section>
      )}

      {plannerStore.status === "error" && (
        <section className="status-panel status-panel--error" role="alert">
          <p className="status-title">The planner data is not available yet.</p>
          <p>{plannerStore.message}</p>
        </section>
      )}

      {plannerStore.status === "ready" && (
        <WeeklyGoalsCard goals={decodeWeeklyGoals(plannerStore.store)} />
      )}

      <footer>
        <span className="footer-dot" aria-hidden="true" />
        Existing SQLite data, read without changes
      </footer>
    </main>
  );
}
