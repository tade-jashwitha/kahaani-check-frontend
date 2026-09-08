from app.services.feature_extraction import (
    extract_features,
)
from app.services.quality_gate import (
    check_audio_quality,
)
from app.services.stt_service import (
    transcribe,
)


# =========================================================
# Speech sufficiency thresholds
# =========================================================

# Minimum amount of detected speech required before we
# calculate longitudinal speech features.
MIN_USABLE_SPEECH_SECONDS = 8.0

# Minimum percentage of the recording that should contain
# detected speech.
MIN_SPEECH_RATIO = 0.20

# Minimum number of recognized words.
MIN_TRANSCRIPT_WORDS = 5


def _count_words(text: str) -> int:
    """
    Count recognized transcript words.
    """

    return len(
        text.split()
    )


def _calculate_speech_duration(
    segments: list[dict],
) -> float:
    """
    Calculate total detected speech duration.

    Overlapping Whisper segments are merged so that speech
    is never counted twice.
    """

    if not segments:
        return 0.0

    intervals: list[
        tuple[float, float]
    ] = []

    for segment in segments:
        start = float(
            segment["start"]
        )

        end = float(
            segment["end"]
        )

        if end > start:
            intervals.append(
                (
                    start,
                    end,
                )
            )

    if not intervals:
        return 0.0

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

    return sum(
        end - start
        for start, end in merged
    )


def _speech_sufficiency(
    text: str,
    segments: list[dict],
    total_duration_seconds: float,
) -> dict:
    """
    Determine whether the recording contains enough
    usable speech for feature extraction.

    IMPORTANT:
    Failure here is NOT cognitive decline.

    It simply means there is insufficient usable evidence.
    """

    speech_duration = (
        _calculate_speech_duration(
            segments
        )
    )

    word_count = _count_words(
        text
    )

    if total_duration_seconds <= 0:
        speech_ratio = 0.0
    else:
        speech_ratio = (
            speech_duration
            / total_duration_seconds
        )

    # -----------------------------------------------------
    # Check 1: minimum speech duration
    # -----------------------------------------------------

    if (
        speech_duration
        < MIN_USABLE_SPEECH_SECONDS
    ):
        return {
            "passed": False,

            "reason": (
                "Insufficient detected "
                "speech duration"
            ),

            "speech_duration_seconds": (
                speech_duration
            ),

            "speech_ratio": (
                speech_ratio
            ),

            "word_count": word_count,
        }

    # -----------------------------------------------------
    # Check 2: minimum speech ratio
    # -----------------------------------------------------

    if speech_ratio < MIN_SPEECH_RATIO:
        return {
            "passed": False,

            "reason": (
                "Too little usable speech "
                "relative to recording "
                "duration"
            ),

            "speech_duration_seconds": (
                speech_duration
            ),

            "speech_ratio": (
                speech_ratio
            ),

            "word_count": word_count,
        }

    # -----------------------------------------------------
    # Check 3: minimum transcript size
    # -----------------------------------------------------

    if word_count < MIN_TRANSCRIPT_WORDS:
        return {
            "passed": False,

            "reason": (
                "Transcript contains too "
                "few recognized words"
            ),

            "speech_duration_seconds": (
                speech_duration
            ),

            "speech_ratio": (
                speech_ratio
            ),

            "word_count": word_count,
        }

    return {
        "passed": True,

        "reason": None,

        "speech_duration_seconds": (
            speech_duration
        ),

        "speech_ratio": (
            speech_ratio
        ),

        "word_count": word_count,
    }


def process_audio(
    audio_path: str,
) -> dict:
    """
    Kahaani-Check speech processing pipeline.

    Audio
        ↓
    Audio quality
        ↓
    Whisper STT
        ↓
    Speech sufficiency
        ↓
    Feature extraction

    Insufficient speech is classified as insufficient
    evidence and MUST NOT be interpreted as cognitive decline.
    """

    # =====================================================
    # 1. Audio quality gate
    # =====================================================

    quality = check_audio_quality(
        audio_path
    )

    if not quality.passed:
        return {
            "status": "rejected",

            "quality": {
                "passed": False,

                "duration_seconds": (
                    quality.duration_seconds
                ),

                "snr_db": (
                    quality.snr_db
                ),

                "clipping_ratio": (
                    quality.clipping_ratio
                ),

                "reason": (
                    quality.reason
                ),
            },
        }

    # =====================================================
    # 2. Whisper transcription
    # =====================================================

    transcription = transcribe(
        audio_path
    )

    text = transcription.get(
        "text",
        "",
    )

    segments = transcription.get(
        "segments",
        [],
    )

    # =====================================================
    # 3. Speech sufficiency gate
    # =====================================================

    sufficiency = _speech_sufficiency(
        text=text,
        segments=segments,
        total_duration_seconds=(
            quality.duration_seconds
        ),
    )

    if not sufficiency["passed"]:
        return {
            "status": "insufficient_speech",

            "quality": {
                "passed": True,

                "duration_seconds": (
                    quality.duration_seconds
                ),

                "snr_db": (
                    quality.snr_db
                ),

                "clipping_ratio": (
                    quality.clipping_ratio
                ),
            },

            "transcription": transcription,

            "speech_sufficiency": (
                sufficiency
            ),

            # Critical:
            # no unreliable feature values.
            "features": None,
        }

    # =====================================================
    # 4. Feature extraction
    # =====================================================

    features = extract_features(
        text=text,
        segments=segments,
        total_duration_seconds=(
            quality.duration_seconds
        ),
    )

    # =====================================================
    # 5. Final processed result
    # =====================================================

    return {
        "status": "processed",

        "quality": {
            "passed": True,

            "duration_seconds": (
                quality.duration_seconds
            ),

            "snr_db": (
                quality.snr_db
            ),

            "clipping_ratio": (
                quality.clipping_ratio
            ),
        },

        "transcription": transcription,

        "speech_sufficiency": (
            sufficiency
        ),

        "features": features,
    }