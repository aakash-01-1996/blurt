import uuid
from collections.abc import Awaitable, Callable

from blurt_core.db.session import engine
from blurt_core.logging import configure_logging, request_id_var
from fastapi import FastAPI, Request
from fastapi.responses import Response
from sqlalchemy import text

from blurt_api.routers.items import router as items_router
from blurt_api.routers.recordings import router as recordings_router
from blurt_api.routers.summaries import router as summaries_router

configure_logging()

app = FastAPI(title="Blurt API")
app.include_router(recordings_router)
app.include_router(items_router)
app.include_router(summaries_router)


@app.middleware("http")
async def request_id_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    token = request_id_var.set(rid)
    try:
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        return response
    finally:
        request_id_var.reset(token)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
