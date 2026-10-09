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
- [x] Create clean Python API structure
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
Phase 3 and the production-serving cutover are complete. Phase 4 is now in migration-infrastructure cleanup: retire the migration-only React portal shell and narrow legacy runtime dependencies without losing visual-reference coverage. Every Dashboard boundary now runs only in the direct React Dashboard; explicit fallback and standalone `/legacy/` routes keep their complete legacy Dashboard renderers. Continue moving the remaining Journal archive, Calendar, Skate, Guitar, Meditation, and Money regression fixtures off `view=legacyShell`, then remove their portal ownership one verified feature at a time.

## Last Completed Task
Moved Pattern noticed and Pattern history behavior, action routing, task-change synchronization, disclosure/reset behavior, persistence, and desktop/mobile visual parity coverage to the direct React Dashboard plus standalone legacy reference. Removed both fallback portals, the custom update event, legacy bridge API, ownership guards, and bridge-ready lifecycle in `1ad682e`. `frontend-react/src/app/App.tsx` fell from 724 to 625 lines, `frontend/js/app.js` fell from 8,701 to 8,631 lines, and the complete repository workflow passes.

## Next Task
Move the Journal archive fixture from `view=legacyShell` to the direct Journal route plus standalone legacy reference. Preserve empty/filter/search behavior, active-date navigation, live editor synchronization, reload/persistence, compatibility handling, and identical desktop/mobile visuals. Then remove `journalArchiveBoundary`, its legacy-frame date/click listeners and delegated open-date path where no other boundary needs them, plus the legacy archive ownership guard. Continue with Calendar, Skate, Guitar, Meditation, and Money fallback portals afterward. Keep `/legacy/` and the shared legacy stylesheet/assets until no direct React page or regression depends on them.

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
- The explicit legacy-shell fixture loads a focused activity-category bridge during hydration so fallback regression coverage continues to exercise the standalone legacy views. All bridge code follows the same `const`-by-default/no-`var` rule; it is compatibility infrastructure, not a replacement for the React TypeScript model.
- Meditation and Journal remain standalone features but no longer contribute to activity totals or Life Pie. The Meditation regression explicitly verifies session persistence without a Life Pie side effect.
- The rewrite must preserve visual parity with the legacy Planner; this is an architecture rewrite, not a UI redesign.
- Do not add migration-preview branding, explanatory badges, new layouts, or invented visual treatments to the React UI.
- During incremental migration, the Vite preview may use the complete legacy app as a temporary same-origin shell so unmigrated features and interactions remain unchanged while React owns one tested mount.
- Weekly goals and Life Pie are composed only by the direct React Dashboard. Their regressions compare that production route with the standalone legacy reference; explicit fallback routes now leave both cards entirely legacy-owned.
- React's planner-store hook listens only for same-origin `hivePlanner.*` storage events. It keeps direct React pages and the remaining fallback portals synchronized without making browser storage authoritative over the server-first Planner store.
- Planned vs actual stores one object at `hivePlanner.planned.<ISO-WEEK>` and must preserve unknown fields when editing. Each edit also appends the legacy-compatible `planned_hours_updated` record to `hivePlanner.activityLog` with the same group/activity metadata.
- Energy trail remains derived from `hivePlanner.journal.entries` and dated task keys. React filters invalid tracker values before selecting the newest seven rows, and preserves the legacy rule that the comparison appears only after at least two low/empty energy days have previous-day task summaries in the 14-day insight window.
- Journal-entry storage normalization now lives in one typed compatibility module shared by the direct editor, Energy trail, and Journal archive. All three boundaries therefore agree on valid dates, tracker states, duration clamping, blank-entry removal, fallback IDs/timestamps, and newest-first ordering.
- Clicking a direct-Dashboard Energy trail row navigates to the direct Journal route with the selected date. Its regression returns to the direct Dashboard after editing Journal context to verify the persisted cross-feature update; explicit fallback routes use the standalone legacy navigation and renderer.
- Planned vs actual and Energy trail are composed only by the direct React Dashboard. Their regressions compare the production route with standalone legacy at identical desktop/mobile viewports; explicit fallback routes leave both cards entirely legacy-owned.
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
- The fallback React app observes the legacy frame's Journal-date change and click events once and shares the selected date with both meditation and archive. The direct Journal page owns the same selection as local React state, so Archive, Today, and date-input navigation update the editor, meditation, and archive together without iframe listeners.
- The React Journal archive keeps its search text as local transient state and derives cards from `hivePlanner.journal.entries`. Direct Journal card selection updates React page state; the fallback fixture delegates through existing legacy tab/date controls. The legacy archive renderer skips only `.journal-archive-card[data-react-owned="true"]`, so the normal legacy application remains unaffected.
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
- React owns `.monthly-calendar-card .panel-inner` on fallback routes. Focused strict-TypeScript modules preserve the legacy six-week Sunday-first grid, chronological event ordering, four-pill limit, time/duration labels, raw stored category text in tooltips, legacy category aliases for styling, routine-managed event filtering, and Monday-first saved day-type classes.
- On fallback routes React also owns the weekly planner and selected-day event editor. The bridge carries only date/month/week state and moves the existing editor card into the expanded React day; legacy renderers skip only explicitly React-owned Calendar mounts, so the standalone legacy Calendar remains unchanged.
- The direct Calendar route composes the month grid, weekly planner, week setup, and event editor inside `PlannerShell` with no iframe. Its typed editor preserves raw unknown event fields, legacy title-prefixed times and category aliases, reminder markers, goal-step references, empty-date fallback, and cross-feature task reconciliation.
- Calendar day cells remain native buttons to match the legacy browser rendering exactly. Event pills are non-button descendants with delegated pointer editing, avoiding the legacy invalid nested-button markup while preserving the visual contract and date-cell keyboard behavior.
- Calendar event category normalization is shared by the React month model and React-owned calendar-task reconciliation, while decoded event records retain their raw stored category label where the legacy tooltip exposes it.
- Skate's direct hero derives entirely from strict-TypeScript plan, settings, session, task, and weekly-total models. The narrow state/action bridge remains only for explicit `view=legacyShell` regression fixtures; production `view=skateView` does not consume legacy Skate state.
- Skate program-day edits commit on blur, restore the last rendered value until normalization publishes, and clamp to Day 1–60. Settings writes preserve unknown stored fields, changing the primary rest day removes a duplicate extra rest day, and intensity updates both settings and the compatible current-session plan. Current Skate session start time remains transient across reload.
- Skate's intensity roadmap derives directly from `hivePlanner.skate.sessions` through a pure typed compatibility model. Stored order decides the latest dot color/title exactly like legacy; malformed records are ignored safely, invalid intensities fall back to yellow, explicit session dates take precedence, and the roadmap continues after Day 60.
- The Skate feedback dialog, transient start/finish state, and save flow are React/TypeScript-owned. The hero and roadmap open the shared React controller directly; direct-route settings persist through the typed settings model, while only the explicit legacy-shell fixture delegates settings through the narrow compatibility bridge.
- Feedback persistence appends the compatibility-rich session without rewriting existing raw session entries, retains unknown Skate-setting and task fields, resets the normalized current plan, and stores task/settings/reset writes before the appended session completion marker. This ordering prevents observers from seeing a session before its dependent intensity and task updates reach SQLite.
- A current-day Skate save finishes the best matching Skate task or creates the legacy-compatible `Skate session` task and marks the session `trackedInTask`; a retroactive save uses a date-anchored UTC window and never changes a historical task. The running Skate timer remains intentionally transient across reload.
- Skate Body support derives from `hivePlanner.physical.logs` through one pure typed compatibility decoder shared by the React card and Sprouty's Skate context. It preserves the legacy Monday-Sunday window, done/modified/skipped rules, label grouping, count-first sorting, and zero-minute `Logged` display.
- Body-support saves append the normalized new record while retaining every existing raw array entry and unknown field. This is intentionally safer than the legacy save path, which normalizes the complete array and can discard compatibility data. React claims only `.body-log-card .panel-inner`; the standalone legacy application remains unchanged, and same-window storage events immediately refresh Life Pie and Sprouty context.
- The shipped Skate Training plan is currently read-only. Older warm-up, focus, and skill-editing functions remain orphaned in the legacy source with no live call sites, so the migration preserves the visible checked-in plan instead of reviving dead editor behavior.
- React owns `.skate-session-card .panel-inner` on fallback routes and derives its state directly from the immutable typed SkateIQ data plus compatible settings. The shipped manual-progression rule remains exact: pre-season previews Day 1, then `currentProgramDay` selects Day 1–60 even on post-streak calendar dates. No detached legacy renderer, DOM parser, or `MutationObserver` remains.
- React owns `.guitar-goal-card .panel-inner` on fallback routes through a focused strict-TypeScript model. Focus and next-step values remain raw strings, save on every input event without trimming, and use the existing Planner persistence path; the legacy Guitar renderer skips only these detached inputs when the card is marked React-owned.
- The Guitar migration regression records the complete shipped page before the tracker cutover: weekly target/minute/average calculations, focus-aware plan copy, four-row recent history, transient timer reset, finish-dialog persistence, task synchronization, malformed root fallback, exact desktop/mobile goal-card visuals, and clean console behavior.
- Guitar session/task synchronization is shared with Skate through a focused strict-TypeScript compatibility module. It retains every raw existing session entry and unknown task field, chooses ready then unfinished then any matching activity task, and creates the legacy-compatible `Saved session` task only when no Guitar task exists.
- Guitar session start remains transient across reload. Completing a session writes its task update before appending the completion marker, preserves the Monday-Sunday target rules and newest-four history contract, and uses the exact legacy duration rounding and copy.
- The root/no-view entry path plus explicit Dashboard, Money, Journal, Calendar, Skate, and Guitar routes bypass the iframe and compose all six primary pages directly inside the focused React shell.
- `backend/planner_api.py` owns the Planner KV/backup application contract: `hivePlanner.*` key validation, string-value validation, import-object validation, version-2 export documents, and success response shapes. SQLite connection/transaction behavior remains in `backend/db.py`, while HTTP status/header/body mechanics remain in `PlannerHandler`.
- `backend/reminder_service.py` owns stored event/task loading, due-reminder collection, Telegram delivery, sent-marker persistence, the 30-second polling loop, and daemon-thread startup. It writes each changed storage key once, leaves a partially delivered key unwritten so the poll can retry it, and keeps malformed raw list records while excluding them from reminder evaluation.
- `backend/http_server.py` owns the complete HTTP transport: route dispatch, JSON parsing/responses, Planner/integration endpoint wiring, static MIME/cache headers, HEAD behavior, and traversal protection. Malformed JSON or UTF-8 returns one `400 Invalid JSON` response and stops endpoint processing. `backend/app.py` only initializes SQLite, constructs the threaded server, starts reminders, prints addresses, and owns process lifetime.
- The Python server serves `frontend-react/dist` at the root by default. `YUAN_PLANNER_FRONTEND_MODE=legacy` is an explicit compatibility/visual-reference override; invalid values safely fall back to React.
- `/legacy/` serves the standalone legacy application, while `/css/*` and `/js/*` remain legacy asset routes because direct React pages still load the established stylesheet and compatibility code. React build files are served exactly, extensionless client paths fall back to `index.html`, missing file-like paths return `404`, unknown `/api` routes never enter the SPA fallback, and a missing build returns a clear `503`.
- React production assets remain ignored build output. Local runs require `npm run build`; Docker uses a Node 24 builder stage and copies only `dist` into the Python image.
- Existing browser visual-reference fixtures start the Python server in explicit legacy mode. A separate production regression starts it in React mode and verifies compiled assets, direct Dashboard and Money rendering, API access, desktop/mobile overflow, console cleanliness, and the isolated legacy fallback.
- Chrome polling tolerates transient expression errors while an iframe document is detached during navigation, then reports the last evaluation error if the readiness condition times out. This removes combined-suite timing flakes without hiding persistent failures.
- A missing `view` maps to the direct React Dashboard, while unknown explicit values continue through `LegacyPlannerApp`. Migration-boundary browser fixtures use `view=legacyShell`, which the parent intentionally treats as fallback and the legacy app safely normalizes to its Dashboard.
- The direct route loads the legacy stylesheet only while mounted. Loading it globally changes the parent body's padding and narrows every iframe preview, which the complete Money regression suite caught.
- Direct-shell navigation writes the requested `view` and deterministic planner `date` into the URL. Dashboard, Money, Journal, Calendar, Skate, and Guitar all navigate directly.
- React backup import/export preserves unknown `hivePlanner.*` values and excludes the transient Guitar session just like legacy. Import publishes same-window storage events so the direct Money cards update immediately.
- The React Pattern store adapter runs only after the server-first Planner store is loaded. It derives the direct Dashboard model from typed Planner data, never interprets legacy bridge memory as source data, and never writes metric inputs back to storage.
- Insight action navigation resolves the current direct Dashboard `#plannedMount` and `#taskTitle` at click time so actions always use live controls rather than stale references captured before rendering.
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
- Keep browser-flow assertions separate from reusable Chrome protocol, Chrome lifecycle, and temporary planner-server helpers so each test file has one clear responsibility.
- Browser tests may use the existing Chrome DevTools Protocol directly to avoid adding a production or test package dependency.
- Reuse one browser-planner fixture for Chrome and temporary-server lifecycle instead of duplicating setup across user-flow tests.

## Known Problems
- Existing project is over 20,000 lines.
- Some files contain thousands of lines.
- Duplicate/redundant functions likely exist.
- Current architecture is difficult to understand.
- `backend/app.py` is now a 58-line process bootstrap, the clean Python structure milestone is complete, and `http_server.py` serves the compiled React application at the root. The legacy directory remains reachable only through explicit compatibility and shared-asset routes.
- `frontend/js/app.js` is 8,631 lines and still owns much of the standalone legacy application's storage, normalization, rendering, event handling, and cross-feature orchestration; only the extracted boundaries have direct coverage.
- `frontend/css/styles.css` is 5,667 lines with several accumulated responsive sections.
- Time/date parsing and normalization are duplicated across frontend modules and backend integrations.
- Several declared storage keys and an older Study/Body weekly-overview path are inactive, while the real database still contains legacy-only keys that backups must preserve.
- Browser inspection reports generated form controls without an `id` or `name`; the current Chrome run reported 29 controls.
- The default `node` on the inspected machine is Node 14 and cannot run `node --test`; use the installed modern Node runtime or fix the local PATH before relying on `scripts/test.sh` without `NODE_BIN`.
- Most remaining cross-feature flows in the standalone legacy `app.js` still lack DOM or end-to-end tests; browser coverage now protects task and activity-session lifecycles, all six direct primary pages, and the other migrated React boundaries.
- Weekly goals, dashboard day state, task progress, Today's intention, the task list/editor/form, Life Pie, Planned vs actual, Energy trail, Pattern noticed/history, all six Money boundaries, Journal editor, Meditation, Journal archive, Calendar, Skate, and Guitar are React-owned and verified on direct production routes. No Dashboard feature retains a fallback portal. The temporary iframe shell remains only for explicit `view=legacyShell` regression fixtures and unknown-view compatibility.
- Browser smoke tests skip when Chrome/Chromium or Node WebSocket support is unavailable; they run with the documented Node 24 runtime on the inspected machine.
- A local Python start returns `503` at the UI root when `frontend-react/dist` has not been built. This is intentional and documented; Docker always builds the bundle.
- `LegacyPlannerApp` and its remaining portal ownership bridges still occupy most of the 625-line `frontend-react/src/app/App.tsx`. Production primary routes bypass it, but Journal archive, Calendar, Skate, Guitar, Meditation, and Money fallback fixtures still depend on it.
- Direct React pages still load the 5,667-line legacy stylesheet, and explicit legacy `/css` and `/js` routes remain runtime dependencies. These cannot be removed until focused styling and compatibility migrations replace them.
- The direct shell's Sprouty surface now sends grounded task, insight, journal, planning, activity, day-state, Money, and Skate context; restores state-aware quick prompts; handles server failure with evidence-based local answers; appends question-aware action suggestions; and preserves pointer-follow, drag persistence, click suppression, and mobile motion behavior. Shared-shell Sprouty parity is complete.
- The React visual regression test skips when Chrome or `frontend-react` dependencies are unavailable, matching the existing browser-test prerequisite policy.
- Browser-capable root Node test files run serially to avoid Chrome/Vite startup timeouts under parallel process saturation.
- The final complete browser run passed all 150 root JavaScript/browser tests after the shared Chrome waiter was hardened against transient detached iframe documents. Treat any repeated failure as actionable rather than accepting it as a combined-run flake.

## Session Log

### Session 62

- Re-read the repository instructions and full handoff, confirmed the clean rewrite branch/history/diff, inventoried the Dashboard fallback portals and their `view=legacyShell` fixtures, and kept all implementation in React plus strict TypeScript.
- Moved Weekly goals/Life Pie, Today's intention/Task progress, and Day-state parity, behavior, compatibility, persistence/reload, cross-feature, and desktop/mobile visual coverage to the direct Dashboard. Removed their fallback portal ownership, legacy renderer guards, and the now-unused Day-state custom event bridge in three small commits: `f8584a7`, `8305212`, and `c8fcec2`.
- The first complete run exposed one stale Skate Body-support assertion that still expected the removed fallback Life Pie portal to reflect a React save. Updated that cross-feature assertion to the production direct Dashboard and committed it as `52a6475`; the focused regression then passed.
- Verification: 42 Python tests, 247 React tests, lint, strict typecheck, production build, and all 150 root JavaScript/browser tests pass. `git diff --check` passes for every completed slice.

### Session 63

- Re-read the repository instructions and full handoff, confirmed the clean rewrite branch/history/diff, and traced the remaining Dashboard task, planning, and Energy portal contracts before changing code.
- Moved task lifecycle/UI parity, calendar-linked reconciliation, and agent undo persistence coverage to the direct Dashboard. Removed the fallback task list/form portals, parent reconciliation/undo wiring, and legacy ownership guards while leaving direct strict-TypeScript behavior unchanged. Commit: `c02bd4b`.
- Moved Planned vs actual and Energy trail totals, editing, audit, compatibility, Journal navigation, cross-runtime persistence, and desktop/mobile visual coverage to direct production routes. Removed both fallback portals and restored standalone legacy rendering. Commit: `6e1968c`.
- Verification: 42 Python tests, 247 React tests, lint, strict typecheck, production build, and all 150 root JavaScript/browser tests pass. The isolated standalone task-flow rerun also passed after a parallel Chrome load-event timeout, and the final serial full workflow was fully green.

### Session 64

- Re-read the repository instructions and full handoff, confirmed the rewrite branch/history/diff, and traced the remaining Pattern noticed/history portal, bridge, legacy ownership, action-routing, and snapshot contracts before changing code.
- Moved Pattern noticed and Pattern history behavior plus desktop/mobile visual comparisons from the iframe fixture to the direct React Dashboard while retaining standalone legacy behavior coverage. Direct tests now prove native action routing, task-change refresh, persisted empty tasks, fixed history range, disclosure reset, and dialog refresh without the legacy bridge.
- Removed `dashboardInsightBoundary`, `patternHistoryBoundary`, their portal state/effects, the custom insight-update event, `YuanPlannerDashboardInsightBridge`, bridge-ready state, and legacy ownership guards. Standalone fallback storage events now refresh the legacy insight renderer directly. Commit: `1ad682e`.
- Verification: 42 Python tests, 247 React tests, lint, strict typecheck, production build, and all 150 root JavaScript/browser tests pass. Focused Pattern/history and complete direct-Dashboard/production-serving browser regressions also pass.

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
