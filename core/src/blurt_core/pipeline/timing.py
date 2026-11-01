"""Map character spans in a transcript to wall-clock time via STT segments.

The split stage records each item's character range (``span_start_char`` /
``span_end_char``) into the transcript text. Whisper-style STT also gives us
timed ``segments`` (each with ``start`` / ``end`` seconds and its ``text``).
This module bridges the two so an item can carry real ``start_s`` / ``end_s``
instead of a client-side approximation.
"""

from __future__ import annotations

# (char_start, char_end, start_s, end_s) for one located segment.
_Range = tuple[int, int, float, float]


def _segment_char_ranges(segments: list[dict[str, float | str]], text: str) -> list[_Range]:
    """Locate each segment's text within ``text`` and pair it with its timing.

    Segments are matched in order with a moving cursor, so repeated phrases
    resolve to their next occurrence rather than the first. A segment whose
    text can't be found (e.g. whitespace/normalization drift) is placed
    immediately after the cursor using its length, keeping the ranges ordered.
    """
    ranges: list[_Range] = []
    cursor = 0
    for seg in segments:
        seg_text = str(seg.get("text", "")).strip()
        if not seg_text:
            continue
        start_s = float(seg.get("start", 0.0))
        end_s = float(seg.get("end", start_s))
        idx = text.find(seg_text, cursor)
        if idx == -1:
            idx = cursor
        char_start = idx
        char_end = idx + len(seg_text)
        ranges.append((char_start, char_end, start_s, end_s))
        cursor = char_end
    return ranges


def _time_at(char: int, ranges: list[_Range]) -> float:
    """Interpolate the time (seconds) at a character offset."""
    first = ranges[0]
    if char <= first[0]:
        return first[2]
    last_end = first[3]
    for char_start, char_end, start_s, end_s in ranges:
        if char < char_start:
            # In a gap between segments: hold the previous segment's end.
            return last_end
        if char < char_end:
            span = char_end - char_start
            frac = (char - char_start) / span if span > 0 else 0.0
            return start_s + frac * (end_s - start_s)
        last_end = end_s
    return last_end


def span_time_range(
    segments: list[dict[str, float | str]],
    text: str,
    char_start: int | None,
    char_end: int | None,
) -> tuple[float | None, float | None]:
    """Return ``(start_s, end_s)`` for a character span, or ``(None, None)``.

    Returns ``(None, None)`` when the span has no character offsets or there is
    no usable segment timing, so callers can fall back gracefully.
    """
    if char_start is None:
        return None, None
    ranges = _segment_char_ranges(segments, text)
    if not ranges:
        return None, None
    start_s = _time_at(char_start, ranges)
    end_s = _time_at(char_end, ranges) if char_end is not None else start_s
    if end_s < start_s:
        end_s = start_s
    return start_s, end_s
