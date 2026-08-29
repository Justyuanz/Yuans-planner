"""Telegram reminder delivery for timed planner events and tasks."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from urllib import error, request

from config import planner_timezone, telegram_bot_token, telegram_chat_id, telegram_enabled


EVENTS_KEY = "hivePlanner.events"
DAILY_TASKS_PREFIX = "hivePlanner.dailyTasks."

@dataclass
class DueReminder:
    storage_key: str
    event_id: str
    reminder_key: str
    text: str


def parse_event_time(title: str) -> tuple[int, int] | None:
    text = str(title or "").strip()
    if not text:
        return None
    digits = []
    for char in text:
        if char.isdigit() or char == ":":
            digits.append(char)
            continue
        if char in {" ", "-", "–"} and digits:
            break
        if digits:
            break
        return None
    if not digits:
        return None
    token = "".join(digits)
    if ":" in token:
        hour_text, minute_text = token.split(":", 1)
    elif len(token) > 2:
        hour_text, minute_text = token[:-2], token[-2:]
    else:
        hour_text, minute_text = token, "0"
    try:
        hour = int(hour_text)
        minute = int(minute_text)
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return hour, minute


def normalize_reminder_minutes(value: Any) -> int:
    try:
        minutes = int(value)
    except (TypeError, ValueError):
        return 0
    return minutes if minutes > 0 else 0


def parse_clock_time(value: Any) -> tuple[int, int] | None:
    text = str(value or "").strip()
    if not text:
        return None
    normalized = text.replace("–", "-").replace("—", "-")
    normalized = normalized.replace(" to ", "-").replace(" TO ", "-")
    first = normalized.split("-", 1)[0].strip()
    if ":" not in first:
        return parse_event_time(first)
    parts = first.split(":", 1)
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return hour, minute


def format_clock_time(parts: tuple[int, int] | None) -> str:
    if not parts:
        return ""
    return f"{parts[0]:02d}:{parts[1]:02d}"


def entry_start_datetime(entry: dict[str, Any], date_text: str) -> datetime | None:
    date_text = date_text or str(entry.get("date") or "").strip()
    time_parts = parse_clock_time(entry.get("scheduledTime")) or parse_event_time(str(entry.get("title") or entry.get("label") or ""))
    if not date_text or not time_parts:
        return None
    try:
        date_value = datetime.strptime(date_text, "%Y-%m-%d")
    except ValueError:
        return None
    return date_value.replace(hour=time_parts[0], minute=time_parts[1], second=0, microsecond=0, tzinfo=planner_timezone())


def normalize_now(now: datetime) -> datetime:
    if now.tzinfo is None:
        return now.replace(tzinfo=planner_timezone())
    return now.astimezone(planner_timezone())


def reminder_key_for_entry(entry: dict[str, Any], date_text: str) -> str | None:
    start_at = entry_start_datetime(entry, date_text)
    reminder_minutes = normalize_reminder_minutes(entry.get("reminderMinutes"))
    if not start_at or reminder_minutes <= 0:
        return None
    return "|".join(
        [
            str(entry.get("id") or ""),
            start_at.isoformat(timespec="minutes"),
            str(reminder_minutes),
        ]
    )


def format_reminder_label(reminder_minutes: int) -> str:
    if reminder_minutes % 1440 == 0:
        days = reminder_minutes // 1440
        return f"{days} day" + ("s" if days != 1 else "")
    if reminder_minutes % 60 == 0:
        hours = reminder_minutes // 60
        return f"{hours} hour" + ("s" if hours != 1 else "")
    return f"{reminder_minutes} minutes"


def build_due_reminders(entries: list[dict[str, Any]], now: datetime, storage_key: str, date_text: str, kind_label: str) -> list[DueReminder]:
    now = normalize_now(now)
    due: list[DueReminder] = []
    for entry in entries:
        if kind_label == "Task" and entry.get("sourceEventId") and entry.get("useSourceEventReminder", True) is not False:
            continue
        reminder_key = reminder_key_for_entry(entry, date_text)
        if not reminder_key:
            continue
        if str(entry.get("reminderSentFor") or "") == reminder_key:
            continue
        start_at = entry_start_datetime(entry, date_text)
        reminder_minutes = normalize_reminder_minutes(entry.get("reminderMinutes"))
        if not start_at or reminder_minutes <= 0:
            continue
        remind_at = start_at - timedelta(minutes=reminder_minutes)
        if now < remind_at or now > start_at + timedelta(hours=6):
            continue
        title = str(entry.get("title") or entry.get("label") or ("Untitled " + kind_label.lower())).strip() or ("Untitled " + kind_label.lower())
        note = str(entry.get("note") or "").strip()
        lines = [
            "Planner reminder",
            kind_label,
            title,
            f"When: {start_at.strftime('%Y-%m-%d %H:%M')}",
            f"Reminder: {format_reminder_label(reminder_minutes)} before",
        ]
        if note:
            lines.append(f"Note: {note}")
        due.append(
            DueReminder(
                storage_key=storage_key,
                event_id=str(entry.get("id") or ""),
                reminder_key=reminder_key,
                text="\n".join(lines),
            )
        )
    return due
def send_telegram_message(text: str) -> None:
    token = telegram_bot_token()
    chat_id = telegram_chat_id()
    if not telegram_enabled() or not token or not chat_id:
        raise RuntimeError("Telegram notifications are not configured.")
    payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    endpoint = f"https://api.telegram.org/bot{token}/sendMessage"
    req = request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            error_body = ""
        detail = error_body.strip() or str(exc)
        raise RuntimeError(f"Telegram delivery failed: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Telegram delivery failed: {exc}") from exc
    parsed = json.loads(body)
    if not parsed.get("ok"):
        raise RuntimeError("Telegram delivery failed.")


def telegram_status() -> dict[str, Any]:
    chat_id = telegram_chat_id()
    return {
        "enabled": telegram_enabled(),
        "configured": bool(telegram_bot_token() and chat_id),
        "chatHint": ("..." + chat_id[-4:]) if len(chat_id) >= 4 else chat_id,
    }
