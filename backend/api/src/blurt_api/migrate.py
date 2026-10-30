"""Alembic migration entrypoint for the Kubernetes migrate Job."""

from alembic import command
from alembic.config import Config
from blurt_core.config import settings


def run() -> None:
    cfg = Config()
    cfg.set_main_option("script_location", "/app/core/alembic")
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    run()
