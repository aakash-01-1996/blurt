import logging
import signal
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_running = True


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
