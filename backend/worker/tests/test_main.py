import threading
import time

import blurt_worker.main as wm


def test_worker_starts_and_stops() -> None:
    wm._running = True
    t = threading.Thread(target=wm.main, daemon=True)
    t.start()
    time.sleep(0.1)
    wm._running = False
    t.join(timeout=2)
    assert not t.is_alive()
