"""Protect runtime configuration defaults and normalization."""

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import (
    PROJECT_ROOT,
    openai_timeout_seconds,
    planner_db_path,
)


class ConfigTests(unittest.TestCase):
    def test_database_path_defaults_inside_the_project(self) -> None:
        for configured in ["", "   "]:
            with self.subTest(configured=configured):
                with mock.patch.dict(
                    os.environ,
                    {"YUAN_PLANNER_DB_PATH": configured},
                    clear=True,
                ):
                    self.assertEqual(planner_db_path(), PROJECT_ROOT / "data" / "planner.db")

    def test_database_path_resolves_relative_and_absolute_overrides(self) -> None:
        with mock.patch.dict(os.environ, {"YUAN_PLANNER_DB_PATH": "data/other.db"}, clear=True):
            self.assertEqual(planner_db_path(), PROJECT_ROOT / "data" / "other.db")
        with mock.patch.dict(os.environ, {"YUAN_PLANNER_DB_PATH": "/tmp/planner.db"}, clear=True):
            self.assertEqual(planner_db_path(), Path("/tmp/planner.db"))

    def test_openai_timeout_clamps_and_rejects_invalid_values(self) -> None:
        for configured, expected in [
            ({}, 20),
            ({"YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS": "1"}, 5),
            ({"YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS": "120"}, 60),
            ({"YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS": "30"}, 30),
            ({"YUAN_PLANNER_OPENAI_TIMEOUT_SECONDS": "not-a-number"}, 20),
        ]:
            with self.subTest(configured=configured):
                with mock.patch.dict(os.environ, configured, clear=True):
                    self.assertEqual(openai_timeout_seconds(), expected)

if __name__ == "__main__":
    unittest.main()
