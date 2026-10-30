from fastapi import FastAPI

app = FastAPI(title="Blurt API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
