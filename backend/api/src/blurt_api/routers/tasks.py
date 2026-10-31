import uuid
from datetime import UTC, datetime

from blurt_core.db.models import Task, TaskStatus
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from blurt_api.auth import CurrentUserId

router = APIRouter(prefix="/api/v1", tags=["tasks"])


class TaskOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    title: str
    due_date: datetime | None
    project: str | None
    status: TaskStatus
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    title: str | None = None
    project: str | None = None


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(user_id: CurrentUserId) -> list[Task]:
    with get_session() as session:
        rows = (
            session.execute(
                select(Task)
                .where(Task.user_id == user_id)
                .order_by(
                    Task.completed_at.asc().nullsfirst(),
                    Task.due_date.asc().nullslast(),
                    Task.created_at.desc(),
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            session.expunge(row)
        return list(rows)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: uuid.UUID, body: TaskUpdate, user_id: CurrentUserId) -> Task:
    with get_session() as session:
        task = session.get(Task, task_id)
        if task is None or task.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        data = body.model_dump(exclude_unset=True)
        if data.get("status") is not None:
            task.status = data["status"]
            task.completed_at = datetime.now(UTC) if task.status == TaskStatus.done else None
        if data.get("title") is not None:
            task.title = data["title"]
        if "project" in data:
            task.project = data["project"]

        session.flush()
        session.expunge(task)
        return task
