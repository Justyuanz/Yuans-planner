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
Phase 3 has one visually and behaviorally verified migration boundary. The Vite preview keeps the complete legacy Planner as a temporary migration shell while React owns weekly-goal rendering, editing, browser/server persistence, and compatibility-safe serialization. The adjacent legacy Life Pie is now characterized and protected before React takes ownership.

## Last Completed Task
Characterized Life Pie before migration without changing production behavior. A real-browser flow now protects its empty state, default/reload period, Day/Week/Month/All interactions, exact group/detail ordering, totals, excluded Other time, incomplete-task accounting, percentage rounding, and accessible label. The legacy-versus-React gate now compares the populated Life Pie at 1280×720 and 390×844 with exact text/style/geometry assertions and tolerance-based pixel screenshots.

## Next Task
Implement Life Pie as the next small React-owned boundary using the new characterization and visual regression tests. Add focused TypeScript tests for compatibility decoding and calculations first; preserve the exact legacy markup, styles, wording, periods, totals, responsive behavior, and weekly-goal behavior.

## Important Decisions
- The rewrite must preserve visual parity with the legacy Planner; this is an architecture rewrite, not a UI redesign.
- Do not add migration-preview branding, explanatory badges, new layouts, or invented visual treatments to the React UI.
- During incremental migration, the Vite preview may use the complete legacy app as a temporary same-origin shell so unmigrated features and interactions remain unchanged while React owns one tested mount.
- The legacy weekly-goal renderer skips `#weeklyGoals` only when the preview marks it `data-react-owned="true"`; the normal legacy application remains unaffected.
- Visual regression coverage must compare the legacy and React versions at identical desktop and mobile viewports, including computed styles/geometry and a rendered screenshot where stable.
- Screenshot comparisons decode Chrome PNG pixels and allow at most 1% of pixels to differ by more than eight channel values; exact DOM content and computed style/geometry comparisons remain mandatory so minor cross-frame antialiasing does not create false failures.
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
- `frontend/js/app.js` is 8,313 lines and still owns most storage, normalization, rendering, event handling, and cross-feature orchestration; only the newly extracted boundaries have direct coverage.
- `frontend/css/styles.css` is 5,631 lines with several accumulated responsive sections.
- Time/date parsing and normalization are duplicated across frontend modules and backend integrations.
- Several declared storage keys and an older Study/Body weekly-overview path are inactive, while the real database still contains legacy-only keys that backups must preserve.
- Browser inspection reports 29 generated form controls without an `id` or `name`.
- The default `node` on the inspected machine is Node 14 and cannot run `node --test`; use the installed modern Node runtime or fix the local PATH before relying on `scripts/test.sh` without `NODE_BIN`.
- Most remaining cross-feature flows in `app.js` still lack DOM or end-to-end tests; three browser tests now cover task and activity-session lifecycles plus all six primary view renders.
- Life Pie now has a focused browser behavior test and desktop/mobile visual parity coverage, but its calculation and compatibility rules have not yet been extracted into focused React/TypeScript modules.
- Browser smoke tests skip when Chrome/Chromium or Node WebSocket support is unavailable; they run with the documented Node 24 runtime on the inspected machine.
- The React preview is not yet served directly by the Python backend. Its temporary legacy shell depends on Vite development proxies and is not the final production integration architecture.
- The React visual regression test skips when Chrome or `frontend-react` dependencies are unavailable, matching the existing browser-test prerequisite policy.
- Browser-capable root Node test files run serially to avoid Chrome/Vite startup timeouts under parallel process saturation.

## Session Log

### Session 1

- Confirmed the rewrite worktree is clean and on `rewrite/react-typescript`; `main` remains in the original worktree at tag `pre-react-rewrite`.
- Read the repository instructions and handoff, then inspected recent history, the current diff, the tracked source/test inventory, relevant implementations and tests, and existing design notes.
- Inspected the existing `main` SQLite schema and field shapes without copying personal content.
- Ran the app against an empty temporary database and verified all six views at desktop and mobile widths. All 19 initial network requests succeeded; no horizontal overflow was present. Chrome reported one existing form-control issue affecting 29 generated fields.
- Added `docs/reverse-engineering.md` as the Phase 1 source of truth.
- Verification: 17 Python tests and 94 JavaScript tests pass using `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node`. The default Node 14 binary is too old for the test runner.
- No production files were changed.

### Session 2

- Re-read the updated code-quality rules and kept all new JavaScript on `const`/`let` with focused files and no `var`.
- Added `tests/fixtures/planner-v2-compatibility.json` with anonymized current, legacy, unknown-key, and unknown-field data.
- Added an HTTP test proving the fixture survives import and export byte-for-byte at the stored string-value boundary.
- Added `frontend/js/storage-core.js` and tests for server-first hydration, browser-only planner-key backfill, malformed input handling, unknown-key preservation, and transient-key backup exclusion.
- Added `frontend/js/calendar-task-sync.js` and tests for legacy category mapping, imported task shape, stale-link removal, existing user-state preservation, and duplicate-free repeat synchronization.
- Wired both pure modules into the legacy app and asserted that they load before `app.js`.
- TDD evidence: the new Node tests first failed because the modules did not exist; the compatibility HTTP test first failed because the fixture did not exist; the script-order test first failed before the calendar-task module was loaded.
- Browser verification with a temporary database confirmed that a browser-only planner key backfills to SQLite and a calendar event creates one linked Coding task with its reminder after reload. Desktop and 500px layouts have no horizontal overflow; the existing 29-field accessibility warning remains.
- Verification: JavaScript syntax checks pass; 18 Python tests and 101 JavaScript tests pass using `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node`.

### Session 3

- Re-read the expanded readability and structure rules in `AGENTS.md`; preserved the user's uncommitted instruction change without staging it.
- Added a real-browser test for blank-database startup and the task create/edit/delete lifecycle, including SQLite persistence across three reloads and browser-error checks.
- Kept the test infrastructure dependency-free and split it by responsibility: user-flow assertions, temporary server lifecycle, Chrome lifecycle, and Chrome protocol transport.
- TDD evidence: the new flow test first failed because its browser/server harness did not exist. A pipe-transport harness failure was then isolated and replaced with Chrome's local debugging endpoint before the planner flow was evaluated.
- Documented browser-test prerequisites in `README.md` and updated the reverse-engineering test inventory and remaining gaps.
- Verification: syntax checks pass; 18 Python tests and 102 JavaScript tests pass with no skips using `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node` and the installed Chrome browser.

### Session 4

- Added explicit Phase 2 sub-checks so completed critical user-flow coverage is visibly marked while the overall item remains open.
- Added a real-browser Guitar and Skate completion flow using the actual session dialogs and a temporary SQLite database.
- Verified that each session creates or updates a completed activity task, persists `trackedInTask: true`, survives reload, and contributes its duration exactly once through the production totals rule.
- Added a focused shared browser-planner fixture and refactored the existing task-flow test to reuse it without changing production code.
- TDD evidence: the session flow first failed because the shared browser-planner boundary did not exist; the fixture was then added and both browser flows passed.
- Verification: syntax checks pass; 18 Python tests and 103 JavaScript tests pass with no skips using `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node` and the installed Chrome browser.

### Session 5

- Re-read the updated readability and structure rules in `AGENTS.md`; preserved the user's uncommitted instruction change without staging it.
- Added a focused real-browser smoke test that navigates Dashboard, Journal, Money, Calendar, Skate, and Guitar against an isolated SQLite database.
- Verified that each selected view is the only active view, exposes its expected accessible heading, finishes rendering representative dynamic content, and produces no browser errors.
- Test-first note: the characterization test was added before any production rewrite and passed against the legacy behavior, so no production implementation change was required.
- Browser verification at 1280×720 and 390×844 confirmed responsive Calendar, Dashboard, and Guitar rendering, working navigation, no horizontal overflow, no console errors, and successful asset/API requests.
- Marked the defined Phase 2 safety-net milestone complete. No production files or React code were changed.
- Verification: 18 Python tests and 104 JavaScript tests pass with no skips using `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node` and the installed Chrome browser.

### Session 6

- Recovered and preserved the failed session's uncommitted `frontend-react/` work after reading the repository instructions, handoff, branch history, status, and current diff.
- Reviewed the new boundary against the legacy weekly-goal storage key, track definitions, placeholders, and malformed-data behavior; no compatibility or correctness defect was found.
- Verified real SQLite-backed weekly goals in Chrome at 1440×900 and 390×844. Both layouts rendered three accessible goal cards without clipping or horizontal overflow.
- Found and fixed one genuine browser issue: the Vite preview requested a missing favicon and logged a 404. Added a small preview favicon; the final console is clean and all page, API, and asset requests succeed.
- Lighthouse snapshot audits report 100 accessibility and 100 best-practices scores on desktop and mobile. The preview-only `robots.txt` and `llms.txt` recommendations were intentionally left out of scope.
- Verification: 12 React tests, React lint, strict type-checking, and the Vite production build pass. The legacy safety net also passes with 18 Python tests and 104 JavaScript tests, including all browser flows.
- The system `node` is still Node 14. Frontend npm scripts must run with the Node 24 binary first on the child-process `PATH`; invoking npm itself through Node 24 is not sufficient because npm scripts otherwise resolve the old system binary.

### Session 7

- Stopped feature migration and treated the legacy Planner as the visual source of truth after the first React preview was identified as an unintended redesign.
- Captured legacy and React baselines with the same isolated SQLite data at 1280×720 and 390×844. Confirmed the legacy weekly-goals panel is three stacked input cards on desktop and intentionally hidden below 980px while Money leads the mobile dashboard.
- Added reusable viewport and screenshot support to the dependency-free Chrome helper plus a focused Vite preview server fixture.
- Added a real-browser parity test before the UI correction. It failed against the redesigned React page because no legacy-compatible React mount existed, then passed after the correction.
- Replaced the standalone preview design with a temporary same-origin legacy shell. React now owns only `#weeklyGoals`, renders the exact legacy class structure as read-only inputs, and reuses the existing Planner CSS without copying or restyling it.
- Manual browser verification confirmed the complete desktop and mobile pages match the legacy layouts, React inputs remain read-only when focused and typed into, all requests succeed, and no horizontal overflow appears.
- Verification: 12 React tests, React lint, strict type-checking, and the Vite production build pass. The full safety net passes with 18 Python tests and 105 JavaScript tests, including four legacy/browser flows and the React visual comparison.

### Session 8

- Resumed with the existing weekly-goals feature rather than starting another UI migration.
- Characterized the legacy edit contract: 120-character inputs save trimmed values on `change`/blur and persist through browser storage plus `/api/kv`.
- Added failing tests first for the missing API write boundary, compatibility-safe encoding, editable React input, server persistence, unknown-field retention, and reload survival.
- Added `putPlannerStoreValue`, an encoder that preserves unknown stored fields, and blur-based React editing with optimistic browser storage and server persistence.
- Kept the existing screenshot/computed-style comparison intact; the same browser test now verifies behavior and persistence before checking the 390×844 mobile-hidden contract.
- Serialized the root Node test files after the added Chrome/Vite flow caused unrelated legacy browser tests to exceed their timeouts under parallel process saturation.
- Verification: 16 React tests, React lint, strict type-checking, and the production build pass. The full safety net passes with 18 Python tests and 105 root JavaScript tests, including all browser flows.

### Session 9

- Stopped before further feature migration and characterized the legacy Life Pie as the source of truth.
- Added a real-browser behavior test covering the stable empty state, default Week selection, all four period interactions, reload reset, group/detail order, exact totals and rounded percentages, excluded Other time, and the legacy rule that unfinished task hours still count.
- Extended the legacy-versus-React visual gate to compare the populated Life Pie at 1280×720 and 390×844, including wording, computed styles, geometry, responsive reflow, accessibility text, and screenshots.
- Added a focused dependency-free PNG comparison helper. It rejects visible pixel drift while tolerating minor cross-frame antialiasing differences; exact DOM/style/geometry comparisons remain alongside it.
- Manual Chrome DevTools verification confirmed matching legacy/React desktop and mobile layouts, working period selection, a 128px desktop donut, one-column mobile reflow, no horizontal overflow, and successful network requests. The existing warning for 29 generated controls without `id`/`name` remains unchanged; there were no console errors.
- No production or React source files changed. Verification: 16 React tests, React lint, strict type-checking, and the production build pass. The full safety net passes with 18 Python tests and 106 root JavaScript tests, including the new Life Pie behavior and desktop/mobile visual flows.

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
