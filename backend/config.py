"""Runtime configuration for Yuan's Planner."""

from __future__ import annotations

import os
from datetime import timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENV_PATH = PROJECT_ROOT / ".env"


def load_env_file(path: Path = DEFAULT_ENV_PATH) -> None:
    """Load simple KEY=VALUE pairs from .env without overriding real env vars."""
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ[key] = value


load_env_file()


def planner_host() -> str:
    return os.environ.get("YUAN_PLANNER_HOST", "0.0.0.0")


def planner_port() -> int:
    return int(os.environ.get("YUAN_PLANNER_PORT", "8765"))


def planner_db_path() -> Path:
    configured = os.environ.get("YUAN_PLANNER_DB_PATH", "").strip()
    if not configured:
        return PROJECT_ROOT / "data" / "planner.db"
    path = Path(configured).expanduser()
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path


def planner_timezone_name() -> str:
    return os.environ.get("YUAN_PLANNER_TIMEZONE", "Europe/Helsinki").strip() or "Europe/Helsinki"


def planner_timezone():
    try:
        return ZoneInfo(planner_timezone_name())
    except ZoneInfoNotFoundError:
        return timezone.utc


def openai_api_key() -> str:
    return os.environ.get("OPENAI_API_KEY", "").strip()


def openai_model() -> str:
    return os.environ.get("YUAN_PLANNER_OPENAI_MODEL", "gpt-5-mini").strip() or "gpt-5-mini"


def openai_timeout_seconds() -> int:
    raw = os.environ.get("YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS", "20").strip()
    try:
        return max(5, min(60, int(raw)))
    except ValueError:
        return 20


def telegram_enabled() -> bool:
    raw = os.environ.get("YUAN_PLANNER_TELEGRAM_ENABLED", "0").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def telegram_bot_token() -> str:
    return os.environ.get("YUAN_PLANNER_TELEGRAM_BOT_TOKEN", "").strip()


def telegram_chat_id() -> str:
    return os.environ.get("YUAN_PLANNER_TELEGRAM_CHAT_ID", "").strip()
