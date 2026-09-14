# Current-System Reverse Engineering

## Purpose and Scope

This document is the behavioral and structural map for the React + TypeScript rewrite. It describes the application on `rewrite/react-typescript` before production rewrite work begins. The legacy application remains the reference implementation.

Sources inspected:

- all tracked source, test, script, and design files
- the existing SQLite database in the `main` worktree, using schema- and field-only queries (no personal content copied here)
- the running application at desktop and mobile viewport sizes using an empty temporary database
- the full Python and JavaScript test suites

Snapshot date: 2026-09-12.

## System Summary

Yuan's Planner is a single-page, server-rendered-static application with six client-side views. There is no frontend build step and no third-party runtime dependency.

```text
Browser
  index.html + styles.css
  15 UMD-style pure JavaScript modules
  app.js (state, DOM rendering, event handlers, orchestration)
       |
       | JSON over same-origin HTTP
       v
Python ThreadingHTTPServer
  static file serving
  generic key/value API
  mascot proxy
  Telegram reminder worker
       |
       v
SQLite kv_store
  key -> string value (usually JSON text)
```

The browser is the domain layer. The Python backend does not understand tasks, journals, budgets, or most other planner records. It persists opaque strings under `hivePlanner.*` keys. The exceptions are the mascot adapter, which compacts a structured context payload, and the Telegram worker, which parses event and daily-task JSON to find due reminders.

## Runtime and Data Flow

### Startup

1. `backend/app.py` loads `.env` through `backend/config.py`.
2. `backend/db.py` creates `kv_store` if needed.
3. `ThreadingHTTPServer` serves `frontend/` and the `/api/*` routes.
4. A daemon thread polls every 30 seconds for Telegram reminders.
5. The browser loads the pure modules in the order declared in `frontend/index.html`; `frontend/js/app.js` loads last.
6. `app.js` fetches `/api/kv` into an in-memory string map.
7. Planner keys found only in `localStorage` are copied into memory and asynchronously persisted to the server.
8. Transient Skate and Guitar timer starts are cleared so an abandoned browser session does not become a long recorded session.
9. Every view is rendered, event handlers are attached, and a one-second timer refreshes active timers.

### Write behavior

For a normal browser write, `app.js`:

1. serializes the domain value to a string;
2. updates its in-memory map;
3. writes the same string to `localStorage`;
4. sends an asynchronous `PUT /api/kv` when server storage is available.

The UI does not wait for the server write to succeed. If a fetch rejects, it marks server storage unavailable for the remainder of the page session and continues with browser storage. There is no retry queue, conflict detection, revision number, or cross-device merge.

At hydration, the server wins when a key exists in both places. Browser storage only fills missing server keys.

### Intentional transient state

- Task timers persist `timerStartedAt` and resume after refresh, capped at eight hours.
- The currently running Skate and Guitar session start times are deliberately memory-only and are cleared on refresh.
- The Skate session checklist is persisted, but its `startedAt` field is stripped before storage.
- `hivePlanner.guitar.currentSession` is removed during hydration and excluded from browser backups.

These differences are user-visible contracts and need explicit tests before migration.

## File Map

### Root and operations

| File | Responsibility | Rewrite significance |
| --- | --- | --- |
| `README.md` | Product summary, local/Docker setup, configuration, backup, and test commands | Public operational contract |
| `Dockerfile` | Python 3.11 image serving backend and frontend; persistent DB at `/app/persist/planner.db` | Deployment contract |
| `docker-compose.yml` | Maps the configured host port and mounts `./data` | Local persistent deployment |
| `scripts/start.sh` | Runs `python3 backend/app.py` from the project root | Primary launch path |
| `scripts/open-ui.sh` | Starts the server if needed and opens a macOS app-style browser window | Local convenience path |
| `scripts/test.sh` | Runs Python `unittest`, then Node's built-in test runner | Requires Node 18+; the machine's default Node 14 is too old |

### Backend

| File | Responsibility | Important boundary |
| --- | --- | --- |
| `backend/app.py` | HTTP routing, static files, JSON request/response helpers, reminder polling and delivery | Framework-free entry point; routes are coupled directly to storage and integrations |
| `backend/config.py` | `.env` parsing and typed environment accessors | Relative DB paths resolve from project root; invalid timezone falls back to UTC |
| `backend/db.py` | Creates and mutates the SQLite key/value table | Values are opaque strings; imports accept every string-valued `hivePlanner.*` key |
| `backend/openai_mascot.py` | Compacts planner context, calls OpenAI Responses API, normalizes JSON/text replies | Optional; errors become HTTP 503 and the browser falls back locally |
| `backend/telegram_notifier.py` | Parses schedule/reminder fields and sends Telegram messages | Understands only events and date-keyed daily tasks |

### Frontend shell

| File | Responsibility | Rewrite significance |
| --- | --- | --- |
| `frontend/index.html` | Complete markup for all six views and three dialogs; declares script order | All views exist in one document and are toggled with `.active` |
| `frontend/css/styles.css` | Entire visual system and responsive layout | 5,631 lines and 848 rule blocks; styles have accumulated in several breakpoint sections |
| `frontend/js/app.js` | Storage, normalization, all DOM rendering, all event handlers, cross-feature synchronization, timers, backup UI, and app startup | Primary migration risk: 8,313 lines and more than 200 named functions |

### Frontend pure modules

All modules use a small UMD wrapper: CommonJS for Node tests and `globalThis.Yuan*` globals in the browser.

| File | Responsibility |
| --- | --- |
| `calendar-core.js` | Parses structured and legacy times; sorts and groups events into day parts |
| `calendar-task-sync.js` | Reconciles calendar-linked tasks without overwriting user task state |
| `weekly-planner-core.js` | Day types, continuous load-hours model, effort/category normalization, capacity validation |
| `money-core.js` | Money normalization, euro parsing, budgets, transfers, pace/projections, vendor summaries |
| `journal-core.js` | Journal/tracker normalization, sorting, search, previews |
| `activity-log.js` | Validates and orders append-only user/agent activity records |
| `insight-core.js` | Computes task, time, money, journal, and cross-domain metrics |
| `insight-rules.js` | Converts metrics into prioritized, evidence-bearing insights |
| `pattern-history.js` | Groups current insights for the pattern-history dialog |
| `agent-core.js` | Proposes and applies reversible task-list actions |
| `mascot-rag.js` | Builds local retrieval context and deterministic evidence-based answers |
| `skate-core.js` | Date-driven 21-week/60-day SkateIQ training plan and intensity metadata |
| `skate-session-core.js` | Skate session dates/intensity and session-to-task duration synchronization |
| `mind-core.js` | Meditation completion and standalone mind-session hour aggregation |
| `storage-core.js` | Planner-key filtering, server-first hydration merging, and backup selection |

### Tests

| Area | Existing protection |
| --- | --- |
| Persistence and HTTP | SQLite CRUD/import rollback; KV/export/import/delete API; static files, HEAD, traversal rejection |
| Integrations | Telegram parsing/due/deduplication/timezone; app reminder write-back; limited mascot reply normalization |
| Pure frontend logic | 101 Node tests across calendar, load planning, money, journal, activity history, insights, agent actions, mascot RAG, Skate, sessions, meditation, storage hydration, and calendar-task synchronization |
| Browser integration | 3 dependency-free headless Chrome tests cover blank-database startup, task create/edit/delete persistence, Guitar/Skate session-to-task synchronization without double-counting, and dynamic rendering for all six primary views |
| Missing integration layer | No visual regression; no browser storage failure/recovery test; no automated browser coverage for the remaining cross-feature flows |

Baseline after completing Phase 2: 18 Python tests and 104 JavaScript tests pass when the suite uses a modern Node runtime. Browser tests run when Chrome or Chromium and Node WebSocket support are available.

## HTTP API Map

| Method and path | Input | Output / effect |
| --- | --- | --- |
| `GET /api/kv` | none | `{data: {key: stringValue}}` for all rows |
| `PUT /api/kv` | `{key, value}` | Upserts one string value; key must start with `hivePlanner.` |
| `DELETE /api/kv?key=...` | planner key | Deletes one row |
| `GET /api/export` | none | Version-2 downloadable backup containing all rows |
| `POST /api/import` | `{data: object}` | Transactionally merges string-valued planner keys; matching keys are replaced, unrelated keys remain |
| `GET /api/mascot/status` | none | Whether an OpenAI API key is configured |
| `POST /api/mascot/chat` | `{question, context}` | OpenAI-grounded reply or 503 fallback signal |
| `GET /api/telegram/status` | none | Enabled/configured status and masked chat hint |
| `POST /api/telegram/test` | none | Sends one test message or returns 503 |
| `GET/HEAD /*` | static path | Serves files under `frontend/`; traversal is rejected |

Important API properties:

- There is no authentication or authorization. The default host is `0.0.0.0`, so the app is reachable on the LAN unless configured otherwise.
- The backend accepts any `hivePlanner.*` key and any string value; it does not validate JSON or domain shape.
- `read_json_body()` sends a 400 response for malformed JSON but returns `{}` to the caller, so a handler can attempt a second response. This is an implementation risk to cover before changing the server.
- Static responses explicitly disable caching.

## Feature Map

### Shared shell

- Six-view navigation: Dashboard, Journal, Money, Calendar, Skate, Guitar.
- The selected view can be initialized with `?view=<viewId>`.
- The effective current date can be overridden with `?date=YYYY-MM-DD`; this is useful for deterministic testing.
- Export downloads all in-memory planner keys except the transient Guitar current session.
- Import accepts either `{data: ...}` or a raw key map and merges valid string-valued planner keys.
- Sprouty mascot can be dragged, shows rotating fallback lines, exposes quick questions, and answers locally or through the optional backend OpenAI adapter.

### Dashboard

- Three editable weekly goals: Study, Body, Mind.
- Quick money transaction form with remaining week/month totals, category shortcuts, and vendor-based category suggestion. Invalid amounts keep focus in the amount field, vendor matching runs on blur, successful entries prepend a dated transaction and activity record, non-empty vendors update remembered rules, and reload restores calculated totals while resetting the transient impact message.
- Today task list with create, edit, delete, completion, timer, activity category, scheduled time, and optional Telegram reminder.
- Calendar activities for today are copied into daily tasks and linked by `sourceEventId`.
- Five day-state choices (`good`, `okay`, `low`, `empty`, `scattered`) influence agent suggestions and insight context.
- Life pie aggregates Study, Body, and Mind time for day/week/month/all-time.
  - Week is selected by default; Day, Week, Month, and All are in-memory view state and reset to Week on reload.
  - Study contains Leetcode, Coding, and Python; Body contains Skate and Gym / Judo; Mind contains Guitar, Meditation, and Journal. Other tasks are excluded.
  - Task hours count whether or not the task is complete. Timer hours take precedence, while standalone sessions and physical/journal records contribute through their existing no-double-count rules.
  - Each displayed percentage is rounded independently. Empty periods keep all rows visible at `0% · 0h` and use the neutral donut background.
  - At the mobile breakpoint the donut and summary reflow from two columns to one without changing wording, order, or component styling.
- Planned-versus-actual weekly hours by activity.
- One top deterministic insight, actions, undo, and a grouped pattern-history dialog.
- Energy trail shows the seven newest journal entries with valid energy, focus, or context, using newest-first ordering. Each row opens that journal date. Its comparison note uses the existing 14-day insight window and appears after at least two low/empty energy days have previous-day task summaries.

### Journal

- One journal entry per date, selected by date picker or Today button.
- Autosaves title, body, optional journaling minutes, energy, focus, and context.
- An entry is deleted when all fields are cleared.
- Archive is newest-first and searchable across date, title, content, and tracker fields.
- Meditation timer persists an end timestamp and completes after reload/suspension when the deadline has passed.
- The Journal meditation card accepts 1–180 whole minutes, disables Start and the duration while active, exposes Cancel, and shows saved minutes for the currently selected Journal date. Completion appends exactly one standalone Mind session; cancellation retains prior sessions without adding one.
- The Journal archive normalizes and sorts non-empty entries newest-first, marks the selected date, builds a 132-character whitespace-collapsed preview, includes tracker context, and filters live across date, title, content, energy, focus, and context. Selecting a result opens that date in the editor; search text is transient across reloads.
- Completed meditation and journal minutes contribute to the Mind total.

### Money

- Recent activity is a closed-by-default disclosure that shows the newest eight valid transactions across month boundaries. Rows use the configured category name or `Other`, display `No vendor` when blank, and reset the disclosure to closed after reload.

- The Money overview always shows the current calendar month, the Monday-to-Sunday week clipped to the month, remaining flexible money for that week, and flexible money left for the month. Negative values retain the same cards with the `is-negative` treatment, and both summaries update when money settings or transactions change.

- Euro-aware quick transaction entry with category and optional vendor.
- Monthly target; fixed and flexible category budgets; protected fixed categories.
- Budget transfers between categories.
- Current week/month availability, pace delta, projected monthly total, category progress, trends, and prior-month comparison.
- Vendor aggregation and remembered vendor-to-category rules.
- Recent activity display.

### Calendar and weekly planner

- Week navigation plus a month grid.
- Week configuration assigns each day Recovery, Normal, or High-Intensity; at least one Recovery day and at most two High-Intensity days are enforced.
- Activities contain category, effort, date, optional start/end, reminder-only status, note, and reminder lead time.
- Load is duration × category multiplier × effort multiplier, plus a context-switch charge after the third non-reminder block.
- Capacity is 4.5/7/9 load hours for Recovery/Normal/High-Intensity days.
- Recovery days limit Skate/Gym blocks to 30 minutes.
- The form previews projected load and rejects blocks that exceed the day budget.
- Events can be created, edited, and deleted. Legacy titles with leading time ranges remain readable.
- Goal-planner steps can create and retain links to calendar events.
- Timed events and direct tasks can trigger Telegram reminders; sent markers are reset when an event is edited.

### Skate

- Date/manual-day-driven 60-day SkateIQ plan followed by a longer weekly program.
- Required weekly rest day and optional second rest day.
- Per-day Blue/Yellow/Green intensity, effort/attempt guidance, benchmark days, and roadmap.
- Persisted training checklist: warm-up groups, flat/transition focus cards, skill builder, notes, and stage completion.
- Start/finish current session or log a past session; completion captures duration, date, intensity, confidence, progress, improvements, and next focus.
- A finished session updates a matching Skate task or creates one where the session helper is used.
- Board-hours and weekly session metrics derive from saved sessions.
- Body-support log records Gym, Judo, Yoga, Stretch, Recovery, Walk, or Other activity.

### Guitar

- Editable focus and next-step text.
- Start/finish a memory-only session timer.
- Completion records duration and note, and syncs time into today's matching Guitar task.
- Weekly session count, simple plan copy, and recent session history.
- Weekly target defaults to four and is read from storage, but there is no current UI for changing it.

### Insights and agent actions

- Activity history captures task, plan-hour, money, journal, day-state, and agent-action changes.
- Metrics use a 14-day lookback for task averages, planned/actual gaps, morning overruns, evening load, plan edits, carryover, unscheduled/vague tasks, money, journal, energy, and cross-domain correlations.
- Rules enforce minimum samples and choose one highest-priority insight.
- Available actions can simplify today by hiding tasks, keep the top three, move one task to tomorrow, shift a morning time, or add smaller helper tasks.
- Actions are undoable; the last ten snapshots are kept.
- Local mascot answers are grounded in the same metrics, tasks, journal, money, and Skate context. The optional OpenAI path receives a compact subset and returns a short answer plus evidence.

## Persistence Map

### Physical SQLite schema

```sql
CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

`updated_at` is an ISO-8601 UTC timestamp generated by the backend. There are no foreign keys, indexes beyond the primary key, migrations, schema version rows, or per-record timestamps enforced by SQLite.

The inspected legacy database had 96 rows and about 129 KB of string values. It included 55 date-keyed task rows (166 task records) and 299 event records, of which 181 were legacy `routineManaged` events. These counts are diagnostic only; data content was not copied.

### Current storage keys

| Key or family | Stored value | Primary owner |
| --- | --- | --- |
| `hivePlanner.weeklyGoals` | `{study, body, mind}` strings | Dashboard |
| `hivePlanner.events` | `Event[]` | Calendar |
| `hivePlanner.dailyTasks.<YYYY-MM-DD>` | `Task[]` | Dashboard |
| `hivePlanner.planned.<YYYY-Www>` | activity-id to planned-hours object | Dashboard |
| `hivePlanner.routine.week.<YYYY-Www>` | `{week, isConfigured, days[7]}` | Weekly planner |
| `hivePlanner.goalPlanner.items` | `Goal[]` with nested steps | Weekly planner |
| `hivePlanner.money.settings` | money settings/categories/transfers/notes object | Money |
| `hivePlanner.money.transactions` | `MoneyTransaction[]` | Money |
| `hivePlanner.money.vendorRules` | `VendorRule[]` | Money |
| `hivePlanner.journal.entries` | `JournalEntry[]` | Journal |
| `hivePlanner.meditation` | `{active, sessions}` | Journal/Mind |
| `hivePlanner.activityLog` | `ActivityLogEntry[]` | Insights |
| `hivePlanner.dayState` | date-key to state object | Dashboard/agent |
| `hivePlanner.agent.uiState` | `{hiddenTaskIdsByDate}` | Agent |
| `hivePlanner.agent.undo` | up to ten before/after snapshots | Agent |
| `hivePlanner.skate.coachTemplate` | warm-ups, focus suggestions, skill builder, roadmap chains | Skate |
| `hivePlanner.skate.settings` | intensity map, program day, rest days | Skate |
| `hivePlanner.skate.currentSession` | persisted checklist without start time | Skate |
| `hivePlanner.skate.sessions` | `SkateSession[]` | Skate/Body totals |
| `hivePlanner.physical.logs` | `BodySupportLog[]` | Skate/Body totals |
| `hivePlanner.guitar.focus` | plain string | Guitar |
| `hivePlanner.guitar.nextStep` | plain string | Guitar |
| `hivePlanner.guitar.weeklyTarget` | numeric string, default `4` | Guitar |
| `hivePlanner.guitar.sessions` | `GuitarSession[]` | Guitar/Mind totals |
| `hivePlanner.mascot.position` | `{x, y}`-style drag position | Shared shell |

Declared or implemented but currently inactive paths:

- `hivePlanner.physical.week.<YYYY-Www>` and both `hivePlanner.weekOverview.*.<YYYY-Www>` families support an older Study/Body weekly overview. The render function exits because its mount elements no longer exist in `index.html`.
- `databaseName`, `hivePlanner.skate.focus`, `hivePlanner.skate.weeklyTarget`, and `hivePlanner.guitar.goal` are declared in `app.js` but never read or written there.
- `hivePlanner.guitar.currentSession` is declared only for cleanup/exclusion; current session timing is memory-only.

### Domain record shapes

The following shapes are compatibility contracts inferred from current normalizers and real field names. Fields marked optional are present only in some generations of saved data.

```text
Task
  id, label, activity, hours, timerSeconds, timerStartedAt, done, createdAt
  scheduledTime, reminderMinutes, reminderSentAt, reminderSentFor
  sourceEventId?, useSourceEventReminder?

Event
  id, date, title, note, category, effort, dayPart
  startTime, endTime, reminderOnly, reminderMinutes
  createdAt, updatedAt?, reminderSentAt?, reminderSentFor?
  routineManaged?, goalId?, goalStepId?

JournalEntry
  id, date, title, content, durationMinutes
  tracker { energy, focus, context }
  createdAt, updatedAt

MoneyTransaction
  id, date, amountCents, categoryId, vendor, note, createdAt

MoneySettings
  monthlyTargetCents
  categories[] { id, name, kind, budgetCents, weeklyBudgetCents?, protected }
  transfers[] { id, fromCategoryId, toCategoryId, amountCents, note, createdAt }
  notes { averages[] }

Goal
  id, title, why
  steps[] { id, text, minutes, done, scheduledDay, eventId }

SkateSettings
  intensityByDate, currentProgramDay, restDayOfWeek, extraRestDayOfWeek

GuitarSession
  id, focus, nextStep, note, durationHours, trackedInTask, startedAt, finishedAt

BodySupportLog
  id, date, kind, name, status, minutes, score, note, createdAt

ActivityLogEntry
  id, timestamp, action, entityType, entityId, dateKey
  field, before, after, meta
```

Skate sessions are the widest compatibility shape. Current saves include identity/timestamps, `dateKey`, duration/task-link fields, intensity and feedback, warm-up snapshots, selected focus/skill state, roadmap labels, and a nested `sessionPlan`. Older records contain overlapping but different feedback fields. The rewrite should preserve unknown fields until a migration is explicitly tested.

### Observed legacy-only keys

The existing database also contains keys not owned by current production code:

- `hivePlanner.skate.learningItems`
- `hivePlanner.skate.warmupItems`
- `hivePlanner.study.sessions`
- `hivePlanner.telegramWater.settings`

The server intentionally preserves them because export/import and the KV API operate on every planner key. They must not be deleted merely because the current UI no longer reads them.

## Cross-Feature Coupling

These relationships are especially important for migration sequencing:

| Producer | Consumer | Contract |
| --- | --- | --- |
| Calendar event | Daily task list | Today's non-routine event is copied to a linked task by `sourceEventId`; stale linked tasks are removed when the event disappears |
| Calendar event | Telegram worker | Structured start time, date, lead minutes, and sent markers determine delivery |
| Goal step | Calendar event | `goalId`, `goalStepId`, `eventId`, and `scheduledDay` maintain a two-way reference |
| Task timer | Life pie / planned-vs-actual / insights | Effective hours prefer timer data over manual hours |
| Skate/Guitar session | Daily tasks | Finished duration is added to the matching activity task and marks it done |
| Skate/Guitar standalone session | Life pie | Counted only when it was not already tracked in a task, preventing double counting |
| Journal/meditation | Life pie | Minutes become Mind hours |
| Journal tracker | Energy trail / insight metrics / mascot | Energy, focus, and context feed several derived views |
| Money transaction | Dashboard/Money/insights/mascot | One write refreshes budget pace and cross-domain metrics |
| Activity log | Insights/mascot | Before/after task edits enable pattern detection that final task state alone cannot provide |
| Day state | Agent/insights/mascot | Changes suggested task count, prompts, and coaching context |

## Duplication, Dead Code, and Migration Risks

### Confirmed duplication

- Time parsing appears in `calendar-core.js`, `app.js`, `agent-core.js`, `insight-core.js`, `mascot-rag.js`, `backend/openai_mascot.py`, and `backend/telegram_notifier.py` with related but not identical accepted formats.
- `app.js` contains a full fallback implementation of much of `calendar-core.js`, even though the module is always loaded first by `index.html`.
- Date formatting/range utilities are repeated across `app.js`, `money-core.js`, `insight-core.js`, and `skate-core.js`.
- Domain normalization is split between pure modules and additional fallback/adapter logic in `app.js`.
- Money, journal, Skate, and calendar orchestration each mix read/write, normalization, rendering, and event handling inside `app.js` despite having pure-core modules.

### Confirmed inactive or legacy paths

- The older combined Study/Body weekly overview has no DOM mount but still has storage helpers, defaults, rendering, and calls.
- Several unused storage constants remain as listed in the persistence map.
- The real database retains legacy data families that current code ignores.
- The `routineManaged` event path remains in stored data and is filtered from current user-facing calendar queries.

### High-risk behavior to preserve

- Server-first hydration with browser-only backfill.
- Fire-and-forget writes and browser fallback after server failure.
- Unknown planner keys surviving export/import.
- Old event titles that encode time instead of using structured fields.
- Normalizers accepting older or incomplete records and supplying defaults.
- No double counting when a session is also synced to a task.
- Reminder deduplication through `reminderSentFor`, and imported tasks deferring to source-event reminders by default.
- Task timer cap and the different persistence rules for task versus activity-session timers.
- One journal entry per date and clearing all content deleting that entry.

### Current quality gaps

- `app.js` now has browser-level task and activity-session lifecycle tests, but most other user-facing views remain unprotected at the browser boundary.
- Browser inspection found 29 generated form controls without `id` or `name`; Chrome reports this as an accessibility/form issue.
- There is no domain schema version or explicit data migration mechanism.
- There is no documented multi-tab or concurrent-write behavior.
- The default LAN binding is convenient but broad for an unauthenticated personal-data app.
- The test script depends on whichever `node` appears first in `PATH`; on the inspected machine that is Node 14 even though a compatible Node 24 installation exists.

## Critical User Flows

These flows should become the first integration/e2e safety net before components are replaced:

1. Start with an existing SQLite database, hydrate all planner keys, render the Dashboard, and refresh without data loss.
2. Create, edit, complete, time, pause, and delete a task; verify activity history and actual-hour totals.
3. Create/edit/delete a timed calendar activity; verify load validation, month/week rendering, linked daily task, and reminder reset behavior.
4. Restart with legacy event/task shapes and confirm normalization does not rewrite or lose meaningful fields.
5. Write, search, revisit, and clear a journal entry; verify tracker and Mind-hour effects.
6. Start meditation, reload after its deadline, and confirm exactly one completed session.
7. Add a money transaction and transfer; verify dashboard summary, category budgets, projections, vendor summary, and persistence.
8. Start and finish Skate and Guitar sessions; verify feedback/session history, task synchronization, refresh behavior, and no double-counted time.
9. Apply and undo each agent action; verify tasks are hidden/moved/expanded rather than silently deleted.
10. Export, mutate, import, restart, and confirm both current and unknown legacy keys survive.
11. Run with the backend unavailable; verify local browser storage still works and later hydration behavior is understood.
12. Deliver one due Telegram reminder and confirm duplicate suppression and saved sent markers.

## Recommended Migration Seams

Phase 2's planned safety net is complete, and no production rewrite has begun. The next work is the first Phase 3 structure beside the still-active legacy frontend.

Recommended order:

1. [x] Capture representative, anonymized version-2 backup fixtures containing current and legacy shapes.
2. [x] Extract or expose storage hydration/persistence as a testable adapter without changing behavior.
3. [x] Add integration tests for event-to-task synchronization and session-to-task/no-double-count behavior.
4. [x] Extend the browser smoke suite from its startup and task-lifecycle baseline to cover all six primary views.
5. [ ] Create the React + TypeScript application beside the legacy frontend.

The first React boundary should be read-only: load the same `/api/kv` payload and render one small feature using typed compatibility decoders. Writes and legacy removal should wait until the corresponding behavioral tests exist.
