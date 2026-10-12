# Yuan's Planner Rewrite — Agent Handoff

## New Code Quality Requirement

All new React/TypeScript code must follow the code-quality rules in `AGENTS.md`, especially: `const` by default, no `var`, strict TypeScript, avoid `any`, clear focused functions/files, short useful comments, and lint/type-check/test before commits.

---


## Goal
Rewrite Yuan's Planner into a clean, understandable architecture without breaking existing behavior.

Target:
- Frontend: React + TypeScript
- Backend: Python
- Database: SQLite
- Preserve existing features and data unless a change is explicitly documented.

## Repository Setup
Use the **existing Git repository**, not a separate unrelated repo.

Keep:
- `main` = original working Yuan's Planner
- `rewrite/react-typescript` = rewrite/migration branch

Prefer a Git worktree so both versions are available as separate folders:
- original folder → `main`
- rewrite folder → `rewrite/react-typescript`

Before migration starts:
1. Commit the current working project.
2. Create tag `pre-react-rewrite`.
3. Create branch `rewrite/react-typescript`.
4. Do all rewrite work on the rewrite branch.
5. Do not modify `main` during the migration.

The old application is the behavioral reference until the replacement is verified.

## Core Rules
1. Do not rewrite the whole project at once.
2. Understand existing behavior before replacing it.
3. Migrate one feature at a time.
4. Keep old working code until the replacement is tested.
5. Prefer simple, readable code over clever abstractions.
6. One file should have one clear responsibility.
7. Keep functions short and focused when practical.
8. Avoid duplicated logic.
9. Do not redesign features unless necessary.
10. Never remove working code until the replacement passes tests.

## Comments
Write **short, useful comments** so I can learn from the code.

Comment:
- why non-obvious code exists
- important business rules
- unusual decisions or edge cases
- sections whose purpose is not immediately clear

Do not:
- comment obvious code
- write long essay-style comments
- use comments instead of clear names and structure

Example:

```ts
// Keep completed tasks visible until the next daily reset.
const visibleTasks = ...
```

not:

```ts
// This variable stores the visible tasks.
const visibleTasks = ...
```

## Git Discipline
Git history is part of the project documentation.

At the beginning of a session, inspect:
- `git status`
- recent Git history
- current diff
- `AGENT_HANDOFF.md`

**Commit cadence (user rule, 2026-10-11): exactly one commit per session.** Do the work in small verified steps as before, but squash them into a single commit before the session ends. This overrides the "frequent, small commits" guidance in `AGENTS.md`; keep the single commit message structured so the individual steps are still legible.

Historically this file asked for frequent, small commits after completed working steps. Keep that habit for *verification* boundaries, not for commit boundaries.

Good commit boundaries:
- add tests for one behavior
- migrate one small feature
- extract one coherent module
- fix one verified bug
- remove one verified legacy implementation

Avoid giant commits containing many unrelated changes.

Before each commit:
1. Review the diff.
2. Run relevant tests.
3. Confirm the application still works for the affected feature.
4. Use a clear commit message describing what changed.

Do not intentionally commit broken code. If a session must stop mid-task, leave clear notes in this file about the unfinished state.

## Required Workflow
For every task:

1. Read this file.
2. Check Git status, recent commits, and current diff.
3. Inspect the relevant existing code.
4. Identify and document current behavior.
5. Add or update tests protecting that behavior.
6. Run the tests before changing the implementation when useful.
7. Make one reasonably small migration/refactor.
8. Run tests again.
9. Fix failures before continuing.
10. Review the diff.
11. Commit the completed working step.
12. Update this file before ending the session.

## Testing Priority
Testing is mandatory because the rewrite must preserve behavior.

Protect important user flows first:
- application starts successfully
- existing SQLite data loads correctly
- create/edit/delete operations work
- refresh/restart does not lose data
- major pages render correctly
- important filters, dates, forms, and interactions still behave as before

Use:
- unit tests for isolated logic where useful
- backend/API tests for Python behavior
- end-to-end tests for important UI flows

For a migrated feature:
1. Understand old behavior.
2. Create tests for the important behavior.
3. Implement the replacement.
4. Run tests.
5. Compare old and new behavior.
6. Remove legacy code only after verification.


## Migration Order

### Phase 1 — Reverse Engineering
- [x] Map project files
- [x] List existing features
- [x] Document SQLite schema
- [x] Identify frontend/backend boundaries
- [x] Identify duplicated/dead code
- [x] Identify critical user flows

### Phase 2 — Safety Net
- [x] Add tests for critical backend behavior
- [x] Add tests for critical user flows
  - [x] Protect startup and task create/edit/delete persistence across refreshes
  - [x] Protect Guitar/Skate session-to-task synchronization and no-double-count totals
  - [x] Smoke-test all six primary views in the browser
- [x] Record current expected behavior

### Phase 3 — New Structure
- [x] Create React + TypeScript frontend beside the old frontend
- [x] Create clean Python API structure
- [x] Connect frontend to backend
- [x] Confirm SQLite data still works

### Phase 4 — Feature Migration
Complete. Every feature went through the same loop:

- [x] document old behavior
- [x] add tests
- [x] implement new version
- [x] compare old/new behavior
- [x] commit the working migration
- [x] remove legacy implementation only after tests pass

### Phase 5 — Legacy Removal
Complete.

- [x] retire every browser test's dependency on the standalone frontend
- [x] remove the legacy routes, legacy server mode, and Docker legacy copy
- [x] run the final feature and route audit against the production build
- [x] delete `frontend/` and re-verify the whole application without it

### Phase 6 — Bug Fixes and Maintenance
Complete.

- [x] fix the write-ordering race that could discard a saved edit
- [x] deduplicate the duplicated date helpers in React (see Date Helper Consolidation)
- [x] deduplicate the leading-time parsers and `formatTimer` into `shared/planner-time.ts`
- [x] investigated the two Python label-time parsers and deliberately left them separate (see Date Helper Consolidation)
- [x] give the unlabelled form controls an accessible name (see Form Control Accessibility)
- [x] audit the storage keys against the live database (see Storage Key Audit)

### Phase 7 — Architecture Refactor
Not started. Only begin once Phase 6 is finished and the complete suite is green. See "Architecture Refactor Plan" below, and the Refactor Phase rules in `AGENTS.md`. Structural only: no behavior, visual, API, or storage change.

- [x] Phase 7a — the stylesheet: dead rules removed, `tokens.css` extracted, cascade contract documented (Session 81)
- [x] split the shared kernel out of `features/life-pie/` (Session 82)
- [x] regroup `features/` into `pages/` plus a named `shared/` layer (Session 82)
- [x] move the mascot modules out of `app/` (Session 82)
- [x] make page naming consistent (Session 82)

## Current Task
**Everything planned is done, and both open decisions are resolved.** The migration, the bug fixes, the stylesheet, the restructure, the verification, the cross-page coupling, and the path alias are all complete.

The suite is 44 Python tests, 324 React/TypeScript tests across 58 files, and 46 browser tests, with zero skips.

The branch is ready to merge and is waiting only on your explicit approval. Nothing has been pushed.

## Last Completed Task
Session G — the `@/` path alias, the last recorded decision.

243 imports two or more levels deep became `@/...`, while the 88 single-level `../` imports stayed: one step up keeps a nearby relationship visible and was never the problem. The alias is configured in the two places that have to agree, `vite.config.ts` for the build and vitest and `tsconfig.json` for type checking, and `no-restricted-imports` now rejects any new `../../` import with a message pointing at `@/`.

The change is provably invisible: **the built JavaScript and CSS are byte-identical to the pre-change build**, hashes and filenames included.

## Next Task
Nothing is outstanding. The remaining step is yours: approve the merge into `main`, or name the next piece of work.

If you approve, the sequence is the final audit in this file, then `git push origin rewrite/react-typescript`, then the merge. Do not merge into `main` until you say so explicitly.

## Form Control Accessibility

Session A looked at the seven JSX form controls that carried no `id` or `name`, and the measurement changed the task. Two of them were false positives from a generic inspection heuristic: the Money budget input is wrapped in a `<label>` and also carries `aria-label` and `title`, and the weekly goal input carries `aria-label`. Both already had a proper accessible name, so an `id` would have added nothing.

The other five had a real gap, and that gap was the accessible name rather than the id. The two Task editor selects had no name at all, and the Task editor title and time inputs plus the Sprouty chat input had only a placeholder. All five now carry an `aria-label` and an `id`: `taskEditorTitle`, `taskEditorTime`, `taskEditorReminder`, `taskEditorActivity`, and `mascotChatInput`. The editor ids are deliberately distinct from the task form's `taskTitle`, `taskTime`, `taskReminder` and `taskActivity`, because the form and the editor render at the same time and duplicate ids would be invalid. Only one editor can be open at once, since `TaskList` keeps a single `editingTaskId`, so static ids are safe.

Verified in Chrome's accessibility tree: the editor controls now report "Task title" and "Scheduled time" as their names. Two things were checked and deliberately left alone:

- The task form's selects already carry `aria-label` ("Task Telegram reminder", "Task activity"). The browser pane renders a combobox's selected value rather than its name, which made them look unlabelled.
- The task hours input is correctly associated with its `<label for>`; `input.labels` resolves to "Hours". The same pane rendering made its name look like its placeholder.
- The task form's title input takes its name from its placeholder, "Add the next thing that actually matters". Adding an `aria-label` would change what a screen reader announces, so it was left as is.

## Storage Key Audit

The live database at `/Users/yuan/Desktop/Hive/YuanPlanner/data/planner.db` holds 96 rows across 27 key families. Compared against the 27 key prefixes the React production code references, **eight families have no consumer**:

- `hivePlanner.skate.focus`, `hivePlanner.skate.learningItems`, `hivePlanner.skate.warmupItems`, `hivePlanner.skate.weeklyTarget` — the orphaned Skate editors
- `hivePlanner.study.sessions` — the retired Study feature
- `hivePlanner.telegramWater.settings` — water reminders, removed from the product
- `hivePlanner.weekOverview.study.<ISOWEEK>` and `hivePlanner.weekOverview.skateBody.<ISOWEEK>` — the inactive weekly-overview path, 10 rows between them

All eight were already inactive in the shipped legacy app, so nothing was lost in the migration. Backups keep them regardless: `selectBackupData` and `decodeImportedPlannerData` pass through every `hivePlanner.*` key except the transient Guitar session, and `BackupTools.test.ts` now pins a round trip using these exact eight key names, so a future allowlist would fail loudly instead of quietly dropping them.

**Warning for the stylesheet session: dead styling does not imply a dead key.** The `coach-*` and `goal-card-*` CSS clusters are dead, and the matching mounts are absent from the legacy document, so neither UI was reachable even in the legacy app. Their stored data is still read by features that survived: `hivePlanner.skate.coachTemplate` is decoded by the Skate feedback dialog, and `hivePlanner.goalPlanner.items` is both read and written by the Calendar event editor for its goal-step references. Delete the rules, keep the keys.

## Date Helper Consolidation

Session 79 removed the duplicated date helpers in React. `frontend-react/src/shared/planner-date.ts` now owns them, with 22 unit tests that pin the malformed-input behavior the old copies relied on:

| Helper | Was | Now |
| --- | --- | --- |
| `humanDate` label formatter | 9 copies | 1 shared |
| `addDays` | 4 byte-identical copies | 1 shared |
| `startOfLocalDay` (was `localDay`) | 3 byte-identical copies | 1 shared |
| `dateFromKey` tolerant key parse | 3 copies | 1 shared |
| `dateKeyFromValue` (was `localDateKey`) | 2 byte-identical copies | 1 shared |
| `strictDateKey` (was `normalizedDateKey`/`validDateKey`) | 2 copies, proven equivalent over a two-year sweep | 1 shared |
| `leadingTimeMinutes` label parse | 4 copies | 1 shared in `planner-time.ts` |
| `formatTimer` | 2 copies | 1 shared in `planner-time.ts` |

Ten now-unused local `WEEKDAYS`/`MONTHS` arrays went with them, and `meditation-store.ts` no longer imports from `life-pie`.

The method matters more than the result: every group was characterized before being merged. Each old implementation was run against a matrix of valid, unpadded, partial, and unparseable inputs, and only provably identical groups were merged. That found three cases worth keeping apart:

- **Guitar and the calendar event editor keep their own key parse.** Guitar defaults missing parts to 0, which rolls a partial key back a month instead of clamping to the 1st; the editor parses by fixed character positions because it reads a date input. Both now share only the label formatter, so their malformed-input behavior is unchanged.
- **The three `normalizedDateKey` implementations are genuinely different contracts** (tolerant reformat in `life-pie`, strict round-trip in Skate, slice-based in Guitar) and must not be merged.
- **The two Python label-time parsers stay separate.** `openai_mascot.parse_label_time_minutes` and `telegram_notifier.parse_event_time` agree on all 23 realistic labels tested but diverge on four malformed shapes (`"9:5 Odd"`, `"7:5"`, `"007:00 Odd"`, `"09:00Deep"`), where the mascot regex is stricter. Adopting the strict one would stop a reminder firing for a label like `"09:00Deep"`, so unifying them is a behavior change in the notification path, not a refactor. If it is ever wanted, the safe direction is to adopt the laxer parser in both and add tests for those four shapes. Note also that `telegram_notifier.parse_clock_time` is **not** a duplicate of either: it only ever receives field values such as `"09:00"` or `"09:00-10:30"`, never a label.

The time helpers followed the same method. The four leading-time parsers agreed on all 24 string inputs tested and diverged only on numbers, because each coerced its input differently: the calendar ignores a number, the insight metrics treat 0 as absent, and the mascot reads any number. So `leadingTimeMinutes` takes text and every caller keeps its own coercion. The two `formatTimer` copies produced identical output for all 43,201 finite second values checked and differed only on a non-finite input; the shared version keeps the guard, which is unreachable from the task timer because `elapsedTaskSeconds` always returns a clamped finite number, and preserves Meditation's existing "0:00" for a malformed `endsAt`. `clockMinutes`, `eventMinutes` and `scheduledMinutes` were left alone: they parse field values such as `"09:00"` or `"09:00-10:30"`, not labels.

`formatPlannerDate` still lives in `features/life-pie/life-pie-store.ts` even though Skate, Guitar, and others import it. Relocating it to `shared/planner-date.ts` as `toDateKey` is a Phase 7 move, kept out of Phase 6 so this phase only removed duplication.

## Plan — Sessions A to D

One session per block, one commit per session. Each block ends with the complete
suite green (Python, React/TypeScript, lint, strict typecheck, production build,
every browser test, zero skips) and the live six-page pass at desktop and phone
size with no console or network errors. If a block runs long, stop at a stage
boundary and record where it stopped; never leave a half-moved structure.

**The plan is a guide, not a contract.** Do not follow it so strictly that
something found along the way gets ignored. Whatever turns up mid-session, deal
with it:

- **Fix it now** when it is small, or when it sits in the code being touched
  anyway, or when leaving it would be a real risk such as data loss or a wrong
  recorded decision. Fixed work gets the same verification as planned work:
  a regression test that would have caught it, and the complete suite.
- **Write it down now** when it is larger or unrelated: add it to Known Problems
  or amend the plan in this file, with enough evidence that the next session does
  not have to rediscover it. Never leave a discovery only in a chat reply.
- **Extend the session** when finishing something matters more than stopping at
  the planned boundary. Equally, drop a planned item and say so if a discovery
  makes it wrong or pointless. Record either choice.
- **Correct the plan itself** when a measurement contradicts it. The plan was
  written from measurements; when a new one disagrees, the measurement wins.
- Never let the extra work weaken verification. If something cannot be verified
  properly in the time left, record it instead of rushing it in.

Session 79 is the precedent: the Journal flake turned out to be a real
write-ordering race that could discard a saved edit, the stylesheet audit found
107 dead class names, the recorded budget-disclosure decision was wrong, and the
"29 form controls" figure was stale. None of that was in any plan, and all of it
mattered more than the planned task it interrupted.

### Session A — bugs and cleanup (Phase 6)

1. **Leading-time parsers.** Four implementations share one regex and identical
   semantics: `parseTimeMinutes` (calendar-month), `parseTaskTimeMinutes`
   (dashboard-insight), `parseMascotTaskTime` (mascot-local-retrieval), and
   `taskStartMinutes` (energy-trail-store, via `TASK_TIME_PATTERN`). Characterize
   them against valid, unpadded, out-of-range, and unparseable labels first, then
   merge into `shared/planner-time.ts` with tests that pin that matrix. Leave
   `clockMinutes`, `eventMinutes`, and `scheduledMinutes` alone: they parse field
   values such as `"09:00"` or `"09:00-10:30"`, not labels.
2. **`formatTimer`.** Two copies that differ only in guarding a non-finite input.
   Decide one way, note the decision, and apply it to both.
3. **Form controls without an `id` or `name`.** The React source has seven such
   JSX sites, one of which renders a row per budget category, so the rendered
   count is higher. Add stable ids derived from the data (for example the
   category id). The browser tests select these by `aria-label`, so adding an id
   should not disturb them; confirm that rather than assuming it.
4. **Storage-key audit.** React references 29 distinct `hivePlanner.*` keys.
   Compare that against the keys the real database actually holds (`main`'s
   worktree has the live file) and against the declared-but-inactive keys plus
   the old Study/Body weekly-overview path. Keep every key the database still
   holds so backups stay complete, and write down which are legacy-only.

### Session B — the stylesheet (Phase 7a) — DONE (Session 81)

Steps 1, 2, 3 and 5 are done. **Step 4, co-locating each part with the page it
styles, was deliberately deferred to Session C** and is recorded there: moving a
stylesheet part next to its component means moving it again when Session C
regroups `features/` into `pages/`, so doing it now is double churn on the files
most at risk. The deferral costs nothing, because the clarity win of step 4
depends on the page directories Session C creates.

What was measured and removed:

- 93 of 467 class names were dead, not the 107 first estimated. The 14-name gap
  is the dynamic `className` sites: of the 23 that build a class from data, only
  `intensity-${...}` is a true prefix concatenation, and its generated names are
  live. Check that list again before trusting any future dead-class count.
- 166 whole rules removed and 11 selector lists trimmed. `src/styles` went from
  5,677 to 4,596 lines; the built stylesheet from 81,766 to 67,615 bytes.
- Verified by diffing the built output, not by eye: exactly 93 class names
  disappeared, none appeared, and no removed class is still referenced. A
  re-audit then reported zero dead classes remaining.
- One dead id selector, `#studyOverview`, removed. Its 15 bytes are the only
  difference between the post-prune build and the final one, which is what makes
  the final byte count a check rather than an observation.

Structural moves, each gated on a byte-identical build:

- `coach.css` was down to 45 lines after pruning, none of it coach styling, and
  the name had become misleading. Folded into the end of `skate-guitar.css`,
  which is the adjacent import, so the cascade order is unchanged.
- The `:root` design variables were extracted into a new `tokens.css`, imported
  first. Both moves rebuilt byte-identical, which proves they changed nothing.

### Cross-surface CSS overlap

Found while documenting the cascade contract, and the reason that comment does
not claim the parts are cleanly separated: **17 selectors are styled in two
surface parts each, and 5 of those have conflicting property values that only
the import order resolves.**

| Selector | Parts (cascade order) | Conflicting properties |
| --- | --- | --- |
| `.task-list` | activity-goals.css → tasks.css | `gap`, `padding` |
| `.task-hours input` | activity-goals.css → tasks.css | `width`, `min-height`, `padding` |
| `.event-pill` | tasks.css → calendar.css | `width`, `min-height`, `padding` |
| `.icon-button` | tasks.css → calendar.css | `border`, `border-radius`, `background` |
| `.money-vendor-list` | money.css → activity-goals.css | `padding`, `border`, `background` |

The other twelve overlap without conflicting (`.backup-utility`, `.weekday`,
`.soft-stat`, `.scale-field`, `.pie-breakdown`, `.money-shortcuts`,
`.money-remaining-strip`, `.journal-paper` and its `::after`,
`.journal-entry-row textarea`, and the two `.guitar-*-card .panel-inner` rules).

Consequence for Session C: a part may be moved to a new directory, but its
position in the `planner.css` import list must not change, and a part must not
be split into per-page pieces without first resolving the five conflicts above.
Doing that is a visible design change and needs explicit approval, so it is not
part of the structural refactor. The evidence was produced by parsing top-level
rules out of the eleven surface parts and comparing declarations pairwise; the
script is reproducible from this description in a few lines.

### Session C — the React restructure (Phase 7b) — DONE (Session 82)

All five stages landed. The shape now is:

```text
src/
  pages/      calendar/ dashboard/ guitar/ journal/ money/ skate/
              each: <Name>Page.tsx + cards/<card>/
  shared/     activity-categories, activity-log, activity-totals,
              calendar-event-store, format-hours, is-record,
              journal-entry-store, planner-date, planner-time,
              session-task-sync, tasks/
  mascot/     14 files, its own feature
  app/        shell, routing, store, persistence (11 files, 527 lines)
  api/  styles/
```

Measured after: 131 files and 15,863 lines under `pages/`, 2,952 under
`shared/`, 1,873 under `mascot/`, 527 under `app/`. `features/` is gone.

Verification at every stage: typecheck and the unit suite between steps, the
complete suite at each stage boundary, the built stylesheet byte-identical
throughout (`21adb2c8d63b7cb649fdee4d53056ed0`, and the published asset name
`index-BNgGG6ag.css` never changed), and a live six-page pass at desktop and
375px with no console errors and every request 200.

Two tools written for this and worth reusing, in the session scratchpad:
`move-dirs.py` and `move-files.py`. They resolve every relative import to a
source-relative path, map it through the move, and re-render it from the
importing file's new location, so a regroup is one command and touches nothing
but import specifiers.

### Cross-page coupling — mostly resolved (Session 85)

Session C recorded five cross-page imports and said none was fixable by a move.
**That was too strong.** Looking at what each one actually imported showed four
of them were movable, and they are now gone: **five became one.**

| Was | Resolution |
| --- | --- |
| calendar week → dashboard `planned-actual` | imported only `isoWeekKey`, a pure ISO-week function. Moved to `shared/planner-date.ts`. |
| skate body support → dashboard `planned-actual` | the same import, fixed by the same move. |
| calendar month → dashboard `today-intention` | imported the day-type model. Split: the day type now lives in `shared/routine-week.ts`, the card keeps only its own label. |
| dashboard insight → money `money-quick-store` | the money store is read by all six Money cards, the insight and the mascot. It was never the quick card's. Moved to `shared/money-store.ts` with `shared/money-definitions.ts`. |

The one that remains is `pages/dashboard/DashboardPage` rendering
`MoneyQuickCard`, and it should stay. The Money quick log genuinely appears on
the Dashboard, so this is deliberate composition, not leakage. Moving a page's
main card into a shared directory to satisfy a layering rule would make the
code harder to follow, not easier.

Two things the work turned up:

- **`hivePlanner.routine.week.*` had two owners.** The Calendar weekly planner
  and the Dashboard intention card each carried their own copy of the storage
  key and of the day-type alias table, under different names
  (`calendarWeekStorageKey`, `todayIntentionStorageKey`). Two features could
  have drifted apart on the same stored document. They now share
  `shared/routine-week.ts`, which has its own tests.
- The ISO-week assertions moved with `isoWeekKey` and were checked against
  Python's `isocalendar()` rather than only against the code under test. The
  year-boundary case matters: 1 Jan 2021 is week 53 of **2020**, and four
  features key weekly storage on it.

`mascot/` still imports nine modules from pages, down from ten. This stays
**accepted, not a defect**: Sprouty answers questions about every surface, so
reading across them is its job.

### Path alias — DONE (Session 86)

`@/` now means `src/`. 243 imports two or more levels deep became `@/...`; the
88 single-level `../` imports were left alone, because a single step up keeps a
nearby relationship visible and is not the thing that hurt.

Set in two places that must agree: `resolve.alias` in `vite.config.ts` for the
build and for vitest, and `paths` in `tsconfig.json` for type checking. Note
`baseUrl` is deprecated in this TypeScript version, so the `paths` target is
written relative to the config file (`./src/*`) instead.

`no-restricted-imports` now rejects any new `../../` import with a message
pointing at `@/`. Verified by reintroducing one deep import and confirming
eslint failed on it.

**The proof this changed nothing is unusually strong:** the built JavaScript and
CSS are byte-identical to the pre-change build, hashes and filenames included
(`index-IPzjF0KP.js`, `index-BNgGG6ag.css`). `dist/` holds only those two plus
an untouched favicon and an `index.html` generated from an untouched template
that references those same filenames. A live browser pass was therefore not run
for this change and would have added nothing: the server is serving the same
bytes it served before.

## Architecture Refactor Plan — EXECUTED (Session 82)

The target shape below was carried out in Session C; see that section for what
landed and what was deliberately left. Kept for the reasoning behind the shape.

The modules themselves are small, single-purpose, and tested. What read as messy was the top-level map: `features/` is a flat list of 28 sibling directories that hides the real shape of the app. These findings were measured in Session 79, so they do not need re-deriving:

- **An accidental kernel with a misleading name.** `app/App.tsx` imports its date helper from `features/life-pie/life-pie`, and `life-pie` has eleven consumers including `app/`. It is shared infrastructure wearing a dashboard card's name.
- **Inconsistent page naming.** `dashboard-page`, `money-page`, and `journal-page`, but then plain `calendar`, `skate`, and `guitar`.
- **Inconsistent granularity.** `skate/` is one directory of 24 files and 3,911 lines, while the single Money page is spread across seven directories.
- **Ownership is invisible.** Nothing in the tree says that `energy-trail` is dashboard-only while `tasks` is shared by six places; it takes a grep. Measured consumers: `life-pie` 11, `tasks` 6, `journal` 5, `activity-categories` 3, `sessions` 2; every other feature has one.
- **`app/` is a grab bag.** Shell, routing, persistence, backup tools, and six mascot modules.

Target shape, grouping by route with a real shared layer:

```text
src/
  pages/
    dashboard/   DashboardPage.tsx + cards/ (day-state, intention, task-progress,
                 weekly-goals, planned-actual, energy-trail, insight, pattern-history)
    money/       MoneyPage.tsx + cards/ (overview, quick, budgets, pacing, vendors, activity)
    journal/     JournalPage.tsx + cards/ (editor, archive, meditation)
    calendar/  skate/  guitar/
  shared/        planner-date, activity-categories, tasks, journal-compat,
                 sessions, activity-log, is-record
  mascot/        its own feature, out of app/
  app/           shell, routing, store, persistence only
  api/  styles/
```

Suggested order, smallest risk first: split the kernel out of `life-pie`, then move the mascot modules, then make page naming consistent, then regroup one page at a time starting with Money (five self-contained card directories).

Do not change CSS class names, DOM ids, or `hivePlanner.*` keys. CSS Modules would be the textbook answer for the global stylesheet, but it renames classes, which would break the pinned visual contracts and the visual-preservation rule; the per-surface stylesheet split already in place is the safe version. Revisit only with explicit user approval.

## Upstream Legacy Change — Activity Categories (2026-10-05)

Legacy `main` commit `01d6c6d` changed the activity/time-tracking contract and is already deployed. Treat this as production behavior to preserve in the rewrite.

- Active tracked categories are `transcendence` (Transcendence), `mobileDevelopment` (Mobile Development), `portfolioJobPrep` (Portfolio / Job Prep), `skate` (Skate), `gym` (Gym), and `guitar` (Guitar). `other` remains a non-statistical fallback.
- Persisted legacy IDs migrate as follows: `cpp` and `fso` → `transcendence`; `python` → `mobileDevelopment`; `lc` → `portfolioJobPrep`; `p90x3` → `gym`.
- Calendar categories migrate as follows: Coding → Transcendence; Python → Mobile Development; Leetcode/LeetCode → Portfolio / Job Prep. The new calendar categories have their own existing-style color labels and map to the matching task activity IDs.
- LeetCode, Python, Coding, Meditation, and Journal are no longer activity/time-total categories. Meditation and Journal remain standalone Planner features; only their contribution to activity totals and Life Pie was removed.
- Life Pie now groups Transcendence, Mobile Development, and Portfolio / Job Prep under Work; Skate and Gym under Body; and Guitar under Guitar.
- Planned weekly hours remain stored as compatibility-safe objects at `hivePlanner.planned.<ISO-WEEK>`. The live W41 values were saved as data, not source constants: Transcendence 20h, Mobile Development 5h, Portfolio / Job Prep 2h, Skate 2.5h, Gym 1h, and Guitar 1h. Planned vs actual inputs remain editable in 0.25-hour steps.
- The legacy migration combines hours when old and new IDs coexist and preserves unrelated/unknown data. Mirror that behavior rather than silently dropping old fields.
- The legacy implementation centralizes category definitions and migration in `frontend/js/activity-categories.js`; its Node suite includes migration coverage. Main passed 97 JavaScript tests and live browser verification after deployment.

## Important Decisions

> **Reading note.** Decisions below that mention `/legacy/` routes, `frontend/js/` modules, "explicit fallback routes", the legacy-mode server, or a standalone legacy renderer are historical: they record what was true while the migration ran and why each React boundary behaves as it does. None of that code exists any more. Treat those lines as the reasoning behind the current React contract, not as a description of code you can still find.

- Production activity/category compatibility is defined by legacy `main` commit `01d6c6d`. The rewrite must accept old stored IDs, expose the new labels/IDs, preserve unknown fields, and avoid hardcoding weekly target values into UI or calculation logic.
- React centralizes the production activity definitions and legacy ID mapping in the strict-TypeScript `activity-categories.ts` module. Life Pie and Planned vs actual import this contract instead of maintaining separate category lists.
- Planned-hour decoding combines numeric old and new values that map to the same production activity while retaining unrelated fields unchanged. The UI persists the normalized object on the next edit rather than discarding compatibility data.
- The explicit legacy-shell fixture loads a focused activity-category bridge during hydration so fallback regression coverage continues to exercise the standalone legacy views. All bridge code follows the same `const`-by-default/no-`var` rule; it is compatibility infrastructure, not a replacement for the React TypeScript model.
- Meditation and Journal remain standalone features but no longer contribute to activity totals or Life Pie. The Meditation regression explicitly verifies session persistence without a Life Pie side effect.
- The rewrite must preserve visual parity with the legacy Planner; this is an architecture rewrite, not a UI redesign.
- Do not add migration-preview branding, explanatory badges, new layouts, or invented visual treatments to the React UI.
- The temporary same-origin portal shell has been retired. Vite regressions exercise direct React production routes, while standalone legacy routes remain the behavior and visual reference.
- Weekly goals and Life Pie are composed only by the direct React Dashboard. Their regressions compare that production route with the standalone legacy reference; explicit fallback routes now leave both cards entirely legacy-owned.
- React's planner-store hook listens only for same-origin `hivePlanner.*` storage events. It keeps direct React boundaries synchronized without making browser storage authoritative over the server-first Planner store.
- Planned vs actual stores one object at `hivePlanner.planned.<ISO-WEEK>` and must preserve unknown fields when editing. Each edit also appends the legacy-compatible `planned_hours_updated` record to `hivePlanner.activityLog` with the same group/activity metadata.
- Energy trail remains derived from `hivePlanner.journal.entries` and dated task keys. React filters invalid tracker values before selecting the newest seven rows, and preserves the legacy rule that the comparison appears only after at least two low/empty energy days have previous-day task summaries in the 14-day insight window.
- Journal-entry storage normalization now lives in one typed compatibility module shared by the direct editor, Energy trail, and Journal archive. All three boundaries therefore agree on valid dates, tracker states, duration clamping, blank-entry removal, fallback IDs/timestamps, and newest-first ordering.
- Clicking a direct-Dashboard Energy trail row navigates to the direct Journal route with the selected date. Its regression returns to the direct Dashboard after editing Journal context to verify the persisted cross-feature update; explicit fallback routes use the standalone legacy navigation and renderer.
- Planned vs actual and Energy trail are composed only by the direct React Dashboard. Their regressions compare the production route with standalone legacy at identical desktop/mobile viewports; explicit fallback routes leave both cards entirely legacy-owned.
- Money quick derives its category budgets, transfers, transactions, vendor rules, pace, and remaining-money summaries from the existing `hivePlanner.money.*` compatibility records. Saving writes a transaction, a normalized activity-log entry, and a remembered vendor rule when a vendor is present.
- Money quick retains optimistic values per storage key until the corresponding external value supersedes them. This prevents an unrelated legacy activity-log write from hiding a newly saved React transaction while still allowing full Money settings changes to update the React summary immediately.
- Money overview and Money quick share the typed Money compatibility decoder, including the current week clipped to the month. Both are composed only by the direct React Money page; explicit fallback and standalone legacy routes use their complete original renderers.
- Money Pace and projection extends the shared decoder with current-month total/flexible spending, projected spending, and long-term month-prefix totals. Its history disclosure remains uncontrolled so live store updates preserve open state while reload closes it like legacy.
- Money Vendors uses the shared decoder for trimmed, case-sensitive current-month summaries and exact-name previous-month comparison. Money recent activity uses the same decoder; its native disclosure remains transient and open across live list updates, while reload creates a closed disclosure like legacy. Both are composed only by the direct React Money page.
- Money Budgets and categories uses the shared typed Money decoder. Its focused persistence module normalizes known legacy fields while retaining unknown root, category, transfer, and notes data; monthly edits derive the weekly guide from the active month, and every write publishes through the existing bridge so all six direct React Money boundaries stay synchronized.
- All six Money boundaries are composed only by the direct React Money page. No Money fallback portal or legacy Money ownership guard remains; explicit fallback and standalone `/legacy/` routes use the complete original renderer.
- Budget inputs use the browser's native `change` event because the legacy editor commits only when editing finishes, not on every typed character. Invalid values restore the rendered amount and write nothing. Nested section and transfer disclosure state stays mounted until reload, while the outer settings disclosure can be reset by the card re-render that follows a toggle or edit. Session 79 verified that legacy and React behave identically here in both the guarded and unguarded click sequences, so the outer panel's live `open` flag is deliberately not asserted immediately after an edit; the pinned visual contract covers how the expanded panel renders.
- Meditation uses the existing `hivePlanner.meditation` `{active, sessions}` document. Start and cancel preserve compatible unknown root/session fields; expiry mirrors the legacy compact completion shape and appends one standalone session using the timer's persisted end timestamp.
- Meditation is composed only by the direct React Journal page, where Archive, Today, and date-input navigation share one local selected-date state with the editor and archive. Explicit fallback and standalone legacy routes use their complete original renderer without a React ownership flag or iframe date observer.
- The React Journal archive keeps its search text as local transient state and derives cards from `hivePlanner.journal.entries`. It is composed only by the direct React Journal page; explicit fallback and standalone legacy routes use their complete original archive renderer without an ownership guard.
- Direct Journal editor persistence mirrors the legacy contract: title and tracker context are trimmed in storage, content stays raw, minutes clamp to 0–1440, blank entries delete, IDs and creation timestamps survive edits, every create/update/delete appends a normalized `journal_entry_*` audit record, and optimistic per-key values keep editor and archive synchronized while server writes settle.
- Pattern noticed and Pattern history are fully React/TypeScript-owned. Both derive from the same strict Planner-store metric bundle, so the card and history evidence cannot drift between legacy and React calculation paths.
- Pattern action routing is React/TypeScript-owned. The direct Dashboard targets its live task input and Planned vs actual mount, navigates with the shared direct-shell helper, and opens Pattern history through native React dialog state. Agent undo is also React/TypeScript-owned and no longer uses a legacy insight bridge.
- All eleven Pattern rules and top-insight priority selection are React/TypeScript-owned. Browser regressions exercise the direct Dashboard and compare it with the standalone legacy reference without a portal or legacy-derived metric bridge.
- Task-derived Pattern metrics are split across focused strict-TypeScript numeric/date, daily-summary, and aggregate modules, with parity tests protecting their compatibility behavior.
- Cross-domain Pattern metrics are split across focused strict-TypeScript Money/activity, Journal/energy, correlation, and composition modules. A focused store adapter now combines them with task metrics and production no longer reads the legacy raw-metrics bridge.
- The direct React Dashboard owns the complete Dashboard composition and `#patternHistoryDialog`. Explicit fallback routes and the standalone legacy application keep their complete original Dashboard renderers; no Dashboard React portals or insight bridge remain.
- Pattern history is a fixed 14-day snapshot in the shipped legacy UI; it has no range selector or dialog-level undo control. A focused typed builder owns mode grouping, priority ordering, the two-action limit, and all eleven evidence formats. React refreshes the snapshot while the dialog is closed and remounts it on every open so native evidence disclosures reset exactly like the legacy rebuild.
- Day state is composed only by the direct React Dashboard. It decodes `hivePlanner.dayState` with the legacy `okay` fallback and persists both state and normalized `day_state_updated` audit writes while preserving unknown fields; the fallback portal and custom side-effect event are removed, and standalone legacy handles its own buttons and Sprouty side effects.
- Task progress, the task list/editor/form, calendar-linked reconciliation, and agent undo are composed only by the direct React Dashboard. Focused strict-TypeScript modules separately own compatibility decoding, list/timers, editor, form, shared options, persistence, and activity-log writes. The typed model preserves legacy truthy completion, retired activity IDs, time/reminder normalization, timer caps, calendar-source reminder flags, focus-mode hidden tasks, and undo snapshots. Explicit fallback routes use the complete standalone legacy task renderer, binders, reconciler, and undo path.
- Today's intention is composed only by the direct React Dashboard and derives its badge from `hivePlanner.routine.week.<ISO-WEEK>`. The typed model preserves the legacy Monday-first indexing, day-type aliases, and normal-day fallback without mutating stored compatibility data; explicit fallback routes use the complete standalone legacy renderer.
- The month grid, weekly planner, week setup, and selected-day event editor are composed only by the direct React Calendar. Their regressions compare that production route with the standalone legacy reference; explicit fallback routes use the complete original Calendar renderer with no React ownership flags, custom navigation/state bridge, or editor DOM relocation.
- The direct Calendar route composes the month grid, weekly planner, week setup, and event editor inside `PlannerShell` with no iframe. Its typed editor preserves raw unknown event fields, legacy title-prefixed times and category aliases, reminder markers, goal-step references, empty-date fallback, and cross-feature task reconciliation.
- Calendar day cells remain native buttons to match the legacy browser rendering exactly. Event pills are non-button descendants with delegated pointer editing, avoiding the legacy invalid nested-button markup while preserving the visual contract and date-cell keyboard behavior.
- Calendar event category normalization is shared by the React month model and React-owned calendar-task reconciliation, while decoded event records retain their raw stored category label where the legacy tooltip exposes it.
- Skate's direct hero derives entirely from strict-TypeScript plan, settings, session, task, and weekly-total models. It is composed only by the direct React Skate page; explicit fallback and standalone legacy routes use the complete original Skate renderer with no React ownership flags or custom state/action bridge.
- Skate program-day edits commit on blur, restore the last rendered value until normalization publishes, and clamp to Day 1–60. Settings writes preserve unknown stored fields, changing the primary rest day removes a duplicate extra rest day, and intensity updates both settings and the compatible current-session plan. Current Skate session start time remains transient across reload.
- Skate's intensity roadmap derives directly from `hivePlanner.skate.sessions` through a pure typed compatibility model. Stored order decides the latest dot color/title exactly like legacy; malformed records are ignored safely, invalid intensities fall back to yellow, explicit session dates take precedence, and the roadmap continues after Day 60.
- The Skate feedback dialog, transient start/finish state, and save flow are React/TypeScript-owned on the direct route. The hero and roadmap open the shared React controller directly and settings persist through the typed settings model; explicit fallback and standalone legacy routes keep their original dialog, timer, and settings handlers.
- Feedback persistence appends the compatibility-rich session without rewriting existing raw session entries, retains unknown Skate-setting and task fields, resets the normalized current plan, and stores task/settings/reset writes before the appended session completion marker. This ordering prevents observers from seeing a session before its dependent intensity and task updates reach SQLite.
- A current-day Skate save finishes the best matching Skate task or creates the legacy-compatible `Skate session` task and marks the session `trackedInTask`; a retroactive save uses a date-anchored UTC window and never changes a historical task. The running Skate timer remains intentionally transient across reload.
- Skate Body support derives from `hivePlanner.physical.logs` through one pure typed compatibility decoder shared by the React card and Sprouty's Skate context. It preserves the legacy Monday-Sunday window, done/modified/skipped rules, label grouping, count-first sorting, and zero-minute `Logged` display.
- Body-support saves append the normalized new record while retaining every existing raw array entry and unknown field. This is intentionally safer than the legacy save path, which normalizes the complete array and can discard compatibility data. The React card is composed only by the direct Skate page, and same-window storage events immediately refresh Life Pie and Sprouty context; fallback routes use the standalone legacy implementation.
- The shipped Skate Training plan is currently read-only. Older warm-up, focus, and skill-editing functions remain orphaned in the legacy source with no live call sites, so the migration preserves the visible checked-in plan instead of reviving dead editor behavior.
- The direct React Skate page owns the training-plan card and derives its state directly from the immutable typed SkateIQ data plus compatible settings. The shipped manual-progression rule remains exact: pre-season previews Day 1, then `currentProgramDay` selects Day 1–60 even on post-streak calendar dates. Explicit fallback routes use the complete standalone legacy renderer; no detached DOM parser or `MutationObserver` remains.
- The retired legacy Skate core's automatic post-Day-60 weekly scheduler is not part of the shipped React contract and must not be revived. Typed data tests instead protect all 60 consecutive program days, week mappings, benchmark pins, phase boundaries, and representative plan content used by the manual progression UI.
- The Guitar goal, session card, and finish dialog are composed only by the direct React Guitar page. Focus and next-step values remain raw strings, save on every input event without trimming, and use the existing Planner persistence path; explicit fallback and standalone legacy routes use the complete original Guitar renderer and timer handling without React ownership flags.
- The Guitar migration regression records the complete shipped page before the tracker cutover: weekly target/minute/average calculations, focus-aware plan copy, four-row recent history, transient timer reset, finish-dialog persistence, task synchronization, malformed root fallback, exact desktop/mobile goal-card visuals, and clean console behavior.
- Guitar session/task synchronization is shared with Skate through a focused strict-TypeScript compatibility module. It retains every raw existing session entry and unknown task field, chooses ready then unfinished then any matching activity task, and creates the legacy-compatible `Saved session` task only when no Guitar task exists.
- Guitar session start remains transient across reload. Completing a session writes its task update before appending the completion marker, preserves the Monday-Sunday target rules and newest-four history contract, and uses the exact legacy duration rounding and copy.
- The root/no-view entry path plus explicit Dashboard, Money, Journal, Calendar, Skate, and Guitar routes bypass the iframe and compose all six primary pages directly inside the focused React shell.
- `backend/planner_api.py` owns the Planner KV/backup application contract: `hivePlanner.*` key validation, string-value validation, import-object validation, version-2 export documents, and success response shapes. SQLite connection/transaction behavior remains in `backend/db.py`, while HTTP status/header/body mechanics remain in `PlannerHandler`.
- `backend/reminder_service.py` owns stored event/task loading, due-reminder collection, Telegram delivery, sent-marker persistence, the 30-second polling loop, and daemon-thread startup. It writes each changed storage key once, leaves a partially delivered key unwritten so the poll can retry it, and keeps malformed raw list records while excluding them from reminder evaluation.
- `backend/http_server.py` owns the complete HTTP transport: route dispatch, JSON parsing/responses, Planner/integration endpoint wiring, static MIME/cache headers, HEAD behavior, and traversal protection. Malformed JSON or UTF-8 returns one `400 Invalid JSON` response and stops endpoint processing. `backend/app.py` only initializes SQLite, constructs the threaded server, starts reminders, prints addresses, and owns process lifetime.
- The Python server serves `frontend-react/dist` at the root unconditionally. The `YUAN_PLANNER_FRONTEND_MODE` override is removed, so there is no second frontend to select.
- The server has exactly one static surface: `frontend-react/dist`. React build files are served exactly, extensionless client paths fall back to `index.html`, missing file-like paths return `404`, unknown `/api` routes never enter the SPA fallback, traversal attempts return `403`, and a missing build returns a clear `503`. The retired `/legacy/`, `/js/*`, and `/css/styles.css` routes and the `YUAN_PLANNER_FRONTEND_MODE` override are removed; `/legacy` is now just another client path that renders React.
- React production assets remain ignored build output. Local runs require `npm run build`; Docker uses a Node 24 builder stage and copies only `dist` into the Python image.
- Existing browser visual-reference fixtures start the Python server in explicit legacy mode. A separate production regression starts it in React mode and verifies bundled scripts/styles, direct Dashboard and Money rendering, API access, desktop/mobile overflow, console cleanliness, and React handling of unknown view values.
- Chrome polling tolerates transient expression errors while an iframe document is detached during navigation, then reports the last evaluation error if the readiness condition times out. This removes combined-suite timing flakes without hiding persistent failures.
- Missing and unknown `view` values both map to the direct React Dashboard. The production-serving regression verifies that even `view=legacyShell` renders React with no iframe.
- `frontend-react/src/planner.css` is the canonical visual stylesheet, now an ordered index over `frontend-react/src/styles/*.css`. Vite inlines the imports in order, so the cascade is identical to the previous single file; the byte-identical built output proves it. There is no second CSS copy to drift.
- Direct React pages no longer request `/css`, `/js`, or `/legacy`, and Vite proxies only the API and favicon. This runtime boundary must remain true while test-only legacy dependencies are retired.
- Broad navigation and task lifecycle coverage is now owned by the direct React page regressions. The cross-feature Guitar/Skate flow also runs only against direct React routes and verifies persisted task/session synchronization plus no-double-count totals; the duplicate legacy-only smoke and lifecycle files are intentionally removed.
- Legacy unit-test dependencies are retired only after every unique compatibility assertion is represented through the matching public strict-TypeScript production boundary. The standalone JavaScript module remains available while browser reference coverage still needs it; removing a duplicate CommonJS test does not authorize deleting its runtime reference module early.
- Legacy JavaScript unit-test retirement is complete: no root unit test imports `frontend/js/`. The remaining standalone JavaScript modules must stay available until the browser files that explicitly load the legacy reference have been replaced.
- The orphaned legacy Calendar grouping helper was not recreated in React: the standalone application defines it but never calls it, and the direct Calendar has no matching user-visible behavior. Calendar ordering, labeling, CRUD, task synchronization, and desktop/mobile rendering remain protected at the shipped boundaries.
- Sprouty's retired legacy `simplify_today`, `move_one_task`, `adjust_morning_block`, and `break_task_down` mutation tests were not recreated as dead React action code. The direct shell intentionally keeps these as wording-only suggestions; typed tests protect suggestion selection, day-state normalization, and the separate compatible undo path, while the standalone legacy app retains its own mutation implementation for reference delivery.
- Direct-shell navigation writes the requested `view` and deterministic planner `date` into the URL. Dashboard, Money, Journal, Calendar, Skate, and Guitar all navigate directly.
- React backup import/export preserves unknown `hivePlanner.*` values and excludes the transient Guitar session just like legacy. Import publishes same-window storage events so the direct Money cards update immediately.
- The React Pattern store adapter runs only after the server-first Planner store is loaded. It derives the direct Dashboard model from typed Planner data, never interprets legacy bridge memory as source data, and never writes metric inputs back to storage.
- Insight action navigation resolves the current direct Dashboard `#plannedMount` and `#taskTitle` at click time so actions always use live controls rather than stale references captured before rendering.
- React persistence explicitly publishes a same-window storage event after local writes because browsers do not deliver native storage events to the document that performed the write. This keeps sibling React boundaries synchronized immediately.
- **All server writes share one queue** in `frontend-react/src/app/planner-persistence.ts`. Every edit persists a whole document, so two overlapping edits each send a full snapshot; before the queue existed, an earlier snapshot could finish last and silently discard the newer edit. Session 79 reproduced exactly that: six rapid Journal edits produced six whole-array writes, and the fifth (carrying the pre-edit duration) completed after the sixth, so the saved value was lost. The queue runs writes in issue order, which keeps the newest edit authoritative and still guarantees that a trailing audit entry lands after the state it records. Hydration backfills go through the same queue. A failed write is caught so it cannot stall the queue behind it.
- Direct React hydration preserves the server-first compatibility rule. Valid server strings win, missing `hivePlanner.*` values are read from browser storage and shown immediately, and only those missing values are backfilled to `/api/kv`; unrelated browser keys and malformed values are ignored.
- Each retired Money browser reference is replaced by a focused `tests/helpers/money-*-contract.js` module that exports the contract expressions next to the pinned expected values. Repeated computed-style values live in one `money-visual-tokens.js` module so the six card contracts cannot drift apart.
- Pinned grid templates go through the shared `gridColumns` helper because Chrome serializes a grid template with six significant digits and breaks an exact tie towards the even digit, while the element rect recorded by the same contract keeps full precision.
- The production CSS minifier rewrites equivalent gradient syntax: `circle at 100% 0%` becomes `circle at 100% 0` (serialized `0px`), `circle at 0% 0%` becomes `0px 0px`, and `to right` becomes `90deg`. Pinned contracts record the built serialization; the rendered result is unchanged, and `frontend-react/src/planner.css` remains the single canonical source.
- Money card visual contracts are pinned from a seeded stored state rather than from the end of a long interaction sequence, so the expected geometry stays deterministic and independent of the form flows asserted in the same test.
- Meditation expiry was verified to behave identically in legacy and React: completing an expired timer writes the compact five-key session record, appends it exactly once, drops unknown root data, and preserves unknown fields on existing sessions. The pinned contract records that shape.
- The Journal archive list and its cards legitimately overflow their card at both viewport sizes, which is why the pinned mobile panel width exceeds the viewport. This is existing legacy layout behavior and must not be "fixed" as part of the migration.
- Every retired browser reference follows the same shape: the legacy state and visual contract are captured while the legacy reference is still live, pinned in a focused `tests/helpers/*-contract.js` beside the contract expressions, and asserted against the production React build. Rendered coverage is kept as a tolerant 8x8 RGB signature instead of a live legacy screenshot.
- Beyond the zero-position gradient rewrites, the production stylesheet also makes Chrome serialize the Skate feedback dialog's background position as `0px 0px` rather than `0% 0%`. With no background image to position the two are identical, and the pinned contract records the built form with that note.
- A pinned contract must be captured from, and asserted against, the same stored state. Where a test mutates data before a later viewport pass, it re-seeds the documented fixture first rather than widening the contract.
- A browser readiness expression must evaluate to a boolean. Returning a DOM node makes Chrome fail serialization with "Object reference chain is too long", which surfaces as a confusing timeout, so use `querySelector(...) !== null` instead of a bare selector.
- Visual regression coverage must compare the legacy and React versions at identical desktop and mobile viewports, including computed styles/geometry and a rendered screenshot where stable.
- Once a focused component has already matched the standalone page, its browser regression may retire the live legacy dependency by pinning that verified text, computed-style, and geometry contract and running interactions against the production React server. Rendered screenshot coverage remains at the corresponding direct full-page boundary so removing a duplicate component screenshot does not remove screen-level visual protection.
- Screenshot comparisons decode Chrome PNG pixels and allow at most 1% of pixels to differ by more than eight channel values; exact DOM content and computed style/geometry comparisons remain mandatory so minor cross-frame antialiasing does not create false failures.
- A direct full-page test may retire its live legacy screenshot only after the match is established and a pinned rendered-image signature replaces it. The signature averages an 8×8 grid of RGB tiles and permits at most 5% of tiles to differ by more than eight channel values, while separate DOM and geometry contracts continue to catch localized structural drift.
- The legacy document publishes `data-planner-ready="true"` only after asynchronous hydration, rendering, event binding, and initial-view selection finish. Browser visual helpers wait for this marker before scrolling, so a late `setActiveView` cannot reset capture position; card-only screenshots hide the unrelated animated mascot with `visibility: hidden` while preserving layout.
- New code must be split into small, clear, single-responsibility modules with short focused functions and short explanatory comments for non-obvious logic; do not create new monolithic files.
- Smoke tests alone are insufficient; migration tests must cover behavior, edge cases, persistence/compatibility, and critical cross-feature flows.
- Use the same Git repository.
- Keep `main` as the original working application.
- Perform migration on `rewrite/react-typescript`.
- Prefer a separate Git worktree for the rewrite branch.
- Existing application is the behavioral reference.
- SQLite is preserved initially.
- Python backend is preserved initially.
- Frontend will migrate to React + TypeScript.
- Large rewrites in one step are prohibited.
- Readability and learnability are priorities.
- Use short explanatory comments for non-obvious code.
- Treat every existing `hivePlanner.*` value as a compatibility contract; preserve unknown keys and unknown record fields until a tested migration explicitly handles them.
- Preserve server-first hydration with local-storage backfill unless a separately documented migration changes it.
- Keep task timers persistent, but keep current Skate and Guitar session start times transient across refresh.
- The first React boundary should be read-only and use typed compatibility decoders against the existing `/api/kv` response.
- Keep React source in `frontend-react/`; the Python server owns production delivery from `frontend-react/dist`, while Vite remains only the development and migration-regression server.
- Fetch `/api/kv` without caching, reject malformed non-string API values, and keep weekly-goal decoding pure so compatibility behavior can be tested without a browser.
- Weekly-goal decoding mirrors legacy behavior for missing, invalid JSON, array, and non-string values by rendering empty tracks while leaving stored data untouched.
- Weekly-goal edits save on blur to match the legacy `change` interaction, trim the value, retain unknown fields in the stored object, update browser storage optimistically, and persist through the existing `/api/kv` endpoint.
- Keep the Vite development API target configurable through `VITE_PLANNER_API_TARGET`; the default remains the existing server at `http://127.0.0.1:8765`.
- Keep new compatibility logic in focused, pure UMD modules that the legacy app and Node tests both execute.
- Calendar-linked task reconciliation is React/TypeScript-owned on the direct Dashboard. Its typed compatibility layer accepts legacy category/time formats, preserves user-edited linked task state, removes retired routine and stale source links, ignores malformed/duplicate event records, and adds each missing current event exactly once. Explicit fallback and `/legacy/` routes use the standalone legacy reconciler.
- Agent undo is React/TypeScript-owned. Its typed compatibility layer consumes one legacy stack entry, caps the remaining stack at ten, restores normalized today/tomorrow tasks and compatible agent UI state, preserves unknown state fields, and appends the exact `agent_action_undone` audit record. The legacy bridge method is removed while the standalone legacy undo path remains available to the standalone app.
- Agent undo, day-state, and Money transaction writes share one strict activity-log compatibility decoder so validation and chronological ordering cannot drift across those React persistence boundaries.
- The direct React shell builds Sprouty server context only from typed compatibility decoders and the existing React Dashboard metric/rule pipeline. State-aware prompt choices match legacy wording. Invalid or failed server replies use focused strict-TypeScript retrieval and reply modules to classify the question, select up to three normalized evidence snippets, and produce the established intent-specific local guidance.
- Sprouty's Skate context uses a data-only strict-TypeScript copy of the immutable 60-day SkateIQ reference plan, separated from normalization logic. The model follows the shipped manual-progression contract: `currentProgramDay` selects the plan after season start, date-specific intensity overrides the plan default, recent sessions are newest-first, and weekly support includes only done/modified logs in the local Monday–Sunday window.
- Sprouty's action suggestions are wording-only in the chat; action application remains a separate compatibility path. The strict-TypeScript proposal model preserves the legacy 15% high-carryover threshold, question-aware priority, availability filtering, two-suggestion cap, and exact highest-value `Useful next step:` append for both server and local replies.
- Sprouty's direct-shell motion uses the exact legacy `hivePlanner.mascot.position` `{x, y}` document. Coordinates remain intentionally unbounded for compatibility; pointer movement above five total pixels suppresses exactly one click, pointer-up persists even an unchanged position, reload restores the CSS transform before paint, and the existing mobile-open CSS continues to force `transform: none` while hiding the mascot button.
- The legacy frontend was deleted only after the complete suite passed with it absent, and after a live pass over all six pages on the production server: real seeded data rendered, a new task created through the UI reached SQLite with its audit record and survived a reload, no console errors appeared, every request returned 200, and no page overflowed at 375px.
- Work order after the migration, as the user set it (2026-10-11): finish migration, keep tests green, fix bugs, and only then refactor the architecture. The refactor must be structural only and verified more thoroughly than normal work; `AGENTS.md` holds the rules and the handoff holds the plan.
- The user wants exactly one commit per session (stated 2026-10-11). Work still proceeds in small verified steps, but they are squashed into one commit before the session ends, with a message that keeps the individual steps legible.
- Keep browser-flow assertions separate from reusable Chrome protocol, Chrome lifecycle, and temporary planner-server helpers so each test file has one clear responsibility.
- Browser tests may use the existing Chrome DevTools Protocol directly to avoid adding a production or test package dependency.
- Reuse one browser-planner fixture for Chrome and temporary-server lifecycle instead of duplicating setup across user-flow tests.

## Known Problems
- The retired `frontend/` directory (891-line reference HTML plus 17 legacy JavaScript files, 13,944 lines in all) was deleted once the complete suite passed without it. Its history is still in Git and on `main` if any detail ever needs checking.
- `backend/app.py` is now a 58-line process bootstrap, the clean Python structure milestone is complete, and `http_server.py` serves the compiled React application at the root. The legacy directory remains reachable only through explicit compatibility and shared-asset routes.
- `frontend-react/src/planner.css` is an index that imports 16 focused parts from `frontend-react/src/styles/` in cascade order, with the cascade contract documented in its header. The original split was proved safe by a byte-identical build, as were the two Session 81 moves (`coach.css` folded into `skate-guitar.css`, `tokens.css` extracted as the first import). The parts must not be reordered; `responsive.css` and then `overrides.css` stay last because they intentionally override earlier declarations.
- The surface parts are not cleanly separated: 17 selectors are styled in two parts each and 5 of those conflict, so import order alone decides what renders. See "Cross-surface CSS overlap". This is the main constraint on any future stylesheet move or split.
- Dead CSS is now zero by the class-name audit, but that audit only sees class selectors. Element, attribute, and descendant-only rules were not covered, so "no dead classes" is not the same as "no dead rules".
- Time/date parsing and normalization are duplicated between the frontend and the backend integrations. Within the frontend the duplication is gone: Session 82 removed the last copy, `formatPlannerDate`, which was `toDateKey` under another name.
- One cross-page import remains, the Dashboard rendering the Money quick card, and it is deliberate. The other four were resolved in Session 85; the mascot's nine page imports are accepted by design. See "Cross-page coupling".
- Imports reach outside their own directory through `@/`, which means `src/`. A lint rule rejects new `../../` imports. The alias has to be kept in step in both `vite.config.ts` and `tsconfig.json`.
- Eight legacy-only key families remain in the live database with no consumer; backups preserve them and a test pins that. See the Storage Key Audit.
- The default `node` on the inspected machine is Node 14 and cannot run `node --test`; use the installed modern Node runtime or fix the local PATH before relying on `scripts/test.sh` without `NODE_BIN`.
- Browser coverage protects task and activity-session lifecycles, all six direct primary pages, and every migrated React boundary. The untested flows that remain are all in the retired reference code, which no longer runs.
- Weekly goals, dashboard day state, task progress, Today's intention, the task list/editor/form, Life Pie, Planned vs actual, Energy trail, Pattern noticed/history, all six Money boundaries, Journal editor, Meditation, Journal archive, Calendar, Skate, and Guitar are React-owned and verified on direct production routes. No migrated feature retains a fallback portal or iframe.
- Browser smoke tests skip when Chrome/Chromium or Node WebSocket support is unavailable; they run with the documented Node 24 runtime on the inspected machine.
- A local Python start returns `503` at the UI root when `frontend-react/dist` has not been built. This is intentional and documented; Docker always builds the bundle.
- `frontend-react/src/app/App.tsx` is now a 20-line React-only route dispatcher. Unknown explicit values safely render the Dashboard.
- The direct shell's Sprouty surface now sends grounded task, insight, journal, planning, activity, day-state, Money, and Skate context; restores state-aware quick prompts; handles server failure with evidence-based local answers; appends question-aware action suggestions; and preserves pointer-follow, drag persistence, click suppression, and mobile motion behavior. Shared-shell Sprouty parity is complete.
- The React visual regression test skips when Chrome or `frontend-react` dependencies are unavailable, matching the existing browser-test prerequisite policy.
- Browser-capable root Node test files run serially to avoid Chrome/Vite startup timeouts under parallel process saturation.
- The suite is now 44 Python, 324 React/TypeScript across 58 files, and 46 browser tests, zero skips. The browser count rose from 42 across Sessions 83 and 84: the restart, backup, reminder-contract, and Dashboard cross-card tests.
- The Python and React suites cannot see each other. Each pins its own half of a shared record and nothing but `tests/reminder-contract.e2e.test.js` pins that the halves agree; renaming a serialized field leaves the entire Python suite green.
- Boundary and cross-feature coverage were verified feature by feature in Session 84; the gaps were four, and all four are now tested. The scan that flagged them was wrong in both directions, so treat a keyword matrix as a way to find candidates, never as a measurement.
- The Session 80 complete run passed 44 Python tests, 312 React/TypeScript tests across 55 files, lint, strict typecheck, the production build, and all 42 root browser tests, with the built stylesheet hash unchanged from the session baseline. The count dropped from 43 because the duplicate legacy budgets interaction test was merged into the React one. Treat any repeated failure as actionable rather than accepting it as a combined-run flake.
- No browser file starts the legacy frontend or the Vite dev server; all 42 root browser tests run against the production React build. The fixture no longer has a frontend-mode option and `tests/helpers/react-preview-server.js` is deleted.

## Session Log

### Session 84

- Verified the two coverage columns Session 83 had left as signals, one feature at a time, rather than trusting or repeating the scan. Both were largely false alarms: boundaries are exercised with concrete values in tests that never use the word, and cross-feature coupling is already covered at unit level because each consumer's tests seed the other feature's stored data. Three of the eleven flagged features have no numeric input at all, so they are a verified "not applicable".
- Filled the four real gaps the verification found: the journal archive's 132-character preview cut including the trim before the ellipsis, the Skate hero's upper week clamp past the end of the season, the feedback scale's lower clamp with a zero duration, and the live cross-card path on the Dashboard.
- The Dashboard test is the one that needed a new idea. Every existing sync test fires a synthetic `StorageEvent`, which is the external path; nothing covered a real action in one card refreshing a card beside it through React state. It logs a spend through the real Money quick form and waits for the insight card, which belongs to another page's feature, to change before any reload. Mutation-checked by freezing the insight model on its first value, which makes the test time out rather than pass.
- Dropped an assumption when the code disagreed with it. I expected the Skate hero's day count to clamp to 60 alongside the week; it reports 1, because the SkateIQ day is a stored setting the skater advances by hand rather than a date-derived value. The code was right, the test now states the distinction.
- Verification: 44 Python tests, 316 React/TypeScript tests across 57 files, lint, strict typecheck, production build, and 46 browser tests with zero skips, stylesheet hash unchanged. No production source changed; the only non-test edit was reverted after its mutation check.

### Session 85

- Took the first of the two open decisions and found the record was wrong. Session C had written that none of the five cross-page imports was fixable by a move; reading what each one actually imported showed four were. Five cross-page imports are now one.
- Moved `isoWeekKey` to `shared/planner-date.ts`, which removed two of them at once, and took its assertions with it. Checked the new cases against Python's `isocalendar()` instead of only against the code under test, because the year boundary is the part that matters: 1 Jan 2021 is week 53 of 2020, and four features key weekly storage on it.
- Found a real duplication while doing it: the Calendar weekly planner and the Dashboard intention card each carried their own copy of the `hivePlanner.routine.week.*` key and of the day-type alias table, under different names. Two features owning the same stored document is how they drift apart. Merged both into `shared/routine-week.ts` and gave it its own tests; the existing tests on both sides were the regression net and passed unchanged.
- Split the day type out of the intention card so the Calendar month can read it without importing the Dashboard, and moved the money store and its definitions to `shared/`, where the calendar event store and the journal entry store already live. The money store was read by all six Money cards, the insight and the mascot, so it was never the quick card's.
- Left the last coupling alone on purpose. The Dashboard renders `MoneyQuickCard` because the quick log really does appear there; moving a page's main card into a shared directory to satisfy a layering rule would make the code harder to read, not easier.
- Verification: 44 Python tests, 324 React/TypeScript tests across 58 files, lint, strict typecheck, production build, and 46 browser tests with zero skips, the built stylesheet byte-identical with its asset name unchanged, and a live pass over all six pages at desktop and 375px with no console errors and every request 200.

### Session 86

- Took the last open decision, the `@/` path alias, and applied it to the 243 imports that were two or more levels deep. Left the 88 single-level `../` imports alone: one step up keeps a nearby relationship visible, and deep chains were the thing worth removing.
- Configured it in the two places that have to agree, `vite.config.ts` and `tsconfig.json`, and hit the detail that `baseUrl` is deprecated in this TypeScript version, so the `paths` target is written relative to the config file instead.
- Added `no-restricted-imports` so a new `../../` import fails lint with a message pointing at `@/`, then checked the guard actually fires by reintroducing a deep import rather than trusting a clean run.
- The verification for this one is stronger than a test suite: the built JavaScript and CSS came out byte-identical to the pre-change build, hashes and filenames included, and `dist/` holds nothing else but an untouched favicon and an `index.html` generated from an untouched template. No live pass was run, and it would have added nothing, because the server is serving the same bytes as before.
- Verification: 44 Python tests, 324 React/TypeScript tests across 58 files, lint, strict typecheck, production build, and 46 browser tests with zero skips.

---

## Before Ending Any Session
Always:
1. Run relevant tests.
2. Review `git diff` and `git status`.
3. Commit completed working changes.
4. Squash the session's work into a single commit.
5. Record anything found but not fixed, and any planned item dropped or deferred, with its evidence.
6. Update:
   - Current Task
   - Last Completed Task
   - Next Task
   - Important Decisions
   - Known Problems
   - Session Log

The next agent session must be able to continue using only:
- the repository
- this file
- Git history
- tests
- relevant source files

Do not depend on previous chat history.
