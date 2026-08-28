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
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from config import planner_db_path, planner_host, planner_port, planner_timezone
from db import delete_value, import_values, init_database, put_value, read_all_values
from openai_mascot import ask_mascot, openai_enabled
from telegram_notifier import (
    DAILY_TASKS_PREFIX,
    EVENTS_KEY,
    WATER_REMINDER_KEY,
    build_due_reminders,
    build_due_water_reminders,
    normalize_water_settings,
    send_telegram_message,
    telegram_status,
)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
HOST = planner_host()
PORT = planner_port()
REMINDER_POLL_SECONDS = 30


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
            self.send_json({"data": read_all_values()}, include_body=include_body)
            return
        if path == "/api/export":
            self.send_json(
                {
                    "app": "Yuan's Planner",
                    "version": 2,
                    "data": read_all_values(),
                },
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
        key = payload.get("key")
        value = payload.get("value")
        if not isinstance(key, str) or not key.startswith("hivePlanner."):
            self.send_error(400, "Invalid planner key")
            return
        if not isinstance(value, str):
            self.send_error(400, "Value must be a string")
            return
        put_value(key, value)
        self.send_json({"ok": True})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/import":
            payload = self.read_json_body()
            data = payload.get("data")
            if not isinstance(data, dict):
                self.send_error(400, "Import data must be an object")
                return
            imported = import_values(data)
            self.send_json({"ok": True, "imported": imported})
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
        if not isinstance(key, str) or not key.startswith("hivePlanner."):
            self.send_error(400, "Invalid planner key")
            return
        delete_value(key)
        self.send_json({"ok": True})

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


def datetime_now_local() -> datetime:
    return datetime.now(planner_timezone())


def datetime_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def deliver_due_telegram_reminders() -> int:
    values = read_all_values()
    date_now = datetime_now_local()
    tracked_lists: dict[str, list] = {}
    reminders = []

    raw_events = values.get(EVENTS_KEY, "[]")
    try:
        events = json.loads(raw_events)
    except json.JSONDecodeError:
        events = []
    if isinstance(events, list):
        tracked_lists[EVENTS_KEY] = events
        reminders.extend(build_due_reminders(events, now=date_now, storage_key=EVENTS_KEY, date_text="", kind_label="Event"))

    for key, raw_value in values.items():
        if not key.startswith(DAILY_TASKS_PREFIX):
            continue
        date_key = key[len(DAILY_TASKS_PREFIX):]
        try:
            tasks = json.loads(raw_value)
        except json.JSONDecodeError:
            continue
        if not isinstance(tasks, list):
            continue
        tracked_lists[key] = tasks
        reminders.extend(build_due_reminders(tasks, now=date_now, storage_key=key, date_text=date_key, kind_label="Task"))

    raw_water_settings = values.get(WATER_REMINDER_KEY, "{}")
    try:
        water_settings = json.loads(raw_water_settings)
    except json.JSONDecodeError:
        water_settings = {}
    if isinstance(water_settings, dict):
        reminders.extend(build_due_water_reminders(water_settings, now=date_now, storage_key=WATER_REMINDER_KEY))

    if not reminders:
        return 0

    reminders_by_storage = {}
    for reminder in reminders:
        if reminder.storage_key not in reminders_by_storage:
            reminders_by_storage[reminder.storage_key] = {}
        reminders_by_storage[reminder.storage_key][reminder.event_id] = reminder

    sent_count = 0
    for storage_key, entries in tracked_lists.items():
        by_id = reminders_by_storage.get(storage_key, {})
        changed = False
        for entry in entries:
            reminder = by_id.get(str(entry.get("id") or ""))
            if not reminder:
                continue
            send_telegram_message(reminder.text)
            entry["reminderSentAt"] = datetime_now_utc()
            entry["reminderSentFor"] = reminder.reminder_key
            changed = True
            sent_count += 1
        if changed:
            put_value(storage_key, json.dumps(entries))

    water_reminders = reminders_by_storage.get(WATER_REMINDER_KEY, {})
    if water_reminders:
        changed = False
        water_settings = normalize_water_settings(water_settings)
        for slot_id, reminder in water_reminders.items():
            send_telegram_message(reminder.text)
            water_settings["sentForBySlot"][slot_id] = reminder.reminder_key
            changed = True
            sent_count += 1
        if changed:
            put_value(WATER_REMINDER_KEY, json.dumps(water_settings))
    return sent_count


def reminder_worker() -> None:
    while True:
        try:
            sent = deliver_due_telegram_reminders()
            if sent:
                print(f"[telegram] sent {sent} reminder(s)")
        except Exception as error:
            print(f"[telegram] error {error}")
        time.sleep(REMINDER_POLL_SECONDS)


def start_reminder_worker() -> None:
    worker = threading.Thread(target=reminder_worker, name="telegram-reminders", daemon=True)
    worker.start()


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
