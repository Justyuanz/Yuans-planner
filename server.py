#!/usr/bin/env python3
"""Tiny local server for Yuan's Planner.

Run with:
  python3 server.py

Then open:
  http://127.0.0.1:8765
"""

from __future__ import annotations

import json
import mimetypes
import socket
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "planner.db"
HOST = "0.0.0.0"
PORT = 8765


def connect() -> sqlite3.Connection:
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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def local_network_ip() -> str:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except OSError:
            return "127.0.0.1"


class PlannerHandler(BaseHTTPRequestHandler):
    server_version = "YuanPlanner/1.0"

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/kv":
            self.send_json({"data": self.read_all_values()})
            return
        if path == "/api/export":
            self.send_json(
                {
                    "app": "Yuan's Planner",
                    "version": 2,
                    "exportedAt": now_iso(),
                    "data": self.read_all_values(),
                },
                headers={"Content-Disposition": 'attachment; filename="yuan-planner-backup.json"'},
            )
            return
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        self.serve_static(path)

    def do_PUT(self) -> None:
        if urlparse(self.path).path != "/api/kv":
            self.send_error(404)
            return
        payload = self.read_json_body()
        key = payload.get("key")
        value = payload.get("value")
        if not isinstance(key, str) or not key.startswith("hivePlanner."):
            self.send_error(400, "Invalid planner key")
            return
        if not isinstance(value, str):
            self.send_error(400, "Value must be a string")
            return
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
        self.send_json({"ok": True})

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/import":
            self.send_error(404)
            return
        payload = self.read_json_body()
        data = payload.get("data")
        if not isinstance(data, dict):
            self.send_error(400, "Import data must be an object")
            return
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
        self.send_json({"ok": True, "imported": imported})

    def serve_static(self, path: str) -> None:
        if path == "/":
            path = "/index.html"
        relative = Path(unquote(path.lstrip("/")))
        target = (ROOT / relative).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_error(403)
            return
        if not target.is_file():
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_all_values(self) -> dict[str, str]:
        with connect() as connection:
            rows = connection.execute("SELECT key, value FROM kv_store ORDER BY key").fetchall()
        return {key: value for key, value in rows}

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        if not body:
            return {}
        try:
            parsed = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return {}
        return parsed if isinstance(parsed, dict) else {}

    def send_json(self, value: dict, headers: dict[str, str] | None = None) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if headers:
            for key, header_value in headers.items():
                self.send_header(key, header_value)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print("[%s] %s" % (self.log_date_time_string(), format % args))


def main() -> None:
    connect().close()
    server = ThreadingHTTPServer((HOST, PORT), PlannerHandler)
    lan_ip = local_network_ip()
    print(f"Yuan's Planner running on this laptop at http://127.0.0.1:{PORT}")
    print(f"Same-Wi-Fi phone URL: http://{lan_ip}:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
