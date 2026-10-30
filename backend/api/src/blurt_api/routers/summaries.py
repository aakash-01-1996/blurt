import uuid
from datetime import UTC, datetime, timedelta

from blurt_core.db.models import WeeklySummary
from blurt_core.db.session import get_session
from blurt_core.queue import enqueue
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

router = APIRouter(prefix="/api/v1", tags=["summaries"])

# Hardcoded until auth is implemented (M10)
_DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _current_week_start() -> datetime:
    """Return the Monday 00:00 UTC of the current ISO week."""
    today = datetime.now(UTC).date()
    monday = today - timedelta(days=today.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=UTC)


class SummaryOut(BaseModel):
    id: uuid.UUID
    week_start: datetime
    lines: list  # type: ignore[type-arg]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/summaries", response_model=list[SummaryOut])
def list_summaries() -> list[WeeklySummary]:
    with get_session() as session:
        summaries = list(
            session.execute(
                select(WeeklySummary)
                .where(WeeklySummary.user_id == _DEV_USER_ID)
                .order_by(WeeklySummary.week_start.desc())
                .limit(12)
            ).scalars()
        )
        session.expunge_all()
        return summaries


@router.post(
    "/summaries/generate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict[str, str],
)
def generate_summary() -> dict[str, str]:
    week_start = _current_week_start()

    with get_session() as session:
        existing = session.execute(
            select(WeeklySummary).where(
                WeeklySummary.user_id == _DEV_USER_ID,
                WeeklySummary.week_start == week_start,
            )
        ).scalar_one_or_none()

        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Summary for this week already exists — use regenerate",
            )

        enqueue(
            session,
            "summarize",
            {"user_id": str(_DEV_USER_ID), "week_start": week_start.isoformat()},
        )

    return {"status": "queued", "week_start": week_start.isoformat()}


@router.post(
    "/summaries/regenerate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict[str, str],
)
def regenerate_summary() -> dict[str, str]:
    week_start = _current_week_start()

    with get_session() as session:
        enqueue(
            session,
            "summarize",
            {"user_id": str(_DEV_USER_ID), "week_start": week_start.isoformat()},
        )

    return {"status": "queued", "week_start": week_start.isoformat()}
