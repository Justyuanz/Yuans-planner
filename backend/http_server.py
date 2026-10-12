"""HTTP transport and static-file delivery for Yuan's Planner."""

from __future__ import annotations

import json
import mimetypes
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from openai_mascot import ask_mascot, openai_enabled
from planner_api import (
    ApiRequestError,
    delete_value_for_key,
    export_document,
    import_values_from_payload,
    put_value_from_payload,
    read_values_document,
)
from telegram_notifier import send_telegram_message, telegram_status


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend" / "dist"


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
        if path == "/api" or path.startswith("/api/"):
            self.send_error(404)
            return
        self.serve_static(path, include_body=include_body)

    def do_PUT(self) -> None:
        if urlparse(self.path).path != "/api/kv":
            self.send_error(404)
            return
        payload = self.read_json_body()
        if payload is None:
            return
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
            if payload is None:
                return
            try:
                response = import_values_from_payload(payload)
            except ApiRequestError as error:
                self.send_error(400, str(error))
                return
            self.send_json(response)
            return
        if path == "/api/mascot/chat":
            payload = self.read_json_body()
            if payload is None:
                return
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
                print(
                    "[mascot] ok source=%s answer=%r"
                    % (reply.get("source", ""), reply.get("answer", "")[:160])
                )
            except Exception as error:
                print("[mascot] error %s" % error)
                self.send_json(
                    {"ok": False, "fallback": True, "error": str(error)},
                    status=503,
                )
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
        index_path = FRONTEND_DIR / "index.html"
        if not index_path.is_file():
            self.send_error(503, "Frontend build is missing")
            return

        requested_path = "/index.html" if path == "/" else path
        target = self.resolve_static_target(FRONTEND_DIR, requested_path)
        if target is None:
            return
        if target.is_file():
            self.send_static_file(target, include_body)
            return

        if Path(unquote(path)).suffix:
            self.send_error(404)
            return
        self.send_static_file(index_path, include_body)

    def resolve_static_target(self, root: Path, path: str) -> Path | None:
        relative = Path(unquote(path.lstrip("/")))
        resolved_root = root.resolve()
        target = (resolved_root / relative).resolve()
        if resolved_root not in target.parents and target != resolved_root:
            self.send_error(403)
            return None
        return target

    def send_static_file(self, target: Path, include_body: bool) -> None:
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

    def read_json_body(self) -> dict | None:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        if not body:
            return {}
        try:
            parsed = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400, "Invalid JSON")
            return None
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
