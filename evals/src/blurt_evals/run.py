"""Run the routing + extraction evals against the configured LLM and report."""

import json
from datetime import UTC, datetime
from pathlib import Path

from blurt_core.config import settings
from blurt_core.providers.llm import build_llm_client

from blurt_evals.dataset import load_extraction_cases, load_routing_cases
from blurt_evals.metrics import extraction_metrics, routing_metrics
from blurt_evals.report import build_report, extraction_table, routing_table
from blurt_evals.subject import run_extraction, run_routing

_EVALS_ROOT = Path(__file__).resolve().parents[2]
DATASETS = _EVALS_ROOT / "datasets"
REPORTS = _EVALS_ROOT / "reports"


def main() -> int:
    llm = build_llm_client(settings)

    def model(messages: list[dict[str, str]]) -> str:
        return llm.complete(messages)

    routing = [run_routing(c, model) for c in load_routing_cases(DATASETS / "routing.jsonl")]
    extraction = [
        run_extraction(c, model) for c in load_extraction_cases(DATASETS / "extraction.jsonl")
    ]

    routing_m = routing_metrics(routing)
    extraction_m = extraction_metrics(extraction)

    print(routing_table(routing_m))
    print()
    print(extraction_table(extraction_m))

    REPORTS.mkdir(exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = REPORTS / f"{stamp}.json"
    path.write_text(json.dumps(build_report(routing_m, extraction_m), indent=2))
    print(f"\nReport written to {path.relative_to(_EVALS_ROOT.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
