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
from blurt_evals.thresholds import check_thresholds, load_thresholds

_EVALS_ROOT = Path(__file__).resolve().parents[2]
DATASETS = _EVALS_ROOT / "datasets"
REPORTS = _EVALS_ROOT / "reports"
THRESHOLDS = _EVALS_ROOT / "thresholds.json"


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

    for label, failures in (("routing", routing_m.failures), ("extraction", extraction_m.failures)):
        for f in failures:
            print(f"  FAIL [{label}] {f['case_id']}: {f['error']}")

    report = build_report(routing_m, extraction_m)
    REPORTS.mkdir(exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = REPORTS / f"{stamp}.json"
    path.write_text(json.dumps(report, indent=2))
    print(f"\nReport written to {path.relative_to(_EVALS_ROOT.parent)}")

    results = check_thresholds(report, load_thresholds(THRESHOLDS))
    exit_code = 0
    if results:
        print("\nThresholds:")
        for r in results:
            mark = "PASS" if r.passed else "FAIL"
            print(f"  [{mark}] {r.name}: {r.value:.1%} (min {r.minimum:.0%})")
            if not r.passed:
                exit_code = 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
