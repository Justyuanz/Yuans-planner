"""SQLite helpers for Yuan's Planner."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "planner.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    connection.commit()
    return connection


def init_database() -> None:
    connect().close()


def read_all_values() -> dict[str, str]:
    with connect() as connection:
        rows = connection.execute("SELECT key, value FROM kv_store ORDER BY key").fetchall()
    return {key: value for key, value in rows}


def put_value(key: str, value: str) -> None:
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO kv_store (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, value, now_iso()),
        )


def import_values(data: dict) -> int:
    imported = 0
    with connect() as connection:
        for key, value in data.items():
            if isinstance(key, str) and key.startswith("hivePlanner.") and isinstance(value, str):
                connection.execute(
                    """
                    INSERT INTO kv_store (key, value, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = excluded.updated_at
                    """,
                    (key, value, now_iso()),
                )
                imported += 1
    return imported
