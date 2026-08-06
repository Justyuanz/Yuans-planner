# Yuan's Planner

Yuan's Planner is a small personal planning app with a Python backend and a static frontend.

It currently includes:

- a dashboard for weekly goals, daily tasks, and quick summaries
- a journal view with dated entries and searchable history
- a money planner with budgets, transactions, and vendor summaries
- a calendar with weekly and monthly planning
- skate and guitar tracking pages
- local backup export and import

The app serves `frontend/` directly and stores planner data in SQLite.

## Quick Start

For most people, local setup is just:

```sh
git clone <your-repo-url>
cd YuanPlanner
./scripts/start.sh
```

Then open:

- [http://127.0.0.1:8765](http://127.0.0.1:8765)

There is no frontend build step and no required dependency install for normal local use.

## Tech Stack

- Python standard library backend
- static HTML, CSS, and vanilla JavaScript frontend
- SQLite key-value persistence
- Node's built-in test runner for frontend logic tests

There is no frontend build step.

## Project Structure

```text
YuanPlanner/
  backend/
    app.py
    config.py
    db.py
  frontend/
    index.html
    css/styles.css
    js/app.js
    js/calendar-core.js
    js/journal-core.js
    js/money-core.js
  scripts/
    start.sh
    open-ui.sh
  tests/
    calendar-core.test.js
    journal-core.test.js
    money-core.test.js
  data/
    planner.db
  docker-compose.yml
  Dockerfile
  README.md
```

## Requirements

- Python 3
- Node.js only if you want to run the JavaScript tests

`requirements.txt` is intentionally empty because the app uses Python standard library modules only.

That means:

- `pip install -r requirements.txt` is safe but not necessary
- you do not need `npm install`
- you do not need any frontend build command

## Run Locally

Start the app:

```sh
./scripts/start.sh
```

Equivalent direct command:

```sh
python3 backend/app.py
```

Then open:

- [http://127.0.0.1:8765](http://127.0.0.1:8765)

If port `8765` is already being used on your machine:

```sh
YUAN_PLANNER_PORT=8876 ./scripts/start.sh
```

Then open:

- [http://127.0.0.1:8876](http://127.0.0.1:8876)

To run on another port:

```sh
YUAN_PLANNER_PORT=8876 ./scripts/start.sh
```

If you want the script to launch the UI for you on macOS:

```sh
./scripts/open-ui.sh
```

`open-ui.sh` is a convenience script for macOS. It is not required to run the app.

## Configuration

Optional environment variables:

- `YUAN_PLANNER_HOST`
  Default: `0.0.0.0`
- `YUAN_PLANNER_PORT`
  Default: `8765`
- `YUAN_PLANNER_DB_PATH`
  Default: `data/planner.db`

The backend automatically reads `.env` if it exists.

Example:

```sh
cp .env.example .env
```

## Data Storage

Planner data is stored in SQLite.

Default database location:

```text
data/planner.db
```

The database file and parent directory are created automatically if they do not exist yet.

## Backups

You can back up the planner in two ways.

### App export

Use the in-app export button, or download the same JSON backup from:

```sh
curl http://127.0.0.1:8765/api/export -o yuan-planner-backup.json
```

### Raw SQLite copy

Copy the database file directly:

```sh
cp data/planner.db ./backups/planner.db
```

## Run With Docker

Start the app with Docker Compose:

```sh
docker compose up --build
```

Then open:

- [http://127.0.0.1:8765](http://127.0.0.1:8765)

The compose file mounts `./data` into the container so your SQLite data persists across restarts.

To stop it:

```sh
docker compose down
```

## Tests

Run the frontend logic tests with Node:

```sh
node --test tests/*.test.js
```

At the moment, that covers:

- calendar core behavior
- journal core behavior
- money core behavior

## API Notes

The backend is intentionally small. It currently exposes:

- `GET /api/kv`
- `PUT /api/kv`
- `DELETE /api/kv?key=...`
- `POST /api/import`
- `GET /api/export`

Static files are served from `frontend/`.

## Development Notes

- there is no bundler, framework build, or asset pipeline
- most app behavior lives in `frontend/js/app.js`
- shared logic that is tested independently lives in small core files under `frontend/js/`
- persistence is string-based key-value storage backed by SQLite
