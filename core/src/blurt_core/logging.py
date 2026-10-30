import json
import logging
import os
import sys
from contextvars import ContextVar
from typing import Any

# Context variables — set per-request or per-job
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
job_id_var: ContextVar[str] = ContextVar("job_id", default="")
recording_id_var: ContextVar[str] = ContextVar("recording_id", default="")

POD_NAME = os.environ.get("POD_NAME", "local")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log: dict[str, Any] = {
            "time": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "pod": POD_NAME,
        }
        if rid := request_id_var.get():
            log["request_id"] = rid
        if jid := job_id_var.get():
            log["job_id"] = jid
        if rec := recording_id_var.get():
            log["recording_id"] = rec
        if record.exc_info:
            log["exc_info"] = self.formatException(record.exc_info)
        # Include any extra fields passed via extra={}
        _STANDARD_KEYS = {
            "name",
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
            "message",
            "taskName",
        }
        for key, val in record.__dict__.items():
            if key not in _STANDARD_KEYS:
                log[key] = val
        return json.dumps(log)


def configure_logging(level: str = "INFO") -> None:
    """Call once at process startup."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
