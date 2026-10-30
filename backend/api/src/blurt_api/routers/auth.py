from blurt_core.db.models import User
from blurt_core.db.session import get_session
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from blurt_api.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest) -> TokenOut:
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    with get_session() as session:
        existing = session.execute(
            select(User).where(User.email == body.email)
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(email=body.email, password_hash=hash_password(body.password))
        session.add(user)
        session.flush()
        user_id = user.id

    return TokenOut(access_token=create_access_token(user_id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest) -> TokenOut:
    with get_session() as session:
        user = session.execute(select(User).where(User.email == body.email)).scalar_one_or_none()

        if user is None or not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        user_id = user.id

    return TokenOut(access_token=create_access_token(user_id))
