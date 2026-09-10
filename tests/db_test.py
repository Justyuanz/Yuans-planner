"""Persistence regression tests; every test uses a disposable database."""

import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import db


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "nested" / "planner.db"
        patch = mock.patch.object(db, "DB_PATH", self.path)
        patch.start()
        self.addCleanup(patch.stop)

    def test_create_update_delete_and_reopen(self):
        db.init_database()
        self.assertEqual(db.read_all_values(), {})
        with mock.patch.object(db, "now_iso", return_value="first"):
            db.put_value("hivePlanner.journal", "Hello, 世界")
        with mock.patch.object(db, "now_iso", return_value="second"):
            db.put_value("hivePlanner.journal", "Updated")
        db.init_database()
        self.assertEqual(db.read_all_values(), {"hivePlanner.journal": "Updated"})
        with closing(sqlite3.connect(self.path)) as conn:
            self.assertEqual(conn.execute("SELECT updated_at FROM kv_store").fetchall(), [("second",)])
        db.delete_value("hivePlanner.missing")
        db.delete_value("hivePlanner.journal")
        self.assertEqual(db.read_all_values(), {})

    def test_import_filters_invalid_entries_and_merges_existing_values(self):
        db.put_value("hivePlanner.keep", "keep")
        db.put_value("hivePlanner.replace", "before")
        imported = db.import_values({
            "hivePlanner.replace": "after",
            "hivePlanner.new": "[]",
            "other.key": "ignored",
            "hivePlanner.invalid": [],
            123: "ignored",
        })
        self.assertEqual(imported, 2)
        self.assertEqual(db.read_all_values(), {
            "hivePlanner.keep": "keep",
            "hivePlanner.new": "[]",
            "hivePlanner.replace": "after",
        })

    def test_failed_import_rolls_back_the_entire_batch(self):
        db.put_value("hivePlanner.existing", "before")
        with mock.patch.object(db, "now_iso", side_effect=["first", RuntimeError("failed")]):
            with self.assertRaises(RuntimeError):
                db.import_values({"hivePlanner.existing": "after", "hivePlanner.new": "new"})
        self.assertEqual(db.read_all_values(), {"hivePlanner.existing": "before"})
