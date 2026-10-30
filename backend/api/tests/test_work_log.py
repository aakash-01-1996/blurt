import uuid
from datetime import UTC, datetime

from blurt_core.db.models import Item, ItemStatus, Recording, RecordingStatus, WorkLogEntry
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _seed_work_log_entry(session: Session) -> uuid.UUID:
    rec = Recording(
        user_id=USER_ID,
        storage_key="recs/wl-test.flac",
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    session.add(rec)
    session.flush()

    item = Item(
        recording_id=rec.id,
        section="work_log",
        span_text="Deployed new auth service.",
        fields={"accomplishment": "Deployed new auth service", "project": "platform"},
        status=ItemStatus.approved,
    )
    session.add(item)
    session.flush()

    entry = WorkLogEntry(
        user_id=USER_ID,
        item_id=item.id,
        accomplishment="Deployed new auth service",
        project="platform",
        occurred_on=datetime(2026, 10, 28, tzinfo=UTC),
    )
    session.add(entry)
    session.flush()
    return entry.id


def _clear_work_log(session: Session) -> None:
    session.query(WorkLogEntry).filter(WorkLogEntry.user_id == USER_ID).delete()
    session.commit()


def test_list_work_log_empty(api_client: TestClient, db_session: Session) -> None:
    _clear_work_log(db_session)
    res = api_client.get("/api/v1/work-log")
    assert res.status_code == 200
    assert res.json() == []


def test_list_work_log_returns_entries(api_client: TestClient, db_session: Session) -> None:
    _clear_work_log(db_session)
    entry_id = _seed_work_log_entry(db_session)
    db_session.commit()
    res = api_client.get("/api/v1/work-log")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == str(entry_id)
    assert data[0]["accomplishment"] == "Deployed new auth service"
    assert data[0]["project"] == "platform"


def test_list_work_log_excludes_other_users(api_client: TestClient, db_session: Session) -> None:
    _clear_work_log(db_session)
    other_user_id = uuid.uuid4()
    from blurt_core.db.models import User

    db_session.add(User(id=other_user_id, email="other@blurt.dev", password_hash="x"))
    db_session.flush()

    rec = Recording(
        user_id=other_user_id,
        storage_key="recs/other.flac",
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    db_session.add(rec)
    db_session.flush()

    item = Item(
        recording_id=rec.id,
        section="work_log",
        span_text="Other user's work.",
        fields={},
        status=ItemStatus.approved,
    )
    db_session.add(item)
    db_session.flush()

    db_session.add(WorkLogEntry(user_id=other_user_id, item_id=item.id, accomplishment="Other"))
    db_session.commit()

    res = api_client.get("/api/v1/work-log")
    assert res.status_code == 200
    assert res.json() == []
