# Yuan's Planner Rewrite — Agent Handoff

## Purpose

Rewrite Yuan's Planner into a readable React + strict TypeScript frontend while preserving the Python backend, SQLite data, existing behavior, and visual design.

This file is intentionally operational, not a full diary. Older session details remain available with `git show 5b7537a^:AGENT_HANDOFF.md`.

## Non-Negotiable Rules

- Read `AGENTS.md` and this file before working.
- Work only on `rewrite/react-typescript`, never `main`.
- Preserve the legacy UI exactly unless the user explicitly requests a redesign.
- Use React + strict TypeScript for new frontend application logic.
- Use `const` by default, `let` only for reassignment, and never `var` in new code.
- Keep modules and functions focused and readable; do not create new giant files.
- Treat every `hivePlanner.*` value as a compatibility contract and retain unknown data unless a tested migration says otherwise.
- Characterize legacy behavior and add meaningful regression coverage before replacing it.
- Verify desktop and mobile visual parity for migrated UI.
- Run relevant tests, lint, type checking, and builds before committing.
- Make small verified commits and update this handoff before ending.

## Repository and Migration State

- `main`: original production reference, tagged `pre-react-rewrite`.
- `rewrite/react-typescript`: active migration branch/worktree.
- Frontend migration lives in `frontend-react/`.
- The Python server still serves the legacy `frontend/` app; Vite serves the separate migration preview.
- SQLite and the existing `/api/kv` string-value boundary remain authoritative.
- Money is the first route rendered directly by React with no iframe.
- Dashboard, Journal, Calendar, Skate, and Guitar still use the temporary legacy iframe shell while React owns verified sub-boundaries.

## Current State

The Dashboard task list, editor, add form, completion controls, hours, timers, reminders, deletion, focus-mode visibility, and persistence are now React + strict TypeScript owned and verified.

The Dashboard still needs the following legacy orchestration removed before it can become a direct zero-iframe React page:

- Pattern metric/rule calculation and action persistence
- day-state side effects and Sprouty synchronization
- calendar-linked task reconciliation during hydration
- agent actions and undo persistence

## Next Task

Continue toward a direct React Dashboard page:

1. Characterize and port the remaining Pattern/day-state/agent orchestration into focused TypeScript modules.
2. Preserve calendar-task reconciliation and existing storage/activity-log contracts.
3. Compose the already-migrated Dashboard cards directly inside `PlannerShell`.
4. Add a zero-iframe Dashboard regression with desktop/mobile visual parity and cross-feature persistence checks.

The clean Python API structure also remains incomplete in Phase 3, but it is not the current frontend milestone.

## Completed Migration Boundaries

React-owned and verified:

- Weekly goals
- Dashboard day state, task progress, Today's intention, and task list/editor/form
- Life Pie, Planned vs actual, Energy trail, Pattern noticed, and Pattern history
- Money quick log, overview, Pace, Vendors, recent activity, and Budgets/categories
- Journal meditation and archive
- Direct React Money page and shared shell

Safety coverage includes startup, all six primary views, task CRUD/reload, activity sessions, storage hydration/backfill, compatibility import/export, cross-feature synchronization, and serialized real-Chrome visual flows.

## Compatibility Contracts

### Activity categories

Production behavior comes from legacy `main` commit `01d6c6d`:

- Active tracked IDs: `transcendence`, `mobileDevelopment`, `portfolioJobPrep`, `skate`, `gym`, and `guitar`.
- `other` is excluded from statistics but still supports task hours and timers.
- Retired mappings: `cpp`/`fso` → `transcendence`, `python` → `mobileDevelopment`, `lc` → `portfolioJobPrep`, `p90x3` → `gym`.
- Calendar mappings: Coding → Transcendence, Python → Mobile Development, Leetcode/LeetCode → Portfolio / Job Prep.
- Meditation and Journal remain standalone but no longer contribute to activity totals or Life Pie.
- Planned values at `hivePlanner.planned.<ISO-WEEK>` combine old/new IDs and preserve unknown fields.

### Storage and persistence

- Preserve server-first hydration with browser-only planner-key backfill.
- Reject malformed non-string `/api/kv` values.
- Publish same-window `storage` events after React writes so sibling boundaries update immediately.
- The legacy iframe accepts React writes into memory without creating a second persistence loop.
- Backup import/export preserves unknown planner keys and excludes transient Guitar session state.
- Task timers persist; active Skate and Guitar session starts remain transient across refresh.

### Tasks

- Store tasks at `hivePlanner.dailyTasks.<YYYY-MM-DD>`.
- Preserve label filtering, truthy completion, retired IDs, chronological ordering, time/reminder normalization, 24-hour manual caps, and eight-hour timer caps.
- Reset calendar-source reminder flags when the user changes time/reminder fields.
- Append compatible activity-log records for task writes.
- Keep focus-mode hidden IDs date-specific in `hivePlanner.agent.uiState`.
- Calendar reconciliation preserves user state, removes stale links, and avoids duplicates.

### Money, Journal, and insights

- Money boundaries share typed compatibility decoders and preserve unknown settings/transaction fields.
- Journal normalization is shared by Energy trail and Journal archive.
- Meditation completes expired timers exactly once.
- Pattern history remains a fixed 14-day snapshot and resets disclosure state when reopened.
- Pattern calculation/actions and day-state side effects still use narrow legacy bridges.

## Architecture Decisions

- Migrate incrementally; legacy renderers skip only mounts marked `data-react-owned="true"`.
- The temporary iframe is a migration mechanism, not the final architecture.
- `?view=moneyView` bypasses the iframe and scopes the legacy stylesheet to that direct route.
- Direct-shell navigation preserves deterministic `view` and planner `date` parameters.
- React reuses legacy markup/class names/CSS rather than redesigning UI.
- Dashboard actions resolve live `#plannedMount` and `#taskTitle` nodes after React replaces their children.
- Keep the insight bridge unavailable until legacy hydration completes to prevent empty task persistence.
- Visual gates require exact DOM/style/geometry plus screenshots with at most 1% materially different pixels.
- Run browser-capable root tests serially to avoid Chrome/Vite saturation.

## Verification Baseline

Latest verified baseline:

- React: 125 tests
- Python: 18 tests
- Root JavaScript/browser: 134 tests
- React lint, strict type checking, and Vite build: pass
- Full serialized Chrome suite: pass with no skips

Use Node `/Users/yuan/.nvm/versions/node/v24.14.1/bin/node`; the default Node 14 cannot run the current test runner.

## Known Problems

- `frontend/js/app.js` still owns most remaining orchestration and is about 8,500 lines.
- `frontend/css/styles.css` is about 5,600 lines with accumulated responsive sections.
- Time/date normalization remains duplicated across frontend and backend modules.
- The preview still relies on Vite proxies and is not served directly by Python.
- Direct Money Sprouty lacks full legacy grounded context, quick prompts, and dragging.
- Generated legacy form controls retain existing missing `id`/`name` warnings.
- Some remaining legacy cross-feature flows lack direct DOM/end-to-end coverage.
- The clean Python API structure remains incomplete.

## Recent Sessions

### Session 28 — Activity contract migration

- Ported production category migration and moved Life Pie/Planned vs actual to a shared strict-TypeScript model.
- Verified ID merging, calendar mappings, unknown-field retention, visual parity, and cross-feature behavior.
- Commits: `108aeae`, `9286ad3`, `6d32791`, `015ecc2`.

### Session 29 — Dashboard tasks

- Migrated task compatibility, form, editor, list, timers, reminders, focus mode, persistence, and logs to focused React/TypeScript modules.
- Added desktop/mobile Chrome parity and create/edit/complete/delete/reload coverage.
- Fixed live-node Pattern delegation and hardened macOS Chrome-profile cleanup.
- Commit: `5b7537a`.

### Session 30 — Handoff maintenance

- Replaced the 638-line session diary with this roughly 170-line operational handoff.
- Kept current state, next work, compatibility contracts, architecture decisions, verification baseline, known problems, and the latest three sessions.
- Older detail remains recoverable from Git history instead of being reread every session.

## Before Ending Any Session

1. Run relevant tests.
2. Review `git diff` and `git status`.
3. Commit completed working changes.
4. Update Current State, Next Task, Compatibility/Architecture Decisions, Known Problems, and Recent Sessions when needed.

The repository, Git history, tests, `AGENTS.md`, and this file are the source of truth. Do not rely on chat history.
