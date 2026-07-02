#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

cd "$PROJECT_DIR"
exec "$PYTHON_BIN" backend/app.py
