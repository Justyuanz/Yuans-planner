# React frontend

This folder contains the new React + TypeScript frontend beside the legacy `frontend/` application. The Python server still serves the legacy application, so this preview cannot replace or modify the working planner yet.

The first migrated boundary is intentionally read-only. It fetches the existing `/api/kv` response, validates its string-valued key/value contract, and renders the three weekly-goal tracks without changing SQLite or browser storage.

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

## Quality checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
