#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"

cd "$PROJECT_DIR"
"$PYTHON_BIN" -m unittest discover -s tests -p '*_test.py'
(
  cd frontend-react
  "$NPM_BIN" test
  "$NPM_BIN" run lint
  "$NPM_BIN" run typecheck
  "$NPM_BIN" run build
)
"$NODE_BIN" --test --test-concurrency=1 tests/*.test.js
