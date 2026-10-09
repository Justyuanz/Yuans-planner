import type { GuitarSessionModel } from "./guitar-session";

interface GuitarSessionCardProps {
  model: GuitarSessionModel;
  onFinish: () => void;
  onStart: () => void;
}

export function GuitarSessionCard({ model, onFinish, onStart }: GuitarSessionCardProps) {
  return (
    <>
      <div className="section-head">
        <h2>Session tracker</h2>
        <p className="small-note">Use the numbers, skip the guilt spiral.</p>
      </div>
      <div className="job-strip" aria-label="Guitar session status">
        <p className="job-strip-text" id="guitarSessionStatus">{model.status}</p>
        <div className="timer-controls">
          <button
            className="secondary-button"
            disabled={model.startDisabled}
            id="startGuitarSession"
            type="button"
            onClick={onStart}
          >
            Start session
          </button>
          <button
            className="primary-button"
            disabled={model.finishDisabled}
            id="finishGuitarSession"
            type="button"
            onClick={onFinish}
          >
            Finish session
          </button>
        </div>
      </div>
      <span className="hint" id="guitarSessionHint">{model.hint}</span>
      <div className="guitar-session-summary" id="guitarSessionSummary">
        {model.summary.map((item) => (
          <div className="guitar-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <p className="guitar-session-plan" id="guitarSessionPlan">{model.plan}</p>
      <div className="guitar-session-history" id="guitarRecentSessions">
        {model.history.map((item, index) => (
          <article
            className="guitar-history-item"
            key={`${item.date}:${item.title}:${index}`}
            title={item.title || undefined}
          >
            <div>
              <strong>{item.date}</strong>
              <p>{item.note}</p>
            </div>
            <em>{item.minutes} min</em>
          </article>
        ))}
        {model.history.length === 0 && (
          <p className="body-support-empty">
            Finish one session and this space will start showing what you practised and how long you stayed with it.
          </p>
        )}
      </div>
    </>
  );
}
