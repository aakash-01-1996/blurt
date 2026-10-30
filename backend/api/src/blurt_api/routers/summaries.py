import uuid
from datetime import UTC, datetime, timedelta

from blurt_core.db.models import WeeklySummary
from blurt_core.db.session import get_session
from blurt_core.queue import enqueue
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["summaries"])


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
def list_summaries(user_id: CurrentUserId) -> list[WeeklySummary]:
    with get_session() as session:
        summaries = list(
            session.execute(
                select(WeeklySummary)
                .where(WeeklySummary.user_id == user_id)
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
def generate_summary(user_id: CurrentUserId) -> dict[str, str]:
    week_start = _current_week_start()

    with get_session() as session:
        existing = session.execute(
            select(WeeklySummary).where(
                WeeklySummary.user_id == user_id,
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
            {"user_id": str(user_id), "week_start": week_start.isoformat()},
        )

    return {"status": "queued", "week_start": week_start.isoformat()}


@router.post(
    "/summaries/regenerate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=dict[str, str],
)
def regenerate_summary(user_id: CurrentUserId) -> dict[str, str]:
    week_start = _current_week_start()

    with get_session() as session:
        enqueue(
            session,
            "summarize",
            {"user_id": str(user_id), "week_start": week_start.isoformat()},
        )

    return {"status": "queued", "week_start": week_start.isoformat()}


def _format_markdown(summary: WeeklySummary) -> str:
    date_str = summary.week_start.strftime("%b %-d, %Y")
    lines = "\n".join(f"- {line}" for line in (summary.lines or []))
    return f"## Week of {date_str}\n\n{lines}\n"


def _format_text(summary: WeeklySummary) -> str:
    date_str = summary.week_start.strftime("%b %-d, %Y")
    lines = "\n".join(f"• {line}" for line in (summary.lines or []))
    return f"Week of {date_str}\n\n{lines}\n"


@router.get("/summaries/{summary_id}/export", response_class=PlainTextResponse)
def export_summary(
    summary_id: uuid.UUID,
    user_id: CurrentUserId,
    format: str = Query(default="md", pattern="^(md|txt)$"),
) -> PlainTextResponse:
    with get_session() as session:
        summary = session.get(WeeklySummary, summary_id)
        if summary is None or summary.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Summary not found")

        if format == "txt":
            content = _format_text(summary)
            media_type = "text/plain"
        else:
            content = _format_markdown(summary)
            media_type = "text/markdown"

        week_str = summary.week_start.strftime("%Y-%m-%d")

    filename = f"blurt-summary-{week_str}.{'md' if format == 'md' else 'txt'}"
    return PlainTextResponse(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
