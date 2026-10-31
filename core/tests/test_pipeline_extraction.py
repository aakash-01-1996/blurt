import pytest
from blurt_core.pipeline.extraction import (
    build_extract_messages,
    parse_extract_response,
)


def test_build_messages_for_known_section() -> None:
    messages = build_extract_messages("task", "Call the dentist Tuesday.")
    assert messages is not None
    assert messages[0]["role"] == "system"
    assert messages[1] == {"role": "user", "content": "Call the dentist Tuesday."}


def test_build_messages_returns_none_for_unknown_section() -> None:
    assert build_extract_messages("grocery", "milk and eggs") is None


def test_parse_valid_object() -> None:
    fields = parse_extract_response('{"title": "Call dentist", "due_date": "2026-11-03"}')
    assert fields == {"title": "Call dentist", "due_date": "2026-11-03"}


def test_parse_rejects_non_object() -> None:
    with pytest.raises(ValueError, match="expected a JSON object"):
        parse_extract_response('["milk", "eggs"]')


def test_parse_rejects_invalid_json() -> None:
    with pytest.raises(ValueError, match="invalid JSON"):
        parse_extract_response("{broken")
