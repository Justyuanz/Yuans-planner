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
cd YuanPlanner
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

A friend can host this app from GitHub on any service that can run Python and keep a writable filesystem or mounted persistent volume.

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

If the host provides a port automatically, set `YUAN_PLANNER_PORT` to that value in the platform settings.

## Tests

JavaScript logic tests:

```sh
node --test tests/calendar-core.test.js
```

Python syntax check:

```sh
python3 -m py_compile backend/app.py
```

## Notes

- The frontend is static and lives in `frontend/`.
- The Python backend serves both the API and the frontend assets.
- `.gitignore` excludes local databases, logs, env files, virtualenvs, build output, and other machine-local files.
