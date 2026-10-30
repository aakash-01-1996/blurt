import logging
import signal
import socket
import time
import uuid
from collections.abc import Callable

from blurt_core.db.models import Job
from blurt_core.db.session import get_session
from blurt_core.queue import claim, complete, fail, recover_stuck

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Handler registry: job kind → callable
_handlers: dict[str, Callable[[Job], None]] = {}

_running = True
_current_job_id: uuid.UUID | None = None

WORKER_ID = f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
POLL_INTERVAL = 1  # seconds
RECOVER_INTERVAL = 60  # seconds


def _handle_sigterm(sig: int, frame: object) -> None:
    global _running
    logger.info("SIGTERM received, will stop after current job")
    _running = False


def _process_one() -> bool:
    """Claim and run one job. Returns True if a job was found."""
    global _current_job_id
    with get_session() as session:
        job = claim(session, WORKER_ID)
        if job is None:
            return False
        _current_job_id = job.id
        handler = _handlers.get(job.kind)
        if handler is None:
            fail(session, job.id, f"no handler for job kind '{job.kind}'")
            _current_job_id = None
            return True
        try:
            handler(job)
            complete(session, job.id)
        except Exception as exc:
            fail(session, job.id, str(exc))
            logger.exception("job failed", extra={"job_id": str(job.id)})
        finally:
            _current_job_id = None
    return True


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    logger.info("worker started", extra={"worker_id": WORKER_ID})

    last_recover = time.monotonic()

    while _running:
        if time.monotonic() - last_recover >= RECOVER_INTERVAL:
            with get_session() as session:
                recover_stuck(session)
            last_recover = time.monotonic()

        found = _process_one()
        if not found:
            time.sleep(POLL_INTERVAL)

    # If we were in the middle of a job when SIGTERM arrived, it will have
    # already been marked failed/completed by _process_one before _running
    # was checked again — no extra cleanup needed here.
    logger.info("worker stopped")


if __name__ == "__main__":
    main()
