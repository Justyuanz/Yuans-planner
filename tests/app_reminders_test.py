import json
import unittest
from pathlib import Path
import sys
from unittest import mock

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app as planner_app


class DeliverDueTelegramRemindersTests(unittest.TestCase):
    def test_ignores_legacy_water_settings_and_sends_due_task(self) -> None:
        values = {
            "hivePlanner.dailyTasks.2026-08-29": json.dumps([
                {
                    "id": "task-1",
                    "label": "Planner follow-up",
                    "scheduledTime": "18:00",
                    "reminderMinutes": 10,
                }
            ]),
            "hivePlanner.telegramWater.settings": json.dumps({
                "enabled": True,
                "times": ["12:30", "17:00"],
                "sentForBySlot": {},
            }),
        }

        with mock.patch.object(planner_app, "read_all_values", return_value=values), \
             mock.patch.object(planner_app, "datetime_now_local", return_value=planner_app.datetime(2026, 8, 29, 17, 50)), \
             mock.patch.object(planner_app, "datetime_now_utc", return_value="2026-08-29T14:50:00Z"), \
             mock.patch.object(planner_app, "send_telegram_message") as send_message, \
             mock.patch.object(planner_app, "put_value") as put_value:
            sent_count = planner_app.deliver_due_telegram_reminders()

        self.assertEqual(sent_count, 1)
        send_message.assert_called_once()
        put_value.assert_called_once()
        storage_key, payload = put_value.call_args.args
        self.assertEqual(storage_key, "hivePlanner.dailyTasks.2026-08-29")
        saved_entries = json.loads(payload)
        self.assertEqual(saved_entries[0]["reminderSentFor"], "task-1|2026-08-29T18:00+03:00|10")


if __name__ == "__main__":
    unittest.main()
