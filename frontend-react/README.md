# React frontend

This folder contains the new React + TypeScript frontend beside the legacy `frontend/` application. The Python server still serves the working application, and the Vite preview loads that UI unchanged as a temporary migration shell.

The first migrated boundary is intentionally read-only. React fetches the existing `/api/kv` response, validates its string-valued key/value contract, and takes ownership of the legacy weekly-goals mount. The component uses the legacy markup and CSS so the desktop panel and mobile-hidden behavior remain visually identical.

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

The root test suite also compares the legacy and React weekly-goals panel in Chrome at desktop and mobile viewports. Install this folder's dependencies before running that visual regression test.

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
