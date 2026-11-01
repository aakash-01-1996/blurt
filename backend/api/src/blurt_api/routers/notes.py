import uuid
from datetime import datetime

from blurt_core.db.models import Note
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["notes"])


class NoteOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    content: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


@router.get("/notes", response_model=list[NoteOut])
def list_notes(user_id: CurrentUserId) -> list[Note]:
    with get_session() as session:
        rows = (
            session.execute(
                select(Note).where(Note.user_id == user_id).order_by(Note.created_at.desc())
            )
            .scalars()
            .all()
        )
        for row in rows:
            session.expunge(row)
        return list(rows)


@router.patch("/notes/{note_id}", response_model=NoteOut)
def update_note(note_id: uuid.UUID, body: NoteUpdate, user_id: CurrentUserId) -> Note:
    with get_session() as session:
        note = session.get(Note, note_id)
        if note is None or note.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

        data = body.model_dump(exclude_unset=True)
        if data.get("title") is not None:
            note.title = data["title"]
        if "content" in data:
            note.content = data["content"]

        session.flush()
        session.expunge(note)
        return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: uuid.UUID, user_id: CurrentUserId) -> None:
    with get_session() as session:
        note = session.get(Note, note_id)
        if note is None or note.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        session.delete(note)
