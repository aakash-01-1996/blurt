"""Scoring for routing and extraction outcomes."""

from collections import defaultdict
from dataclasses import dataclass, field

from blurt_evals.subject import ExtractionOutcome, RoutingOutcome


def _norm(v: object) -> str:
    return str(v).strip().lower()


@dataclass
class ClassScore:
    precision: float
    recall: float
    f1: float
    support: int


@dataclass
class RoutingMetrics:
    total: int
    correct: int
    errors: int
    accuracy: float
    per_class: dict[str, ClassScore]
    confusion: dict[str, dict[str, int]]
    failures: list[dict[str, str]] = field(default_factory=list)


def routing_metrics(outcomes: list[RoutingOutcome]) -> RoutingMetrics:
    total = len(outcomes)
    correct = sum(o.correct for o in outcomes)
    errors = sum(o.error is not None for o in outcomes)

    confusion: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    labels: set[str] = set()
    for o in outcomes:
        predicted = o.predicted if o.predicted is not None else "<error>"
        confusion[o.expected][predicted] += 1
        labels.add(o.expected)
        if o.predicted is not None:
            labels.add(o.predicted)

    per_class: dict[str, ClassScore] = {}
    for label in sorted(label for label in labels if label != "<error>"):
        tp = sum(1 for o in outcomes if o.expected == label and o.predicted == label)
        fp = sum(1 for o in outcomes if o.expected != label and o.predicted == label)
        fn = sum(1 for o in outcomes if o.expected == label and o.predicted != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        support = sum(1 for o in outcomes if o.expected == label)
        per_class[label] = ClassScore(precision, recall, f1, support)

    return RoutingMetrics(
        total=total,
        correct=correct,
        errors=errors,
        accuracy=correct / total if total else 0.0,
        per_class=per_class,
        confusion={k: dict(v) for k, v in confusion.items()},
        failures=[{"case_id": o.case_id, "error": o.error} for o in outcomes if o.error],
    )


@dataclass
class ExtractionMetrics:
    total: int
    errors: int
    expected_keys: int
    present_keys: int
    matched_values: int
    key_presence_rate: float
    value_match_rate: float
    missing: list[str] = field(default_factory=list)
    failures: list[dict[str, str]] = field(default_factory=list)


def extraction_metrics(outcomes: list[ExtractionOutcome]) -> ExtractionMetrics:
    total = len(outcomes)
    errors = sum(o.error is not None for o in outcomes)
    expected_keys = present = matched = 0
    missing: list[str] = []

    for o in outcomes:
        predicted = o.predicted_fields or {}
        for key, expected_value in o.expected_fields.items():
            expected_keys += 1
            value = predicted.get(key)
            if value is not None and str(value).strip():
                present += 1
                if _norm(value) == _norm(expected_value):
                    matched += 1
            else:
                missing.append(f"{o.case_id}:{key}")

    return ExtractionMetrics(
        total=total,
        errors=errors,
        expected_keys=expected_keys,
        present_keys=present,
        matched_values=matched,
        key_presence_rate=present / expected_keys if expected_keys else 0.0,
        value_match_rate=matched / expected_keys if expected_keys else 0.0,
        missing=missing,
        failures=[{"case_id": o.case_id, "error": o.error or ""} for o in outcomes if o.error],
    )
