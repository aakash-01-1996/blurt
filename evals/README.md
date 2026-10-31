# blurt_evals

Offline quality checks for the LLM pipeline — how well routing (sorting into
sections) and extraction (field prediction) perform against a labeled dataset.

The harness reuses the **real** prompts from `blurt_core.pipeline`
(`routing.py`, `extraction.py`), so an eval measures exactly what production runs.

## What it measures

- **Routing** — accuracy, per-class precision/recall/F1, and a confusion matrix
  over the `work_log | task | note | skip` sections.
- **Extraction** — per field: *key presence* (did the model return the expected
  key) as the primary signal, and *value match* (normalized exact match) as the
  stricter secondary signal.

## Running

```bash
make eval-data   # offline: validate datasets + print composition (no LLM)
make eval        # live: run against the configured LLM, print a scorecard,
                 # and write evals/reports/<timestamp>.json
```

`make eval` uses the LLM configured in `blurt_core.config.settings`
(`llm_base_url`, `llm_api_key`, `llm_model`) — the same client the worker uses.
It costs tokens and is non-deterministic, so it is **run on demand**, not in CI.

## Datasets

`datasets/*.jsonl`, one JSON object per line (`#` comments and blank lines
ignored):

```jsonl
{"id": "r-tk-1", "text": "Call the dentist Tuesday.", "expected_section": "task"}
{"id": "e-tk-1", "section": "task", "text": "Call the dentist Tuesday.", "expected_fields": {"title": "Call the dentist"}}
```

Grow the dataset by adding lines; `make eval-data` and the dataset tests validate
sections and unique ids.

## CI

The harness **framework** is unit-tested with a fake model (`evals/tests/`,
deterministic, free) and runs in the normal `pytest` job. The live `make eval`
is intentionally excluded from CI.
