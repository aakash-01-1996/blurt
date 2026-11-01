"""Routing (section classification) prompt and response parsing."""

from dataclasses import dataclass

from blurt_core.pipeline.parsing import loads_lenient

ROUTE_PROMPT_VERSION = "2"

VALID_SECTIONS = {"work_log", "task", "note", "list", "skip"}

ROUTE_SYSTEM = """\
You are a classifier. Given a short text from a voice note, decide which section it belongs to.

Sections:
  work_log  — something the speaker accomplished or worked on (past tense)
  task      — a single thing the speaker needs to do (one future action, reminder, todo)
  list      — several related items to collect or track together (a shopping list, \
packing list, checklist, or "add X, Y and Z to my list")
  note      — a thought, observation, idea, or information to remember
  skip      — filler, noise, or not useful (e.g. "um", "testing", "never mind")

Prefer "task" for a single action and "list" when the speaker enumerates multiple items.

Return a JSON object with exactly two keys:
  "section": one of the five values above
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
        data = loads_lenient(raw)
        section = str(data.get("section", "")).strip()
        confidence = float(data.get("confidence", 0.0))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError(f"route LLM returned invalid JSON: {raw!r}") from exc
    if section not in VALID_SECTIONS:
        raise ValueError(f"unexpected section: {section!r}")
    return RouteResult(section=section, confidence=confidence)
