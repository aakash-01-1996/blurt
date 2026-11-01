# ADR 0001: Monorepo and stack choices

**Status:** Accepted

## Context

Starting Blurt from scratch. Needed to pick a repo structure and core stack.

## Decision

- **Monorepo** with a `uv` workspace: `core`, `backend/api`, `backend/worker`, `evals`
- **Python 3.12** managed by `uv`, **Node 24** for the frontend
- **FastAPI** for the API, **Next.js App Router** for the frontend
- **PostgreSQL 18** as the only data store (also used for the job queue)

## Consequences

- All Python packages share `blurt_core` in one PR
- `uv` handles virtualenvs and workspace resolution
- No separate staging environment — local mode and production (cluster) only
