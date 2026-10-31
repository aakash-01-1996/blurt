"""Field-extraction prompts (per section) and response parsing."""

import json

EXTRACT_PROMPT_VERSION = "1"

EXTRACT_SYSTEM_BY_SECTION: dict[str, str] = {
    "work_log": """\
Extract structured fields from this work-log voice note.

Return a JSON object with these keys (omit a key if not mentioned):
  "accomplishment": string — what was done
  "impact":         string — why it mattered or the outcome
  "project":        string — project or area name
  "occurred_on":    string — ISO 8601 date if mentioned (e.g. "2024-03-15"), else omit

Return ONLY the JSON object, no markdown fences.""",
    "task": """\
Extract structured fields from this task voice note.

Return a JSON object with these keys (omit a key if not mentioned):
  "title":    string — short description of the task
  "due_date": string — ISO 8601 date if mentioned, else omit
  "project":  string — project or area name if mentioned

Return ONLY the JSON object, no markdown fences.""",
    "note": """\
Extract structured fields from this note voice note.

Return a JSON object with these keys (omit a key if not mentioned):
  "title":   string — short summary (one sentence)
  "content": string — the full note text, cleaned up

Return ONLY the JSON object, no markdown fences.""",
}


def build_extract_messages(section: str, text: str) -> list[dict[str, str]] | None:
    system = EXTRACT_SYSTEM_BY_SECTION.get(section)
    if system is None:
        return None
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": text},
    ]


def parse_extract_response(raw: str) -> dict[str, str]:
    try:
        fields = json.loads(raw)
    except Exception as exc:
        raise ValueError(f"extract LLM returned invalid JSON: {raw!r}") from exc
    if not isinstance(fields, dict):
        raise ValueError("expected a JSON object")
    return fields
