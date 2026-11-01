import uuid

import pytest
from blurt_api.auth import create_audio_token, verify_audio_token
from blurt_api.deps import storage
from blurt_core.db.models import Recording, RecordingStatus, User
from blurt_core.providers.storage import LocalDiskStorage
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

local_only = pytest.mark.skipif(
    not isinstance(storage, LocalDiskStorage), reason="local-disk storage only"
)


def _seed_recording(session: Session, key: str, user_id: uuid.UUID = USER_ID) -> uuid.UUID:
    if not session.get(User, user_id):
        session.add(User(id=user_id, email=f"{user_id}@blurt.dev", password_hash="x"))
        session.flush()
    rec = Recording(
        user_id=user_id,
        storage_key=key,
        mime_type="audio/flac",
        status=RecordingStatus.ready,
    )
    session.add(rec)
    session.flush()
    return rec.id


def test_audio_token_roundtrip() -> None:
    key = "recordings/u/r.flac"
    token = create_audio_token(key)
    assert verify_audio_token(token, key) is True
    # wrong key, garbage, and empty token are all rejected
    assert verify_audio_token(token, "recordings/u/other.flac") is False
    assert verify_audio_token("not-a-token", key) is False
    assert verify_audio_token("", key) is False


@local_only
def test_audio_url_includes_token(api_client: TestClient, db_session: Session) -> None:
    key = f"recordings/{USER_ID}/{uuid.uuid4()}.flac"
    rec_id = _seed_recording(db_session, key)
    db_session.commit()

    body = api_client.get(f"/api/v1/recordings/{rec_id}/audio-url").json()
    assert "?token=" in body["url"]


@local_only
def test_stream_audio_rejects_missing_or_bad_token(api_client: TestClient) -> None:
    key = "recordings/someone/clip.flac"
    assert api_client.get(f"/api/v1/audio/{key}").status_code == 403
    assert api_client.get(f"/api/v1/audio/{key}?token=bad").status_code == 403


@local_only
def test_stream_audio_with_valid_token(api_client: TestClient) -> None:
    key = f"recordings/test/{uuid.uuid4()}.flac"
    storage.put(key, b"FLACDATA", "audio/flac")
    try:
        token = create_audio_token(key)
        res = api_client.get(f"/api/v1/audio/{key}?token={token}")
        assert res.status_code == 200
        assert res.content == b"FLACDATA"
        # a token minted for one key does not stream another
        other = create_audio_token("recordings/test/other.flac")
        assert api_client.get(f"/api/v1/audio/{key}?token={other}").status_code == 403
    finally:
        storage.delete(key)
