"""Planner storage API contract tests backed by a disposable database."""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import db
import planner_api


class PlannerApiTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        patch = mock.patch.object(db, "DB_PATH", Path(directory.name) / "planner.db")
        patch.start()
        self.addCleanup(patch.stop)

    def test_value_lifecycle_and_export_preserve_raw_strings(self):
        value = '{"message":"Hello, 世界","unknown":{"keep":true}}'

        self.assertEqual(planner_api.read_values_document(), {"data": {}})
        self.assertEqual(
            planner_api.put_value_from_payload({"key": "hivePlanner.test", "value": value}),
            {"ok": True},
        )
        self.assertEqual(planner_api.read_values_document(), {"data": {"hivePlanner.test": value}})
        self.assertEqual(
            planner_api.export_document(),
            {
                "app": "Yuan's Planner",
                "version": 2,
                "data": {"hivePlanner.test": value},
            },
        )
        self.assertEqual(planner_api.delete_value_for_key("hivePlanner.test"), {"ok": True})
        self.assertEqual(planner_api.read_values_document(), {"data": {}})

    def test_put_rejects_invalid_keys_and_non_string_values(self):
        cases = [
            ({"key": "invalid", "value": "x"}, "Invalid planner key"),
            ({"key": 123, "value": "x"}, "Invalid planner key"),
            ({"key": "hivePlanner.test", "value": []}, "Value must be a string"),
        ]

        for payload, message in cases:
            with self.subTest(payload=payload):
                with self.assertRaisesRegex(planner_api.ApiRequestError, message):
                    planner_api.put_value_from_payload(payload)
        self.assertEqual(db.read_all_values(), {})

    def test_import_requires_an_object_and_keeps_merge_filtering(self):
        planner_api.put_value_from_payload({"key": "hivePlanner.keep", "value": "before"})

        with self.assertRaisesRegex(planner_api.ApiRequestError, "Import data must be an object"):
            planner_api.import_values_from_payload({"data": []})

        response = planner_api.import_values_from_payload(
            {
                "data": {
                    "hivePlanner.new": "new",
                    "other.key": "ignored",
                    "hivePlanner.invalid": [],
                }
            }
        )
        self.assertEqual(response, {"ok": True, "imported": 1})
        self.assertEqual(
            planner_api.read_values_document(),
            {"data": {"hivePlanner.keep": "before", "hivePlanner.new": "new"}},
        )

    def test_delete_rejects_non_planner_keys_without_changing_data(self):
        planner_api.put_value_from_payload({"key": "hivePlanner.keep", "value": "value"})

        for key in ["", "invalid", 123]:
            with self.subTest(key=key):
                with self.assertRaisesRegex(planner_api.ApiRequestError, "Invalid planner key"):
                    planner_api.delete_value_for_key(key)
        self.assertEqual(planner_api.read_values_document(), {"data": {"hivePlanner.keep": "value"}})


if __name__ == "__main__":
    unittest.main()
