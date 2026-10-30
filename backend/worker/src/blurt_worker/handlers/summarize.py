import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from blurt_core.config import settings
from blurt_core.db.models import Job, WeeklySummary, WorkLogEntry
from blurt_core.db.session import get_session
from blurt_core.logging import job_id_var
from blurt_core.providers.llm import build_llm_client

logger = logging.getLogger(__name__)

llm = build_llm_client(settings)

_PROMPT_VERSION = "1"

_SYSTEM = """\
You are an assistant that writes concise weekly work summaries.

Given a list of work log entries, produce a JSON array of short bullet-point strings \
(3–8 bullets) that summarise the week's accomplishments. Each bullet should be a single \
sentence starting with a past-tense verb (e.g. "Shipped", "Fixed", "Reviewed").

Return ONLY the JSON array of strings, no markdown fences."""


def handle_summarize(job: Job) -> None:
    job_id_var.set(str(job.id))
    payload = json.loads(job.payload) if isinstance(job.payload, str) else job.payload
    user_id = uuid.UUID(payload["user_id"])
    week_start = datetime.fromisoformat(payload["week_start"]).replace(tzinfo=UTC)

    with get_session() as session:
        entries: list[WorkLogEntry] = list(
            session.query(WorkLogEntry)
            .filter(WorkLogEntry.user_id == user_id)
            .order_by(WorkLogEntry.created_at)
            .all()
        )
        if not entries:
            logger.info(
                "no work log entries for week, skipping",
                extra={"user_id": str(user_id), "week_start": week_start.isoformat()},
            )
            return

        lines_input = "\n".join(
            f"- {e.accomplishment or ''}"
            + (f" (project: {e.project})" if e.project else "")
            + (f" — impact: {e.impact}" if e.impact else "")
            for e in entries
            if e.accomplishment
        )

    with get_session() as session:
        raw = llm.chat(
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": lines_input},
            ],
            session=session,
            job_id=job.id,
            stage="summarize",
            prompt_version=_PROMPT_VERSION,
        )

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list) or not all(isinstance(s, str) for s in parsed):
            raise ValueError("expected a JSON array of strings")
        lines: list[Any] = parsed
    except Exception as exc:
        raise ValueError(f"summarize LLM returned invalid JSON: {raw!r}") from exc

    with get_session() as session:
        existing = (
            session.query(WeeklySummary)
            .filter(
                WeeklySummary.user_id == user_id,
                WeeklySummary.week_start == week_start,
            )
            .one_or_none()
        )
        if existing:
            existing.lines = lines
        else:
            session.add(WeeklySummary(user_id=user_id, week_start=week_start, lines=lines))

    logger.info(
        "summary generated",
        extra={
            "user_id": str(user_id),
            "week_start": week_start.isoformat(),
            "bullet_count": len(lines),
        },
    )
