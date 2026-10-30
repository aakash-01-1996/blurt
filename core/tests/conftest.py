import os
from collections.abc import Generator

import pytest
from blurt_core.config import settings
from blurt_core.db.models import Base
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker


def _test_db_url() -> str:
    return os.environ.get(
        "TEST_DATABASE_URL", settings.database_url.replace("/blurt", "/blurt_test")
    )


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine, None, None]:
    url = _test_db_url()
    engine = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def session(db_engine: Engine) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(bind=db_engine, autoflush=False, autocommit=False)
    s = SessionLocal()
    yield s
    s.rollback()
    s.close()
