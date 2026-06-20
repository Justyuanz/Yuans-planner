#!/bin/zsh
set -eu
PROJECT_DIR="/Users/yuan/Desktop/YuanPlanner"
URL="http://127.0.0.1:8765"
if ! /usr/bin/nc -z 127.0.0.1 8765 >/dev/null 2>&1; then
  "$PROJECT_DIR/scripts/start.sh" >/dev/null 2>&1 &
fi
for _ in {1..40}; do
  if /usr/bin/nc -z 127.0.0.1 8765 >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
if [ -d "/Applications/Google Chrome.app" ]; then
  /usr/bin/open -na "Google Chrome" --args --app="$URL"
else
  /usr/bin/open "$URL"
fi
