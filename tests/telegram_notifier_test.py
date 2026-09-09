import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys
from unittest import mock

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from telegram_notifier import (
    build_due_reminders,
    parse_event_time,
    reminder_key_for_entry,
)
from config import planner_timezone


class TelegramNotifierTests(unittest.TestCase):
    def test_structured_start_time_schedules_reminder(self) -> None:
        events = [{"id": "enrollment", "date": "2026-10-12", "title": "Enrollment",
                   "startTime": "10:00", "reminderOnly": True, "reminderMinutes": 15}]
        due = build_due_reminders(events, datetime(2026, 10, 12, 9, 45), "hivePlanner.events", "", "Event")
        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].event_id, "enrollment")

    def test_parse_event_time_reads_leading_clock_time(self) -> None:
        self.assertEqual(parse_event_time("18:30 Evening skate"), (18, 30))
        self.assertEqual(parse_event_time("930 Study block"), (9, 30))
        self.assertIsNone(parse_event_time("Evening skate"))

    def test_build_due_reminders_returns_unsent_due_event(self) -> None:
        now = datetime(2026, 8, 11, 17, 45)
        events = [
            {
                "id": "event-1",
                "date": "2026-08-11",
                "title": "18:00 Evening skate",
                "note": "Bring water",
                "reminderMinutes": 15,
            }
        ]

        due = build_due_reminders(events, now, "hivePlanner.events", "", "Event")

        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].event_id, "event-1")
        self.assertIn("Bring water", due[0].text)
        self.assertEqual(due[0].storage_key, "hivePlanner.events")

    def test_build_due_reminders_skips_already_sent_event(self) -> None:
        event = {
            "id": "event-1",
            "date": "2026-08-11",
            "title": "18:00 Evening skate",
            "reminderMinutes": 15,
        }
        event["reminderSentFor"] = reminder_key_for_entry(event, "")

        due = build_due_reminders([event], datetime(2026, 8, 11, 17, 45), "hivePlanner.events", "", "Event")

        self.assertEqual(due, [])

    def test_build_due_reminders_handles_direct_task_entries(self) -> None:
        tasks = [
            {
                "id": "task-1",
                "label": "Review planner reminder flow",
                "scheduledTime": "18:00-19:30",
                "reminderMinutes": 10,
            },
            {
                "id": "task-2",
                "label": "18:00 Imported from calendar",
                "sourceEventId": "event-9",
                "reminderMinutes": 10,
            },
        ]

        due = build_due_reminders(tasks, datetime(2026, 8, 11, 17, 50), "hivePlanner.dailyTasks.2026-08-11", "2026-08-11", "Task")

        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].event_id, "task-1")
        self.assertIn("Task", due[0].text)

    def test_build_due_reminders_allows_imported_task_override(self) -> None:
        tasks = [
            {
                "id": "task-3",
                "label": "Imported task override",
                "sourceEventId": "event-3",
                "useSourceEventReminder": False,
                "scheduledTime": "13:00-16:30",
                "reminderMinutes": 10,
            }
        ]

        due = build_due_reminders(tasks, datetime(2026, 8, 11, 12, 50), "hivePlanner.dailyTasks.2026-08-11", "2026-08-11", "Task")

        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].event_id, "task-3")

    def test_build_due_reminders_normalizes_utc_now_to_planner_timezone(self) -> None:
        events = [
            {
                "id": "event-utc",
                "date": "2026-08-12",
                "title": "10:00 Helsinki reminder",
                "reminderMinutes": 0,
            },
            {
                "id": "event-offset",
                "date": "2026-08-12",
                "title": "10:00 Helsinki reminder",
                "reminderMinutes": 15,
            }
        ]

        due = build_due_reminders(
            events,
            datetime.fromisoformat("2026-08-12T06:45:00+00:00"),
            "hivePlanner.events",
            "",
            "Event",
        )

        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].event_id, "event-offset")

    def test_invalid_planner_timezone_falls_back_to_builtin_utc(self) -> None:
        with mock.patch.dict("os.environ", {"YUAN_PLANNER_TIMEZONE": "Mars/Olympus_Mons"}, clear=False):
            zone = planner_timezone()
        self.assertIs(zone, timezone.utc)


if __name__ == "__main__":
    unittest.main()
