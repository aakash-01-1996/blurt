from blurt_core.db.session import engine
from fastapi import FastAPI
from sqlalchemy import text

from blurt_api.routers.recordings import router as recordings_router

app = FastAPI(title="Blurt API")
app.include_router(recordings_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
