import logging
import uuid

from blurt_core.audio import AudioError, normalize
from blurt_core.config import settings
from blurt_core.db.models import Job, Recording, RecordingStatus
from blurt_core.db.session import get_session
from blurt_core.providers.storage import build_storage_provider
from blurt_core.queue import enqueue

logger = logging.getLogger(__name__)

storage = build_storage_provider(settings)


def handle_normalize(job: Job) -> None:
    import json

    payload = json.loads(job.payload) if isinstance(job.payload, str) else job.payload
    recording_id = uuid.UUID(payload["recording_id"])

    with get_session() as session:
        recording = session.get(Recording, recording_id)
        if recording is None:
            raise ValueError(f"Recording {recording_id} not found")

        recording.status = RecordingStatus.normalizing
        original_key = recording.storage_key

    raw_audio = storage.get(original_key)

    try:
        normalized = normalize(raw_audio)
    except AudioError as e:
        with get_session() as session:
            recording = session.get(Recording, recording_id)
            if recording:
                recording.status = RecordingStatus.failed
                recording.error = str(e)
        raise

    # Store normalized file with .flac extension
    flac_key = original_key.rsplit(".", 1)[0] + ".flac"
    storage.put(flac_key, normalized, "audio/flac")
    storage.delete(original_key)

    with get_session() as session:
        recording = session.get(Recording, recording_id)
        if recording is None:
            raise ValueError(f"Recording {recording_id} not found")
        recording.storage_key = flac_key
        recording.status = RecordingStatus.transcribing
        enqueue(session, "transcribe", {"recording_id": str(recording_id)})

    logger.info("normalized recording", extra={"recording_id": str(recording_id)})
