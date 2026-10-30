import uuid
from typing import Any

from sqlalchemy.orm import Session

from blurt_core.db.models import Job, JobStatus


def enqueue(session: Session, job_type: str, payload: dict[str, Any]) -> Job:
    """Create a pending job and add it to the session (does not commit)."""
    import json

    job = Job(
        id=uuid.uuid4(),
        job_type=job_type,
        status=JobStatus.pending,
        payload=json.dumps(payload),
    )
    session.add(job)
    return job
