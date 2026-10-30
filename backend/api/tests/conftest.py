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
def test_engine() -> Generator[Engine, None, None]:
    engine = create_engine(_test_db_url(), pool_pre_ping=True)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def db_session(test_engine: Engine) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    s = SessionLocal()
    yield s
    s.rollback()
    s.close()


@pytest.fixture(autouse=True)
def _patch_api_db(monkeypatch: pytest.MonkeyPatch, test_engine: Engine) -> None:
    """Redirect all get_session calls in the API to the test database."""
    from contextlib import contextmanager

    import blurt_api.auth as auth_mod
    import blurt_api.routers.auth as auth_router_mod
    import blurt_api.routers.items as items_mod
    import blurt_api.routers.summaries as summaries_mod
    import blurt_core.db.session as session_mod

    TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    @contextmanager
    def _test_get_session() -> Generator[Session, None, None]:
        s = TestSession()
        try:
            yield s
            s.commit()
        except Exception:
            s.rollback()
            raise
        finally:
            s.close()

    monkeypatch.setattr(session_mod, "get_session", _test_get_session)
    monkeypatch.setattr(auth_mod, "get_session", _test_get_session)
    monkeypatch.setattr(auth_router_mod, "get_session", _test_get_session)
    monkeypatch.setattr(items_mod, "get_session", _test_get_session)
    monkeypatch.setattr(summaries_mod, "get_session", _test_get_session)
