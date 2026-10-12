"""Application boundary for Planner key-value and backup operations."""

from __future__ import annotations

from collections.abc import Mapping
from typing import TypeGuard

from db import delete_value, import_values, put_value, read_all_values


PLANNER_KEY_PREFIX = "hivePlanner."


class ApiRequestError(ValueError):
    """Raised when a Planner API payload violates the public contract."""


def is_planner_key(value: object) -> TypeGuard[str]:
    return isinstance(value, str) and value.startswith(PLANNER_KEY_PREFIX)


def read_values_document() -> dict[str, object]:
    return {"data": read_all_values()}


def export_document() -> dict[str, object]:
    return {
        "app": "Yuan's Planner",
        "version": 2,
        "data": read_all_values(),
    }


def put_value_from_payload(payload: Mapping[str, object]) -> dict[str, bool]:
    key = payload.get("key")
    value = payload.get("value")
    if not is_planner_key(key):
        raise ApiRequestError("Invalid planner key")
    if not isinstance(value, str):
        raise ApiRequestError("Value must be a string")

    put_value(key, value)
    return {"ok": True}


def import_values_from_payload(payload: Mapping[str, object]) -> dict[str, object]:
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ApiRequestError("Import data must be an object")

    imported = import_values(data)
    return {"ok": True, "imported": imported}


def delete_value_for_key(key: object) -> dict[str, bool]:
    if not is_planner_key(key):
        raise ApiRequestError("Invalid planner key")

    delete_value(key)
    return {"ok": True}
