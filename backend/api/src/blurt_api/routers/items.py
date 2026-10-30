import uuid
from datetime import UTC, datetime

from blurt_core.db.models import Item, ItemStatus, Recording
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

router = APIRouter(prefix="/api/v1", tags=["items"])


class ItemOut(BaseModel):
    id: uuid.UUID
    section: str
    status: ItemStatus
    span_text: str
    route_confidence: float | None
    fields: dict | None  # type: ignore[type-arg]
    followup_question: str | None

    model_config = {"from_attributes": True}


class ReviewRequest(BaseModel):
    action: str  # "approve" | "reject"


@router.get("/recordings/{recording_id}/items", response_model=list[ItemOut])
def list_items(recording_id: uuid.UUID) -> list[Item]:
    with get_session() as session:
        recording = session.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

        items = list(
            session.execute(
                select(Item).where(Item.recording_id == recording_id).order_by(Item.created_at)
            ).scalars()
        )
        session.expunge_all()
        return items


@router.post("/items/{item_id}/review", response_model=ItemOut)
def review_item(item_id: uuid.UUID, body: ReviewRequest) -> Item:
    if body.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve' or 'reject'",
        )

    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

        if item.status in (ItemStatus.approved, ItemStatus.rejected):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Item already {item.status}",
            )

        item.status = ItemStatus.approved if body.action == "approve" else ItemStatus.rejected
        item.reviewed_at = datetime.now(UTC)
        session.flush()
        session.expunge(item)
        return item
