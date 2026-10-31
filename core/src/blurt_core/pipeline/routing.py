"""Routing (section classification) prompt and response parsing."""

import json
from dataclasses import dataclass

ROUTE_PROMPT_VERSION = "1"

VALID_SECTIONS = {"work_log", "task", "note", "skip"}

ROUTE_SYSTEM = """\
You are a classifier. Given a short text from a voice note, decide which section it belongs to.

Sections:
  work_log  — something the speaker accomplished or worked on (past tense)
  task      — something the speaker needs to do (future action, reminder, todo)
  note      — a thought, observation, idea, or information to remember
  skip      — filler, noise, or not useful (e.g. "um", "testing", "never mind")

Return a JSON object with exactly two keys:
  "section": one of the four values above
  "confidence": a float between 0.0 and 1.0

Return ONLY the JSON object, no markdown fences."""


@dataclass(frozen=True)
class RouteResult:
    section: str
    confidence: float


def build_route_messages(text: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": ROUTE_SYSTEM},
        {"role": "user", "content": text},
    ]


def parse_route_response(raw: str) -> RouteResult:
    try:
        data = json.loads(raw)
        section = str(data.get("section", "")).strip()
        confidence = float(data.get("confidence", 0.0))
    except Exception as exc:
        raise ValueError(f"route LLM returned invalid JSON: {raw!r}") from exc
    if section not in VALID_SECTIONS:
        raise ValueError(f"unexpected section: {section!r}")
    return RouteResult(section=section, confidence=confidence)
