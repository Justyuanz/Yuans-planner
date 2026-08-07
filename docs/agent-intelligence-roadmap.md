# Agent Intelligence Roadmap

This file is the source of truth for building Yuan's Planner's agent layer without redesigning the app.

## Product Intent

The agent should help an ADHD brain feel:

- clearer about what is happening
- less overloaded by raw data
- more realistic about time and capacity
- more supported without feeling judged

The agent should not replace the planner. It should sit on top of the planner's existing data and help translate patterns into useful next steps.

## Visual Constraints

These constraints apply through every phase:

- Do not redesign the dashboard.
- Do not move major cards unless explicitly requested later.
- Keep the current spacing, palette, and glass-panel language.
- Add only small UI pieces at first:
  - one small insight card
  - smarter mascot text
  - small action pills when needed
- Keep all new UI aligned and visually quiet.

## Architecture Principles

1. Deterministic first, AI second.
   Facts should be computed by the app, not guessed by an LLM.

2. Event history is required.
   Final state alone is not enough for deep pattern detection.

3. Pattern logic must be modular.
   Keep analytics and insight generation out of `frontend/js/app.js`.

4. Every insight needs evidence.
   The agent should be able to explain why it said something.

5. The agent must reduce overload.
   Show at most one main insight at a time on the dashboard.

## Code Modules

Planned modules:

- `frontend/js/activity-log.js`
- `frontend/js/insight-core.js`
- `frontend/js/insight-rules.js`
- `frontend/js/mascot-agent.js`
- `frontend/js/mascot-rag.js`
- optional later: `frontend/js/agent-client.js`

Responsibilities:

- `activity-log.js`
  Normalizes and validates stored activity events.

- `insight-core.js`
  Computes metrics from current state plus history.

- `insight-rules.js`
  Turns metrics into structured insight objects.

- `mascot-agent.js`
  Selects the top insight, handles mascot state, and formats short UI copy.

- `mascot-rag.js`
  Builds retrieval context from planner history, insights, money, journal, and recent plan changes for mascot conversations.

- `agent-client.js`
  Optional future LLM integration for mascot responses, summarization, and deeper coaching.

## Phase 1: Event History Foundation

### Goal

Store important user changes so the app can later detect patterns in how plans evolve, not just how they end.

### Deliverables

- Add `hivePlanner.activityLog` storage.
- Add `frontend/js/activity-log.js`.
- Log the first important event types:
  - task created
  - task updated
  - task deleted
  - task done changed
  - task timer started
  - task timer paused
  - task timer ended
  - planned hours updated
  - money transaction created
  - journal entry created
  - journal entry updated
  - journal entry deleted

### Test Goals

- A task add creates exactly one `task_created` entry.
- Task edits log only changed fields.
- Planned-hours edits store before/after values.
- Journal save and delete actions create history.
- Money quick-log actions create history.
- Empty or invalid entries do not break log normalization.

### UI Impact

- No major visible UI changes.
- Only invisible history collection.

## Phase 2: Metrics Layer

### Goal

Turn raw state plus activity history into measurable planner behavior.

### Deliverables

- Add pure metric functions:
  - daily planned task average
  - daily completed task average
  - planned vs actual hour gaps
  - morning overrun
  - evening load
  - edit frequency
  - carryover indicators
  - unscheduled task count

### Test Goals

- Metrics work with empty state.
- Metrics work with partial state.
- Date windows are correct.
- Invalid historical data is ignored safely.

### UI Impact

- None yet.

## Phase 3: Insight Rules

### Goal

Turn metrics into evidence-based structured insights.

### First Rule Set

- `morning_overrun`
- `task_overpacking`
- `evening_overload`
- `too_many_unscheduled_tasks`
- `vague_task_friction`
- `reality_baseline_warning`

### Insight Shape

Each insight should have:

- `id`
- `mode`
- `priority`
- `title`
- `why`
- `actions`
- `sampleSize`

### Test Goals

- Rules do not fire on tiny sample sizes.
- Rule priority ordering is stable.
- Wording stays non-judgmental.

## Phase 4: Small Dashboard Insight Card

### Goal

Show one useful insight without disturbing the current layout.

### Deliverables

- Add one small card using the existing panel style.
- Show:
  - one top insight
  - one short evidence line
  - one or two actions

### Placement Constraint

- Prefer the existing right-side dashboard column.
- Do not reshuffle the whole dashboard.

### Test Goals

- Card aligns with current spacing.
- Card hides cleanly if there is no insight.
- Buttons do not crowd the layout.

## Phase 5: RAG-Backed Mascot Conversation

### Goal

Replace random mascot lines with a mascot that can both:

- speak from the top current insight
- answer user questions about their own patterns using retrieved planner evidence

### Deliverables

- Mascot modes:
  - focus
  - reality
  - recovery
  - reflection
- Top dashboard insight can drive mascot text.
- Add a retrieval layer that gathers:
  - recent activity-log entries
  - recent task summaries
  - current top insights
  - money state summary
  - relevant journal snippets or metadata
- Add a small mascot conversation entrypoint:
  - compact input
  - or drawer/modal chat surface
- Add retrieval helpers that answer questions like:
  - what patterns do you notice lately
  - why do my mornings keep running late
  - what do I keep avoiding
  - when do I usually work best
- Keep fallback lines for empty or low-confidence states.

### Test Goals

- Retrieval returns the most relevant planner context for a mascot question.
- Mascot text changes when insights change.
- Bubble text remains short enough for the current UI.
- Conversation responses are grounded in retrieved evidence, not unsupported claims.
- No fake-cheerful messaging during overload.
- The mascot can answer even when no API is available by falling back to rule-based summaries.

## Phase 6: Simple Agent Actions

### Goal

Make the agent useful in action, not only in observation.

### First Actions

- `simplify_today`
- `keep_top_three`
- `move_one_task`
- `adjust_morning_block`
- `break_task_down`

### Test Goals

- Actions are reversible.
- Actions do not silently delete important data.
- Agent changes are also logged to history.

## Phase 7: Pattern History View

### Goal

Give the user a calm place to inspect detected patterns in more depth.

### Deliverables

- A small modal or drawer
- grouped pattern summaries
- date range and evidence visibility

### Test Goals

- Layout remains clean.
- No chart clutter.
- Pattern explanations match the underlying metrics.

## Phase 8: Optional LLM Layer

### Goal

Add a stronger LLM reasoning layer on top of the mascot RAG foundation.

### API Requirement

This is the first phase that needs an API key.

### AI Responsibilities

- rewrite structured insights warmly
- turn retrieved planner evidence into better mascot answers
- answer mascot questions about recent patterns
- help shrink plans conversationally
- summarize multi-signal evidence
- compare recent behavior patterns across time windows

### AI Non-Responsibilities

- do not compute raw facts
- do not invent patterns
- do not replace deterministic rules

### Test Goals

- prompt input is minimal and structured
- responses stay evidence-based
- retrieval context is included and attributable
- fallback works when API is unavailable

## Phase 9: Cross-Domain Intelligence

### Goal

Use tasks, time, money, journal, and plan churn together for richer insights.

### Example Patterns

- food spending rises on high-edit days
- journal behavior changes on overloaded days
- late study blocks correlate with worse completion
- simple mornings correlate with higher task completion

### Test Goals

- minimum sample sizes are enforced
- cross-domain claims use cautious language
- rule thresholds are documented

## Maintainability Rules

- Keep analytics in pure functions.
- Keep DOM rendering separate from analytics.
- Keep event names stable and boring.
- Keep rule thresholds in constants.
- Log the agent's own future actions too.
- Add tests for every new pure module.

## First Milestone

The first meaningful milestone should achieve:

- activity log exists
- task edits and planned-hours changes are logged
- journal and money quick-log actions are logged
- no visible layout disruption

After that, Phase 2 can safely begin.
