"""Protect runtime configuration defaults and normalization."""

import os
import sys
import unittest
from datetime import timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import (
    PROJECT_ROOT,
    openai_timeout_seconds,
    planner_db_path,
    planner_timezone,
    planner_timezone_name,
    telegram_enabled,
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

    def test_timezone_defaults_and_trims_its_name(self) -> None:
        for configured, expected in [
            ({}, "Europe/Helsinki"),
            ({"YUAN_PLANNER_TIMEZONE": "  "}, "Europe/Helsinki"),
            ({"YUAN_PLANNER_TIMEZONE": " Europe/Berlin "}, "Europe/Berlin"),
        ]:
            with self.subTest(configured=configured):
                with mock.patch.dict(os.environ, configured, clear=True):
                    self.assertEqual(planner_timezone_name(), expected)

    def test_unknown_timezone_falls_back_to_utc(self) -> None:
        with mock.patch.dict(os.environ, {"YUAN_PLANNER_TIMEZONE": "Mars/Olympus"}, clear=True):
            self.assertEqual(planner_timezone(), timezone.utc)

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

    def test_telegram_is_disabled_unless_explicitly_enabled(self) -> None:
        for configured, expected in [
            ({}, False),
            ({"YUAN_PLANNER_TELEGRAM_ENABLED": "0"}, False),
            ({"YUAN_PLANNER_TELEGRAM_ENABLED": "maybe"}, False),
            ({"YUAN_PLANNER_TELEGRAM_ENABLED": " TRUE "}, True),
            ({"YUAN_PLANNER_TELEGRAM_ENABLED": "on"}, True),
            ({"YUAN_PLANNER_TELEGRAM_ENABLED": "1"}, True),
        ]:
            with self.subTest(configured=configured):
                with mock.patch.dict(os.environ, configured, clear=True):
                    self.assertEqual(telegram_enabled(), expected)


if __name__ == "__main__":
    unittest.main()
