import uuid
from datetime import UTC, datetime

from blurt_core.db.models import (
    Correction,
    CorrectionKind,
    Item,
    ItemStatus,
    Recording,
    WorkLogEntry,
)
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


class PatchItemRequest(BaseModel):
    fields: dict[str, str]


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

        if body.action == "approve" and item.section == "work_log" and item.fields:
            _create_work_log_entry(session, item)

        session.flush()
        session.expunge(item)
        return item


def _create_work_log_entry(session: object, item: Item) -> None:
    from sqlalchemy.orm import Session as SASession

    assert isinstance(session, SASession)

    fields = item.fields or {}

    occurred_on: datetime | None = None
    raw_date = fields.get("occurred_on")
    if raw_date:
        try:
            occurred_on = datetime.fromisoformat(raw_date).replace(tzinfo=UTC)
        except ValueError:
            pass

    recording = session.get(Recording, item.recording_id)
    user_id = recording.user_id if recording else None
    if user_id is None:
        return

    entry = WorkLogEntry(
        user_id=user_id,
        item_id=item.id,
        accomplishment=fields.get("accomplishment"),
        impact=fields.get("impact"),
        project=fields.get("project"),
        occurred_on=occurred_on,
    )
    session.add(entry)


@router.patch("/items/{item_id}", response_model=ItemOut)
def patch_item(item_id: uuid.UUID, body: PatchItemRequest) -> Item:
    with get_session() as session:
        item = session.get(Item, item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

        if item.status != ItemStatus.approved:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only approved items can be edited",
            )

        before = dict(item.fields) if item.fields else {}
        after = {**before, **body.fields}

        correction = Correction(
            item_id=item_id,
            kind=CorrectionKind.field_edit,
            before=before,
            after=after,
        )
        session.add(correction)

        item.fields = after
        session.flush()
        session.expunge(item)
        return item
