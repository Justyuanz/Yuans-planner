import type { WeeklyGoal } from "./weekly-goals";

interface WeeklyGoalsCardProps {
  goals: WeeklyGoal[];
}

export function WeeklyGoalsCard({ goals }: WeeklyGoalsCardProps) {
  return (
    <section className="goal-panel" aria-labelledby="weekly-goals-heading">
      <div className="section-heading">
        <div>
          <p className="section-kicker">First read-only boundary</p>
          <h2 id="weekly-goals-heading">Weekly goals</h2>
        </div>
        <span className="read-only-badge">Read only</span>
      </div>

      <p className="section-note">Keep these until they feel done.</p>

      <ul className="goal-list">
        {goals.map((goal) => (
          <li className={`goal-card goal-card--${goal.id}`} key={goal.id}>
            <div className="goal-label">
              <span className="goal-dot" aria-hidden="true" />
              <span>{goal.label}</span>
            </div>
            <p className={goal.text ? "goal-text" : "goal-text goal-text--empty"}>
              {goal.text || goal.placeholder}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
