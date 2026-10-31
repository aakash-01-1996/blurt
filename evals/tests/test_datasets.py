from pathlib import Path

from blurt_core.pipeline.extraction import EXTRACT_SYSTEM_BY_SECTION
from blurt_core.pipeline.routing import VALID_SECTIONS
from blurt_evals.dataset import load_extraction_cases, load_routing_cases

DATASETS = Path(__file__).resolve().parents[1] / "datasets"


def test_routing_dataset_is_valid() -> None:
    cases = load_routing_cases(DATASETS / "routing.jsonl")
    assert len(cases) >= 8
    for case in cases:
        assert case.expected_section in VALID_SECTIONS
        assert case.text.strip()
    ids = [c.id for c in cases]
    assert len(ids) == len(set(ids))


def test_extraction_dataset_is_valid() -> None:
    cases = load_extraction_cases(DATASETS / "extraction.jsonl")
    assert len(cases) >= 4
    for case in cases:
        assert case.section in EXTRACT_SYSTEM_BY_SECTION
        assert case.expected_fields
    ids = [c.id for c in cases]
    assert len(ids) == len(set(ids))
