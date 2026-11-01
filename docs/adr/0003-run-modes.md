# ADR 0003: Two run modes — local and cluster

**Status:** Accepted

## Context

Blurt needs to run on a laptop for development and in a Kubernetes cluster for
real use. We did not want a third "staging" environment (ADR 0001), and we
wanted the same code to run in both places with only configuration differing.

## Decision

The same packages run in both modes; only environment variables change
(`core` reads them through `Settings`, defaults in `.env`, overridden by the
cluster ConfigMap/Secret).

- **Local** — `make dev` runs `hivemind` against the `Procfile`: API
  (`uvicorn --reload`), worker, and the Next.js dev server as three local
  processes, against a local PostgreSQL. Defaults: `STORAGE_BACKEND=local`
  (disk under `./data/audio`), on-device STT (`mlx`), and a local
  OpenAI-compatible LLM (Ollama). One worker with empty `HANDLED_KINDS` handles
  every job kind.
- **Cluster** — Kubernetes (`make k8s-*`). The ConfigMap sets
  `STORAGE_BACKEND=s3` (an R2 bucket), STT `groq`, and a hosted
  OpenAI-compatible LLM. Secrets come from the `blurt-secrets` Secret (see the
  secret-handling note below). Workers run as two Deployments split by
  `HANDLED_KINDS` (see ADR 0002).

Secrets are never committed: local uses `.env` (gitignored); the cluster builds
`blurt-secrets` at apply time from the operator's keychain via
`scripts/k8s-secrets.sh`. Only `secret.example.yaml` (empty placeholders) is in
the repo.
