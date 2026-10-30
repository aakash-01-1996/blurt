# ── Build stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

COPY pyproject.toml uv.lock ./
COPY core/pyproject.toml core/
COPY backend/api/pyproject.toml backend/api/
COPY backend/worker/pyproject.toml backend/worker/
COPY evals/pyproject.toml evals/

RUN uv sync --frozen --no-dev --no-install-workspace

COPY core/src/ core/src/
COPY backend/worker/src/ backend/worker/src/
COPY evals/src/ evals/src/

RUN uv sync --frozen --no-dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash blurt

COPY --from=builder --chown=blurt:blurt /app/.venv /app/.venv
COPY --from=builder --chown=blurt:blurt /app/core/src /app/core/src
COPY --from=builder --chown=blurt:blurt /app/backend/worker/src /app/backend/worker/src

USER blurt

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/core/src:/app/backend/worker/src"

CMD ["python", "-m", "blurt_worker.main"]
