# React frontend

This folder contains the new React + TypeScript frontend beside the legacy `frontend/` application. The Python server still serves the working application, and the Vite preview loads that UI unchanged as a temporary migration shell.

The migrated boundaries are weekly goals, Life Pie, Planned vs actual, and Energy trail. React fetches the existing `/api/kv` response, validates its string-valued key/value contract, and takes ownership of only those legacy mounts. The components preserve the legacy markup, CSS, wording, interactions, persistence, desktop appearance, and responsive behavior. Same-origin storage events keep the React-owned summaries current while the surrounding task, journal editor, and activity features remain legacy-owned.

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

The root test suite compares all four migrated boundaries with the legacy UI in Chrome at desktop and mobile viewports. Install this folder's dependencies before running those visual regression tests.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
