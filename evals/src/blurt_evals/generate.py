"""Validate the eval datasets and print their composition (no LLM calls)."""

from collections import Counter
from pathlib import Path

from blurt_evals.dataset import load_extraction_cases, load_routing_cases

_EVALS_ROOT = Path(__file__).resolve().parents[2]
DATASETS = _EVALS_ROOT / "datasets"


def main() -> int:
    routing = load_routing_cases(DATASETS / "routing.jsonl")
    extraction = load_extraction_cases(DATASETS / "extraction.jsonl")

    print(f"routing.jsonl — {len(routing)} cases")
    for section, n in sorted(Counter(c.expected_section for c in routing).items()):
        print(f"  {section:<10} {n}")

    print(f"\nextraction.jsonl — {len(extraction)} cases")
    for section, n in sorted(Counter(c.section for c in extraction).items()):
        print(f"  {section:<10} {n}")

    ids = [c.id for c in routing] + [c.id for c in extraction]
    dupes = [cid for cid, n in Counter(ids).items() if n > 1]
    if dupes:
        print(f"\nWARNING: duplicate case ids: {dupes}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
