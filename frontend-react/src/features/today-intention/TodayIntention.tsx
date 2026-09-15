import type { TodayIntentionModel } from "./today-intention";

interface TodayIntentionProps {
  model: TodayIntentionModel;
}

export function TodayIntention({ model }: TodayIntentionProps) {
  return (
    <div className="intention-block-head">
      <strong>{model.label}</strong>
      <span
        className={`progress-pill day-type-pill ${model.className}`}
        id="todayThemeBadge"
      >
        {model.dayTypeLabel}
      </span>
    </div>
  );
}
