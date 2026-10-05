# React frontend

This folder contains the new React + TypeScript frontend beside the legacy `frontend/` application. The Python server still serves the working application. The Vite preview now renders `?view=moneyView` directly in React; the other five routes continue using the temporary legacy migration shell.

The migrated boundaries are weekly goals, the dashboard day-state selector, the dashboard task-progress banner, Today's intention, Life Pie, Planned vs actual, Energy trail, Pattern noticed, Pattern history, Money quick log, Money overview, Money pace and projection, Money vendors, Money recent activity, Money budgets and categories, the Journal meditation card, and the Journal archive. React fetches the existing `/api/kv` response and validates its string-valued key/value contract. The components preserve the legacy markup, CSS, wording, interactions, persistence, desktop appearance, and responsive behavior. Same-origin storage events keep React summaries current while the task list/editor and journal editor stay legacy-owned. A shared strict-TypeScript activity model accepts the retired IDs, combines them with current planned-hour values, preserves unrelated fields, and exposes the production Transcendence, Mobile Development, Portfolio / Job Prep, Skate, Gym, and Guitar contract. The direct Money route composes all five Money-page cards inside a typed React shell with navigation and compatibility-safe backup controls; it contains no iframe. Other routes retain the legacy shell while their remaining features are migrated.

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

The root test suite compares all seventeen migrated boundaries and the direct Money route with the legacy UI in Chrome at desktop and mobile viewports. Install this folder's dependencies before running those visual regression tests.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
