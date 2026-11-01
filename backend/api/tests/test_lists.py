import uuid

from blurt_core.db.models import (
    Item,
    ItemStatus,
    List,
    ListItem,
    Recording,
    RecordingStatus,
    User,
)
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _ensure_user(session: Session, user_id: uuid.UUID = USER_ID) -> None:
    if not session.get(User, user_id):
        session.add(User(id=user_id, email=f"{user_id}@blurt.dev", password_hash="x"))
        session.flush()


def _seed_list_item(
    session: Session,
    user_id: uuid.UUID = USER_ID,
    fields: dict | None = None,  # type: ignore[type-arg]
    span: str = "Add milk, eggs and bread to my shopping list.",
    status: ItemStatus = ItemStatus.pending,
) -> uuid.UUID:
    _ensure_user(session, user_id)
    rec = Recording(
        user_id=user_id,
        storage_key=f"recs/{uuid.uuid4()}.flac",
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    session.add(rec)
    session.flush()
    item = Item(
        recording_id=rec.id,
        section="list",
        span_text=span,
        fields=fields,
        status=status,
    )
    session.add(item)
    session.flush()
    return item.id


def _seed_list_row(session: Session, user_id: uuid.UUID = USER_ID) -> uuid.UUID:
    item_id = _seed_list_item(session, user_id=user_id, status=ItemStatus.approved)
    the_list = List(user_id=user_id, item_id=item_id, title="Groceries")
    the_list.items = [
        ListItem(text="Milk", position=0),
        ListItem(text="Eggs", position=1),
    ]
    session.add(the_list)
    session.flush()
    return the_list.id


def _clear_lists(session: Session) -> None:
    session.query(ListItem).delete()
    session.query(List).delete()
    session.commit()


def test_list_lists_empty(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    res = api_client.get("/api/v1/lists")
    assert res.status_code == 200
    assert res.json() == []


def test_approving_list_item_creates_list_with_items(
    api_client: TestClient, db_session: Session
) -> None:
    _clear_lists(db_session)
    item_id = _seed_list_item(
        db_session,
        fields={"title": "Shopping list", "items": ["Milk", "Eggs", "Bread"]},
    )
    db_session.commit()

    res = api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    assert res.status_code == 200

    lists = api_client.get("/api/v1/lists").json()
    assert len(lists) == 1
    assert lists[0]["title"] == "Shopping list"
    assert [i["text"] for i in lists[0]["items"]] == ["Milk", "Eggs", "Bread"]
    assert [i["position"] for i in lists[0]["items"]] == [0, 1, 2]
    assert all(i["checked"] is False for i in lists[0]["items"])
    assert lists[0]["item_id"] == str(item_id)


def test_approving_list_without_items_creates_empty_list(
    api_client: TestClient, db_session: Session
) -> None:
    _clear_lists(db_session)
    item_id = _seed_list_item(db_session, fields={"title": "Ideas"})
    db_session.commit()

    api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    lists = api_client.get("/api/v1/lists").json()
    assert lists[0]["title"] == "Ideas"
    assert lists[0]["items"] == []


def test_toggle_list_item_checked(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    list_id = _seed_list_row(db_session)
    db_session.commit()

    item = api_client.get("/api/v1/lists").json()[0]["items"][0]
    res = api_client.patch(f"/api/v1/lists/{list_id}/items/{item['id']}", json={"checked": True})
    assert res.status_code == 200
    assert res.json()["checked"] is True

    refreshed = api_client.get("/api/v1/lists").json()[0]["items"]
    assert [i["checked"] for i in refreshed] == [True, False]


def test_update_list_title(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    list_id = _seed_list_row(db_session)
    db_session.commit()

    res = api_client.patch(f"/api/v1/lists/{list_id}", json={"title": "Weekend shop"})
    assert res.status_code == 200
    assert res.json()["title"] == "Weekend shop"
    assert len(res.json()["items"]) == 2


def test_delete_list_removes_items(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    list_id = _seed_list_row(db_session)
    db_session.commit()

    res = api_client.delete(f"/api/v1/lists/{list_id}")
    assert res.status_code == 204
    assert api_client.get("/api/v1/lists").json() == []
    assert db_session.query(ListItem).count() == 0


def test_patch_list_404_for_unknown(api_client: TestClient) -> None:
    res = api_client.patch(f"/api/v1/lists/{uuid.uuid4()}", json={"title": "x"})
    assert res.status_code == 404


def test_lists_are_scoped_to_the_user(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    other = uuid.uuid4()
    other_list_id = _seed_list_row(db_session, user_id=other)
    db_session.commit()

    listed = api_client.get("/api/v1/lists").json()
    assert all(lst["title"] != "Groceries" for lst in listed)

    res = api_client.patch(f"/api/v1/lists/{other_list_id}", json={"title": "hijack"})
    assert res.status_code == 404

    res = api_client.delete(f"/api/v1/lists/{other_list_id}")
    assert res.status_code == 404


def test_toggle_item_on_foreign_list_is_404(api_client: TestClient, db_session: Session) -> None:
    _clear_lists(db_session)
    mine = _seed_list_row(db_session)
    other = uuid.uuid4()
    other_list_id = _seed_list_row(db_session, user_id=other)
    db_session.commit()

    foreign_item = db_session.query(ListItem).filter(ListItem.list_id == other_list_id).first()
    assert foreign_item is not None
    # my list, but an item that belongs to someone else's list
    res = api_client.patch(f"/api/v1/lists/{mine}/items/{foreign_item.id}", json={"checked": True})
    assert res.status_code == 404
