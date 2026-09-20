from __future__ import annotations


# ============================================================
# Stage 3: Speech Sufficiency Gate
# ============================================================
# Validates that the transcribed audio contains enough usable
# speech to produce reliable acoustic features.
#
# IMPORTANT: Failure here is NOT evidence of cognitive decline.
# It simply means there is insufficient usable evidence.
#
# Input:  text (str), segments (list[dict]),
#         total_duration_seconds (float)
# Output: {"passed": bool, "reason": str|None,
#           "speech_duration_seconds": float,
#           "speech_ratio": float, "word_count": int}
# ============================================================

MIN_USABLE_SPEECH_SECONDS = 8.0
MIN_SPEECH_RATIO = 0.20
MIN_TRANSCRIPT_WORDS = 5


def _count_words(text: str) -> int:
    return len(text.split())


def _calculate_speech_duration(segments: list[dict]) -> float:
    """
    Calculate total detected speech duration from Whisper segments.

    Overlapping segments are merged so speech is never double-counted.
    """
    if not segments:
        return 0.0

    intervals: list[tuple[float, float]] = []

    for seg in segments:
        start = float(seg["start"])
        end = float(seg["end"])
        if end > start:
            intervals.append((start, end))

    if not intervals:
        return 0.0

    intervals.sort(key=lambda x: x[0])

    merged: list[tuple[float, float]] = []
    current_start, current_end = intervals[0]

    for start, end in intervals[1:]:
        if start <= current_end:
            current_end = max(current_end, end)
        else:
            merged.append((current_start, current_end))
            current_start, current_end = start, end

    merged.append((current_start, current_end))

    return sum(end - start for start, end in merged)


def run(
    text: str,
    segments: list[dict],
    total_duration_seconds: float,
) -> dict:
    """
    Check whether the recording contains enough usable speech.

    Returns a result dict with `passed` True/False and diagnostic fields.
    When `passed` is False, the pipeline should stop and return
    status='insufficient_speech'.
    """
    speech_duration = _calculate_speech_duration(segments)
    word_count = _count_words(text)

    speech_ratio = (
        speech_duration / total_duration_seconds
        if total_duration_seconds > 0
        else 0.0
    )

    base = {
        "speech_duration_seconds": speech_duration,
        "speech_ratio": speech_ratio,
        "word_count": word_count,
    }

    if speech_duration < MIN_USABLE_SPEECH_SECONDS:
        return {"passed": False, "reason": "Insufficient detected speech duration", **base}

    if speech_ratio < MIN_SPEECH_RATIO:
        return {"passed": False, "reason": "Too little usable speech relative to recording duration", **base}

    if word_count < MIN_TRANSCRIPT_WORDS:
        return {"passed": False, "reason": "Transcript contains too few recognized words", **base}

    return {"passed": True, "reason": None, **base}
