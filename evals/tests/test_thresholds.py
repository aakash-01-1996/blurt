from pathlib import Path

from blurt_evals.thresholds import _METRICS, check_thresholds, load_thresholds


def test_check_thresholds_pass_and_fail() -> None:
    report = {
        "routing": {"accuracy": 0.9},
        "extraction": {"key_presence_rate": 0.5, "value_match_rate": 0.2},
    }
    results = {
        r.name: r
        for r in check_thresholds(report, {"routing_accuracy": 0.8, "extraction_key_presence": 0.7})
    }
    assert results["routing_accuracy"].passed
    assert not results["extraction_key_presence"].passed


def test_unknown_threshold_key_is_ignored() -> None:
    assert check_thresholds({"routing": {"accuracy": 1.0}}, {"bogus": 0.5}) == []


def test_load_thresholds_missing_file_is_empty(tmp_path: Path) -> None:
    assert load_thresholds(tmp_path / "nope.json") == {}


def test_load_thresholds_reads_file(tmp_path: Path) -> None:
    path = tmp_path / "t.json"
    path.write_text('{"routing_accuracy": 0.8}')
    assert load_thresholds(path) == {"routing_accuracy": 0.8}


def test_project_thresholds_file_is_valid() -> None:
    path = Path(__file__).resolve().parents[1] / "thresholds.json"
    thresholds = load_thresholds(path)
    assert thresholds
    for key in thresholds:
        assert key in _METRICS
