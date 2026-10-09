"""Load, deliver, and persist due Planner reminders."""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone
from typing import Any

from config import planner_timezone
from db import put_value, read_all_values
from telegram_notifier import (
    DAILY_TASKS_PREFIX,
    EVENTS_KEY,
    DueReminder,
    build_due_reminders,
    send_telegram_message,
)


REMINDER_POLL_SECONDS = 30


def datetime_now_local() -> datetime:
    return datetime.now(planner_timezone())


def datetime_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def decode_stored_list(raw_value: str) -> list[Any] | None:
    try:
        value = json.loads(raw_value)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, list) else None


def valid_entry_records(entries: list[Any]) -> list[dict[str, Any]]:
    # Keep malformed records in the stored list, but never pass them to reminder logic.
    return [entry for entry in entries if isinstance(entry, dict)]


def collect_due_reminders(
    values: dict[str, str],
    now: datetime,
) -> tuple[dict[str, list[Any]], list[DueReminder]]:
    tracked_lists: dict[str, list[Any]] = {}
    reminders: list[DueReminder] = []

    events = decode_stored_list(values.get(EVENTS_KEY, "[]"))
    if events is not None:
        tracked_lists[EVENTS_KEY] = events
        reminders.extend(build_due_reminders(valid_entry_records(events), now, EVENTS_KEY, "", "Event"))

    for key, raw_value in values.items():
        if not key.startswith(DAILY_TASKS_PREFIX):
            continue
        tasks = decode_stored_list(raw_value)
        if tasks is None:
            continue
        date_text = key[len(DAILY_TASKS_PREFIX):]
        tracked_lists[key] = tasks
        reminders.extend(build_due_reminders(valid_entry_records(tasks), now, key, date_text, "Task"))

    return tracked_lists, reminders


def group_reminders_by_storage(
    reminders: list[DueReminder],
) -> dict[str, dict[str, DueReminder]]:
    grouped: dict[str, dict[str, DueReminder]] = {}
    for reminder in reminders:
        grouped.setdefault(reminder.storage_key, {})[reminder.event_id] = reminder
    return grouped


def deliver_due_telegram_reminders() -> int:
    tracked_lists, reminders = collect_due_reminders(read_all_values(), datetime_now_local())
    if not reminders:
        return 0

    reminders_by_storage = group_reminders_by_storage(reminders)
    sent_count = 0
    for storage_key, entries in tracked_lists.items():
        reminders_by_id = reminders_by_storage.get(storage_key, {})
        changed = False
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            reminder = reminders_by_id.get(str(entry.get("id") or ""))
            if not reminder:
                continue
            send_telegram_message(reminder.text)
            entry["reminderSentAt"] = datetime_now_utc()
            entry["reminderSentFor"] = reminder.reminder_key
            changed = True
            sent_count += 1
        if changed:
            put_value(storage_key, json.dumps(entries))

    return sent_count


def reminder_worker() -> None:
    while True:
        try:
            sent = deliver_due_telegram_reminders()
            if sent:
                print(f"[telegram] sent {sent} reminder(s)")
        except Exception as error:
            print(f"[telegram] error {error}")
        time.sleep(REMINDER_POLL_SECONDS)


def start_reminder_worker() -> None:
    worker = threading.Thread(target=reminder_worker, name="telegram-reminders", daemon=True)
    worker.start()
