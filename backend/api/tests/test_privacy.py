import uuid
from datetime import datetime

from blurt_core.db.models import (
    Correction,
    CorrectionKind,
    Item,
    ItemStatus,
    List,
    ListItem,
    Note,
    Recording,
    RecordingStatus,
    Task,
    Transcript,
    User,
    WeeklySummary,
    WorkLogEntry,
)
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _ensure_user(session: Session, user_id: uuid.UUID = USER_ID) -> None:
    if not session.get(User, user_id):
        session.add(User(id=user_id, email=f"{user_id}@blurt.dev", password_hash="x"))
        session.flush()


def _seed_graph(session: Session, user_id: uuid.UUID = USER_ID) -> dict[str, uuid.UUID]:
    _ensure_user(session, user_id)
    rec = Recording(
        user_id=user_id,
        storage_key=f"recs/{uuid.uuid4()}.flac",
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    session.add(rec)
    session.flush()

    transcript = Transcript(
        recording_id=rec.id, text="hello world", segments=[], provider="groq", model="whisper"
    )
    session.add(transcript)

    task_item = Item(
        recording_id=rec.id,
        section="task",
        span_text="Call the dentist",
        fields={"title": "Call the dentist"},
        status=ItemStatus.approved,
    )
    session.add(task_item)
    session.flush()
    task = Task(user_id=user_id, item_id=task_item.id, title="Call the dentist")
    session.add(task)
    correction = Correction(
        item_id=task_item.id, kind=CorrectionKind.field_edit, before={}, after={"title": "x"}
    )
    session.add(correction)

    wl_item = Item(
        recording_id=rec.id,
        section="work_log",
        span_text="Shipped the fix",
        fields={"accomplishment": "Shipped the fix"},
        status=ItemStatus.approved,
    )
    session.add(wl_item)
    session.flush()
    wle = WorkLogEntry(user_id=user_id, item_id=wl_item.id, accomplishment="Shipped the fix")
    session.add(wle)
    session.flush()

    note_item = Item(
        recording_id=rec.id,
        section="note",
        span_text="Remember the rate limit",
        fields={"title": "Rate limit", "content": "60/min"},
        status=ItemStatus.approved,
    )
    session.add(note_item)
    session.flush()
    note = Note(user_id=user_id, item_id=note_item.id, title="Rate limit", content="60/min")
    session.add(note)

    list_item = Item(
        recording_id=rec.id,
        section="list",
        span_text="Milk and eggs",
        fields={"title": "Groceries", "items": ["Milk", "Eggs"]},
        status=ItemStatus.approved,
    )
    session.add(list_item)
    session.flush()
    the_list = List(user_id=user_id, item_id=list_item.id, title="Groceries")
    the_list.items = [ListItem(text="Milk", position=0), ListItem(text="Eggs", position=1)]
    session.add(the_list)
    session.flush()
    li_id = the_list.items[0].id

    return {
        "recording": rec.id,
        "transcript": transcript.id,
        "task_item": task_item.id,
        "task": task.id,
        "correction": correction.id,
        "wl_item": wl_item.id,
        "wle": wle.id,
        "note_item": note_item.id,
        "note": note.id,
        "list_item": list_item.id,
        "list": the_list.id,
        "list_item_row": li_id,
    }


def test_delete_recording_cascades(api_client: TestClient, db_session: Session) -> None:
    ids = _seed_graph(db_session)
    db_session.commit()

    res = api_client.delete(f"/api/v1/recordings/{ids['recording']}")
    assert res.status_code == 204

    assert api_client.get(f"/api/v1/recordings/{ids['recording']}").status_code == 404

    db_session.expire_all()
    assert db_session.get(Recording, ids["recording"]) is None
    assert db_session.get(Transcript, ids["transcript"]) is None
    assert db_session.get(Item, ids["task_item"]) is None
    assert db_session.get(Item, ids["wl_item"]) is None
    assert db_session.get(Task, ids["task"]) is None
    assert db_session.get(WorkLogEntry, ids["wle"]) is None
    assert db_session.get(Correction, ids["correction"]) is None
    assert db_session.get(Item, ids["note_item"]) is None
    assert db_session.get(Item, ids["list_item"]) is None
    assert db_session.get(Note, ids["note"]) is None
    assert db_session.get(List, ids["list"]) is None
    assert db_session.get(ListItem, ids["list_item_row"]) is None


def test_delete_recording_404_for_unknown(api_client: TestClient) -> None:
    assert api_client.delete(f"/api/v1/recordings/{uuid.uuid4()}").status_code == 404


def test_delete_recording_scoped_to_user(api_client: TestClient, db_session: Session) -> None:
    other = uuid.uuid4()
    ids = _seed_graph(db_session, user_id=other)
    db_session.commit()

    assert api_client.delete(f"/api/v1/recordings/{ids['recording']}").status_code == 404
    db_session.expire_all()
    assert db_session.get(Recording, ids["recording"]) is not None


def test_export_contains_owned_data(api_client: TestClient, db_session: Session) -> None:
    ids = _seed_graph(db_session)
    db_session.add(
        WeeklySummary(user_id=USER_ID, week_start=datetime(2026, 10, 26), lines=["did a thing"])
    )
    db_session.commit()

    try:
        body = api_client.get("/api/v1/export").json()
        assert "exported_at" in body
        rec_ids = {r["id"] for r in body["recordings"]}
        assert str(ids["recording"]) in rec_ids
        assert any(t["title"] == "Call the dentist" for t in body["tasks"])
        assert any(w["accomplishment"] == "Shipped the fix" for w in body["work_log_entries"])
        assert any(t["text"] == "hello world" for t in body["transcripts"])
        assert any(s["lines"] == ["did a thing"] for s in body["summaries"])
        assert any(n["title"] == "Rate limit" for n in body["notes"])
        exported_list = next(lst for lst in body["lists"] if lst["title"] == "Groceries")
        assert [it["text"] for it in exported_list["items"]] == ["Milk", "Eggs"]
    finally:
        db_session.query(WeeklySummary).filter(WeeklySummary.user_id == USER_ID).delete()
        db_session.commit()


def test_export_scoped_to_user(api_client: TestClient, db_session: Session) -> None:
    other = uuid.uuid4()
    ids = _seed_graph(db_session, user_id=other)
    db_session.commit()

    body = api_client.get("/api/v1/export").json()
    rec_ids = {r["id"] for r in body["recordings"]}
    assert str(ids["recording"]) not in rec_ids
