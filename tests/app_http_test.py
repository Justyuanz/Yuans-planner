"""Exercise the HTTP contract without real data or external integrations."""

import http.client
import json
import sys
import tempfile
import threading
import unittest
from html.parser import HTMLParser
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import app
import db


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
        quiet = mock.patch.object(app.PlannerHandler, "log_message")
        quiet.start()
        self.addCleanup(quiet.stop)
        server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.PlannerHandler)
        self.addCleanup(server.server_close)
        worker = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
        worker.start()
        self.addCleanup(worker.join)
        self.addCleanup(server.shutdown)
        self.port = server.server_port

    def request(self, method, path, payload=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            conn.request(method, path, body=None if payload is None else json.dumps(payload))
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
        self.assertEqual(exported, {"app": "Yuan's Planner", "version": 2, "data": {payload["key"]: payload["value"]}})
        self.assertEqual(self.request("DELETE", "/api/kv?key=hivePlanner.test")[0], 200)
        self.assertEqual(json.loads(self.request("POST", "/api/import", exported)[2]), {"ok": True, "imported": 1})
        self.assertEqual(json.loads(self.request("GET", "/api/kv")[2])["data"], exported["data"])

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

    def test_static_assets_head_and_missing_paths(self):
        status, headers, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(body, (app.FRONTEND_DIR / "index.html").read_bytes())
        parser = AssetParser()
        parser.feed(body.decode())
        self.assertTrue(parser.urls)
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
