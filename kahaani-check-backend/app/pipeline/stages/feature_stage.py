from __future__ import annotations

from app.services.feature_extraction import extract_features


# ============================================================
# Stage 4: Feature Extraction
# ============================================================
# Extracts acoustic and linguistic features from transcribed speech.
#
# Input:  text (str), segments (list[dict]),
#         total_duration_seconds (float)
# Output: feature dict (speaking_rate_wpm, pause_density,
#                       lexical_diversity_ttr, ...)
# ============================================================


def run(
    text: str,
    segments: list[dict],
    total_duration_seconds: float,
) -> dict:
    """
    Extract speech features from the transcription result.

    Should only be called after the sufficiency stage has passed.
    """
    return extract_features(
        text=text,
        segments=segments,
        total_duration_seconds=total_duration_seconds,
    )
