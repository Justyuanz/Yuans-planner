import type { SkateHeroAction, SkateHeroState, SkateIntensity } from "./skate-hero-bridge";

interface SkateHeroCardProps {
  onAction: (action: SkateHeroAction) => void;
  state: SkateHeroState;
}

type SkateHeroSectionProps = SkateHeroCardProps;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INTENSITIES: readonly SkateIntensity[] = ["blue", "yellow", "green"];

function SkateProgramDayInput({ onAction, state }: SkateHeroSectionProps) {
  function commitProgramDay(input: HTMLInputElement): void {
    const draftDay = input.value;
    // Keep the last rendered value visible until the legacy rules return a normalized day.
    input.value = state.currentDay;
    onAction({ action: "set-current-day", value: draftDay });
  }

  return (
    <input
      key={state.currentDay}
      id="skateCurrentDay"
      type="number"
      min="1"
      max="60"
      step="1"
      inputMode="numeric"
      aria-label="Current SkateIQ day"
      defaultValue={state.currentDay}
      onBlur={(event) => commitProgramDay(event.currentTarget)}
    />
  );
}

function SkateSettings({ onAction, state }: SkateHeroSectionProps) {
  return (
    <div className="skate-settings-strip">
      <label className="skate-setting-field" htmlFor="skateRestDay">
        <span>Rest day</span>
        <select
          id="skateRestDay"
          aria-label="Weekly skate rest day"
          value={state.restDay}
          onChange={(event) => onAction({ action: "set-rest-day", value: event.target.value })}
        >
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>{day}</option>
          ))}
        </select>
      </label>
      <label className="skate-setting-field" htmlFor="skateExtraRestDay">
        <span>Extra rest day</span>
        <select
          id="skateExtraRestDay"
          aria-label="Optional extra skate rest day"
          value={state.extraRestDay}
          onChange={(event) => onAction({ action: "set-extra-rest-day", value: event.target.value })}
        >
          <option value="">None</option>
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>{day}</option>
          ))}
        </select>
      </label>
      <label className="skate-setting-field" htmlFor="skateCurrentDay">
        <span>Current SkateIQ day</span>
        <SkateProgramDayInput onAction={onAction} state={state} />
      </label>
      <p className="skate-settings-note" id="skateSettingsNote">{state.settingsNote}</p>
    </div>
  );
}

function SkateFocusSummary({ state }: Pick<SkateHeroCardProps, "state">) {
  return (
    <div className="skate-hero-primary">
      <div className="skate-main-strip">
        <span className="skate-mini-label" id="skateBlockLabel">{state.blockLabel}</span>
        <strong id="skateMainFocus">{state.mainFocus}</strong>
        <p id="skateSkateiqBlock">{state.skateiqBlock}</p>
      </div>
      <div className="skate-support-strip">
        <div className="skate-support-chip">
          <span>Main focus</span>
          <strong id="skateMainFocusShort">{state.mainFocus}</strong>
        </div>
        <div className="skate-support-chip">
          <span>Flow / fun</span>
          <strong id="skateFlowFocus">{state.flowFocus}</strong>
        </div>
        <div className="skate-support-chip" id="skateBenchmarkChip" hidden={!state.benchmarkVisible}>
          <span>Benchmark</span>
          <strong id="skateBenchmarkLabel">{state.benchmarkLabel}</strong>
        </div>
      </div>
    </div>
  );
}

function SkateIntensityCard({ onAction, state }: SkateHeroSectionProps) {
  return (
    <div className="skate-intensity-card">
      <div>
        <strong>Intensity</strong>
        <p className="small-note" id="skateIntensityDescription">{state.intensityDescription}</p>
      </div>
      <div className="skate-intensity-toggle" id="skateIntensityToggle" aria-label="Skate intensity">
        {INTENSITIES.map((intensity) => (
          <button
            className={state.intensity === intensity ? "active" : ""}
            key={intensity}
            type="button"
            data-intensity={intensity}
            aria-pressed={state.intensity === intensity}
            onClick={() => onAction({ action: "set-intensity", value: intensity })}
          >
            {intensity[0]!.toUpperCase() + intensity.slice(1)}
          </button>
        ))}
      </div>
      <div className="skate-intensity-meta">
        <span id="skateIntensityEffort">{state.intensityEffort}</span>
        <strong id="skateAttemptBudget">{state.attemptBudget}</strong>
      </div>
    </div>
  );
}

function SkateSessionActions({ onAction, state }: SkateHeroSectionProps) {
  return (
    <div className="skate-session-actions-card">
      <div className="skate-readiness-head">
        <strong>Session timer</strong>
        <span>Board hours update from saved skate time this week.</span>
      </div>
      <div className="form-actions skate-hero-actions">
        <button
          className="secondary-button"
          type="button"
          id="startSkateSession"
          disabled={state.startDisabled}
          onClick={() => onAction({ action: "start-session" })}
        >
          Start session
        </button>
        <button
          className="primary-button"
          type="button"
          id="finishSkateSession"
          disabled={state.finishDisabled}
          onClick={() => onAction({ action: "finish-session" })}
        >
          Finish session
        </button>
        <button
          className="secondary-button"
          type="button"
          id="logSkateSession"
          onClick={() => onAction({ action: "log-session" })}
        >
          Log past session
        </button>
      </div>
      <span className="hint" id="skateSessionHint">{state.sessionHint}</span>
    </div>
  );
}

export function SkateHeroCard({ onAction, state }: SkateHeroCardProps) {
  return (
    <>
      <div className="section-head">
        <div>
          <h2 id="skateHeading">Skate today</h2>
          <p className="small-note" id="skateHeroSubtitle">{state.heroSubtitle}</p>
        </div>
        <span className="skate-phase-badge" id="skatePhaseBadge">{state.phaseBadge}</span>
      </div>
      <div className="skate-hero-metrics">
        <div className="soft-stat compact"><strong>Week</strong><span id="skateWeekCount">{state.weekCount}</span></div>
        <div className="soft-stat compact"><strong>SkateIQ day</strong><span id="skateDayCount">{state.dayCount}</span></div>
        <div className="soft-stat compact"><strong>Skate days</strong><span id="skateSessionDaysCount">{state.sessionDaysCount}</span></div>
        <div className="soft-stat compact"><strong>Board hours</strong><span id="skateBoardHours">{state.boardHours}</span></div>
      </div>
      <SkateSettings onAction={onAction} state={state} />
      <div className="skate-hero-layout">
        <SkateFocusSummary state={state} />
        <div className="skate-hero-sidebar">
          <SkateIntensityCard onAction={onAction} state={state} />
          <SkateSessionActions onAction={onAction} state={state} />
        </div>
      </div>
    </>
  );
}
