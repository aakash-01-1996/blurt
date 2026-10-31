"""Optional quality gate: compare report metrics against minimum thresholds."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Maps a threshold key to the metric it gates in a report dict.
_METRICS: dict[str, Callable[[dict[str, Any]], float]] = {
    "routing_accuracy": lambda r: r["routing"]["accuracy"],
    "extraction_key_presence": lambda r: r["extraction"]["key_presence_rate"],
    "extraction_value_match": lambda r: r["extraction"]["value_match_rate"],
}


@dataclass
class ThresholdResult:
    name: str
    value: float
    minimum: float

    @property
    def passed(self) -> bool:
        return self.value >= self.minimum


def load_thresholds(path: str | Path) -> dict[str, float]:
    p = Path(path)
    if not p.exists():
        return {}
    return {k: float(v) for k, v in json.loads(p.read_text()).items()}


def check_thresholds(report: dict[str, Any], thresholds: dict[str, float]) -> list[ThresholdResult]:
    results: list[ThresholdResult] = []
    for name, minimum in thresholds.items():
        getter = _METRICS.get(name)
        if getter is None:
            continue
        results.append(ThresholdResult(name=name, value=float(getter(report)), minimum=minimum))
    return results
