"""Small OpenAI-backed mascot helper for grounded planner coaching."""

from __future__ import annotations

import json
from typing import Any
from urllib import error, request

from config import openai_api_key, openai_model, openai_timeout_seconds


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

SYSTEM_PROMPT = """You are the mascot inside Yuan's Planner, an ADHD-friendly life planner.

Your job:
- answer using the planner evidence you are given
- be specific, concrete, and calm
- name real numbers and real task labels when available
- suggest one practical next move when helpful
- never sound robotic, generic, judgmental, or fake-cheerful
- if the evidence is thin, say so honestly

Important style rules:
- keep the answer to 1-3 sentences
- end with one useful next step tied to the evidence when possible
- do not use therapy language
- do not praise randomly
- do not say "it seems" unless evidence is actually weak
- do not mention data that is zero or irrelevant
- avoid vague advice like "make it more concrete" unless you name what should be made concrete

Return JSON only with this shape:
{"answer":"string","evidence":["string","string"]}
"""


def openai_enabled() -> bool:
    return bool(openai_api_key().strip())


def compact_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "todaySummary": metrics.get("todaySummary") or {},
        "dailyTaskAverages": metrics.get("dailyTaskAverages") or {},
        "hourGapAverages": metrics.get("hourGapAverages") or {},
        "morningOverrun": metrics.get("morningOverrun") or {},
        "eveningLoad": metrics.get("eveningLoad") or {},
        "editFrequency": metrics.get("editFrequency") or {},
        "carryoverIndicators": metrics.get("carryoverIndicators") or {},
        "unscheduledTaskCounts": metrics.get("unscheduledTaskCounts") or {},
        "vagueTaskFriction": metrics.get("vagueTaskFriction") or {},
        "moneySummary": metrics.get("moneySummary") or {},
        "foodSpendingOnHighEditDays": metrics.get("foodSpendingOnHighEditDays") or {},
        "journalBehaviorOnOverloadedDays": metrics.get("journalBehaviorOnOverloadedDays") or {},
        "lateStudyCorrelation": metrics.get("lateStudyCorrelation") or {},
        "simpleMorningCorrelation": metrics.get("simpleMorningCorrelation") or {},
        "dailySummaries": (metrics.get("dailySummaries") or [])[-7:],
    }


def compact_skate(skate: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(skate, dict):
        return {}
    return {
        "todayPlan": skate.get("todayPlan") or {},
        "todayState": skate.get("todayState") or {},
        "priorities": (skate.get("priorities") or [])[:6],
        "recentSessions": (skate.get("recentSessions") or [])[:8],
        "supportThisWeek": (skate.get("supportThisWeek") or [])[:8],
    }


def parse_label_time_minutes(label: Any) -> int | None:
    text = str(label or "").strip()
    import re

    match = re.match(r"^(\d{1,2})(?::?(\d{2}))?(?=\s|$|[-–])", text)
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2) or "0")
    if hours > 23 or minutes > 59:
        return None
    return (hours * 60) + minutes


def format_clock(minutes: int | None) -> str:
    if minutes is None:
        return ""
    safe = max(0, int(minutes))
    hours = safe // 60
    remainder = safe % 60
    return f"{hours:02d}:{remainder:02d}"


def summarize_activity(activity_log: list[Any]) -> dict[str, Any]:
    later_moves: list[dict[str, Any]] = []
    growing_estimates: list[dict[str, Any]] = []

    for entry in activity_log:
        if not isinstance(entry, dict):
            continue
        if entry.get("entityType") != "task" or entry.get("action") != "task_updated":
            continue
        if entry.get("field") == "label":
            before_minutes = parse_label_time_minutes(entry.get("before"))
            after_minutes = parse_label_time_minutes(entry.get("after"))
            if before_minutes is not None and after_minutes is not None and after_minutes > before_minutes:
                later_moves.append(
                    {
                        "dateKey": entry.get("dateKey") or "",
                        "label": entry.get("after") or entry.get("before") or "",
                        "before": format_clock(before_minutes),
                        "after": format_clock(after_minutes),
                    }
                )
        if entry.get("field") == "hours":
            before_hours = float(entry.get("before") or 0)
            after_hours = float(entry.get("after") or 0)
            if after_hours > before_hours + 0.24:
                meta = entry.get("meta") if isinstance(entry.get("meta"), dict) else {}
                growing_estimates.append(
                    {
                        "dateKey": entry.get("dateKey") or "",
                        "label": meta.get("label") or "",
                        "beforeHours": before_hours,
                        "afterHours": after_hours,
                    }
                )

    later_moves.sort(key=lambda item: str(item.get("dateKey") or ""), reverse=True)
    growing_estimates.sort(key=lambda item: str(item.get("dateKey") or ""), reverse=True)

    return {
        "laterMoveCount": len(later_moves),
        "latestLaterMove": later_moves[0] if later_moves else None,
        "growingEstimateCount": len(growing_estimates),
        "latestGrowingEstimate": growing_estimates[0] if growing_estimates else None,
    }


def compact_payload(question: str, payload: dict[str, Any]) -> dict[str, Any]:
    top_insight = payload.get("topInsight") or {}
    insights = payload.get("insights") or []
    today_tasks = payload.get("todayTasks") or []
    journal_entries = payload.get("journalEntries") or []
    activity_log = payload.get("activityLog") or []
    recent_task_history = payload.get("recentTaskHistory") or []
    planned_hours = payload.get("plannedHours") or {}
    money_state = payload.get("moneyState") or {}

    return {
        "question": question,
        "currentDateKey": payload.get("currentDateKey") or "",
        "dayState": payload.get("dayState") or "okay",
        "topInsight": {
            "title": top_insight.get("title") or "",
            "why": top_insight.get("why") or "",
            "actions": top_insight.get("actions") or [],
        },
        "insights": [
            {
                "id": item.get("id") or "",
                "title": item.get("title") or "",
                "why": item.get("why") or "",
                "actions": item.get("actions") or [],
            }
            for item in insights[:3]
            if isinstance(item, dict)
        ],
        "activitySummary": summarize_activity(activity_log if isinstance(activity_log, list) else []),
        "metrics": compact_metrics(payload.get("metrics") or {}),
        "recentTaskHistory": recent_task_history[:7] if isinstance(recent_task_history, list) else [],
        "plannedHours": planned_hours if isinstance(planned_hours, dict) else {},
        "moneyState": money_state if isinstance(money_state, dict) else {},
        "skate": compact_skate(payload.get("skate") or {}),
        "todayTasks": [
            {
                "label": task.get("label") or "",
                "hours": task.get("hours") or 0,
                "done": bool(task.get("done")),
            }
            for task in today_tasks[:10]
            if isinstance(task, dict)
        ],
        "journalEntries": [
            {
                "date": entry.get("date") or "",
                "title": entry.get("title") or "",
                "content": str(entry.get("content") or "")[:280],
            }
            for entry in journal_entries[:4]
            if isinstance(entry, dict)
        ],
    }


def extract_text(response_payload: dict[str, Any]) -> str:
    output_text = response_payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: list[str] = []
    for item in response_payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                parts.append(content["text"])
    return "\n".join(part.strip() for part in parts if part and part.strip()).strip()


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    try:
        value = json.loads(stripped)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        pass

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        value = json.loads(stripped[start : end + 1])
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def normalize_reply(parsed: dict[str, Any]) -> dict[str, Any]:
    answer = str(parsed.get("answer") or "").strip()
    evidence = parsed.get("evidence")
    if not answer:
        raise ValueError("OpenAI mascot reply did not include an answer.")
    if not isinstance(evidence, list):
        evidence = []
    return {
        "answer": answer,
        "evidence": [str(item).strip() for item in evidence if str(item).strip()][:3],
        "source": "openai",
    }


def normalize_reply_from_text(text: str) -> dict[str, Any]:
    lines = [str(line).strip(" -\t") for line in str(text or "").splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        raise ValueError("OpenAI mascot reply was empty.")

    answer = lines[0]
    evidence: list[str] = []
    for line in lines[1:]:
        if line and line != answer:
            evidence.append(line)
        if len(evidence) >= 3:
            break

    return {
        "answer": answer,
        "evidence": evidence,
        "source": "openai",
    }


def request_openai(payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        OPENAI_RESPONSES_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {openai_api_key()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=openai_timeout_seconds()) as response:
        raw = response.read().decode("utf-8")
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("OpenAI API returned an invalid response payload.")
    return parsed


def ask_mascot(question: str, planner_payload: dict[str, Any]) -> dict[str, Any]:
    if not openai_enabled():
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    compact = compact_payload(question, planner_payload)
    api_payload = {
        "model": openai_model(),
        "store": False,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": json.dumps(compact, ensure_ascii=False),
                    }
                ],
            },
        ],
    }
    try:
        response_payload = request_openai(api_payload)
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI request failed with HTTP {exc.code}: {detail[:300]}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"OpenAI request failed: {exc.reason}") from exc

    text = extract_text(response_payload)
    parsed = extract_json_object(text)
    if parsed.get("answer"):
        return normalize_reply(parsed)
    return normalize_reply_from_text(text)
