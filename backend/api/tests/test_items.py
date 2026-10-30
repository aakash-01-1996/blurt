import uuid

from blurt_api.main import app
from blurt_core.db.models import Item, ItemStatus, Recording, RecordingStatus, User
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

client = TestClient(app)

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _ensure_user(session: Session) -> None:
    if not session.get(User, USER_ID):
        session.add(User(id=USER_ID, email="test@blurt.dev", password_hash="x"))
        session.flush()


def _seed_recording(session: Session, status: RecordingStatus = RecordingStatus.ready) -> uuid.UUID:
    _ensure_user(session)
    recording = Recording(
        user_id=USER_ID,
        storage_key="recs/test.flac",
        mime_type="audio/flac",
        status=status,
    )
    session.add(recording)
    session.flush()
    return recording.id


def _seed_item(
    session: Session,
    recording_id: uuid.UUID,
    status: ItemStatus = ItemStatus.pending,
) -> uuid.UUID:
    item = Item(
        recording_id=recording_id,
        section="work_log",
        span_text="Shipped the auth refactor.",
        fields={"accomplishment": "Shipped the auth refactor", "project": "backend"},
        status=status,
    )
    session.add(item)
    session.flush()
    return item.id


# ── GET /recordings/{id}/items ────────────────────────────────────────────────


def test_list_items_returns_items_for_recording(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    _seed_item(db_session, recording_id)
    db_session.commit()

    r = client.get(f"/api/v1/recordings/{recording_id}/items")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert data[0]["section"] == "work_log"
    assert data[0]["span_text"] == "Shipped the auth refactor."
    assert data[0]["fields"]["project"] == "backend"


def test_list_items_returns_empty_list_for_no_items(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    db_session.commit()

    r = client.get(f"/api/v1/recordings/{recording_id}/items")
    assert r.status_code == 200
    assert r.json() == []


def test_list_items_404_for_unknown_recording() -> None:
    r = client.get(f"/api/v1/recordings/{uuid.uuid4()}/items")
    assert r.status_code == 404


# ── POST /items/{id}/review ───────────────────────────────────────────────────


def test_review_item_approve(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    item_id = _seed_item(db_session, recording_id)
    db_session.commit()

    r = client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "approved"
    assert data["id"] == str(item_id)


def test_review_item_reject(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    item_id = _seed_item(db_session, recording_id)
    db_session.commit()

    r = client.post(f"/api/v1/items/{item_id}/review", json={"action": "reject"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_review_item_invalid_action(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    item_id = _seed_item(db_session, recording_id)
    db_session.commit()

    r = client.post(f"/api/v1/items/{item_id}/review", json={"action": "delete"})
    assert r.status_code == 422


def test_review_item_404_for_unknown_item() -> None:
    r = client.post(f"/api/v1/items/{uuid.uuid4()}/review", json={"action": "approve"})
    assert r.status_code == 404


def test_review_item_409_if_already_reviewed(db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    item_id = _seed_item(db_session, recording_id, status=ItemStatus.approved)
    db_session.commit()

    r = client.post(f"/api/v1/items/{item_id}/review", json={"action": "reject"})
    assert r.status_code == 409
