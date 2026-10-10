# Yuan's Planner

A hobby vibe coding project: a personal planner built with AI assistance for everyday planning, journaling, and tracking progress. It uses a React + TypeScript frontend, a Python backend, and SQLite.

## What it does

- Dashboard with weekly goals, daily tasks, and planning insights
- Journal with dated entries and searchable history
- Money tracking with budgets, transactions, and vendor summaries
- Weekly and monthly calendar planning
- Skate and guitar practice tracking
- JSON backup export and import
- Optional OpenAI mascot chat and Telegram reminders

## Run locally

You need Python 3.10 or newer and Node.js 20.19 or newer.

```sh
git clone https://github.com/Justyuanz/Yuans-planner.git YuanPlanner
cd YuanPlanner
cd frontend-react
npm ci
npm run build
cd ..
./scripts/start.sh
```

Open [localhost:8765](http://127.0.0.1:8765). You can also start the server with `python3 backend/app.py`. On macOS, `./scripts/open-ui.sh` starts the server if needed and opens the app.

For frontend development, run `npm run dev` from `frontend-react/` while the Python backend is running. Vite proxies API and legacy compatibility requests to port 8765 by default.

To use a different port:

```sh
YUAN_PLANNER_PORT=8876 ./scripts/start.sh
```

## Project structure

```text
backend/        HTTP server, SQLite storage, configuration, and integrations
frontend-react/ React + strict TypeScript application, styles, and production build
frontend/       Legacy HTML/JavaScript reference used during migration testing
scripts/       Start, open, and test commands
tests/         Backend, browser, compatibility, and end-to-end tests
docs/          Design notes and future plans
data/          Local database and runtime files (ignored by Git)
```

`backend/app.py` is the server entry point; `config.py` handles settings and `db.py` handles persistence. The server serves `frontend-react/dist` at the application root. All six primary views render directly in React. The legacy frontend remains available at `/legacy/` for the explicit compatibility shell and as the visual reference during migration.

Design notes: [agent roadmap](docs/agent-intelligence-roadmap.md) and [planner load model](docs/planner-load-model/design.md). These describe design intent and plans, rather than a complete inventory of shipped features.

## Configuration

The backend reads an optional `.env` file in the project root. Existing shell environment variables take precedence. Create this file yourself if needed; keep credentials out of Git.

| Variable | Default / purpose |
| --- | --- |
| `YUAN_PLANNER_HOST` | `0.0.0.0` (all interfaces); use `127.0.0.1` for local-only access |
| `YUAN_PLANNER_PORT` | `8765` |
| `YUAN_PLANNER_DB_PATH` | `data/planner.db`; relative paths resolve from the project root |
| `YUAN_PLANNER_FRONTEND_MODE` | `react`; set to `legacy` only for compatibility or visual-reference testing |
| `YUAN_PLANNER_TIMEZONE` | `Europe/Helsinki` |
| `OPENAI_API_KEY` | Optional key for mascot chat |
| `YUAN_PLANNER_OPENAI_MODEL` | `gpt-5-mini` |
| `YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS` | `20` (clamped to 5–60 seconds) |
| `YUAN_PLANNER_TELEGRAM_ENABLED` | `0`; set to `1` to enable reminders |
| `YUAN_PLANNER_TELEGRAM_BOT_TOKEN` | Optional Telegram bot token |
| `YUAN_PLANNER_TELEGRAM_CHAT_ID` | Optional destination chat ID |

Telegram reminders require all three Telegram settings and a running backend. The browser can be closed. Timed reminders use an event's start time or a legacy title beginning with a time such as `18:00`.

## Data and backups

The server creates `data/planner.db` automatically. The frontend also uses browser local storage as a fallback. Local databases, credentials, logs, and the `backups/` directory are ignored by Git.

Use the app's export/import controls, or export the server's saved data with:

```sh
curl http://127.0.0.1:8765/api/export -o yuan-planner-backup.json
```

Server imports merge valid planner keys into existing data, replacing matching keys.

## Tests

Install the React dependencies once, then run the complete suite:

```sh
cd frontend-react
npm ci
cd ..
```

```sh
sh scripts/test.sh
```

Or run them separately:

```sh
python3 -m unittest discover -s tests -p '*_test.py'
cd frontend-react
npm test
npm run lint
npm run typecheck
npm run build
cd ..
node --test tests/*.test.js
```

Tests cover React feature logic, backend reminders and mascot helpers, SQLite persistence, HTTP storage/backup endpoints, production and legacy static delivery, the main task and activity-session lifecycles, and all six primary views in a real browser. Browser tests run when Chrome or Chromium and a Node.js runtime with WebSocket support are available; otherwise they are skipped. All persistence tests use temporary databases, so they do not modify your planner data or call external services.

## Docker

```sh
docker compose up --build
```

Open [localhost:8765](http://127.0.0.1:8765). Compose mounts `./data` for persistent storage. Stop it with `docker compose down`.

The Docker image builds the React production bundle in a Node stage, then copies only the compiled files into the Python runtime image.

The default Compose configuration does not forward optional integration settings or copy your `.env` into the image. To use integrations in Docker, explicitly add the desired variables to the service's `environment` configuration.
