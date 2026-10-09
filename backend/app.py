#!/usr/bin/env python3
"""Small local server for Yuan's Planner.

Run with:
  python3 backend/app.py

Then open:
  http://127.0.0.1:8765
"""

# This file is run directly with `python3 backend/app.py`, so importing the
# neighboring `db.py` module by name keeps the entry point beginner-friendly.

from __future__ import annotations

import json
import mimetypes
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from config import planner_db_path, planner_host, planner_port
from db import init_database
from openai_mascot import ask_mascot, openai_enabled
from planner_api import (
    ApiRequestError,
    delete_value_for_key,
    export_document,
    import_values_from_payload,
    put_value_from_payload,
    read_values_document,
)
from reminder_service import start_reminder_worker
from telegram_notifier import (
    send_telegram_message,
    telegram_status,
)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
HOST = planner_host()
PORT = planner_port()


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
        self.handle_read(include_body=True)

    def do_HEAD(self) -> None:
        self.handle_read(include_body=False)

    def handle_read(self, include_body: bool) -> None:
        path = urlparse(self.path).path
        if path == "/api/kv":
            self.send_json(read_values_document(), include_body=include_body)
            return
        if path == "/api/export":
            self.send_json(
                export_document(),
                headers={"Content-Disposition": 'attachment; filename="yuan-planner-backup.json"'},
                include_body=include_body,
            )
            return
        if path == "/api/mascot/status":
            self.send_json({"enabled": openai_enabled()}, include_body=include_body)
            return
        if path == "/api/telegram/status":
            self.send_json(telegram_status(), include_body=include_body)
            return
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        self.serve_static(path, include_body=include_body)

    def do_PUT(self) -> None:
        if urlparse(self.path).path != "/api/kv":
            self.send_error(404)
            return
        payload = self.read_json_body()
        try:
            response = put_value_from_payload(payload)
        except ApiRequestError as error:
            self.send_error(400, str(error))
            return
        self.send_json(response)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/import":
            payload = self.read_json_body()
            try:
                response = import_values_from_payload(payload)
            except ApiRequestError as error:
                self.send_error(400, str(error))
                return
            self.send_json(response)
            return
        if path == "/api/mascot/chat":
            payload = self.read_json_body()
            question = payload.get("question")
            context = payload.get("context")
            if not isinstance(question, str) or not question.strip():
                self.send_error(400, "Question is required")
                return
            if not isinstance(context, dict):
                self.send_error(400, "Context must be an object")
                return
            try:
                reply = ask_mascot(question.strip(), context)
                print("[mascot] ok source=%s answer=%r" % (reply.get("source", ""), reply.get("answer", "")[:160]))
            except Exception as error:
                print("[mascot] error %s" % error)
                self.send_json({"ok": False, "fallback": True, "error": str(error)}, status=503)
                return
            self.send_json({"ok": True, "reply": reply})
            return
        if path == "/api/telegram/test":
            try:
                send_telegram_message("Yuan's Planner test notification.")
            except Exception as error:
                self.send_json({"ok": False, "error": str(error)}, status=503)
                return
            self.send_json({"ok": True})
            return
        self.send_error(404)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/kv":
            self.send_error(404)
            return
        key = parse_qs(parsed.query).get("key", [""])[0]
        try:
            response = delete_value_for_key(key)
        except ApiRequestError as error:
            self.send_error(400, str(error))
            return
        self.send_json(response)

    def serve_static(self, path: str, include_body: bool = True) -> None:
        if path == "/":
            path = "/index.html"
        relative = Path(unquote(path.lstrip("/")))
        target = (FRONTEND_DIR / relative).resolve()
        if FRONTEND_DIR not in target.parents and target != FRONTEND_DIR:
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
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        if include_body:
            self.wfile.write(body)

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

    def send_json(
        self,
        value: dict,
        headers: dict[str, str] | None = None,
        include_body: bool = True,
        status: int = 200,
    ) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if headers:
            for key, header_value in headers.items():
                self.send_header(key, header_value)
        self.end_headers()
        if include_body:
            self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print("[%s] %s" % (self.log_date_time_string(), format % args))


def main() -> None:
    init_database()
    server = ThreadingHTTPServer((HOST, PORT), PlannerHandler)
    start_reminder_worker()
    lan_ip = local_network_ip()
    print(f"Yuan's Planner listening at http://127.0.0.1:{PORT}")
    print(f"LAN URL: http://{lan_ip}:{PORT}")
    print(f"SQLite database: {planner_db_path()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Yuan's Planner...")
    finally:
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
