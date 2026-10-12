import type { PatternHistoryModel } from "./pattern-history";

interface PatternHistoryDialogProps {
  model: PatternHistoryModel;
  onAction: (actionId: string) => void;
}

export function PatternHistoryDialog({ model, onAction }: PatternHistoryDialogProps) {
  return (
    <form className="feedback-panel pattern-history-panel" method="dialog">
      <div className="section-head">
        <div>
          <h2>Pattern history</h2>
          <p className="small-note" id="patternHistoryRange">{model.rangeLabel}</p>
        </div>
        <button className="secondary-button" id="closePatternHistory" type="submit">Close</button>
      </div>
      <div className="pattern-history-body" id="patternHistoryBody">
        {model.isEmpty ? (
          <p className="pattern-history-empty">
            There is not enough stable pattern evidence yet. Keep logging normally and this will fill in.
          </p>
        ) : model.groups.map((group) => (
          <section className="pattern-history-group" key={group.mode}>
            <h3 className="pattern-history-group-title">{group.title}</h3>
            {group.items.map((item) => (
              <article className="pattern-history-item" key={item.id}>
                <div className="pattern-history-item-head">
                  <strong>{item.title}</strong>
                  <span className="pattern-history-meta">{`${item.sampleSize} days`}</span>
                </div>
                <p className="pattern-history-summary">{item.summary}</p>
                {item.actions.length > 0 && (
                  <div className="insight-actions">
                    {item.actions.map((action) => (
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
                )}
                {item.evidence.length > 0 && (
                  <details className="pattern-history-evidence">
                    <summary>Show evidence</summary>
                    <ul>
                      {item.evidence.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </details>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </form>
  );
}
