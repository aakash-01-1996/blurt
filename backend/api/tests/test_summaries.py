import uuid
from datetime import UTC, datetime, timedelta

import pytest
from blurt_core.db.models import (
    Item,
    ItemStatus,
    Recording,
    RecordingStatus,
    User,
    WeeklySummary,
    WorkLogEntry,
)
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _ensure_user(session: Session) -> None:
    if not session.get(User, USER_ID):
        session.add(User(id=USER_ID, email="test@blurt.dev", password_hash="x"))
        session.flush()


def _seed_recording(session: Session) -> uuid.UUID:
    _ensure_user(session)
    r = Recording(
        user_id=USER_ID,
        storage_key="recs/test.flac",
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    session.add(r)
    session.flush()
    return r.id


def _seed_work_log_item(session: Session, recording_id: uuid.UUID) -> uuid.UUID:
    item = Item(
        recording_id=recording_id,
        section="work_log",
        span_text="Shipped the auth refactor.",
        fields={"accomplishment": "Shipped auth", "project": "backend"},
        status=ItemStatus.approved,
    )
    session.add(item)
    session.flush()
    entry = WorkLogEntry(
        user_id=USER_ID,
        item_id=item.id,
        accomplishment="Shipped auth",
        project="backend",
    )
    session.add(entry)
    session.flush()
    return item.id


def _current_week_start() -> datetime:
    today = datetime.now(UTC).date()
    monday = today - timedelta(days=today.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=UTC)


def _seed_summary(session: Session, lines: list[str] | None = None) -> uuid.UUID:
    _ensure_user(session)
    summary = WeeklySummary(
        user_id=USER_ID,
        week_start=_current_week_start(),
        lines=lines or ["Shipped auth refactor", "Fixed pipeline bug"],
    )
    session.add(summary)
    session.flush()
    return summary.id


# ── GET /summaries ────────────────────────────────────────────────────────────


def test_list_summaries_empty(api_client: TestClient, db_session: Session) -> None:
    _ensure_user(db_session)
    db_session.commit()

    r = api_client.get("/api/v1/summaries")
    assert r.status_code == 200
    assert r.json() == []


def test_list_summaries_returns_existing(api_client: TestClient, db_session: Session) -> None:
    _seed_summary(db_session)
    db_session.commit()

    r = api_client.get("/api/v1/summaries")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert "Shipped auth refactor" in data[0]["lines"]


# ── POST /summaries/generate ──────────────────────────────────────────────────


def _clear_current_week_summary(session: Session) -> None:
    session.query(WeeklySummary).filter(
        WeeklySummary.user_id == USER_ID,
        WeeklySummary.week_start == _current_week_start(),
    ).delete()
    session.commit()


def test_generate_summary_queues_job(api_client: TestClient, db_session: Session) -> None:
    import json

    from blurt_core.db.models import Job

    _ensure_user(db_session)
    _clear_current_week_summary(db_session)

    r = api_client.post("/api/v1/summaries/generate")
    assert r.status_code == 202
    assert r.json()["status"] == "queued"

    db_session.expire_all()
    job = (
        db_session.query(Job)
        .filter(Job.kind == "summarize")
        .order_by(Job.created_at.desc())
        .first()
    )
    assert job is not None
    payload = json.loads(job.payload) if isinstance(job.payload, str) else job.payload
    assert payload["user_id"] == str(USER_ID)


def test_generate_summary_409_if_already_exists(
    api_client: TestClient, db_session: Session
) -> None:
    _clear_current_week_summary(db_session)
    _seed_summary(db_session)
    db_session.commit()

    r = api_client.post("/api/v1/summaries/generate")
    assert r.status_code == 409


# ── POST /summaries/regenerate ────────────────────────────────────────────────


def test_regenerate_always_queues(api_client: TestClient, db_session: Session) -> None:
    _seed_summary(db_session)
    db_session.commit()

    r = api_client.post("/api/v1/summaries/regenerate")
    assert r.status_code == 202
    assert r.json()["status"] == "queued"


# ── GET /summaries/{id}/export ────────────────────────────────────────────────


def test_export_markdown(api_client: TestClient, db_session: Session) -> None:
    summary_id = _seed_summary(db_session)
    db_session.commit()

    r = api_client.get(f"/api/v1/summaries/{summary_id}/export?format=md")
    assert r.status_code == 200
    assert "text/markdown" in r.headers["content-type"]
    assert r.headers["content-disposition"].startswith("attachment")
    body = r.text
    assert body.startswith("## Week of")
    assert "- Shipped auth refactor" in body
    assert "- Fixed pipeline bug" in body


def test_export_plain_text(api_client: TestClient, db_session: Session) -> None:
    summary_id = _seed_summary(db_session)
    db_session.commit()

    r = api_client.get(f"/api/v1/summaries/{summary_id}/export?format=txt")
    assert r.status_code == 200
    assert "text/plain" in r.headers["content-type"]
    body = r.text
    assert body.startswith("Week of")
    assert "• Shipped auth refactor" in body


def test_export_default_format_is_markdown(api_client: TestClient, db_session: Session) -> None:
    summary_id = _seed_summary(db_session)
    db_session.commit()

    r = api_client.get(f"/api/v1/summaries/{summary_id}/export")
    assert r.status_code == 200
    assert "text/markdown" in r.headers["content-type"]


def test_export_invalid_format(api_client: TestClient, db_session: Session) -> None:
    summary_id = _seed_summary(db_session)
    db_session.commit()

    r = api_client.get(f"/api/v1/summaries/{summary_id}/export?format=pdf")
    assert r.status_code == 422


def test_export_404_for_unknown_summary(api_client: TestClient) -> None:
    r = api_client.get(f"/api/v1/summaries/{uuid.uuid4()}/export")
    assert r.status_code == 404


# ── WorkLogEntry creation on approve ─────────────────────────────────────────


@pytest.mark.parametrize("section", ["task", "note"])
def test_approve_non_work_log_does_not_create_entry(
    api_client: TestClient, db_session: Session, section: str
) -> None:
    recording_id = _seed_recording(db_session)
    item = Item(
        recording_id=recording_id,
        section=section,
        span_text="Do something.",
        fields={"title": "Do something"},
        status=ItemStatus.pending,
    )
    db_session.add(item)
    db_session.commit()

    api_client.post(f"/api/v1/items/{item.id}/review", json={"action": "approve"})

    db_session.expire_all()
    count = db_session.query(WorkLogEntry).filter(WorkLogEntry.item_id == item.id).count()
    assert count == 0


def test_approve_work_log_creates_entry(api_client: TestClient, db_session: Session) -> None:
    recording_id = _seed_recording(db_session)
    item = Item(
        recording_id=recording_id,
        section="work_log",
        span_text="Shipped the pipeline.",
        fields={"accomplishment": "Shipped the pipeline", "project": "core"},
        status=ItemStatus.pending,
    )
    db_session.add(item)
    db_session.commit()

    r = api_client.post(f"/api/v1/items/{item.id}/review", json={"action": "approve"})
    assert r.status_code == 200

    db_session.expire_all()
    entry = db_session.query(WorkLogEntry).filter(WorkLogEntry.item_id == item.id).one()
    assert entry.accomplishment == "Shipped the pipeline"
    assert entry.project == "core"
