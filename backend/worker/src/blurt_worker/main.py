import logging
import signal
import time
from collections.abc import Callable

from blurt_core.db.models import Job
from blurt_core.logging import configure_logging

from blurt_worker.handlers.normalize import handle_normalize

configure_logging()
logger = logging.getLogger(__name__)

_running = True

_handlers: dict[str, Callable[[Job], None]] = {
    "normalize": handle_normalize,
}


def _handle_sigterm(sig: int, frame: object) -> None:
    global _running
    logger.info("SIGTERM received, shutting down")
    _running = False


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    logger.info("worker started")
    while _running:
        time.sleep(1)
    logger.info("worker stopped")


if __name__ == "__main__":
    main()
