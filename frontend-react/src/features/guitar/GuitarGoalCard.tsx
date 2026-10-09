import type { GuitarGoalField, GuitarGoalModel } from "./guitar-goal";

interface GuitarGoalCardProps {
  model: GuitarGoalModel;
  onChange: (field: GuitarGoalField, value: string) => void;
}

export function GuitarGoalCard({ model, onChange }: GuitarGoalCardProps) {
  return (
    <>
      <div className="section-head">
        <h2 id="guitarHeading">Progress planner</h2>
        <p className="small-note">Keep the target specific enough to practise.</p>
      </div>
      <label className="form-row" htmlFor="guitarFocusInput">
        <span>Current focus</span>
        <input
          autoComplete="off"
          defaultValue={model.focus}
          id="guitarFocusInput"
          maxLength={90}
          onInput={(event) => onChange("focus", event.currentTarget.value)}
          placeholder="Chord changes, fingerpicking, one song..."
        />
      </label>
      <label className="form-row" htmlFor="guitarNextStepInput">
        <span>Small thing to practice</span>
        <input
          autoComplete="off"
          defaultValue={model.nextStep}
          id="guitarNextStepInput"
          maxLength={120}
          onInput={(event) => onChange("nextStep", event.currentTarget.value)}
          placeholder="One chord change, one picking pattern, one section of a song..."
        />
      </label>
    </>
  );
}
