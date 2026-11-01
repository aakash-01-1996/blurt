import uuid

from blurt_core.db.models import (
    Item,
    ItemStatus,
    Note,
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


def _seed_note_item(
    session: Session,
    user_id: uuid.UUID = USER_ID,
    fields: dict | None = None,  # type: ignore[type-arg]
    span: str = "Remember the API rate limit is 60 per minute.",
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
        section="note",
        span_text=span,
        fields=fields,
        status=status,
    )
    session.add(item)
    session.flush()
    return item.id


def _seed_note_row(session: Session) -> uuid.UUID:
    item_id = _seed_note_item(session, status=ItemStatus.approved)
    note = Note(
        user_id=USER_ID,
        item_id=item_id,
        title="API rate limit",
        content="Remember the API rate limit is 60 per minute.",
    )
    session.add(note)
    session.flush()
    return note.id


def _clear_notes(session: Session) -> None:
    session.query(Note).delete()
    session.commit()


def test_list_notes_empty(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    res = api_client.get("/api/v1/notes")
    assert res.status_code == 200
    assert res.json() == []


def test_approving_note_item_creates_note(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    item_id = _seed_note_item(
        db_session,
        fields={"title": "API rate limit", "content": "60 requests per minute."},
    )
    db_session.commit()

    res = api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    assert res.status_code == 200

    notes = api_client.get("/api/v1/notes").json()
    assert len(notes) == 1
    assert notes[0]["title"] == "API rate limit"
    assert notes[0]["content"] == "60 requests per minute."
    assert notes[0]["item_id"] == str(item_id)


def test_approving_note_without_fields_falls_back_to_span(
    api_client: TestClient, db_session: Session
) -> None:
    _clear_notes(db_session)
    item_id = _seed_note_item(db_session, fields=None, span="Idea: dark mode toggle.")
    db_session.commit()

    api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    notes = api_client.get("/api/v1/notes").json()
    assert [n["title"] for n in notes] == ["Idea: dark mode toggle."]
    assert notes[0]["content"] == "Idea: dark mode toggle."


def test_rejecting_note_item_creates_no_note(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    item_id = _seed_note_item(db_session, fields={"title": "Nope"})
    db_session.commit()

    api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "reject"})
    assert api_client.get("/api/v1/notes").json() == []


def test_update_note_title_and_content(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    note_id = _seed_note_row(db_session)
    db_session.commit()

    res = api_client.patch(
        f"/api/v1/notes/{note_id}",
        json={"title": "Rate limits", "content": "Now 120/min."},
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Rate limits"
    assert res.json()["content"] == "Now 120/min."


def test_delete_note(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    note_id = _seed_note_row(db_session)
    db_session.commit()

    res = api_client.delete(f"/api/v1/notes/{note_id}")
    assert res.status_code == 204
    assert api_client.get("/api/v1/notes").json() == []


def test_patch_note_404_for_unknown(api_client: TestClient) -> None:
    res = api_client.patch(f"/api/v1/notes/{uuid.uuid4()}", json={"title": "x"})
    assert res.status_code == 404


def test_notes_are_scoped_to_the_user(api_client: TestClient, db_session: Session) -> None:
    _clear_notes(db_session)
    other = uuid.uuid4()
    other_item = _seed_note_item(db_session, user_id=other, status=ItemStatus.approved)
    other_note = Note(user_id=other, item_id=other_item, title="Someone else's note")
    db_session.add(other_note)
    db_session.flush()
    other_note_id = other_note.id
    db_session.commit()

    listed = api_client.get("/api/v1/notes").json()
    assert all(n["title"] != "Someone else's note" for n in listed)

    res = api_client.patch(f"/api/v1/notes/{other_note_id}", json={"title": "hijack"})
    assert res.status_code == 404

    res = api_client.delete(f"/api/v1/notes/{other_note_id}")
    assert res.status_code == 404
