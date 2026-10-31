"""Human-readable and JSON-serializable eval reports."""

from dataclasses import asdict

from blurt_evals.metrics import ExtractionMetrics, RoutingMetrics


def routing_table(m: RoutingMetrics) -> str:
    lines = [
        f"Routing — {m.correct}/{m.total} correct "
        f"(accuracy {m.accuracy:.1%}), {m.errors} parse error(s)",
        f"  {'section':<10}{'prec':>7}{'rec':>7}{'f1':>7}{'n':>5}",
    ]
    for section, s in m.per_class.items():
        lines.append(
            f"  {section:<10}{s.precision:>7.2f}{s.recall:>7.2f}{s.f1:>7.2f}{s.support:>5}"
        )
    return "\n".join(lines)


def extraction_table(m: ExtractionMetrics) -> str:
    return (
        f"Extraction — {m.total} cases, {m.errors} parse error(s)\n"
        f"  key presence: {m.present_keys}/{m.expected_keys} ({m.key_presence_rate:.1%})\n"
        f"  value match:  {m.matched_values}/{m.expected_keys} ({m.value_match_rate:.1%})"
    )


def build_report(routing: RoutingMetrics, extraction: ExtractionMetrics) -> dict:  # type: ignore[type-arg]
    return {
        "routing": {
            "total": routing.total,
            "correct": routing.correct,
            "errors": routing.errors,
            "accuracy": routing.accuracy,
            "per_class": {k: asdict(v) for k, v in routing.per_class.items()},
            "confusion": routing.confusion,
            "failures": routing.failures,
        },
        "extraction": asdict(extraction),
    }
