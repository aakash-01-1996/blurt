"""WebAuthn / passkey registration and login ceremonies.

Additive to password auth: a user registers passkeys from Settings (while
logged in) and can then sign in with one. Both issue the same JWT.

The challenge that must survive between the begin/complete round-trips is
carried in a short-lived signed token (not server state), so this works across
stateless API replicas.
"""

import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import webauthn
from blurt_core.config import settings
from blurt_core.db.models import Credential, User
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from blurt_api.auth import CurrentUserId, create_access_token

router = APIRouter(prefix="/api/v1/auth/passkey", tags=["passkey"])

_CHALLENGE_TTL = timedelta(minutes=5)


# ── challenge token (stateless) ───────────────────────────────────────────────


def _issue_challenge(challenge: bytes, scope: str, sub: str) -> str:
    payload = {
        "chal": bytes_to_base64url(challenge),
        "scope": scope,
        "sub": sub,
        "exp": datetime.now(UTC) + _CHALLENGE_TTL,
    }
    return str(jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm))


def _read_challenge(token: str, scope: str) -> tuple[bytes, str]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired challenge"
        ) from exc
    if payload.get("scope") != scope:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wrong challenge scope")
    return base64url_to_bytes(payload["chal"]), str(payload["sub"])


# ── request/response bodies ───────────────────────────────────────────────────


class BeginOut(BaseModel):
    options: dict[str, Any]
    challenge_token: str


class RegisterComplete(BaseModel):
    credential: dict[str, Any]
    challenge_token: str
    label: str | None = None


class LoginBegin(BaseModel):
    email: EmailStr


class LoginComplete(BaseModel):
    credential: dict[str, Any]
    challenge_token: str


class CredentialOut(BaseModel):
    id: uuid.UUID
    label: str | None
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── registration (authenticated, from Settings) ───────────────────────────────


@router.post("/register/begin", response_model=BeginOut)
def register_begin(user_id: CurrentUserId) -> BeginOut:
    with get_session() as session:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        existing = list(
            session.execute(
                select(Credential.credential_id).where(Credential.user_id == user_id)
            ).scalars()
        )
        email = user.email

    options = webauthn.generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_id=user_id.bytes,
        user_name=email,
        user_display_name=email,
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(cid)) for cid in existing
        ],
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    token = _issue_challenge(options.challenge, "passkey-register", str(user_id))
    return BeginOut(options=json.loads(webauthn.options_to_json(options)), challenge_token=token)


@router.post("/register/complete", response_model=CredentialOut)
def register_complete(body: RegisterComplete, user_id: CurrentUserId) -> Credential:
    challenge, sub = _read_challenge(body.challenge_token, "passkey-register")
    if sub != str(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge mismatch")

    try:
        verification = webauthn.verify_registration_response(
            credential=body.credential,
            expected_challenge=challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Passkey registration failed: {exc}"
        ) from exc

    cred_id = bytes_to_base64url(verification.credential_id)
    with get_session() as session:
        if session.execute(
            select(Credential).where(Credential.credential_id == cred_id)
        ).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Passkey already registered"
            )
        cred = Credential(
            user_id=user_id,
            credential_id=cred_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            label=body.label,
        )
        session.add(cred)
        session.flush()
        session.expunge(cred)
        return cred


# ── login (unauthenticated, email-first) ──────────────────────────────────────


@router.post("/login/begin", response_model=BeginOut)
def login_begin(body: LoginBegin) -> BeginOut:
    with get_session() as session:
        user = session.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
        cred_ids = (
            list(
                session.execute(
                    select(Credential.credential_id).where(Credential.user_id == user.id)
                ).scalars()
            )
            if user
            else []
        )
    if not cred_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No passkeys for this account"
        )

    options = webauthn.generate_authentication_options(
        rp_id=settings.webauthn_rp_id,
        allow_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(cid)) for cid in cred_ids
        ],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    token = _issue_challenge(options.challenge, "passkey-login", body.email)
    return BeginOut(options=json.loads(webauthn.options_to_json(options)), challenge_token=token)


@router.post("/login/complete", response_model=TokenOut)
def login_complete(body: LoginComplete) -> TokenOut:
    challenge, email = _read_challenge(body.challenge_token, "passkey-login")

    raw_id = body.credential.get("id") or body.credential.get("rawId")
    if not raw_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed credential")

    with get_session() as session:
        cred = session.execute(
            select(Credential).where(Credential.credential_id == str(raw_id))
        ).scalar_one_or_none()
        user = session.get(User, cred.user_id) if cred else None
        if cred is None or user is None or user.email != email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown passkey")

        try:
            verification = webauthn.verify_authentication_response(
                credential=body.credential,
                expected_challenge=challenge,
                expected_rp_id=settings.webauthn_rp_id,
                expected_origin=settings.webauthn_origin,
                credential_public_key=cred.public_key,
                credential_current_sign_count=cred.sign_count,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Passkey login failed: {exc}"
            ) from exc

        cred.sign_count = verification.new_sign_count
        cred.last_used_at = datetime.now(UTC)
        user_id = user.id

    return TokenOut(access_token=create_access_token(user_id))


# ── manage ────────────────────────────────────────────────────────────────────


@router.get("/credentials", response_model=list[CredentialOut])
def list_credentials(user_id: CurrentUserId) -> list[Credential]:
    with get_session() as session:
        rows = (
            session.execute(
                select(Credential)
                .where(Credential.user_id == user_id)
                .order_by(Credential.created_at.desc())
            )
            .scalars()
            .all()
        )
        session.expunge_all()
        return list(rows)


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(credential_id: uuid.UUID, user_id: CurrentUserId) -> None:
    with get_session() as session:
        cred = session.get(Credential, credential_id)
        if cred is None or cred.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passkey not found")
        session.delete(cred)
