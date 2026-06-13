# Yuan's Planner

Yuan's Planner is a small local full-stack app for study consistency, skate tracking, calendar events, planned-vs-actual hours, and job application logging.

## Why I Built It

I built this app mostly for fun while making myself a personal tool for the months before graduation. The whole thing has a very assisted, vibe-code energy on purpose, but the project is organized so future me can still understand it.

## Run Locally

```sh
./scripts/start.sh
```

Then open [http://127.0.0.1:8765](http://127.0.0.1:8765).

If you want a different port:

```sh
YUAN_PLANNER_PORT=8876 ./scripts/start.sh
```

## Notes

- The backend uses only Python's standard library, so `requirements.txt` is intentionally minimal.
- The local SQLite database lives in `data/planner.db` and is ignored by Git.
- The installed runtime copy used by local auto-start is separate from this source project.

## Project Shape

```text
YuanPlanner/
  frontend/
    index.html
    css/styles.css
    js/app.js
  backend/
    app.py
    db.py
  data/
    planner.db
  scripts/
    start.sh
  docs/
    cleanup_report.md
  backups/
    legacy_archive/
```
