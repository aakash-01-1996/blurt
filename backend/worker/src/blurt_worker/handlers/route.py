import json
import logging
import uuid

from blurt_core.config import settings
from blurt_core.db.models import Item, ItemStatus, Job, Recording, RecordingStatus
from blurt_core.db.session import get_session
from blurt_core.logging import job_id_var, recording_id_var
from blurt_core.providers.llm import build_llm_client
from blurt_core.queue import enqueue
from sqlalchemy.orm import Session as SASession

logger = logging.getLogger(__name__)

llm = build_llm_client(settings)

_PROMPT_VERSION = "1"

_VALID_SECTIONS = {"work_log", "task", "note", "skip"}

_SYSTEM = """\
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


def _all_non_rejected_have_fields(session: SASession, recording_id: uuid.UUID) -> bool:
    """True when every item for the recording is either rejected or has fields extracted."""
    unfinished: int = (
        session.query(Item)
        .filter(
            Item.recording_id == recording_id,
            Item.fields.is_(None),
            Item.status != ItemStatus.rejected,
        )
        .count()
    )
    return unfinished == 0


def handle_route(job: Job) -> None:
    job_id_var.set(str(job.id))
    payload = json.loads(job.payload) if isinstance(job.payload, str) else job.payload
    recording_id = uuid.UUID(payload["recording_id"])
    item_id = uuid.UUID(payload["item_id"])
    recording_id_var.set(str(recording_id))

    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise ValueError(f"Item {item_id} not found")
        span_text = item.span_text

    with get_session() as session:
        raw = llm.chat(
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": span_text},
            ],
            session=session,
            job_id=job.id,
            stage="route",
            prompt_version=_PROMPT_VERSION,
        )

    try:
        result: dict[str, str | float] = json.loads(raw)
        section = str(result.get("section", "")).strip()
        confidence = float(result.get("confidence", 0.0))
        if section not in _VALID_SECTIONS:
            raise ValueError(f"unexpected section: {section!r}")
    except Exception as exc:
        raise ValueError(f"route LLM returned invalid JSON: {raw!r}") from exc

    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise ValueError(f"Item {item_id} not found")

        item.section = section
        item.route_confidence = confidence

        if section == "skip" or confidence < settings.router_confidence_threshold:
            item.status = ItemStatus.rejected
            session.flush()
            if _all_non_rejected_have_fields(session, recording_id):
                recording = session.get(Recording, recording_id)
                if recording:
                    recording.status = RecordingStatus.ready
                    session.flush()
            logger.info(
                "item routed → rejected",
                extra={"item_id": str(item_id), "section": section, "confidence": confidence},
            )
        else:
            session.flush()
            enqueue(
                session,
                "extract",
                {"recording_id": str(recording_id), "item_id": str(item_id)},
            )
            logger.info(
                "item routed",
                extra={"item_id": str(item_id), "section": section, "confidence": confidence},
            )
