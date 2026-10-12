import { DAY_STATE_OPTIONS, type DayStateId } from "./day-state";

interface DayStateOptionsProps {
  activeState: DayStateId;
  onSelect: (state: DayStateId) => void;
}

export function DayStateOptions({ activeState, onSelect }: DayStateOptionsProps) {
  return DAY_STATE_OPTIONS.map(({ id, label }) => (
    <button
      className={`day-state-chip${id === activeState ? " is-active" : ""}`}
      data-day-state={id}
      key={id}
      onClick={() => onSelect(id)}
      type="button"
    >
      {label}
    </button>
  ));
}
