#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
NODE_BIN="${NODE_BIN:-node}"

cd "$PROJECT_DIR"
"$PYTHON_BIN" -m unittest discover -s tests -p '*_test.py'
"$NODE_BIN" --test tests/*.test.js
