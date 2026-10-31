"""Lenient JSON parsing for LLM responses that may wrap output in fences/prose."""

import json
from typing import Any


def _strip_fences(raw: str) -> str:
    s = raw.strip()
    if not s.startswith("```"):
        return s
    s = s[3:]
    newline = s.find("\n")
    if newline != -1:
        first_line = s[:newline].strip()
        if first_line and first_line.isalnum():  # a language tag like ```json
            s = s[newline + 1 :]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()


def _first_json_object(s: str) -> str | None:
    start = s.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(s)):
        c = s[i]
        if in_string:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == '"':
                in_string = False
        elif c == '"':
            in_string = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def loads_lenient(raw: str) -> Any:
    """Parse JSON from an LLM response, tolerating markdown fences and surrounding prose.

    Raises ValueError if no JSON value can be recovered.
    """
    candidate = _strip_fences(raw)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    obj = _first_json_object(candidate) or _first_json_object(raw)
    if obj is None:
        raise ValueError(f"no JSON object found in: {raw!r}")
    try:
        return json.loads(obj)
    except json.JSONDecodeError as exc:
        raise ValueError(f"no JSON object found in: {raw!r}") from exc
