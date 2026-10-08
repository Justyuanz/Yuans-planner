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
The root/no-view entry path, explicit `?view=todayView` Dashboard, and explicit `?view=moneyView` Money route render directly in React + strict TypeScript with no iframe. The Dashboard/shared-shell cutover phase is complete, including Sprouty parity and root-route visual/navigation verification. Journal, Calendar, Skate, and Guitar remain on the temporary legacy-shell fallback and are the next route-level migration work.

## Last Completed Task
Switched the missing-`view` root entry path to the direct React Dashboard. Browser coverage now proves literal `/` is direct, a no-view URL with a selected date is state/geometry/pixel-identical to explicit `?view=todayView`, Dashboard-to-Money navigation preserves the date, and Journal, Calendar, Skate, and Guitar still open the correct legacy iframe route. Existing portal-boundary tests now request an explicit test-only legacy-shell fallback instead of depending on the old root behavior.

## Next Task
Start the direct Journal route migration. First document the remaining legacy Journal page composition and editor/tracker/save behavior, then add browser regressions for the complete desktop/mobile Journal route. Reuse the already React-owned Meditation and Journal archive boundaries, migrate one focused remaining Journal boundary at a time in strict TypeScript, and keep the legacy-shell fixture available until the full route reaches parity.

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
- Pattern action routing is React/TypeScript-owned. The direct Dashboard targets its live task input and Planned vs actual mount, navigates with the shared direct-shell helper, and opens Pattern history through native React dialog state. The fallback portal still resolves live iframe controls at click time. Agent undo is also React/TypeScript-owned and no longer uses the legacy insight bridge.
- All eleven Pattern rules and top-insight priority selection are React/TypeScript-owned. The browser regression replaces legacy `currentInsight()` and `currentMetrics()` with throwing guards to prove the React card does not consume legacy-derived insights or metrics.
- Task-derived Pattern metrics are split across focused strict-TypeScript numeric/date, daily-summary, and aggregate modules, with parity tests protecting their compatibility behavior.
- Cross-domain Pattern metrics are split across focused strict-TypeScript Money/activity, Journal/energy, correlation, and composition modules. A focused store adapter now combines them with task metrics and production no longer reads the legacy raw-metrics bridge.
- On the explicit Dashboard route, React owns the complete Dashboard composition and `#patternHistoryDialog`; on the temporary fallback route it owns only `#dashboardInsightCard .panel-inner` and the dialog contents through portals. The standalone legacy application keeps its original renderers.
- Pattern history is a fixed 14-day snapshot in the shipped legacy UI; it has no range selector or dialog-level undo control. A focused typed builder owns mode grouping, priority ordering, the two-action limit, and all eleven evidence formats. React refreshes the snapshot while the dialog is closed and remounts it on every open so native evidence disclosures reset exactly like the legacy rebuild.
- React owns the contents of `#dayStateOptions`, decodes `hivePlanner.dayState` with the legacy `okay` fallback, and persists both state and normalized `day_state_updated` audit writes in strict TypeScript while preserving unknown state fields. The legacy write bridge is removed; a narrow custom event carries the selected state only to refresh the still-unmigrated Sprouty prompts, insight renderer, and mascot bubble.
- Both the legacy day-state renderer and its click binder honor `data-react-owned="true"`. The binder guard is required because iframe hydration may finish after React claims the mount; without it, the React buttons receive a second legacy handler and append duplicate audit records.
- React owns `.day-banner`, `#tasksMount`, and `#taskForm`. Focused strict-TypeScript modules separately own compatibility decoding, the list/timers, editor, add form, shared options, persistence, and activity-log writes. The typed model preserves legacy truthy completion, retired activity IDs, time/reminder normalization, timer caps, calendar-source reminder flags, and focus-mode hidden tasks.
- The legacy task renderer routes both empty and populated progress through one ownership-aware helper. This keeps the standalone app unchanged while preventing detached legacy span references from overwriting the React portal.
- Legacy task/activity binders skip only React-owned mounts. Pattern task-focus resolves the live DOM because React replaces the original form children; agent undo now builds and persists its own typed compatibility writes. The standalone legacy application retains its original undo behavior.
- React owns only `.intention-block` and derives its badge from `hivePlanner.routine.week.<ISO-WEEK>`. The typed model preserves the legacy Monday-first indexing, day-type aliases, and normal-day fallback without mutating stored compatibility data.
- The legacy intention renderer continues updating the dashboard subtitle, date, and week-status heading, but skips only the detached badge when `.intention-block` is React-owned. The standalone legacy application therefore retains its original renderer.
- The root/no-view entry path plus `?view=moneyView` and `?view=todayView` bypass the iframe and compose their pages directly inside the focused React shell. The four remaining feature routes still instantiate `LegacyPlannerApp`, preserving a verification fallback during incremental cutover.
- A missing `view` now maps to the direct React Dashboard, while unknown explicit values continue through `LegacyPlannerApp`. Migration-boundary browser fixtures use `view=legacyShell`, which the parent intentionally treats as fallback and the legacy app safely normalizes to its Dashboard; production Journal, Calendar, Skate, and Guitar route behavior remains unchanged.
- The direct route loads the legacy stylesheet only while mounted. Loading it globally changes the parent body's padding and narrows every iframe preview, which the complete Money regression suite caught.
- Direct-shell navigation writes the requested `view` and deterministic planner `date` into the URL. Dashboard and Money now navigate directly to each other; Calendar, Activity, Skate, and Journal still reload into the established legacy-shell route until migrated.
- React backup import/export preserves unknown `hivePlanner.*` values and excludes the transient Guitar session just like legacy. Import publishes same-window storage events so the direct Money cards update immediately.
- The React Pattern store adapter runs only after the server-first Planner store is loaded and the hydrated legacy frame exposes the portal boundary. It never interprets bridge memory as source data or writes metric inputs back to storage.
- Insight action navigation resolves the current `#plannedMount` and `#taskTitle` at click time because React ownership replaces their original child nodes; retaining pre-migration references would target detached nodes.
- React persistence explicitly publishes a same-window storage event after local writes because browsers do not deliver native storage events to the document that performed the write. This keeps sibling React boundaries synchronized immediately. Server writes within one logical batch are serialized so a trailing audit entry cannot become observable before the restored state it records.
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
- Calendar-linked task reconciliation is React/TypeScript-owned. Its typed compatibility layer accepts legacy category/time formats, preserves user-edited linked task state, removes retired routine and stale source links, ignores malformed/duplicate event records, and adds each missing current event exactly once. The legacy reconciler remains only for the standalone application and is skipped when React owns `#tasksMount`.
- Agent undo is React/TypeScript-owned. Its typed compatibility layer consumes one legacy stack entry, caps the remaining stack at ten, restores normalized today/tomorrow tasks and compatible agent UI state, preserves unknown state fields, and appends the exact `agent_action_undone` audit record. The legacy bridge method is removed while the standalone legacy undo path remains available to the standalone app.
- Agent undo, day-state, and Money transaction writes share one strict activity-log compatibility decoder so validation and chronological ordering cannot drift across those React persistence boundaries.
- The direct React shell builds Sprouty server context only from typed compatibility decoders and the existing React Dashboard metric/rule pipeline. State-aware prompt choices match legacy wording. Invalid or failed server replies use focused strict-TypeScript retrieval and reply modules to classify the question, select up to three normalized evidence snippets, and produce the established intent-specific local guidance.
- Sprouty's Skate context uses a data-only strict-TypeScript copy of the immutable 60-day SkateIQ reference plan, separated from normalization logic. The model follows the shipped manual-progression contract: `currentProgramDay` selects the plan after season start, date-specific intensity overrides the plan default, recent sessions are newest-first, and weekly support includes only done/modified logs in the local Monday–Sunday window.
- Sprouty's action suggestions are wording-only in the chat; action application remains a separate compatibility path. The strict-TypeScript proposal model preserves the legacy 15% high-carryover threshold, question-aware priority, availability filtering, two-suggestion cap, and exact highest-value `Useful next step:` append for both server and local replies.
- Sprouty's direct-shell motion uses the exact legacy `hivePlanner.mascot.position` `{x, y}` document. Coordinates remain intentionally unbounded for compatibility; pointer movement above five total pixels suppresses exactly one click, pointer-up persists even an unchanged position, reload restores the CSS transform before paint, and the existing mobile-open CSS continues to force `transform: none` while hiding the mascot button.
- Keep browser-flow assertions separate from reusable Chrome protocol, Chrome lifecycle, and temporary planner-server helpers so each test file has one clear responsibility.
- Browser tests may use the existing Chrome DevTools Protocol directly to avoid adding a production or test package dependency.
- Reuse one browser-planner fixture for Chrome and temporary-server lifecycle instead of duplicating setup across user-flow tests.

## Known Problems
- Existing project is over 20,000 lines.
- Some files contain thousands of lines.
- Duplicate/redundant functions likely exist.
- Current architecture is difficult to understand.
- `frontend/js/app.js` is 8,526 lines and still owns most storage, normalization, rendering, event handling, and cross-feature orchestration; only the newly extracted boundaries have direct coverage.
- `frontend/css/styles.css` is 5,658 lines with several accumulated responsive sections.
- Time/date parsing and normalization are duplicated across frontend modules and backend integrations.
- Several declared storage keys and an older Study/Body weekly-overview path are inactive, while the real database still contains legacy-only keys that backups must preserve.
- Browser inspection reports generated form controls without an `id` or `name`; the current Chrome run reported 29 controls.
- The default `node` on the inspected machine is Node 14 and cannot run `node --test`; use the installed modern Node runtime or fix the local PATH before relying on `scripts/test.sh` without `NODE_BIN`.
- Most remaining cross-feature flows in `app.js` still lack DOM or end-to-end tests; browser coverage now protects task and activity-session lifecycles, all six primary views, the direct Dashboard and Money pages, and the migrated React boundaries.
- Weekly goals, dashboard day state, task progress, Today's intention, the task list/editor/form, Life Pie, Planned vs actual, Energy trail, Pattern noticed/history, all six Money boundaries, Journal meditation, and Journal archive are React-owned and verified. The root/no-view Dashboard plus explicit Dashboard and Money routes are directly composed; Journal, Calendar, Skate, and Guitar route orchestration still depends on the temporary iframe shell.
- Browser smoke tests skip when Chrome/Chromium or Node WebSocket support is unavailable; they run with the documented Node 24 runtime on the inspected machine.
- The React preview is not yet served directly by the Python backend. Its temporary legacy shell depends on Vite development proxies and is not the final production integration architecture.
- The direct shell's Sprouty surface now sends grounded task, insight, journal, planning, activity, day-state, Money, and Skate context; restores state-aware quick prompts; handles server failure with evidence-based local answers; appends question-aware action suggestions; and preserves pointer-follow, drag persistence, click suppression, and mobile motion behavior. Shared-shell Sprouty parity is complete.
- The React visual regression test skips when Chrome or `frontend-react` dependencies are unavailable, matching the existing browser-test prerequisite policy.
- Browser-capable root Node test files run serially to avoid Chrome/Vite startup timeouts under parallel process saturation.

## Session Log

### Session 43

- Re-read `AGENTS.md`, this handoff, branch state, recent history, current diff, and the implementation and browser-verification skills, then selected Sprouty's legacy action-suggestion wording as one focused strict-TypeScript parity increment.
- Added failing unit tests first for direct move intent, high-carryover one-thing questions, no eligible work, stable two-action priority, server/local finalization, duplicate prevention, and blank-answer fallback.
- Implemented a focused proposal/finalization module that uses normalized React task, day-state, carryover, and recent-history context. It preserves legacy action availability, task selection, question-aware ordering, suggestion copy, and the exact `Useful next step:` append without porting action application into the chat.
- Wired both successful server answers and evidence-based local fallback answers through the typed finalizer. Extended the real-browser Money/Sprouty flow to verify the exact appended suggestion on both paths.
- Final verification: 179 React tests, React lint, strict type-checking, the Vite production build, 18 Python tests, and all 137 root JavaScript tests pass, including the direct Money desktop/mobile visual regression and real-browser Sprouty server/fallback flow.

### Session 44

- Re-read `AGENTS.md`, this handoff, branch state, recent history, current diff, and the implementation and browser-verification skills, then selected Sprouty's draggable persisted position as one focused strict-TypeScript parity increment.
- Added failing unit tests first for numeric legacy coordinate decoding, malformed storage, drag deltas, the exact greater-than-five-pixel click-suppression boundary, and the exact persistence key/document. Extended the direct Money browser flow with legacy/React initial-position parity, synthetic pointer drag, server persistence, reload restoration, drag-versus-click behavior, and mobile transform/button assertions.
- Implemented a focused position compatibility module and a separate motion hook. The hook applies saved coordinates before paint, mirrors pointer-follow and scroll drift, uses pointer capture where available, updates drag CSS without render churn, persists on pointer-up, and consumes exactly one click after a real drag.
- Restored the legacy normal-click contract in the React mascot: a click toggles Sprouty chat, advances the encouragement line, and retriggers the 1.6-second excitement animation. Mobile-open mode remains controlled entirely by the existing legacy CSS.
- Final verification: 188 React tests, React lint, strict type-checking, the Vite production build, 18 Python tests, and all 137 root JavaScript tests pass, including the updated direct Money desktop/mobile visual regression and real-browser drag/reload flow.

### Session 45

- Re-read `AGENTS.md`, this handoff, branch state, recent history, current diff, and the implementation and browser-verification skills, then selected the missing-view Dashboard cutover as the final shared-shell phase increment.
- Added a failing real-browser regression first for literal `/`, no-view selected-date parity against explicit `?view=todayView`, exact desktop state/geometry/screenshots, date-preserving direct Money navigation, and the four unmigrated feature-route fallbacks.
- Changed only the top-level route decision so a missing `view` renders `DashboardPage`; explicit Money/Dashboard behavior and all other route values remain unchanged. The focused browser regression passes at desktop and mobile viewports with no console errors.
- The first complete suite correctly exposed 21 old migration-boundary browser fixtures that relied on no-view to obtain the iframe shell. Updated those fixtures to request `view=legacyShell`; the parent preserves the fallback while the legacy app normalizes the unknown view to Dashboard, keeping their portal-boundary purpose intact without weakening the new root contract.
- Final verification: 188 React tests, React lint, strict type-checking, the Vite production build, 18 Python tests, and all 137 root JavaScript tests pass, including root/direct Dashboard pixel parity and all explicit legacy feature fallbacks.

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
