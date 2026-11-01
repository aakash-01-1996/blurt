from blurt_core.pipeline.timing import span_time_range

# "hello world this is a test" split across three timed segments.
SEGMENTS = [
    {"start": 0.0, "end": 2.0, "text": "hello world"},
    {"start": 2.0, "end": 4.0, "text": "this is"},
    {"start": 4.0, "end": 6.0, "text": "a test"},
]
TEXT = "hello world this is a test"


def test_span_aligned_to_segment_boundaries() -> None:
    # "this is" starts at char 12, ends at char 19.
    start_s, end_s = span_time_range(SEGMENTS, TEXT, 12, 19)
    assert start_s == 2.0
    assert end_s == 4.0


def test_span_interpolated_within_segment() -> None:
    # Char 6 is halfway through "hello world" (11 chars), so ~1.0s.
    start_s, _ = span_time_range(SEGMENTS, TEXT, 6, 11)
    assert abs(start_s - (6 / 11) * 2.0) < 1e-6


def test_span_covering_whole_transcript() -> None:
    start_s, end_s = span_time_range(SEGMENTS, TEXT, 0, len(TEXT))
    assert start_s == 0.0
    assert end_s == 6.0


def test_no_char_offsets_returns_none() -> None:
    assert span_time_range(SEGMENTS, TEXT, None, None) == (None, None)


def test_no_segments_returns_none() -> None:
    assert span_time_range([], TEXT, 0, 5) == (None, None)


def test_missing_end_char_falls_back_to_start() -> None:
    start_s, end_s = span_time_range(SEGMENTS, TEXT, 12, None)
    assert start_s == end_s == 2.0


def test_offset_past_end_clamps_to_last_segment() -> None:
    start_s, end_s = span_time_range(SEGMENTS, TEXT, 1000, 2000)
    assert start_s == 6.0
    assert end_s == 6.0


def test_repeated_phrase_matches_in_order() -> None:
    segments = [
        {"start": 0.0, "end": 1.0, "text": "go"},
        {"start": 1.0, "end": 2.0, "text": "go"},
    ]
    text = "go go"
    # Second "go" starts at char 3.
    start_s, _ = span_time_range(segments, text, 3, 5)
    assert start_s == 1.0


def test_unmatched_segment_keeps_ranges_ordered() -> None:
    # Segment text that isn't present in the transcript falls back to cursor
    # placement; the result must still be monotonic and not raise.
    segments = [
        {"start": 0.0, "end": 1.0, "text": "alpha"},
        {"start": 1.0, "end": 2.0, "text": "ZZZ"},
        {"start": 2.0, "end": 3.0, "text": "gamma"},
    ]
    text = "alpha beta gamma"
    start_s, end_s = span_time_range(segments, text, 0, len(text))
    assert start_s == 0.0
    assert end_s >= start_s
