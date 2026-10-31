"""Eval dataset schema and JSONL loaders."""

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RoutingCase:
    id: str
    text: str
    expected_section: str


@dataclass(frozen=True)
class ExtractionCase:
    id: str
    section: str
    text: str
    expected_fields: dict[str, str]


def _read_jsonl(path: str | Path) -> list[dict]:  # type: ignore[type-arg]
    rows: list[dict] = []  # type: ignore[type-arg]
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        rows.append(json.loads(line))
    return rows


def load_routing_cases(path: str | Path) -> list[RoutingCase]:
    return [
        RoutingCase(id=r["id"], text=r["text"], expected_section=r["expected_section"])
        for r in _read_jsonl(path)
    ]


def load_extraction_cases(path: str | Path) -> list[ExtractionCase]:
    return [
        ExtractionCase(
            id=r["id"],
            section=r["section"],
            text=r["text"],
            expected_fields=r["expected_fields"],
        )
        for r in _read_jsonl(path)
    ]
