"""Runs the real pipeline prompts against an injectable model function."""

from collections.abc import Callable
from dataclasses import dataclass

from blurt_core.pipeline.extraction import build_extract_messages, parse_extract_response
from blurt_core.pipeline.routing import build_route_messages, parse_route_response

from blurt_evals.dataset import ExtractionCase, RoutingCase

# A model takes chat messages and returns the raw completion string.
ModelFn = Callable[[list[dict[str, str]]], str]


@dataclass
class RoutingOutcome:
    case_id: str
    expected: str
    predicted: str | None
    confidence: float | None
    error: str | None = None

    @property
    def correct(self) -> bool:
        return self.error is None and self.predicted == self.expected


@dataclass
class ExtractionOutcome:
    case_id: str
    section: str
    expected_fields: dict[str, str]
    predicted_fields: dict[str, str] | None
    error: str | None = None


def run_routing(case: RoutingCase, model: ModelFn) -> RoutingOutcome:
    try:
        raw = model(build_route_messages(case.text))
        result = parse_route_response(raw)
    except Exception as exc:
        return RoutingOutcome(case.id, case.expected_section, None, None, error=str(exc))
    return RoutingOutcome(case.id, case.expected_section, result.section, result.confidence)


def run_extraction(case: ExtractionCase, model: ModelFn) -> ExtractionOutcome:
    messages = build_extract_messages(case.section, case.text)
    if messages is None:
        return ExtractionOutcome(
            case.id, case.section, case.expected_fields, None, error=f"no prompt for {case.section}"
        )
    try:
        raw = model(messages)
        fields = parse_extract_response(raw)
    except Exception as exc:
        return ExtractionOutcome(case.id, case.section, case.expected_fields, None, error=str(exc))
    return ExtractionOutcome(case.id, case.section, case.expected_fields, fields)
