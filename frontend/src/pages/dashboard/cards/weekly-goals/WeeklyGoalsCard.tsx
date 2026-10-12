import type { WeeklyGoal, WeeklyGoalId } from "./weekly-goals";

interface WeeklyGoalsCardProps {
  goals: readonly WeeklyGoal[];
  onGoalChange: (goalId: WeeklyGoalId, text: string) => void;
}

export function WeeklyGoalsCard({ goals, onGoalChange }: WeeklyGoalsCardProps) {
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
            defaultValue={goal.text}
            maxLength={120}
            onBlur={(event) => onGoalChange(goal.id, event.currentTarget.value)}
            placeholder={goal.placeholder}
            type="text"
          />
        </div>
      ))}
    </>
  );
}
