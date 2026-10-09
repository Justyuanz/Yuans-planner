import json
import sys
import unittest
from pathlib import Path
from unittest import mock

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import reminder_service


class DeliverDueTelegramRemindersTests(unittest.TestCase):
    def deliver(
        self,
        values: dict[str, str],
        now: str = "2026-08-29T17:50:00",
        sent_at: str = "2026-08-29T14:50:00Z",
    ) -> tuple[int, mock.MagicMock, mock.MagicMock]:
        with (
            mock.patch.object(reminder_service, "read_all_values", return_value=values),
            mock.patch.object(
                reminder_service,
                "datetime_now_local",
                return_value=reminder_service.datetime.fromisoformat(now),
            ),
            mock.patch.object(reminder_service, "datetime_now_utc", return_value=sent_at),
            mock.patch.object(reminder_service, "send_telegram_message") as send_message,
            mock.patch.object(reminder_service, "put_value") as put_value,
        ):
            sent_count = reminder_service.deliver_due_telegram_reminders()
        return sent_count, send_message, put_value

    def test_ignores_legacy_water_settings_and_sends_due_task(self) -> None:
        values = {
            "hivePlanner.dailyTasks.2026-08-29": json.dumps(
                [
                    {
                        "id": "task-1",
                        "label": "Planner follow-up",
                        "scheduledTime": "18:00",
                        "reminderMinutes": 10,
                    }
                ]
            ),
            "hivePlanner.telegramWater.settings": json.dumps(
                {
                    "enabled": True,
                    "times": ["12:30", "17:00"],
                    "sentForBySlot": {},
                }
            ),
        }

        sent_count, send_message, put_value = self.deliver(values)

        self.assertEqual(sent_count, 1)
        send_message.assert_called_once()
        put_value.assert_called_once()
        storage_key, payload = put_value.call_args.args
        self.assertEqual(storage_key, "hivePlanner.dailyTasks.2026-08-29")
        saved_entries = json.loads(payload)
        self.assertEqual(
            saved_entries[0]["reminderSentFor"],
            "task-1|2026-08-29T18:00+03:00|10",
        )

    def test_ignores_malformed_storage_roots_without_writing(self) -> None:
        values = {
            "hivePlanner.events": "not-json",
            "hivePlanner.dailyTasks.2026-08-29": "{}",
            "hivePlanner.dailyTasks.2026-08-30": "[",
            "hivePlanner.telegramWater.settings": "[]",
        }

        sent_count, send_message, put_value = self.deliver(values)

        self.assertEqual(sent_count, 0)
        send_message.assert_not_called()
        put_value.assert_not_called()

    def test_partial_send_failure_leaves_the_storage_key_unwritten_for_retry(self) -> None:
        values = {
            "hivePlanner.events": json.dumps(
                [
                    {
                        "id": "event-1",
                        "date": "2026-08-29",
                        "title": "18:00 First event",
                        "reminderMinutes": 10,
                    },
                    {
                        "id": "event-2",
                        "date": "2026-08-29",
                        "title": "18:05 Second event",
                        "reminderMinutes": 15,
                    },
                ]
            )
        }

        with (
            mock.patch.object(reminder_service, "read_all_values", return_value=values),
            mock.patch.object(
                reminder_service,
                "datetime_now_local",
                return_value=reminder_service.datetime(2026, 8, 29, 17, 50),
            ),
            mock.patch.object(
                reminder_service,
                "send_telegram_message",
                side_effect=[None, RuntimeError("offline")],
            ) as send_message,
            mock.patch.object(reminder_service, "put_value") as put_value,
        ):
            with self.assertRaisesRegex(RuntimeError, "offline"):
                reminder_service.deliver_due_telegram_reminders()

        self.assertEqual(send_message.call_count, 2)
        put_value.assert_not_called()

    def test_ignores_and_preserves_malformed_records_while_sending_valid_ones(self) -> None:
        malformed_records = [None, "legacy", 42]
        values = {
            "hivePlanner.events": json.dumps(
                malformed_records
                + [
                    {
                        "id": "due-event",
                        "date": "2026-08-29",
                        "title": "18:00 Due event",
                        "reminderMinutes": 10,
                    }
                ]
            )
        }

        sent_count, send_message, put_value = self.deliver(values)

        self.assertEqual(sent_count, 1)
        send_message.assert_called_once()
        saved_entries = json.loads(put_value.call_args.args[1])
        self.assertEqual(saved_entries[:3], malformed_records)
        self.assertEqual(saved_entries[3]["reminderSentAt"], "2026-08-29T14:50:00Z")

    def test_sends_only_due_unsent_records_and_preserves_other_entries(self) -> None:
        sent_event = {
            "id": "sent-event",
            "date": "2026-08-29",
            "title": "18:00 Already sent",
            "reminderMinutes": 10,
            "reminderSentFor": "sent-event|2026-08-29T18:00+03:00|10",
        }
        values = {
            "hivePlanner.events": json.dumps(
                [
                    {
                        "id": "due-event",
                        "date": "2026-08-29",
                        "title": "18:00 Due event",
                        "reminderMinutes": 10,
                        "unknown": {"keep": True},
                    },
                    {
                        "id": "future-event",
                        "date": "2026-08-29",
                        "title": "20:00 Future event",
                        "reminderMinutes": 10,
                    },
                    sent_event,
                    {
                        "id": "no-reminder",
                        "date": "2026-08-29",
                        "title": "18:00 No reminder",
                    },
                ]
            )
        }

        sent_count, send_message, put_value = self.deliver(values)

        self.assertEqual(sent_count, 1)
        send_message.assert_called_once()
        put_value.assert_called_once()
        saved_entries = json.loads(put_value.call_args.args[1])
        self.assertEqual(saved_entries[0]["unknown"], {"keep": True})
        self.assertEqual(saved_entries[0]["reminderSentAt"], "2026-08-29T14:50:00Z")
        self.assertNotIn("reminderSentAt", saved_entries[1])
        self.assertEqual(saved_entries[2], sent_event)
        self.assertNotIn("reminderSentAt", saved_entries[3])

    def test_batches_multiple_reminders_into_one_write_per_storage_key(self) -> None:
        values = {
            "hivePlanner.events": json.dumps(
                [
                    {
                        "id": "event-1",
                        "date": "2026-08-29",
                        "title": "18:00 First event",
                        "reminderMinutes": 10,
                    },
                    {
                        "id": "event-2",
                        "date": "2026-08-29",
                        "title": "18:05 Second event",
                        "reminderMinutes": 15,
                    },
                ]
            ),
            "hivePlanner.dailyTasks.2026-08-29": json.dumps(
                [
                    {
                        "id": "task-1",
                        "label": "First task",
                        "scheduledTime": "18:00",
                        "reminderMinutes": 10,
                    },
                    {
                        "id": "task-2",
                        "label": "Second task",
                        "scheduledTime": "18:05",
                        "reminderMinutes": 15,
                    },
                ]
            ),
        }

        sent_count, send_message, put_value = self.deliver(values)

        self.assertEqual(sent_count, 4)
        self.assertEqual(send_message.call_count, 4)
        self.assertEqual(put_value.call_count, 2)
        self.assertEqual(
            [call.args[0] for call in put_value.call_args_list],
            ["hivePlanner.events", "hivePlanner.dailyTasks.2026-08-29"],
        )
        for call in put_value.call_args_list:
            saved_entries = json.loads(call.args[1])
            self.assertTrue(all("reminderSentFor" in entry for entry in saved_entries))

    def test_send_failure_does_not_mark_or_persist_the_reminder(self) -> None:
        values = {
            "hivePlanner.events": json.dumps(
                [
                    {
                        "id": "event-1",
                        "date": "2026-08-29",
                        "title": "18:00 Event",
                        "reminderMinutes": 10,
                    }
                ]
            )
        }

        with (
            mock.patch.object(reminder_service, "read_all_values", return_value=values),
            mock.patch.object(
                reminder_service,
                "datetime_now_local",
                return_value=reminder_service.datetime(2026, 8, 29, 17, 50),
            ),
            mock.patch.object(
                reminder_service,
                "send_telegram_message",
                side_effect=RuntimeError("offline"),
            ),
            mock.patch.object(reminder_service, "put_value") as put_value,
        ):
            with self.assertRaisesRegex(RuntimeError, "offline"):
                reminder_service.deliver_due_telegram_reminders()

        put_value.assert_not_called()

    def test_worker_uses_the_30_second_poll_interval(self) -> None:
        with (
            mock.patch.object(
                reminder_service,
                "deliver_due_telegram_reminders",
                return_value=0,
            ) as deliver,
            mock.patch.object(reminder_service.time, "sleep", side_effect=StopIteration) as sleep,
        ):
            with self.assertRaises(StopIteration):
                reminder_service.reminder_worker()

        deliver.assert_called_once_with()
        sleep.assert_called_once_with(30)

    def test_worker_logs_delivery_errors_and_polls_again(self) -> None:
        with (
            mock.patch.object(
                reminder_service,
                "deliver_due_telegram_reminders",
                side_effect=[RuntimeError("offline"), 0],
            ) as deliver,
            mock.patch.object(
                reminder_service.time,
                "sleep",
                side_effect=[None, StopIteration],
            ) as sleep,
            mock.patch("builtins.print") as print_message,
        ):
            with self.assertRaises(StopIteration):
                reminder_service.reminder_worker()

        self.assertEqual(deliver.call_count, 2)
        self.assertEqual(sleep.call_args_list, [mock.call(30), mock.call(30)])
        print_message.assert_any_call("[telegram] error offline")

    def test_start_worker_uses_a_named_daemon_thread(self) -> None:
        with mock.patch.object(reminder_service.threading, "Thread") as thread_class:
            reminder_service.start_reminder_worker()

        thread_class.assert_called_once_with(
            target=reminder_service.reminder_worker,
            name="telegram-reminders",
            daemon=True,
        )
        thread_class.return_value.start.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
