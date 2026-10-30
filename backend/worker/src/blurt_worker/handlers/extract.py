import json
import logging
import uuid

from blurt_core.config import settings
from blurt_core.db.models import Item, ItemStatus, Job, Recording, RecordingStatus
from blurt_core.db.session import get_session
from blurt_core.logging import job_id_var, recording_id_var
from blurt_core.providers.llm import build_llm_client

logger = logging.getLogger(__name__)

llm = build_llm_client(settings)

_PROMPT_VERSION = "1"

_SYSTEM_BY_SECTION: dict[str, str] = {
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


def _all_items_done(session: object, recording_id: uuid.UUID) -> bool:
    """Returns True when every item is either extracted (has fields) or rejected."""
    from sqlalchemy.orm import Session as SASession

    assert isinstance(session, SASession)
    from blurt_core.db.models import Item as ItemModel

    unfinished = (
        session.query(ItemModel)
        .filter(
            ItemModel.recording_id == recording_id,
            ItemModel.fields.is_(None),
            ItemModel.status != ItemStatus.rejected,
        )
        .count()
    )
    return unfinished == 0


def handle_extract(job: Job) -> None:
    job_id_var.set(str(job.id))
    payload = json.loads(job.payload) if isinstance(job.payload, str) else job.payload
    recording_id = uuid.UUID(payload["recording_id"])
    item_id = uuid.UUID(payload["item_id"])
    recording_id_var.set(str(recording_id))

    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise ValueError(f"Item {item_id} not found")
        section = item.section
        span_text = item.span_text

    system_prompt = _SYSTEM_BY_SECTION.get(section)
    if system_prompt is None:
        with get_session() as session:
            item = session.get(Item, item_id)
            if item:
                item.status = ItemStatus.rejected
        logger.warning("no extract prompt for section", extra={"section": section})
        return

    with get_session() as session:
        raw = llm.chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": span_text},
            ],
            session=session,
            job_id=job.id,
            stage="extract",
            prompt_version=_PROMPT_VERSION,
        )

    try:
        fields: dict[str, str] = json.loads(raw)
        if not isinstance(fields, dict):
            raise ValueError("expected a JSON object")
    except Exception as exc:
        raise ValueError(f"extract LLM returned invalid JSON: {raw!r}") from exc

    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise ValueError(f"Item {item_id} not found")

        item.fields = fields
        item.status = ItemStatus.pending
        session.flush()

        if _all_items_done(session, recording_id):
            recording = session.get(Recording, recording_id)
            if recording:
                recording.status = RecordingStatus.ready
                session.flush()

    logger.info(
        "extracted fields",
        extra={"item_id": str(item_id), "section": section, "fields": list(fields.keys())},
    )
