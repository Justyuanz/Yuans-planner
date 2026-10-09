# React frontend

This folder contains the production React + strict TypeScript frontend. The Python server serves the compiled `dist/` bundle at the application root, and Vite provides the local frontend-development server.

Dashboard, Money, Journal, Calendar, Skate, and Guitar render directly in React without an iframe. React validates the existing `/api/kv` string-valued key/value contract and preserves the legacy markup, CSS, wording, interactions, persistence, desktop appearance, and responsive behavior. Unknown or explicitly compatibility-only views use the isolated legacy shell at `/legacy/` while migration cleanup continues.

## Run locally

Use Node.js 20.19 or newer. Install dependencies and create the production bundle:

```sh
npm ci
npm run build
```

Then start the Python server from the repository root with `./scripts/start.sh`.

For frontend development, start the Python backend and run:

```sh
npm run dev
```

Open the local address printed by Vite. Development `/api` requests are proxied to `http://127.0.0.1:8765`.

Set `VITE_PLANNER_API_TARGET` before starting Vite when the Python backend uses another local port.

The root test suite compares migrated React behavior and layout with the legacy visual reference in Chrome at desktop and mobile viewports. It also opens the compiled bundle through the Python server to protect the production path, assets, API access, responsive overflow, and explicit legacy fallback.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
