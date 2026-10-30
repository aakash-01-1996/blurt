import signal
import threading
import time
from unittest.mock import patch

import blurt_worker.main as wm


def test_worker_starts_and_stops() -> None:
    wm._running = True
    # signal.signal only works on main thread; patch it out for test
    with patch.object(signal, "signal"):
        t = threading.Thread(target=wm.main, daemon=True)
        t.start()
        time.sleep(0.1)
        wm._running = False
        t.join(timeout=2)
    assert not t.is_alive()
