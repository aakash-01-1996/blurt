import logging
import signal
import time
import traceback
from collections.abc import Callable

from blurt_core.config import settings
from blurt_core.db.models import Job
from blurt_core.db.session import get_session
from blurt_core.logging import configure_logging
from blurt_core.queue import claim, complete, fail, recover_stuck

from blurt_worker.handlers.normalize import handle_normalize
from blurt_worker.handlers.transcribe import handle_transcribe

configure_logging()
logger = logging.getLogger(__name__)

_running = True
_WORKER_ID = f"worker-{__name__}"

_handlers: dict[str, Callable[[Job], None]] = {
    "normalize": handle_normalize,
    "transcribe": handle_transcribe,
}

# Restrict to specific job kinds if HANDLED_KINDS is set (e.g. "normalize,transcribe")
_HANDLED_KINDS: list[str] | None = (
    [k.strip() for k in settings.handled_kinds.split(",") if k.strip()]
    if settings.handled_kinds
    else None
)


def _handle_sigterm(sig: int, frame: object) -> None:
    global _running
    logger.info("SIGTERM received, shutting down")
    _running = False


def _process_one() -> bool:
    """Claim and process one job. Returns True if a job was processed."""
    with get_session() as session:
        job = claim(session, _WORKER_ID, kinds=_HANDLED_KINDS)
        if job is None:
            return False
        job_id = job.id
        kind = job.kind

    handler = _handlers.get(kind)
    if handler is None:
        with get_session() as session:
            fail(session, job_id, f"unknown job kind: {kind}")
        logger.error("no handler for job kind", extra={"kind": kind})
        return True

    try:
        with get_session() as session:
            job_obj = session.get(Job, job_id)
            if job_obj is None:
                return True
        handler(job_obj)
        with get_session() as session:
            complete(session, job_id)
    except Exception:
        with get_session() as session:
            fail(session, job_id, traceback.format_exc())
        logger.exception("job failed", extra={"job_id": str(job_id), "kind": kind})

    return True


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    logger.info(
        "worker started",
        extra={"handled_kinds": _HANDLED_KINDS or "all"},
    )

    last_recover = 0.0

    while _running:
        now = time.monotonic()
        if now - last_recover >= 60:
            with get_session() as session:
                recover_stuck(session)
            last_recover = now

        try:
            processed = _process_one()
        except Exception:
            logger.exception("unexpected error in worker loop")
            processed = False

        if not processed:
            time.sleep(1)

    logger.info("worker stopped")


if __name__ == "__main__":
    main()
