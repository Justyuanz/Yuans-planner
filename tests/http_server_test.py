"""Exercise the HTTP contract without real data or external integrations."""

import http.client
import json
import sys
import tempfile
import threading
import unittest
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import db
import http_server


FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "planner-v2-compatibility.json"


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.urls.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.urls.append(attrs["href"])


class HttpTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        patch = mock.patch.object(db, "DB_PATH", Path(directory.name) / "planner.db")
        patch.start()
        self.addCleanup(patch.stop)
        quiet = mock.patch.object(http_server.PlannerHandler, "log_message")
        quiet.start()
        self.addCleanup(quiet.stop)
        server = ThreadingHTTPServer(("127.0.0.1", 0), http_server.PlannerHandler)
        self.addCleanup(server.server_close)
        worker = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
        worker.start()
        self.addCleanup(worker.join)
        self.addCleanup(server.shutdown)
        self.port = server.server_port

    def request(self, method, path, payload=None):
        body = None if payload is None else json.dumps(payload)
        return self.request_raw(method, path, body)

    def request_raw(self, method, path, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            conn.request(method, path, body=body)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_persistence_export_import_and_delete(self):
        self.assertEqual(json.loads(self.request("GET", "/api/kv")[2]), {"data": {}})
        payload = {"key": "hivePlanner.test", "value": "Hello, 世界"}
        self.assertEqual(self.request("PUT", "/api/kv", payload)[0], 200)
        status, headers, body = self.request("GET", "/api/export")
        self.assertEqual(status, 200)
        self.assertIn("yuan-planner-backup.json", headers["Content-Disposition"])
        exported = json.loads(body)
        self.assertEqual(
            exported,
            {
                "app": "Yuan's Planner",
                "version": 2,
                "data": {payload["key"]: payload["value"]},
            },
        )
        self.assertEqual(self.request("DELETE", "/api/kv?key=hivePlanner.test")[0], 200)
        self.assertEqual(
            json.loads(self.request("POST", "/api/import", exported)[2]),
            {"ok": True, "imported": 1},
        )
        self.assertEqual(json.loads(self.request("GET", "/api/kv")[2])["data"], exported["data"])

    def test_version_2_fixture_round_trips_without_data_shape_loss(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

        status, _, body = self.request("POST", "/api/import", fixture)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"ok": True, "imported": len(fixture["data"])})

        status, _, body = self.request("GET", "/api/export")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["data"], fixture["data"])

    def test_invalid_writes_do_not_change_data(self):
        for method, path, payload in [
            ("PUT", "/api/kv", {"key": "invalid", "value": "x"}),
            ("PUT", "/api/kv", {"key": "hivePlanner.test", "value": []}),
            ("POST", "/api/import", {"data": []}),
            ("DELETE", "/api/kv?key=invalid", None),
        ]:
            with self.subTest(method=method, payload=payload):
                self.assertEqual(self.request(method, path, payload)[0], 400)
        self.assertEqual(db.read_all_values(), {})

    def test_malformed_json_returns_one_parse_error_without_writing(self):
        for method, path, body in [
            ("PUT", "/api/kv", "{"),
            ("POST", "/api/import", "{"),
            ("POST", "/api/mascot/chat", "{"),
            ("POST", "/api/mascot/chat", b"\xff"),
        ]:
            with self.subTest(method=method, path=path):
                status, _, response_body = self.request_raw(method, path, body)
                self.assertEqual(status, 400)
                self.assertIn(b"Invalid JSON", response_body)
        self.assertEqual(db.read_all_values(), {})

    def test_integration_status_endpoints_return_their_current_state(self):
        telegram_state = {"enabled": True, "configured": True, "chatHint": "...1234"}
        with (
            mock.patch.object(http_server, "openai_enabled", return_value=True),
            mock.patch.object(http_server, "telegram_status", return_value=telegram_state),
        ):
            mascot_status = self.request("GET", "/api/mascot/status")
            telegram_status = self.request("GET", "/api/telegram/status")

        self.assertEqual(mascot_status[0], 200)
        self.assertEqual(json.loads(mascot_status[2]), {"enabled": True})
        self.assertEqual(telegram_status[0], 200)
        self.assertEqual(json.loads(telegram_status[2]), telegram_state)

    def test_mascot_chat_validates_payload_and_trims_the_question(self):
        for payload, message in [
            ({"context": {}}, b"Question is required"),
            ({"question": "   ", "context": {}}, b"Question is required"),
            ({"question": "Help", "context": []}, b"Context must be an object"),
        ]:
            with self.subTest(payload=payload):
                status, _, body = self.request("POST", "/api/mascot/chat", payload)
                self.assertEqual(status, 400)
                self.assertIn(message, body)

        reply = {
            "answer": "Start with the first task.",
            "evidence": ["One task is open."],
            "source": "openai",
        }
        with (
            mock.patch.object(http_server, "ask_mascot", return_value=reply) as ask_mascot,
            mock.patch("builtins.print"),
        ):
            status, _, body = self.request(
                "POST",
                "/api/mascot/chat",
                {"question": "  What next?  ", "context": {"dayState": "okay"}},
            )

        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"ok": True, "reply": reply})
        ask_mascot.assert_called_once_with("What next?", {"dayState": "okay"})

    def test_mascot_chat_returns_a_503_fallback_when_generation_fails(self):
        with (
            mock.patch.object(
                http_server,
                "ask_mascot",
                side_effect=RuntimeError("offline"),
            ),
            mock.patch("builtins.print"),
        ):
            status, _, body = self.request(
                "POST",
                "/api/mascot/chat",
                {"question": "What next?", "context": {}},
            )

        self.assertEqual(status, 503)
        self.assertEqual(
            json.loads(body),
            {"ok": False, "fallback": True, "error": "offline"},
        )

    def test_telegram_test_reports_delivery_success_and_failure(self):
        with mock.patch.object(http_server, "send_telegram_message") as send_message:
            status, _, body = self.request("POST", "/api/telegram/test", {})

        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"ok": True})
        send_message.assert_called_once_with("Yuan's Planner test notification.")

        with mock.patch.object(
            http_server,
            "send_telegram_message",
            side_effect=RuntimeError("not configured"),
        ):
            status, _, body = self.request("POST", "/api/telegram/test", {})

        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body), {"ok": False, "error": "not configured"})

    def test_unknown_api_routes_return_not_found(self):
        for method in ["GET", "HEAD", "POST", "PUT", "DELETE"]:
            with self.subTest(method=method):
                status, _, _ = self.request(method, "/api/missing", {})
                self.assertEqual(status, 404)

    def test_static_assets_head_and_missing_paths(self):
        status, headers, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(body, (http_server.FRONTEND_DIR / "index.html").read_bytes())
        parser = AssetParser()
        parser.feed(body.decode())
        self.assertTrue(parser.urls)
        storage_script = next(
            url for url in parser.urls if url.startswith("/js/storage-core.js")
        )
        activity_categories_script = next(
            url for url in parser.urls if url.startswith("/js/activity-categories.js")
        )
        calendar_task_script = next(
            url for url in parser.urls if url.startswith("/js/calendar-task-sync.js")
        )
        app_script = next(url for url in parser.urls if url.startswith("/js/app.js"))
        self.assertLess(parser.urls.index(storage_script), parser.urls.index(app_script))
        self.assertLess(parser.urls.index(activity_categories_script), parser.urls.index(app_script))
        self.assertLess(parser.urls.index(calendar_task_script), parser.urls.index(app_script))
        for url in ["/"] + parser.urls:
            with self.subTest(url=url):
                status, headers, body = self.request("GET", url)
                self.assertEqual(status, 200)
                head_status, head_headers, head_body = self.request("HEAD", url)
                self.assertEqual(head_status, 200)
                self.assertEqual(head_body, b"")
                self.assertEqual(head_headers["Content-Length"], str(len(body)))
                self.assertEqual(head_headers["Content-Type"], headers["Content-Type"])
        self.assertEqual(self.request("GET", "/favicon.ico")[0], 204)
        self.assertEqual(self.request("GET", "/missing-file")[0], 404)
        self.assertEqual(self.request("GET", "/%2e%2e/backend/config.py")[0], 403)
