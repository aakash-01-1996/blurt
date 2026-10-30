from blurt_api.main import app
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

client = TestClient(app)

_EMAIL = "alice@example.com"
_PASSWORD = "supersecret123"


# ── POST /auth/signup ─────────────────────────────────────────────────────────


def test_signup_returns_token(db_session: Session) -> None:
    r = client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": _PASSWORD})
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_signup_duplicate_email(db_session: Session) -> None:
    client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": _PASSWORD})
    r = client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": _PASSWORD})
    assert r.status_code == 409


def test_signup_short_password(db_session: Session) -> None:
    r = client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": "short"})
    assert r.status_code == 422


def test_signup_invalid_email(db_session: Session) -> None:
    r = client.post("/api/v1/auth/signup", json={"email": "not-an-email", "password": _PASSWORD})
    assert r.status_code == 422


# ── POST /auth/login ──────────────────────────────────────────────────────────


def test_login_returns_token(db_session: Session) -> None:
    client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": _PASSWORD})
    r = client.post("/api/v1/auth/login", json={"email": _EMAIL, "password": _PASSWORD})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(db_session: Session) -> None:
    client.post("/api/v1/auth/signup", json={"email": _EMAIL, "password": _PASSWORD})
    r = client.post("/api/v1/auth/login", json={"email": _EMAIL, "password": "wrongpassword"})
    assert r.status_code == 401


def test_login_unknown_email(db_session: Session) -> None:
    r = client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": _PASSWORD}
    )
    assert r.status_code == 401
