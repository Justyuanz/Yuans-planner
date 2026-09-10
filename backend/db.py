"""SQLite helpers for Yuan's Planner."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from config import planner_db_path

DB_PATH = planner_db_path()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    except Exception:
        conn.close()
        raise
    return conn


def init_database() -> None:
    conn = connect()
    conn.close()


def read_all_values() -> dict[str, str]:
    conn = connect()
    try:
        rows = conn.execute("SELECT key, value FROM kv_store ORDER BY key").fetchall()
    finally:
        conn.close()
    return {key: value for key, value in rows}


def _upsert_value(conn: sqlite3.Connection, key: str, value: str) -> None:
    """Write one value within the caller's transaction."""
    conn.execute(
        """
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        """,
        (key, value, now_iso()),
    )


def put_value(key: str, value: str) -> None:
    conn = connect()
    try:
        _upsert_value(conn, key, value)
        conn.commit()
    finally:
        conn.close()


def delete_value(key: str) -> None:
    conn = connect()
    try:
        conn.execute("DELETE FROM kv_store WHERE key = ?", (key,))
        conn.commit()
    finally:
        conn.close()


def import_values(data: dict) -> int:
    imported = 0
    conn = connect()
    try:
        for key, value in data.items():
            if isinstance(key, str) and key.startswith("hivePlanner.") and isinstance(value, str):
                _upsert_value(conn, key, value)
                imported += 1
        conn.commit()
    finally:
        conn.close()
    return imported
