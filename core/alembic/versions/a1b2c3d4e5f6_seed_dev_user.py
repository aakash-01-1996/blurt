"""seed dev user

Revision ID: a1b2c3d4e5f6
Revises: e5c0c4c0d7a6
Create Date: 2026-10-29 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "e5c0c4c0d7a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
_DEV_USER_EMAIL = "dev@blurt.local"
_DEV_USER_HASH = "dev-only-not-a-real-hash"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO users (id, email, password_hash)
        VALUES ('{_DEV_USER_ID}', '{_DEV_USER_EMAIL}', '{_DEV_USER_HASH}')
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM users WHERE id = '{_DEV_USER_ID}'")
