# Planner Load Model

## Status

Draft

## Summary

Replace the existing discontinuous point table with a duration-based load model. The planner will show usable daily capacity in `load hours`, not arbitrary points: every activity costs its actual duration multiplied by a small category weight and an explicit effort rating. The total changes smoothly as an event is moved, resized, or marked easier/harder.

The skate page will keep one required rest day and add an optional second rest day selector. The second selector defaults to `None`, so the normal plan remains six skating days, while a difficult week can intentionally become five.

## Context and Scope

The current planner assigns sharp category-and-duration point jumps and caps some long study blocks. That makes the score difficult to predict and lets some long days appear lighter than they are. Recovery days also have zero capacity, which prevents ordinary life maintenance from being planned.

This design covers the weekly planner's day budgets, calendar activity validation, planner guidance, and skate rest-day setting. It does not prescribe medical training, automatically schedule events, or change the user's existing calendar data.

## Goals

- Make a day's score understandable from its time blocks without memorising a table.
- Let the user choose the expected effort for every planned activity.
- Show the exact load of the draft activity and its effect on the day before the user presses Add.
- Keep Normal and High-Intensity days practical to build in the calendar.
- Allow appointments, cooking, chores, and personal care on a recovery day.
- Protect against accidentally packing multiple long, demanding physical sessions into an otherwise overloaded day.
- Support an optional second skate rest day without requiring it every week.
- Preserve existing saved weekly plans and activity categories.

## Non-Goals

- Diagnose training recovery, injury risk, sleep, or health status.
- Force the user to follow a fixed productivity method.
- Treat a calendar estimate as an actual completed workload.
- Automatically convert existing events or historical scores.

## Constraints

- Existing event data has category, start time, end time, and reminder fields, but no effort rating.
- The system must work offline in the browser and keep its current local-storage/API data shape compatible.
- The user needs a planner that remains flexible when real life changes, so capacity should guide and warn, not silently erase or auto-move work.

## Research Basis

- Time estimates and logged durations should be visible and revisable: a field study of academic work found duration feedback helps address optimistic planning bias and that logging at natural breakpoints supported sustained tracking. [UCL research paper](https://discovery.ucl.ac.uk/id/eprint/10209357/1/chiwork25-6.pdf)
- Interruptions add resumption time, mental workload, and frustration, particularly when frequent, so the planner should count separate demanding blocks instead of only total time. [Powers and Scerbo, 2022](https://journals.sagepub.com/doi/10.1177/1071181322661418)
- Physical activity should be spread across the week, not interpreted as a requirement to exercise every day. WHO recommends 150-300 minutes of moderate activity or 75-150 minutes of vigorous activity weekly, plus strength work on two or more days. [WHO guidelines](https://www.who.int/publications/b/55518)
- Resistance-training guidance commonly allows 2-3 days weekly with at least 48 hours before training the same muscles again. The planner should therefore flag, rather than reward, consecutive high-load gym days. [ACSM guidance](https://www.bewegenismedicijn.nl/files/downloads/acsm_position_stand_resistance_training_healthy_adults.pdf)

These sources support a predictable, recovery-aware planning model. The numeric budgets below are product defaults, not health prescriptions, and can later be personalised from the user's own planned-versus-actual history.

## Proposed Design

### 1. Continuous Load Hours

Each timed activity gets a load score:

`load = scheduled hours x category multiplier x effort multiplier`

| Category | Multiplier | Reason |
| --- | ---: | --- |
| Study/school | 1.0 | Default focused-work baseline. |
| Cooking, chores/groceries, social, guitar, personal | 0.75 | Usually lighter cognitively or physically, but still consumes real time and energy. |
| Skate | 1.2 | Balance, repeated attempts, and physical recovery increase load modestly. |
| Gym | 1.3 | Strength work has a slightly higher recovery cost. |

| Effort | Multiplier | Default use |
| --- | ---: | --- |
| Easy | 0.75 | Review, gentle cruise, recovery movement, familiar chores. |
| Standard | 1.0 | The normal planned version of the activity. |
| Demanding | 1.25 | New material, deadline push, intense skate attempts, heavy gym session. |

Defaults are deliberate but editable: study, cooking, chores, social, guitar, and personal start at `Standard`; skate and gym start at `Demanding`. The user can lower a relaxed skate cruise to `Easy`, or raise a difficult coding session to `Demanding`.

Examples: 30 minutes of standard study = `0.5` load hours; 90 minutes of standard skate = `1.8`; 90 minutes of demanding skate = `2.3`; 2 hours of demanding gym = `3.3`. Scores round to the nearest tenth for display but retain precision internally. Reminder-only items remain zero.

No category may cap at a maximum score. A five-hour study block should visibly use five load hours so the plan remains honest.

### 2. Draft Preview Before Add

The calendar/weekly-planner add row gains a compact `Effort` selector beside category and a live, non-editable preview directly under or beside the fields. It updates on category, start time, end time, and effort changes:

`90 min Coding · Demanding = 1.9 load hours`

It also shows the day impact before Add:

`Would become 4.8 / 7 load hours · 2.2 left`

If the block does not fit, the preview remains visible in amber and explains why, for example:

`Would become 7.6 / 7 · shorten it, move it, or make this a High-Intensity Day.`

The form must never wait until submission to reveal a score. The existing blocked behaviour remains as a final guard, but the score and reason are always visible while planning.

### 3. Daily Budgets

| Day type | Budget | Intended shape |
| --- | ---: | --- |
| Recovery | 4.5 load hours | A stay-home day: three to four hours of study can coexist with simple chores, guitar, and personal care. |
| Normal | 7 load hours | A four- to five-hour school-study block, a short skate, and a few small supporting tasks. |
| High-Intensity | 9 load hours | A deliberately fuller mixture of demanding work or training, with enough space left for meals and recovery. |

The UI should phrase this as `3.1 / 7 load hours planned`, not “points left.” A block that exceeds the budget is blocked before save with a specific suggestion to shorten, move, or switch the day type. Existing booked activity is never removed automatically.

### 4. Context-Switch Guardrail

Each non-reminder activity after the third planned block adds a `0.25` load-hour switch cost. This starts only with the fourth block, so an ordinary day is not punished for breakfast, one main session, and an evening task. It gently makes five tiny unrelated tasks visible as a fuller day than their raw duration alone implies.

The summary must expose both numbers: `4.2 activity load + 0.5 switching = 4.7 / 7`. This avoids hidden scoring.

### 5. Physical-Load Guardrails

- Skate and gym start at `Demanding`, but the user can deliberately lower the effort for an easy cruise, mobility session, or other lighter version of the activity.
- On a Normal day, a second demanding physical block is allowed only if the total stays within budget, but shown as an amber `training-heavy` warning.
- On a High-Intensity day, two demanding physical blocks are allowed, again only within budget.
- On a Recovery day, skate and gym may be planned only up to 30 minutes and are labelled `easy recovery movement`; study and other life tasks can still be planned within the 4.5 load-hour budget.
- The weekly overview warns when gym is scheduled on adjacent days. It is a warning, not a veto, because the planner does not know muscle groups, intensity, or rehabilitation context.

### 6. Skate Rest Days

Persist the following settings:

```js
{
  restDayOfWeek: 0,
  extraRestDayOfWeek: null,
  currentProgramDay: 1,
  intensityByDate: {}
}
```

The skate page shows:

- `Weekly rest day`: required weekday selector.
- `Extra rest day`: selector with `None` plus weekdays; it must not duplicate the weekly rest day.

When the optional day is set, the hero and training-plan copy call both days off-board and the session counter target changes from `0 / 6` to `0 / 5`. The SkateIQ program day remains manual, as it is today.

## Interfaces and Data

- `weekly-planner-core` replaces `pointsForActivity` implementation with `loadForActivity(category, minutes, effort)` and exposes activity, switch, total, budget, and remaining load in `daySummary`.
- Keep a backwards-compatible `pointsForActivity` export as a temporary alias if the app or older tests still call it; it returns the new load score.
- Planner events gain `effort: "easy" | "standard" | "demanding"`. Existing events normalise to the appropriate category default, so current plans stay valid.
- The add form uses a pure `previewActivityLoad` result from the core; UI labels do not duplicate any scoring math.
- `skateSettings` accepts existing values and adds nullable `extraRestDayOfWeek`.

## Alternatives Considered

- Keep category-specific step tables: rejected because threshold cliffs caused the current problem and are hard to explain.
- Use only calendar hours: rejected because a three-hour gym/skate day and three hours of errands have different recovery demands.
- Use a 1-10 effort scale: rejected because false precision makes rapid planning slower and makes similar plans look different for arbitrary reasons.
- Require an effort slider only for skate/gym: rejected because mentally demanding coding and study sessions also vary substantially; every block needs the same simple three-choice control.
- Make recovery days zero-capacity: rejected because rest needs ordinary life maintenance, not an empty calendar.

## Tradeoffs

- The new model is easier to reason about but it cannot perfectly know subjective effort; the effort choice makes that uncertainty visible and user-controlled.
- A switch cost makes the planner more realistic for fragmented days but remains an approximation; showing it explicitly keeps it contestable.
- Weekly gym guidance is intentionally a warning rather than an enforced rule, preserving user autonomy.

## Rollout and Migration

1. Add pure-core tests covering linear duration scoring, effort multipliers, switch cost, all day budgets, recovery movement, and physical-load warnings.
2. Add the effort selector and live pre-add preview to the calendar and weekly planner; update all copy from points to load hours.
3. Add the optional skate rest-day setting with compatibility normalisation.
4. Verify the normal and high day flows in the browser using realistic study, skate, gym, errands, and appointment blocks, including an over-budget preview.
5. Existing events normalise to a default effort on read; their stored category and timing are not changed.

## Open Questions

- Whether the 4.5, 7, and 9 daily budgets should be personalised later from the user's actual completion history.

## Decision

Adopt continuous duration-based load hours, a three-level effort rating, an always-visible pre-add score preview, explicit switch cost, usable recovery-day budgets, and an optional second skate rest day. This is the smallest coherent replacement for the current scoring model while retaining the planner's existing categories and editing flow.
