import pytest
from blurt_core.pipeline.routing import (
    ROUTE_SYSTEM,
    build_route_messages,
    parse_route_response,
)


def test_build_route_messages_includes_system_and_text() -> None:
    messages = build_route_messages("Shipped the retry fix.")
    assert messages[0] == {"role": "system", "content": ROUTE_SYSTEM}
    assert messages[1] == {"role": "user", "content": "Shipped the retry fix."}


def test_parse_valid_response() -> None:
    result = parse_route_response('{"section": "work_log", "confidence": 0.92}')
    assert result.section == "work_log"
    assert result.confidence == 0.92


def test_parse_defaults_missing_confidence_to_zero() -> None:
    result = parse_route_response('{"section": "task"}')
    assert result.section == "task"
    assert result.confidence == 0.0


def test_parse_rejects_unknown_section() -> None:
    with pytest.raises(ValueError, match="unexpected section"):
        parse_route_response('{"section": "grocery", "confidence": 0.9}')


def test_parse_rejects_invalid_json() -> None:
    with pytest.raises(ValueError, match="invalid JSON"):
        parse_route_response("not json at all")
