import pytest
from blurt_core.pipeline.extraction import parse_extract_response
from blurt_core.pipeline.parsing import loads_lenient
from blurt_core.pipeline.routing import parse_route_response


def test_plain_json() -> None:
    assert loads_lenient('{"a": 1}') == {"a": 1}


def test_json_fence_with_language_tag() -> None:
    raw = '```json\n{"section": "task", "confidence": 0.9}\n```'
    assert loads_lenient(raw) == {"section": "task", "confidence": 0.9}


def test_bare_fence() -> None:
    assert loads_lenient('```\n{"a": 1}\n```') == {"a": 1}


def test_prose_preamble() -> None:
    assert loads_lenient('Sure, here you go:\n{"title": "X"}') == {"title": "X"}


def test_trailing_commentary() -> None:
    assert loads_lenient('{"title": "X"} — hope that helps!') == {"title": "X"}


def test_brace_inside_string_is_respected() -> None:
    assert loads_lenient('{"note": "use {curly} braces"}') == {"note": "use {curly} braces"}


def test_no_json_raises() -> None:
    with pytest.raises(ValueError, match="no JSON object"):
        loads_lenient("there is no json here")


def test_route_parser_tolerates_fences() -> None:
    result = parse_route_response('```json\n{"section": "work_log", "confidence": 0.8}\n```')
    assert result.section == "work_log"
    assert result.confidence == 0.8


def test_extract_parser_tolerates_fences() -> None:
    fields = parse_extract_response('```json\n{"title": "Call dentist"}\n```')
    assert fields == {"title": "Call dentist"}
