import json
from pathlib import Path

from blurt_evals.dataset import (
    ExtractionCase,
    RoutingCase,
    load_extraction_cases,
    load_routing_cases,
)
from blurt_evals.metrics import extraction_metrics, routing_metrics
from blurt_evals.report import build_report, extraction_table, routing_table
from blurt_evals.subject import ModelFn, run_extraction, run_routing


def route_model(section: str, confidence: float = 0.9) -> ModelFn:
    return lambda _messages: json.dumps({"section": section, "confidence": confidence})


def extract_model(fields: dict[str, str]) -> ModelFn:
    return lambda _messages: json.dumps(fields)


def test_run_routing_correct() -> None:
    outcome = run_routing(RoutingCase("c1", "Shipped the fix", "work_log"), route_model("work_log"))
    assert outcome.correct
    assert outcome.predicted == "work_log"
    assert outcome.confidence == 0.9


def test_run_routing_parse_error_is_captured() -> None:
    outcome = run_routing(RoutingCase("c1", "x", "work_log"), lambda _m: "not json")
    assert not outcome.correct
    assert outcome.error is not None


def test_routing_metrics_and_confusion() -> None:
    outcomes = [
        run_routing(RoutingCase("1", "a", "work_log"), route_model("work_log")),
        run_routing(RoutingCase("2", "b", "task"), route_model("task")),
        run_routing(RoutingCase("3", "c", "note"), route_model("task")),
    ]
    m = routing_metrics(outcomes)
    assert m.total == 3
    assert m.correct == 2
    assert abs(m.accuracy - 2 / 3) < 1e-9
    assert m.confusion["note"]["task"] == 1
    assert m.per_class["task"].support == 1


def test_run_extraction_scores_presence_and_value_match() -> None:
    case = ExtractionCase(
        "e1", "task", "Call dentist Tuesday", {"title": "Call dentist", "due_date": "2026-11-03"}
    )
    outcome = run_extraction(
        case, extract_model({"title": "Call dentist", "due_date": "2026-11-03"})
    )
    assert outcome.error is None
    m = extraction_metrics([outcome])
    assert m.expected_keys == 2
    assert m.present_keys == 2
    assert m.matched_values == 2
    assert m.value_match_rate == 1.0


def test_extraction_flags_missing_keys() -> None:
    case = ExtractionCase("e1", "task", "x", {"title": "A", "due_date": "2026-01-01"})
    outcome = run_extraction(case, extract_model({"title": "A"}))
    m = extraction_metrics([outcome])
    assert m.present_keys == 1
    assert "e1:due_date" in m.missing


def test_extraction_unknown_section_errors() -> None:
    outcome = run_extraction(ExtractionCase("e1", "grocery", "milk", {"x": "y"}), extract_model({}))
    assert outcome.error is not None


def test_loaders_skip_blank_and_comment_lines(tmp_path: Path) -> None:
    rpath = tmp_path / "routing.jsonl"
    rpath.write_text('{"id":"1","text":"Shipped","expected_section":"work_log"}\n# a comment\n\n')
    cases = load_routing_cases(rpath)
    assert len(cases) == 1
    assert cases[0].expected_section == "work_log"

    epath = tmp_path / "extract.jsonl"
    epath.write_text(
        '{"id":"1","section":"task","text":"Call","expected_fields":{"title":"Call"}}\n'
    )
    ecases = load_extraction_cases(epath)
    assert len(ecases) == 1
    assert ecases[0].expected_fields == {"title": "Call"}


def test_build_report_is_json_serializable() -> None:
    routing = routing_metrics([run_routing(RoutingCase("1", "a", "task"), route_model("task"))])
    extraction = extraction_metrics(
        [
            run_extraction(
                ExtractionCase("e", "task", "x", {"title": "A"}), extract_model({"title": "A"})
            )
        ]
    )
    report = build_report(routing, extraction)
    json.dumps(report)
    assert report["routing"]["accuracy"] == 1.0
    assert "Routing" in routing_table(routing)
    assert "Extraction" in extraction_table(extraction)
