import type { WeeklyGoal } from "./weekly-goals";

interface WeeklyGoalsCardProps {
  goals: readonly WeeklyGoal[];
}

export function WeeklyGoalsCard({ goals }: WeeklyGoalsCardProps) {
  return (
    <>
      {goals.map((goal) => (
        <div className="weekly-goal-card" key={goal.id}>
          <div className="weekly-goal-track">
            <span className={`weekly-goal-dot ${goal.id}`} aria-hidden="true" />
            <span>{goal.label}</span>
          </div>
          <input
            aria-label={`${goal.label} weekly goal`}
            className="weekly-goal-input"
            maxLength={120}
            placeholder={goal.placeholder}
            readOnly
            type="text"
            value={goal.text}
          />
        </div>
      ))}
    </>
  );
}
