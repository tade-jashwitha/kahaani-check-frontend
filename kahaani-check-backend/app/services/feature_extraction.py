import re


def _tokenize(text: str) -> list[str]:
    """
    Tokenize Hindi / Unicode text.

    This is intentionally language-simple for the MVP.
    """

    return re.findall(
        r"\b[\w\u0900-\u097F]+\b",
        text.lower(),
    )


def _merge_intervals(
    segments: list[dict],
) -> list[tuple[float, float]]:
    """
    Merge overlapping speech intervals.

    Whisper segments normally do not overlap, but merging
    protects the feature calculations if they ever do.
    """

    intervals: list[
        tuple[float, float]
    ] = []

    for segment in segments:
        start = float(segment["start"])
        end = float(segment["end"])

        if end > start:
            intervals.append(
                (start, end)
            )

    if not intervals:
        return []

    intervals.sort(
        key=lambda x: x[0]
    )

    merged: list[
        tuple[float, float]
    ] = []

    current_start, current_end = (
        intervals[0]
    )

    for start, end in intervals[1:]:
        if start <= current_end:
            current_end = max(
                current_end,
                end,
            )
        else:
            merged.append(
                (
                    current_start,
                    current_end,
                )
            )

            current_start = start
            current_end = end

    merged.append(
        (
            current_start,
            current_end,
        )
    )

    return merged


def calculate_speaking_rate(
    text: str,
    speech_duration_seconds: float,
) -> float:
    """
    Calculate words per minute using detected speech duration.

    WPM is only meaningful when usable speech duration is
    sufficiently large. The orchestrator handles that gate.
    """

    words = _tokenize(text)

    if speech_duration_seconds <= 0:
        return 0.0

    return (
        len(words)
        / speech_duration_seconds
        * 60.0
    )


def calculate_pause_density(
    segments: list[dict],
    total_duration_seconds: float,
) -> float:
    """
    Calculate the proportion of the complete recording spent
    in pauses BETWEEN detected speech intervals.

    Leading and trailing silence are not counted as pauses.
    """

    if (
        not segments
        or total_duration_seconds <= 0
    ):
        return 0.0

    merged = _merge_intervals(
        segments
    )

    if len(merged) < 2:
        return 0.0

    pause_seconds = 0.0

    for previous, current in zip(
        merged,
        merged[1:],
    ):
        gap = (
            current[0]
            - previous[1]
        )

        if gap > 0:
            pause_seconds += gap

    density = (
        pause_seconds
        / total_duration_seconds
    )

    return min(
        1.0,
        max(
            0.0,
            density,
        ),
    )


def calculate_lexical_diversity(
    text: str,
) -> float:
    """
    Type-token ratio:

        unique words / total words
    """

    words = _tokenize(text)

    if not words:
        return 0.0

    unique_words = set(words)

    return (
        len(unique_words)
        / len(words)
    )


def extract_features(
    text: str,
    segments: list[dict],
    total_duration_seconds: float,
) -> dict:
    """
    Extract Tier-1 speech features.
    """

    merged = _merge_intervals(
        segments
    )

    speech_duration = sum(
        end - start
        for start, end in merged
    )

    words = _tokenize(text)

    return {
        "speaking_rate_wpm": (
            calculate_speaking_rate(
                text=text,
                speech_duration_seconds=(
                    speech_duration
                ),
            )
        ),

        "pause_density": (
            calculate_pause_density(
                segments=segments,
                total_duration_seconds=(
                    total_duration_seconds
                ),
            )
        ),

        "lexical_diversity_ttr": (
            calculate_lexical_diversity(
                text
            )
        ),

        "speech_duration_seconds": (
            speech_duration
        ),

        "word_count": len(words),

        "segment_count": len(
            segments
        ),
    }