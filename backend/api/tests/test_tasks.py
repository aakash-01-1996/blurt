import uuid

from blurt_core.db.models import (
    Item,
    ItemStatus,
    Recording,
    RecordingStatus,
    Task,
    TaskStatus,
    User,
)
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _ensure_user(session: Session, user_id: uuid.UUID = USER_ID) -> None:
    if not session.get(User, user_id):
        session.add(User(id=user_id, email=f"{user_id}@blurt.dev", password_hash="x"))
        session.flush()


def _seed_task_item(
    session: Session,
    user_id: uuid.UUID = USER_ID,
    fields: dict | None = None,  # type: ignore[type-arg]
    span: str = "Call the dentist on Tuesday.",
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
        section="task",
        span_text=span,
        fields=fields,
        status=status,
    )
    session.add(item)
    session.flush()
    return item.id


def _seed_task_row(session: Session, status: TaskStatus = TaskStatus.open) -> uuid.UUID:
    item_id = _seed_task_item(session, status=ItemStatus.approved)
    task = Task(
        user_id=USER_ID,
        item_id=item_id,
        title="Call the dentist",
        project="personal",
        status=status,
    )
    session.add(task)
    session.flush()
    return task.id


def _clear_tasks(session: Session) -> None:
    session.query(Task).delete()
    session.commit()


def test_list_tasks_empty(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    res = api_client.get("/api/v1/tasks")
    assert res.status_code == 200
    assert res.json() == []


def test_approving_task_item_creates_task(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    item_id = _seed_task_item(
        db_session,
        fields={"title": "Call the dentist", "due_date": "2026-11-03", "project": "personal"},
    )
    db_session.commit()

    res = api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    assert res.status_code == 200

    tasks = api_client.get("/api/v1/tasks").json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Call the dentist"
    assert tasks[0]["project"] == "personal"
    assert tasks[0]["status"] == "open"
    assert tasks[0]["due_date"] is not None
    assert tasks[0]["item_id"] == str(item_id)


def test_approving_task_without_fields_falls_back_to_span(
    api_client: TestClient, db_session: Session
) -> None:
    _clear_tasks(db_session)
    item_id = _seed_task_item(db_session, fields=None, span="Buy groceries.")
    db_session.commit()

    api_client.post(f"/api/v1/items/{item_id}/review", json={"action": "approve"})
    tasks = api_client.get("/api/v1/tasks").json()
    assert [t["title"] for t in tasks] == ["Buy groceries."]


def test_mark_task_done_sets_completed_at(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    task_id = _seed_task_row(db_session)
    db_session.commit()

    res = api_client.patch(f"/api/v1/tasks/{task_id}", json={"status": "done"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "done"
    assert body["completed_at"] is not None


def test_reopen_task_clears_completed_at(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    task_id = _seed_task_row(db_session, status=TaskStatus.done)
    db_session.commit()

    res = api_client.patch(f"/api/v1/tasks/{task_id}", json={"status": "open"})
    assert res.status_code == 200
    assert res.json()["completed_at"] is None


def test_update_task_title_and_project(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    task_id = _seed_task_row(db_session)
    db_session.commit()

    res = api_client.patch(
        f"/api/v1/tasks/{task_id}", json={"title": "Call dentist back", "project": "health"}
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Call dentist back"
    assert res.json()["project"] == "health"


def test_patch_task_404_for_unknown(api_client: TestClient) -> None:
    res = api_client.patch(f"/api/v1/tasks/{uuid.uuid4()}", json={"status": "done"})
    assert res.status_code == 404


def test_tasks_are_scoped_to_the_user(api_client: TestClient, db_session: Session) -> None:
    _clear_tasks(db_session)
    other = uuid.uuid4()
    other_item = _seed_task_item(db_session, user_id=other, status=ItemStatus.approved)
    other_task = Task(user_id=other, item_id=other_item, title="Someone else's task")
    db_session.add(other_task)
    db_session.flush()
    other_task_id = other_task.id
    db_session.commit()

    listed = api_client.get("/api/v1/tasks").json()
    assert all(t["title"] != "Someone else's task" for t in listed)

    res = api_client.patch(f"/api/v1/tasks/{other_task_id}", json={"status": "done"})
    assert res.status_code == 404
