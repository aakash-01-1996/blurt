import blurt_api.deps as deps
import pytest
from blurt_api.main import app
from blurt_core.providers.storage import FakeStorage
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def fake_storage(monkeypatch: pytest.MonkeyPatch) -> FakeStorage:
    fs = FakeStorage()
    monkeypatch.setattr(deps, "storage", fs)
    # Also patch it in the router module
    import blurt_api.routers.recordings as rec_module

    monkeypatch.setattr(rec_module, "storage", fs)
    return fs


client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200


def test_upload_too_large() -> None:
    big = b"x" * (26 * 1024 * 1024)
    r = client.post(
        "/api/v1/recordings",
        files={"file": ("rec.webm", big, "audio/webm")},
    )
    assert r.status_code == 413
