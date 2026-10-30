import uuid
from datetime import datetime

from blurt_core.db.models import WorkLogEntry
from blurt_core.db.session import get_session
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["work-log"])


class WorkLogEntryOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    accomplishment: str | None
    impact: str | None
    project: str | None
    occurred_on: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/work-log", response_model=list[WorkLogEntryOut])
def list_work_log(user_id: CurrentUserId) -> list[WorkLogEntry]:
    with get_session() as session:
        rows = (
            session.execute(
                select(WorkLogEntry)
                .where(WorkLogEntry.user_id == user_id)
                .order_by(
                    WorkLogEntry.occurred_on.desc().nullslast(), WorkLogEntry.created_at.desc()
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            session.expunge(row)
        return list(rows)
