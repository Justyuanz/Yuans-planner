#!/usr/bin/env sh
set -eu
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${YUAN_PLANNER_PORT:-8765}"
URL="http://127.0.0.1:${PORT}"
if ! /usr/bin/nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1; then
  "$PROJECT_DIR/scripts/start.sh" >/dev/null 2>&1 &
fi
i=0
while [ "$i" -lt 40 ]; do
  if /usr/bin/nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
  i=$((i + 1))
done
if [ -d "/Applications/Google Chrome.app" ]; then
  /usr/bin/open -na "Google Chrome" --args --app="$URL"
else
  /usr/bin/open "$URL"
fi
