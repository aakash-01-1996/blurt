"""JWT utilities and the FastAPI auth dependency."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
from blurt_core.config import settings
from blurt_core.db.models import User
from blurt_core.db.session import get_session
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

_bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    hashed: bytes = bcrypt.hashpw(plain.encode(), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bool(bcrypt.checkpw(plain.encode(), hashed.encode()))


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return str(jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm))


def _decode_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        if sub is None:
            raise ValueError("missing sub")
        return uuid.UUID(sub)
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> uuid.UUID:
    return _decode_token(credentials.credentials)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> User:
    user_id = _decode_token(credentials.credentials)
    with get_session() as session:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        session.expunge(user)
    return user


CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
