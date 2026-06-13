# Yuan's Planner Cleanup Report

## Real Working Source

The real editable source code is:

- `/Users/yuan/Documents/planner + calendar`

This is the copy that currently matches the installed runtime for:

- `frontend/index.html`
- `frontend/css/styles.css`
- `frontend/js/app.js`
- `backend/app.py`

## Running App Runtime

The app that currently runs on the laptop uses this installed runtime folder:

- `/Users/yuan/Library/Application Support/YuansPlanner`

This folder contains:

- the runtime frontend files
- the runtime backend files
- the live SQLite database
- launch helper scripts used by LaunchAgents

## Auto-Start Wiring

Active LaunchAgents found:

- `/Users/yuan/Library/LaunchAgents/local.yuan.planner.plist`
- `/Users/yuan/Library/LaunchAgents/local.yuan.planner.ui.plist`

No active crontab entry was found from `crontab -l`.

That means the current automatic startup is using LaunchAgents, not crontab.

## Desktop File Classification

### KEEP

- `/Users/yuan/Documents/planner + calendar`
  This is the real source project right now.
- `/Users/yuan/Library/Application Support/YuansPlanner`
  This is the currently running installed runtime copy.
- `/Users/yuan/Library/LaunchAgents/local.yuan.planner.plist`
  Active auto-start server launcher.
- `/Users/yuan/Library/LaunchAgents/local.yuan.planner.ui.plist`
  Active auto-open UI launcher.

### MOVE TO PROJECT

- `README.md`
  Keep in the clean project root.
- `.gitignore`
  Keep in the clean project root.
- `requirements.txt`
  Keep in the clean project root.
- `scripts/start.sh`
  Keep as the one simple start script in the clean project.
- `data/planner.db`
  Keep in the clean project as local private app data.

### ARCHIVE

- `/Users/yuan/Desktop/Yuan's Planner App`
  Old duplicate project/runtime copy on Desktop. Not the canonical source.
- `/Users/yuan/Desktop/Yuan's Planner.app`
  Old app wrapper. Not needed for source editing.
- `/Users/yuan/Desktop/Start Yuan's Planner.command`
  Old launcher pointing to the Desktop duplicate folder.
- `/Users/yuan/Desktop/Open Yuan Planner crontab editor.command`
  Old helper for a crontab path that is not currently active.
- `/Users/yuan/Desktop/Yuan Planner crontab line.txt`
  Old crontab note. Current startup uses LaunchAgents instead.

### SAFE TO DELETE

None recommended yet.

The planner-related Desktop files are better archived first rather than deleted.

### UNSURE

- `/Users/yuan/Library/Application Support/YuansPlanner/planner.log`
- `/Users/yuan/Library/Application Support/YuansPlanner/planner.launchd.log`
- `/Users/yuan/Library/Application Support/YuansPlanner/planner.launchd.err`
- `/Users/yuan/Library/Application Support/YuansPlanner/planner.ui.launchd.log`
- `/Users/yuan/Library/Application Support/YuansPlanner/planner.ui.launchd.err`

These are runtime logs. They are safe to ignore, but I would not delete them automatically during cleanup without checking whether you still want local app auto-start behavior.

## Recommended Final State

The clean project to keep working in should live at:

- `/Users/yuan/Desktop/YuanPlanner`

The old scattered Desktop duplicates should move to:

- `/Users/yuan/Desktop/YuanPlanner_Archive`

## Workspace Cleanup Already Prepared

Inside the source project, the old helper files have been moved into:

- `/Users/yuan/Documents/planner + calendar/backups/legacy_archive`

This local archive now holds:

- old `.command` launchers
- old LaunchAgent install scripts
- archived plist copies
- the old app wrapper bundle
- stress/test helper scripts
- the old duplicate root `planner.db`

That leaves the working project focused on:

- `frontend/`
- `backend/`
- `data/`
- `scripts/`
- `docs/`
