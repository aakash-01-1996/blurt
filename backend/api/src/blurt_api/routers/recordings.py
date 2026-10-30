import uuid

from blurt_core.audio import AudioError, probe_duration
from blurt_core.config import settings
from blurt_core.db.models import Recording, RecordingStatus
from blurt_core.db.session import get_session
from blurt_core.queue import enqueue
from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from blurt_api.deps import storage

router = APIRouter(prefix="/api/v1", tags=["recordings"])

MAX_BYTES = settings.max_upload_mb * 1024 * 1024
MAX_DURATION_S = 10 * 60  # 10 minutes


class RecordingOut(BaseModel):
    id: uuid.UUID
    status: RecordingStatus
    duration_s: float | None
    error: str | None

    model_config = {"from_attributes": True}


class RecordingListItem(BaseModel):
    id: uuid.UUID
    status: RecordingStatus
    duration_s: float | None
    created_at: str

    model_config = {"from_attributes": True}


@router.post("/recordings", status_code=status.HTTP_202_ACCEPTED, response_model=RecordingOut)
async def upload_recording(file: UploadFile) -> Recording:
    data = await file.read()

    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_mb} MB limit",
        )

    try:
        duration = probe_duration(data)
    except AudioError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    if duration > MAX_DURATION_S:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Recording exceeds 10-minute limit",
        )

    # Hardcode user_id for now (login is M10)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    recording_id = uuid.uuid4()
    ext = (file.filename or "audio").rsplit(".", 1)[-1]
    storage_key = f"recordings/{user_id}/{recording_id}.{ext}"

    storage.put(storage_key, data, file.content_type or "application/octet-stream")

    with get_session() as session:
        recording = Recording(
            id=recording_id,
            user_id=user_id,
            storage_key=storage_key,
            mime_type=file.content_type or "application/octet-stream",
            duration_s=duration,
            status=RecordingStatus.uploaded,
        )
        session.add(recording)
        enqueue(session, "normalize", {"recording_id": str(recording_id)})

    return recording


@router.get("/recordings", response_model=list[RecordingListItem])
def list_recordings() -> list[Recording]:
    with get_session() as session:
        recordings = list(
            session.execute(
                select(Recording).order_by(Recording.created_at.desc()).limit(20)
            ).scalars()
        )
        session.expunge_all()
        return recordings


@router.get("/recordings/{recording_id}", response_model=RecordingOut)
def get_recording(recording_id: uuid.UUID) -> Recording:
    with get_session() as session:
        recording = session.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(status_code=404, detail="Recording not found")
        session.expunge(recording)
        return recording


@router.get("/recordings/{recording_id}/audio-url")
def audio_url(recording_id: uuid.UUID) -> dict[str, str]:
    with get_session() as session:
        recording = session.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(status_code=404, detail="Recording not found")
        key = recording.storage_key

    url = storage.playback_url(key)
    return {"url": url}


@router.get("/audio/{key:path}")
def stream_audio(key: str) -> StreamingResponse:
    """Stream local audio files (local mode only)."""
    from blurt_core.providers.storage import LocalDiskStorage

    if not isinstance(storage, LocalDiskStorage):
        raise HTTPException(status_code=404, detail="Not available in S3 mode")
    try:
        data = storage.get(key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Audio not found")
    return StreamingResponse(iter([data]), media_type="audio/flac")
