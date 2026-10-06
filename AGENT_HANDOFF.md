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

Make **frequent, small commits** after completed working steps.

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
- [ ] Create clean Python API structure
- [x] Connect frontend to backend
- [x] Confirm SQLite data still works

### Phase 4 — Feature Migration
Migrate one feature at a time.

For each feature:
- [ ] document old behavior
- [ ] add tests
- [ ] implement new version
- [ ] compare old/new behavior
- [ ] commit the working migration
- [ ] remove legacy implementation only after tests pass

## Current Task
The Dashboard task system, day-state persistence/auditing, and Pattern metrics, rules, priority selection, actions, and history evidence are React + strict TypeScript owned and verified. Calendar reconciliation and agent undo still depend on narrow legacy bridges, while Sprouty's unmigrated surface receives a read-only day-state effect notification, so the Dashboard route continues to use the migration iframe.

## Last Completed Task
Replaced the day-state write bridge with focused strict-TypeScript persistence that preserves unknown compatibility fields, normalizes existing activity records, and appends the exact legacy `day_state_updated` audit entry. A narrow notification refreshes the still-unmigrated Sprouty/insight surfaces without granting legacy code write ownership; browser coverage installs a throwing legacy bridge guard and verifies persistence, one audit entry, reload, side effects, and desktop/mobile visual parity.

## Next Task
Continue toward the direct React Dashboard page by replacing calendar-linked task reconciliation with focused strict-TypeScript ownership and compatibility tests. Then replace agent undo before composing the Dashboard directly in `PlannerShell`.

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
- Production activity/category compatibility is defined by legacy `main` commit `01d6c6d`. The rewrite must accept old stored IDs, expose the new labels/IDs, preserve unknown fields, and avoid hardcoding weekly target values into UI or calculation logic.
- React centralizes the production activity definitions and legacy ID mapping in the strict-TypeScript `activity-categories.ts` module. Life Pie and Planned vs actual import this contract instead of maintaining separate category lists.
- Planned-hour decoding combines numeric old and new values that map to the same production activity while retaining unrelated fields unchanged. The UI persists the normalized object on the next edit rather than discarding compatibility data.
- The temporary legacy shell loads a focused activity-category bridge during hydration because five routes still run inside that shell. All new bridge code follows the same `const`-by-default/no-`var` rule; it is compatibility infrastructure, not a replacement for the React TypeScript model.
- Meditation and Journal remain standalone features but no longer contribute to activity totals or Life Pie. The Meditation regression explicitly verifies session persistence without a Life Pie side effect.
- The rewrite must preserve visual parity with the legacy Planner; this is an architecture rewrite, not a UI redesign.
- Do not add migration-preview branding, explanatory badges, new layouts, or invented visual treatments to the React UI.
- During incremental migration, the Vite preview may use the complete legacy app as a temporary same-origin shell so unmigrated features and interactions remain unchanged while React owns one tested mount.
- The legacy weekly-goal renderer skips `#weeklyGoals` only when the preview marks it `data-react-owned="true"`; the normal legacy application remains unaffected.
- The React preview marks `.life-card` `data-react-owned="true"`, clears only its existing `.panel-inner`, and portals the legacy-equivalent Life Pie markup into that mount; the normal legacy application remains unaffected.
- React's planner-store hook listens only for same-origin `hivePlanner.*` storage events. This is the compatibility bridge that keeps React-owned summaries current while task, physical, session, meditation, and journal writes remain in the legacy frame.
- Planned vs actual stores one object at `hivePlanner.planned.<ISO-WEEK>` and must preserve unknown fields when editing. Each edit also appends the legacy-compatible `planned_hours_updated` record to `hivePlanner.activityLog` with the same group/activity metadata.
- Energy trail remains derived from `hivePlanner.journal.entries` and dated task keys. React filters invalid tracker values before selecting the newest seven rows, and preserves the legacy rule that the comparison appears only after at least two low/empty energy days have previous-day task summaries in the 14-day insight window.
- Journal-entry storage normalization now lives in one typed compatibility module shared by Energy trail and Journal archive. Both boundaries therefore agree on valid dates, tracker states, duration clamping, blank-entry removal, fallback IDs/timestamps, and newest-first ordering.
- Clicking a React-owned Energy trail row delegates navigation through the existing legacy tab and journal-date controls so the unmigrated Journal view retains its established rendering and save behavior.
- Money quick derives its category budgets, transfers, transactions, vendor rules, pace, and remaining-money summaries from the existing `hivePlanner.money.*` compatibility records. Saving writes a transaction, a normalized activity-log entry, and a remembered vendor rule when a vendor is present.
- Money quick retains optimistic values per storage key until the corresponding external value supersedes them. This prevents an unrelated legacy activity-log write from hiding a newly saved React transaction while still allowing full Money settings changes to update the React summary immediately.
- The legacy Money renderer continues synchronizing category inputs used by the full Money view, but skips only the React-owned quick-log select and summary mount. The normal legacy application remains unaffected.
- Money overview and Money quick share the typed Money compatibility decoder, including the current week clipped to the month. The overview claims only `.money-overview-card .panel-inner`; the legacy renderer skips that card only when React marks it owned, so the normal legacy application remains unaffected.
- Money Pace and projection extends the shared decoder with current-month total/flexible spending, projected spending, and long-term month-prefix totals. React claims only `.money-pacing-card .panel-inner`; its history disclosure remains uncontrolled so live store updates preserve open state while reload closes it like legacy.
- Money Vendors uses that shared decoder for trimmed, case-sensitive current-month summaries and exact-name previous-month comparison. React claims only `.money-vendors-card .panel-inner`; the legacy renderer skips that card only when marked React-owned, so standalone legacy behavior remains unaffected.
- Money recent activity uses the same typed Money decoder and claims only `.money-activity-card .panel-inner`. Its native disclosure state remains transient and open across live list updates, while reload creates a closed disclosure like the legacy app.
- Money Budgets and categories uses the shared typed Money decoder and claims only `.money-budget-card .panel-inner`. Its focused persistence module normalizes known legacy fields while retaining unknown root, category, transfer, and notes data; monthly edits derive the weekly guide from the active month, and every write publishes through the existing bridge so all six React Money boundaries stay synchronized.
- Budget inputs use the browser's native `change` event because the legacy editor commits only when editing finishes, not on every typed character. Invalid values restore the rendered amount; any edit collapses the outer settings disclosure while nested section and transfer disclosure state remains mounted until reload.
- Meditation uses the existing `hivePlanner.meditation` `{active, sessions}` document. Start and cancel preserve compatible unknown root/session fields; expiry mirrors the legacy compact completion shape and appends one standalone session using the timer's persisted end timestamp.
- The React app observes the legacy frame's Journal-date change and click events once and shares the selected date with both meditation and archive. Archive, Today, date-input, and Energy-trail navigation therefore update both React boundaries without duplicate iframe listeners.
- The React Journal archive keeps its search text as local transient state, derives cards from `hivePlanner.journal.entries`, and delegates card selection through the existing legacy tab/date controls. The legacy archive renderer skips only `.journal-archive-card[data-react-owned="true"]`, so the normal legacy application remains unaffected while legacy editor saves still flow back through the storage bridge.
- Pattern noticed and Pattern history are fully React/TypeScript-owned. Both derive from the same strict Planner-store metric bundle, so the card and history evidence cannot drift between legacy and React calculation paths.
- Pattern action routing is React/TypeScript-owned. The action target resolves live iframe controls at click time for task focus, planned-hours scrolling, Money navigation, and Pattern-history opening; only agent undo remains on the legacy insight bridge.
- All eleven Pattern rules and top-insight priority selection are React/TypeScript-owned. The browser regression replaces legacy `currentInsight()` and `currentMetrics()` with throwing guards to prove the React card does not consume legacy-derived insights or metrics.
- Task-derived Pattern metrics are split across focused strict-TypeScript numeric/date, daily-summary, and aggregate modules, with parity tests protecting their compatibility behavior.
- Cross-domain Pattern metrics are split across focused strict-TypeScript Money/activity, Journal/energy, correlation, and composition modules. A focused store adapter now combines them with task metrics and production no longer reads the legacy raw-metrics bridge.
- React owns only `#dashboardInsightCard .panel-inner` and the contents of `#patternHistoryDialog`. Pattern actions delegate to the existing task/planned-hours controls, while the standalone legacy application keeps its original renderers.
- Pattern history is a fixed 14-day snapshot in the shipped legacy UI; it has no range selector or dialog-level undo control. A focused typed builder owns mode grouping, priority ordering, the two-action limit, and all eleven evidence formats. React refreshes the snapshot while the dialog is closed and remounts it on every open so native evidence disclosures reset exactly like the legacy rebuild.
- React owns the contents of `#dayStateOptions`, decodes `hivePlanner.dayState` with the legacy `okay` fallback, and persists both state and normalized `day_state_updated` audit writes in strict TypeScript while preserving unknown state fields. The legacy write bridge is removed; a narrow custom event carries the selected state only to refresh the still-unmigrated Sprouty prompts, insight renderer, and mascot bubble.
- Both the legacy day-state renderer and its click binder honor `data-react-owned="true"`. The binder guard is required because iframe hydration may finish after React claims the mount; without it, the React buttons receive a second legacy handler and append duplicate audit records.
- React owns `.day-banner`, `#tasksMount`, and `#taskForm`. Focused strict-TypeScript modules separately own compatibility decoding, the list/timers, editor, add form, shared options, persistence, and activity-log writes. The typed model preserves legacy truthy completion, retired activity IDs, time/reminder normalization, timer caps, calendar-source reminder flags, and focus-mode hidden tasks.
- The legacy task renderer routes both empty and populated progress through one ownership-aware helper. This keeps the standalone app unchanged while preventing detached legacy span references from overwriting the React portal.
- Legacy task/activity binders skip only React-owned mounts. Pattern task-focus and agent undo resolve/delegate through the live DOM/bridge because React replaces the original form children; the standalone legacy application remains unchanged.
- React owns only `.intention-block` and derives its badge from `hivePlanner.routine.week.<ISO-WEEK>`. The typed model preserves the legacy Monday-first indexing, day-type aliases, and normal-day fallback without mutating stored compatibility data.
- The legacy intention renderer continues updating the dashboard subtitle, date, and week-status heading, but skips only the detached badge when `.intention-block` is React-owned. The standalone legacy application therefore retains its original renderer.
- `?view=moneyView` bypasses the iframe and composes the five Money-page cards directly inside a focused React shell. Other routes still instantiate `LegacyPlannerApp`, so this first direct page does not force an unsafe whole-app cutover.
- The direct route loads the legacy stylesheet only while mounted. Loading it globally changes the parent body's padding and narrows every iframe preview, which the complete Money regression suite caught.
- Direct-shell navigation writes the requested `view` and deterministic planner `date` into the URL. Navigating away from Money therefore reloads into the established legacy-shell route until that destination page is migrated.
- React backup import/export preserves unknown `hivePlanner.*` values and excludes the transient Guitar session just like legacy. Import publishes same-window storage events so the direct Money cards update immediately.
- The React Pattern store adapter runs only after the server-first Planner store is loaded and the hydrated legacy frame exposes the portal boundary. It never interprets bridge memory as source data or writes metric inputs back to storage.
- Insight action navigation resolves the current `#plannedMount` and `#taskTitle` at click time because React ownership replaces their original child nodes; retaining pre-migration references would target detached nodes.
- React persistence explicitly publishes a same-window storage event after local writes because browsers do not deliver native storage events to the document that performed the write. This keeps sibling React boundaries synchronized immediately.
- The legacy iframe listens for external `hivePlanner.*` storage writes from React-owned parent mounts and updates only its in-memory store. This prevents a later legacy write from overwriting newer React values without causing a second persistence loop.
- Visual regression coverage must compare the legacy and React versions at identical desktop and mobile viewports, including computed styles/geometry and a rendered screenshot where stable.
- Screenshot comparisons decode Chrome PNG pixels and allow at most 1% of pixels to differ by more than eight channel values; exact DOM content and computed style/geometry comparisons remain mandatory so minor cross-frame antialiasing does not create false failures.
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
- Keep the new frontend in `frontend-react/` while the Python server continues serving the legacy `frontend/` application; use Vite only as the separate migration preview for now.
- Fetch `/api/kv` without caching, reject malformed non-string API values, and keep weekly-goal decoding pure so compatibility behavior can be tested without a browser.
- Weekly-goal decoding mirrors legacy behavior for missing, invalid JSON, array, and non-string values by rendering empty tracks while leaving stored data untouched.
- Weekly-goal edits save on blur to match the legacy `change` interaction, trim the value, retain unknown fields in the stored object, update browser storage optimistically, and persist through the existing `/api/kv` endpoint.
- Keep the Vite development API target configurable through `VITE_PLANNER_API_TARGET`; the default remains the existing server at `http://127.0.0.1:8765`.
- Keep new compatibility logic in focused, pure UMD modules that the legacy app and Node tests both execute.
- Calendar-linked task reconciliation must preserve user-edited task state, remove stale source links, and add each missing current event without duplication.
- Keep browser-flow assertions separate from reusable Chrome protocol, Chrome lifecycle, and temporary planner-server helpers so each test file has one clear responsibility.
- Browser tests may use the existing Chrome DevTools Protocol directly to avoid adding a production or test package dependency.
- Reuse one browser-planner fixture for Chrome and temporary-server lifecycle instead of duplicating setup across user-flow tests.

## Known Problems
- Existing project is over 20,000 lines.
- Some files contain thousands of lines.
- Duplicate/redundant functions likely exist.
- Current architecture is difficult to understand.
- `frontend/js/app.js` is 8,516 lines and still owns most storage, normalization, rendering, event handling, and cross-feature orchestration; only the newly extracted boundaries have direct coverage.
- `frontend/css/styles.css` is 5,658 lines with several accumulated responsive sections.
- Time/date parsing and normalization are duplicated across frontend modules and backend integrations.
- Several declared storage keys and an older Study/Body weekly-overview path are inactive, while the real database still contains legacy-only keys that backups must preserve.
- Browser inspection reports generated form controls without an `id` or `name`; the current Chrome run reported 29 controls.
- The default `node` on the inspected machine is Node 14 and cannot run `node --test`; use the installed modern Node runtime or fix the local PATH before relying on `scripts/test.sh` without `NODE_BIN`.
- Most remaining cross-feature flows in `app.js` still lack DOM or end-to-end tests; browser coverage now protects task and activity-session lifecycles, all six primary views, and eighteen React migration boundaries.
- Weekly goals, dashboard day state, task progress, Today's intention, the task list/editor/form, Life Pie, Planned vs actual, Energy trail, Pattern noticed/history, all six Money boundaries, Journal meditation, and Journal archive are React-owned and verified. Dashboard orchestration and the other feature views still depend on the temporary iframe shell.
- Browser smoke tests skip when Chrome/Chromium or Node WebSocket support is unavailable; they run with the documented Node 24 runtime on the inspected machine.
- The React preview is not yet served directly by the Python backend. Its temporary legacy shell depends on Vite development proxies and is not the final production integration architecture.
- The direct Money shell's Sprouty surface can call the backend and provides a safe fallback, but it does not yet reproduce the legacy local grounded-response context, quick prompts, or draggable position behavior. Finish shared-shell parity before replacing the legacy shell on every route.
- The React visual regression test skips when Chrome or `frontend-react` dependencies are unavailable, matching the existing browser-test prerequisite policy.
- Browser-capable root Node test files run serially to avoid Chrome/Vite startup timeouts under parallel process saturation.

## Session Log

### Session 34

- Re-read `AGENTS.md`, this handoff, branch state, recent history, and the implementation skill, then selected the strict Planner-store metric composer and production cutover as the next focused React/TypeScript increment.
- Added failing store-level tests first for malformed compatibility values, complete task/activity/Money/Journal composition, mutation safety, and direct visible-card derivation.
- Implemented a focused strict-TypeScript adapter that decodes dated task keys, legacy-valid activity records, shared Money state/transactions, and shared Journal entries before composing all Pattern metrics and rules.
- Switched the production React Pattern card from the legacy `currentMetrics()` bridge to the loaded Planner store. The real-browser regression makes both `currentInsight()` and `currentMetrics()` throw while live task deletion still updates the card.
- Final verification: 150 React tests, React lint, strict type-checking, and the Vite production build pass. The full safety net passes with 18 Python tests and all 134 root JavaScript tests, including the serialized real-Chrome browser flows.

### Session 35

- Re-read `AGENTS.md`, this handoff, branch state, recent history, and the implementation skill, then selected typed Pattern-history evidence and the production history cutover as the next focused React/TypeScript increment.
- Added failing builder tests first for the fixed empty snapshot, mode grouping, priority ordering, the two-action limit, and exact evidence text for all eleven Pattern rules.
- Implemented a focused strict-TypeScript history builder and exposed store-backed history composition beside the existing typed card composition.
- Removed the production `currentHistory()` bridge read and its now-unused React legacy-model normalizer. Dashboard and Pattern-history browser regressions replace that legacy method with a throwing guard while preserving refresh, disclosure reset, actions, and exact desktop/mobile visual parity.
- The focused browser run exposed an existing transient-null iframe race in the Pattern-history readiness helper; the wait now treats a missing `contentDocument` as not ready and the rerun passes.
- Final verification: 150 React tests, React lint, strict type-checking, and the Vite production build pass. The full safety net passes with 18 Python tests and all 134 root JavaScript tests, including the serialized real-Chrome browser flows.

### Session 36

- Re-read `AGENTS.md`, this handoff, branch state, recent history, and the implementation skill, then selected removal of the day-state write bridge as the next focused strict-TypeScript increment.
- Added persistence tests first for compatibility-field preservation, exact audit shape, malformed documents and audit records, legacy fallback behavior, and raw previous values.
- Implemented typed day-state and activity-log writes, removed the React-to-legacy write bridge, and added a narrow effect-only event for the still-unmigrated Sprouty and insight surfaces. The browser regression installs a throwing legacy bridge guard to prove React owns the write.
- Final verification: 153 React tests, React lint, strict type-checking, the Vite production build, and both focused real-Chrome day-state tests pass. The full safety net passed 18 Python tests and 133/134 root tests; its only failure was an unrelated transient-null iframe race in the Money navigation test, which passed immediately when rerun alone.

---

## Before Ending Any Session
Always:
1. Run relevant tests.
2. Review `git diff` and `git status`.
3. Commit completed working changes.
4. Update:
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
