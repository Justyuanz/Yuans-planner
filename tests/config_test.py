"""Protect runtime configuration defaults and normalization."""

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import planner_frontend_mode


class ConfigTests(unittest.TestCase):
    def test_frontend_mode_defaults_to_react(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(planner_frontend_mode(), "react")

    def test_frontend_mode_normalizes_supported_values(self) -> None:
        for configured, expected in [
            (" React ", "react"),
            ("LEGACY", "legacy"),
        ]:
            with self.subTest(configured=configured):
                with mock.patch.dict(
                    os.environ,
                    {"YUAN_PLANNER_FRONTEND_MODE": configured},
                    clear=True,
                ):
                    self.assertEqual(planner_frontend_mode(), expected)

    def test_frontend_mode_falls_back_to_react_for_unknown_values(self) -> None:
        with mock.patch.dict(
            os.environ,
            {"YUAN_PLANNER_FRONTEND_MODE": "unsupported"},
            clear=True,
        ):
            self.assertEqual(planner_frontend_mode(), "react")


if __name__ == "__main__":
    unittest.main()
