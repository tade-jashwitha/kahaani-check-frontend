from __future__ import annotations

from app.services.quality_gate import check_audio_quality, QualityResult


# ============================================================
# Stage 1: Audio Quality Gate
# ============================================================
# Checks that the audio file meets minimum quality thresholds
# before expensive operations (STT, feature extraction) are run.
#
# Input:  audio_path (str)
# Output: {"passed": bool, "duration_seconds": float,
#           "snr_db": float, "clipping_ratio": float,
#           "reason": str | None}
# ============================================================


def run(audio_path: str) -> dict:
    """
    Run the audio quality gate on the given file path.

    Returns a standardised result dict.  When `passed` is False,
    the pipeline should stop and return status='rejected'.
    """
    result: QualityResult = check_audio_quality(audio_path)

    return {
        "passed": result.passed,
        "duration_seconds": result.duration_seconds,
        "snr_db": result.snr_db,
        "clipping_ratio": result.clipping_ratio,
        "reason": result.reason,
    }
