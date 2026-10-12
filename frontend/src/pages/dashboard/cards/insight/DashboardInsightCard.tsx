import type { DashboardInsightModel } from "./dashboard-insight";

interface DashboardInsightCardProps {
  model: DashboardInsightModel;
  onAction: (actionId: string) => void;
  onOpenHistory: () => void;
}

export function DashboardInsightCard({ model, onAction, onOpenHistory }: DashboardInsightCardProps) {
  return (
    <>
      <div className="section-head">
        <h3>Pattern noticed</h3>
        <p className="small-note" id="dashboardInsightMode">{model.modeText}</p>
      </div>
      <p className="insight-title" id="dashboardInsightTitle">{model.title}</p>
      <p className="insight-why" id="dashboardInsightWhy">{model.why}</p>
      <div className="insight-actions" id="dashboardInsightActions">
        {model.actions.map((action) => (
          <button
            className="insight-action"
            key={action.id}
            onClick={() => onAction(action.id)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
      <button
        className="insight-link-button"
        id="openPatternHistory"
        onClick={onOpenHistory}
        type="button"
      >
        View pattern history
      </button>
    </>
  );
}
