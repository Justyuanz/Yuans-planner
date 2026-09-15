# React frontend

This folder contains the new React + TypeScript frontend beside the legacy `frontend/` application. The Python server still serves the working application, and the Vite preview loads that UI unchanged as a temporary migration shell.

The migrated boundaries are weekly goals, the dashboard day-state selector, Life Pie, Planned vs actual, Energy trail, Pattern noticed, Pattern history, Money quick log, Money overview, Money pace and projection, Money vendors, Money recent activity, Money budgets and categories, the Journal meditation card, and the Journal archive. React fetches the existing `/api/kv` response, validates its string-valued key/value contract, and takes ownership of only those legacy mounts. The components preserve the legacy markup, CSS, wording, interactions, persistence, desktop appearance, and responsive behavior. Same-origin storage events keep the React-owned summaries current while tasks and the journal editor stay legacy-owned. The day-state selector delegates writes through a narrow legacy bridge so its compatibility fields, audit entries, Sprouty prompts, and insight side effects remain unchanged. The two Pattern boundaries use a typed bridge to the legacy insight engine while React owns their presentation and transient disclosure state. Money quick writes compatible transaction, vendor-rule, and activity-log records, and all six Money boundaries use the same compatibility decoder so quick and legacy Money changes flow through the same bridge. Budget edits and transfers preserve unknown stored fields while updating every React Money summary immediately. Meditation start, cancel, expiry, and selected Journal date behavior remain compatible, and completed sessions update the React Life Pie immediately. Journal archive filtering stays transient, archive selections open the matching legacy editor date, and legacy editor writes update the React-owned archive.

## Run the preview

Use Node.js 20.19 or newer. Start the existing Python backend from the repository root:

```sh
./scripts/start.sh
```

Then start Vite from this folder:

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Development `/api` requests are proxied to `http://127.0.0.1:8765`.

Set `VITE_PLANNER_API_TARGET` before starting Vite when the Python backend uses another local port.

The root test suite compares all fifteen migrated boundaries with the legacy UI in Chrome at desktop and mobile viewports. Install this folder's dependencies before running those visual regression tests.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
