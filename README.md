# Yuan's Planner

Yuan's Planner is a small Python + static HTML/CSS/JS app for:

- daily study planning
- skate session tracking
- body support logging
- calendar scheduling
- planned vs actual hours
- lightweight goal planning

It serves the frontend directly from the Python backend and stores app data in SQLite.

## Tech Stack

- Python standard library backend
- Static frontend in `frontend/`
- SQLite database for persistence

There is currently **no Node install step** and **no frontend build step**.

## Project Structure

```text
Yuans-Planner/
  backend/
    app.py
    config.py
    db.py
  frontend/
    index.html
    css/styles.css
    js/app.js
    js/calendar-core.js
  scripts/
    start.sh
    open-ui.sh
  tests/
    calendar-core.test.js
  data/
    planner.db           # created automatically on first run
  .env.example
  requirements.txt
  README.md
```

## Fresh Clone Setup

Clone the repo:

```sh
git clone <your-repo-url>
cd Yuans-Planner
```

Create and activate a virtual environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
```

Install Python requirements:

```sh
pip install -r requirements.txt
```

`requirements.txt` is intentionally minimal right now, but this is still the correct install command for a fresh clone.

## Environment Variables

The app works with no required secrets.

Optional environment variables:

- `YUAN_PLANNER_HOST`
  Default: `0.0.0.0`
- `YUAN_PLANNER_PORT`
  Default: `8765`
- `YUAN_PLANNER_DB_PATH`
  Default: `data/planner.db`

Example:

```sh
cp .env.example .env
```

The backend now reads `.env` automatically if it exists. On a hosting platform, you can also set the same variables directly in the host's environment settings.

## Run With Docker

Build and start the app:

```sh
docker compose up --build
```

If your Docker install uses the older standalone Compose binary, use `docker-compose up --build` instead.

Then open:

- `http://127.0.0.1:8765`

The Docker setup stores SQLite in the project's local `data/` folder instead of inside the container image:

- container path: `/app/persist/planner.db`
- local path: `data/planner.db`

That means your data survives:

- `docker compose down`
- image rebuilds
- container replacement
- and it stays easy to inspect or copy from your laptop

If you want to stop the app without deleting the saved data:

```sh
docker compose down
```

## Exporting Or Backing Up Data

You have two easy backup options.

### Option 1: App-level JSON export

Use the app's **Export backup** button in the UI, or download the same backup from the API:

```sh
curl http://127.0.0.1:8765/api/export -o yuan-planner-backup.json
```

This is the safest portable backup if you may later move data between machines or app versions.

### Option 2: Raw SQLite backup from the local data folder

Copy the database file directly:

```sh
cp data/planner.db ./backups/planner.db
```

You can restore that database later by putting it back at `data/planner.db`.

## Run Locally

Recommended:

```sh
./scripts/start.sh
```

Equivalent direct command:

```sh
python3 backend/app.py
```

Then open:

- `http://127.0.0.1:8765`

With a custom port:

```sh
YUAN_PLANNER_PORT=8876 ./scripts/start.sh
```

## Verified Commands

### Install

```sh
pip install -r requirements.txt
```

### Development Run

```sh
./scripts/start.sh
```

or

```sh
python3 backend/app.py
```

### Production Build

There is currently **no build step**.

The app serves static files directly from the repo.

### Production Start / Serve

```sh
python3 backend/app.py
```

If you use a process manager or platform start command, point it at the same entrypoint.

## Database Behavior

The app uses SQLite.

Default database location:

```text
data/planner.db
```

Important:

- `planner.db` is **created automatically** on first run.
- You do **not** need to copy a blank database into the server manually.
- If you want persistent data in production, point `YUAN_PLANNER_DB_PATH` at persistent storage.

Example production setting:

```sh
YUAN_PLANNER_DB_PATH=/data/planner/planner.db
```

If the database path does not exist yet, the app creates the parent directory automatically.

## Deploying From GitHub

Minimum deployment requirements:

- Python 3.11+ recommended
- ability to run `python3 backend/app.py`
- writable path for the SQLite file

Recommended deployment configuration:

- Start command:

```sh
python3 backend/app.py
```

- Environment:

```text
YUAN_PLANNER_HOST=0.0.0.0
YUAN_PLANNER_PORT=<platform port or your chosen port>
YUAN_PLANNER_DB_PATH=<persistent storage path>/planner.db
```

Docker equivalent:

- mount persistent storage into the container
- set `YUAN_PLANNER_DB_PATH` to a file inside that mount, such as `/app/persist/planner.db`

If the host provides a port automatically, set `YUAN_PLANNER_PORT` to that value in the platform settings.

## Tests

JavaScript logic tests:

```sh
node --test tests/calendar-core.test.js
```

This requires Node.js 18+ because it uses the built-in `node:test` runner.
The planner itself does not require Node to run.

Python syntax check:

```sh
python3 -m py_compile backend/app.py
python3 -m py_compile backend/config.py
python3 -m py_compile backend/db.py
```
