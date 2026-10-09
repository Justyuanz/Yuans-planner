import type { SkateTrainingPlanState } from "./skate-training-plan-bridge";

interface SkateTrainingPlanCardProps {
  state: SkateTrainingPlanState;
}

export function SkateTrainingPlanCard({ state }: SkateTrainingPlanCardProps) {
  return (
    <>
      <div className="section-head">
        <h2>Training plan</h2>
        <p className="small-note">
          The actual program for today and this week, straight from your checked-in plan.
        </p>
      </div>
      <div className="skate-coach-flow" id="skateCoachFlow">
        <div className="skate-plan-stack">
          {state.emptyMessage ? (
            <p className="body-support-empty">{state.emptyMessage}</p>
          ) : state.today !== null && state.week !== null ? (
            <>
              <section className="skate-plan-card skate-plan-today">
                <div className="skate-plan-head">
                  <div>
                    <span className="skate-plan-kicker">{state.today.kicker}</span>
                    <h3>{state.today.title}</h3>
                    <p>{state.today.description}</p>
                  </div>
                </div>
                <div className="skate-plan-grid">
                  {state.today.blocks.map((block) => (
                    <article className="skate-plan-block" key={block.label}>
                      <span>{block.label}</span>
                      <strong>{block.value}</strong>
                    </article>
                  ))}
                </div>
                {state.today.note && <p className="skate-plan-note">{state.today.note}</p>}
              </section>
              <section className="skate-plan-card">
                <div className="skate-plan-head">
                  <div>
                    <span className="skate-plan-kicker">{state.week.kicker}</span>
                    <h3>{state.week.title}</h3>
                    <p>{state.week.description}</p>
                  </div>
                </div>
                <div className="skate-plan-list">
                  {state.week.rows.map((row) => (
                    <article
                      className={[
                        "skate-plan-row",
                        `intensity-${row.intensity}`,
                        row.current ? "is-current" : "",
                        row.preview ? "is-preview" : ""
                      ].filter(Boolean).join(" ")}
                      key={`${row.label}-${row.title}`}
                    >
                      <div className="skate-plan-row-top">
                        <span>{row.label}</span>
                        <strong>{row.title}</strong>
                        <em>{row.intensityLabel}</em>
                      </div>
                      <p className="skate-plan-row-copy">{row.subtitle}</p>
                      <p className="skate-plan-row-detail">{row.detail}</p>
                      {row.benchmark && <span className="skate-plan-pill">{row.benchmark}</span>}
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
