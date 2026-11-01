import uuid
from datetime import datetime

from blurt_core.db.models import List, ListItem
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["lists"])


class ListItemOut(BaseModel):
    id: uuid.UUID
    text: str
    checked: bool
    position: int

    model_config = {"from_attributes": True}


class ListOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    created_at: datetime
    items: list[ListItemOut]

    model_config = {"from_attributes": True}


class ListUpdate(BaseModel):
    title: str


class ListItemUpdate(BaseModel):
    checked: bool | None = None
    text: str | None = None


@router.get("/lists", response_model=list[ListOut])
def list_lists(user_id: CurrentUserId) -> list[List]:
    with get_session() as session:
        rows = (
            session.execute(
                select(List)
                .where(List.user_id == user_id)
                .options(selectinload(List.items))
                .order_by(List.created_at.desc())
            )
            .scalars()
            .all()
        )
        session.expunge_all()
        return list(rows)


@router.patch("/lists/{list_id}", response_model=ListOut)
def update_list(list_id: uuid.UUID, body: ListUpdate, user_id: CurrentUserId) -> List:
    with get_session() as session:
        the_list = _get_owned_list(session, list_id, user_id)
        the_list.title = body.title
        session.flush()
        session.refresh(the_list, attribute_names=["items"])
        session.expunge_all()
        return the_list


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(list_id: uuid.UUID, user_id: CurrentUserId) -> None:
    with get_session() as session:
        the_list = _get_owned_list(session, list_id, user_id)
        session.delete(the_list)


@router.patch("/lists/{list_id}/items/{list_item_id}", response_model=ListItemOut)
def update_list_item(
    list_id: uuid.UUID,
    list_item_id: uuid.UUID,
    body: ListItemUpdate,
    user_id: CurrentUserId,
) -> ListItem:
    with get_session() as session:
        the_list = _get_owned_list(session, list_id, user_id)
        li = session.get(ListItem, list_item_id)
        if li is None or li.list_id != the_list.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List item not found")

        data = body.model_dump(exclude_unset=True)
        if data.get("checked") is not None:
            li.checked = data["checked"]
        if data.get("text") is not None:
            li.text = data["text"]

        session.flush()
        session.expunge(li)
        return li


def _get_owned_list(session: object, list_id: uuid.UUID, user_id: uuid.UUID) -> List:
    from sqlalchemy.orm import Session as SASession

    assert isinstance(session, SASession)
    the_list = session.get(List, list_id)
    if the_list is None or the_list.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return the_list
