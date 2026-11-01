import uuid

import pytest
import webauthn
from blurt_api.routers.passkey import _issue_challenge, _read_challenge
from blurt_core.db.models import Credential, User
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from webauthn.helpers import bytes_to_base64url

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_EMAIL = "test@blurt.dev"

RAW_CRED_ID = b"\x01\x02\x03credential-bytes"
CRED_ID_B64 = bytes_to_base64url(RAW_CRED_ID)


class _FakeReg:
    credential_id = RAW_CRED_ID
    credential_public_key = b"FAKE_PUBLIC_KEY"
    sign_count = 0


class _FakeAuth:
    new_sign_count = 7


def _ensure_user(
    session: Session, user_id: uuid.UUID = TEST_USER_ID, email: str = TEST_EMAIL
) -> None:
    if not session.get(User, user_id):
        session.add(User(id=user_id, email=email, password_hash="x"))
        session.flush()


def _seed_credential(
    session: Session, user_id: uuid.UUID = TEST_USER_ID, cred_id: str = CRED_ID_B64
) -> uuid.UUID:
    email = TEST_EMAIL if user_id == TEST_USER_ID else f"{user_id}@blurt.dev"
    _ensure_user(session, user_id, email=email)
    cred = Credential(
        user_id=user_id,
        credential_id=cred_id,
        public_key=b"FAKE_PUBLIC_KEY",
        sign_count=0,
    )
    session.add(cred)
    session.flush()
    return cred.id


def _clear(session: Session) -> None:
    session.query(Credential).delete()
    session.commit()


# ── challenge token ───────────────────────────────────────────────────────────


def test_challenge_token_roundtrip() -> None:
    token = _issue_challenge(b"\x00\x01\x02", "passkey-register", str(TEST_USER_ID))
    challenge, sub = _read_challenge(token, "passkey-register")
    assert challenge == b"\x00\x01\x02"
    assert sub == str(TEST_USER_ID)


def test_challenge_token_wrong_scope_rejected() -> None:
    from fastapi import HTTPException

    token = _issue_challenge(b"abc", "passkey-login", "x@y.z")
    with pytest.raises(HTTPException) as ei:
        _read_challenge(token, "passkey-register")
    assert ei.value.status_code == 400


# ── registration ──────────────────────────────────────────────────────────────


def test_register_begin_returns_options(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    res = api_client.post("/api/v1/auth/passkey/register/begin")
    assert res.status_code == 200
    body = res.json()
    assert "challenge" in body["options"]
    assert body["options"]["rp"]["id"] == "localhost"
    assert body["challenge_token"]


def test_register_complete_stores_credential(
    api_client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _clear(db_session)
    token = _issue_challenge(b"challenge-bytes", "passkey-register", str(TEST_USER_ID))
    monkeypatch.setattr(webauthn, "verify_registration_response", lambda **_: _FakeReg())

    res = api_client.post(
        "/api/v1/auth/passkey/register/complete",
        json={"credential": {"id": CRED_ID_B64}, "challenge_token": token, "label": "MacBook"},
    )
    assert res.status_code == 200
    assert res.json()["label"] == "MacBook"

    db_session.expire_all()
    stored = db_session.query(Credential).filter_by(credential_id=CRED_ID_B64).one()
    assert stored.user_id == TEST_USER_ID
    assert stored.public_key == b"FAKE_PUBLIC_KEY"


def test_register_complete_rejects_foreign_challenge(
    api_client: TestClient, db_session: Session
) -> None:
    _clear(db_session)
    # challenge minted for a different subject
    token = _issue_challenge(b"x", "passkey-register", str(uuid.uuid4()))
    res = api_client.post(
        "/api/v1/auth/passkey/register/complete",
        json={"credential": {"id": CRED_ID_B64}, "challenge_token": token},
    )
    assert res.status_code == 400


# ── login ───────────────────────────────────────────────────────────────────


def test_login_begin_404_without_passkeys(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    _ensure_user(db_session)
    db_session.commit()
    res = api_client.post("/api/v1/auth/passkey/login/begin", json={"email": TEST_EMAIL})
    assert res.status_code == 404


def test_login_begin_returns_options(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    _seed_credential(db_session)
    db_session.commit()
    res = api_client.post("/api/v1/auth/passkey/login/begin", json={"email": TEST_EMAIL})
    assert res.status_code == 200
    assert res.json()["options"]["challenge"]
    assert res.json()["challenge_token"]


def test_login_complete_issues_token_and_bumps_sign_count(
    api_client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _clear(db_session)
    _seed_credential(db_session)
    db_session.commit()
    token = _issue_challenge(b"login-challenge", "passkey-login", TEST_EMAIL)
    monkeypatch.setattr(webauthn, "verify_authentication_response", lambda **_: _FakeAuth())

    res = api_client.post(
        "/api/v1/auth/passkey/login/complete",
        json={"credential": {"id": CRED_ID_B64}, "challenge_token": token},
    )
    assert res.status_code == 200
    assert res.json()["access_token"]

    db_session.expire_all()
    stored = db_session.query(Credential).filter_by(credential_id=CRED_ID_B64).one()
    assert stored.sign_count == 7
    assert stored.last_used_at is not None


def test_login_complete_unknown_credential_401(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    _seed_credential(db_session)
    db_session.commit()
    token = _issue_challenge(b"login-challenge", "passkey-login", TEST_EMAIL)
    res = api_client.post(
        "/api/v1/auth/passkey/login/complete",
        json={"credential": {"id": "unknown-cred-id"}, "challenge_token": token},
    )
    assert res.status_code == 401


# ── manage ────────────────────────────────────────────────────────────────────


def test_list_and_delete_credentials(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    cred_id = _seed_credential(db_session)
    db_session.commit()

    listed = api_client.get("/api/v1/auth/passkey/credentials").json()
    assert [c["id"] for c in listed] == [str(cred_id)]

    assert api_client.delete(f"/api/v1/auth/passkey/credentials/{cred_id}").status_code == 204
    assert api_client.get("/api/v1/auth/passkey/credentials").json() == []


def test_delete_credential_scoped_to_user(api_client: TestClient, db_session: Session) -> None:
    _clear(db_session)
    other = uuid.uuid4()
    foreign = _seed_credential(db_session, user_id=other, cred_id="other-cred")
    db_session.commit()

    assert api_client.delete(f"/api/v1/auth/passkey/credentials/{foreign}").status_code == 404
    assert api_client.get("/api/v1/auth/passkey/credentials").json() == []
