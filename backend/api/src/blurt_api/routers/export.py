from datetime import UTC, datetime
from typing import Any

from blurt_core.db.models import (
    Item,
    Recording,
    Task,
    Transcript,
    WeeklySummary,
    WorkLogEntry,
)
from blurt_core.db.session import get_session
from fastapi import APIRouter
from sqlalchemy import select

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["export"])


def _recording(r: Recording) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "status": r.status.value,
        "duration_s": r.duration_s,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _transcript(t: Transcript) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "recording_id": str(t.recording_id),
        "text": t.text,
        "segments": t.segments,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _item(i: Item) -> dict[str, Any]:
    return {
        "id": str(i.id),
        "recording_id": str(i.recording_id),
        "section": i.section,
        "status": i.status.value,
        "span_text": i.span_text,
        "start_s": i.start_s,
        "end_s": i.end_s,
        "fields": i.fields,
    }


def _task(t: Task) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "item_id": str(t.item_id),
        "title": t.title,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "project": t.project,
        "status": t.status.value,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
    }


def _work_log(w: WorkLogEntry) -> dict[str, Any]:
    return {
        "id": str(w.id),
        "item_id": str(w.item_id),
        "accomplishment": w.accomplishment,
        "impact": w.impact,
        "project": w.project,
        "occurred_on": w.occurred_on.isoformat() if w.occurred_on else None,
    }


def _summary(s: WeeklySummary) -> dict[str, Any]:
    return {
        "id": str(s.id),
        "week_start": s.week_start.isoformat() if s.week_start else None,
        "lines": s.lines,
    }


@router.get("/export")
def export_data(user_id: CurrentUserId) -> dict[str, Any]:
    """Export everything this user owns as a single JSON document."""
    with get_session() as session:
        recordings = list(
            session.execute(select(Recording).where(Recording.user_id == user_id)).scalars()
        )
        rec_ids = [r.id for r in recordings]

        transcripts = (
            list(
                session.execute(
                    select(Transcript).where(Transcript.recording_id.in_(rec_ids))
                ).scalars()
            )
            if rec_ids
            else []
        )
        items = (
            list(session.execute(select(Item).where(Item.recording_id.in_(rec_ids))).scalars())
            if rec_ids
            else []
        )
        tasks = list(session.execute(select(Task).where(Task.user_id == user_id)).scalars())
        work_log = list(
            session.execute(select(WorkLogEntry).where(WorkLogEntry.user_id == user_id)).scalars()
        )
        summaries = list(
            session.execute(select(WeeklySummary).where(WeeklySummary.user_id == user_id)).scalars()
        )

        return {
            "exported_at": datetime.now(UTC).isoformat(),
            "recordings": [_recording(r) for r in recordings],
            "transcripts": [_transcript(t) for t in transcripts],
            "items": [_item(i) for i in items],
            "tasks": [_task(t) for t in tasks],
            "work_log_entries": [_work_log(w) for w in work_log],
            "summaries": [_summary(s) for s in summaries],
        }
