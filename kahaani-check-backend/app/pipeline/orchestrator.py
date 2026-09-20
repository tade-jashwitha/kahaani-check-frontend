from __future__ import annotations

from typing import Any
from app.pipeline.stages import (
    quality_stage,
    transcription_stage,
    sufficiency_stage,
    feature_stage,
)


# ============================================================
# Audio Processing Pipeline — Orchestrator
# ============================================================
#
# Pipeline:
#   Normalized Audio (16kHz mono WAV)
#     ↓
#   [Stage 1] Quality Gate        — rejects unreadable/clipped/noisy audio
#     ↓
#   [Stage 2] Whisper STT         — speech-to-text with language detection
#     ↓
#   [Stage 3] Speech Sufficiency  — ensures enough continuous speech
#     ↓
#   [Stage 4] Feature Extraction  — speaking rate, pauses, lexical diversity
#     ↓
#   Result dict
# ============================================================


def process_audio(
    audio_path: str,
    language: str | None = None,
) -> dict[str, Any]:
    """
    Run the full Kahaani-Check speech processing pipeline.

    Returns a result dict with keys:
      status      — 'processed' | 'rejected' | 'transcription_failed' | 'insufficient_speech'
      quality     — quality gate result
      transcription  — STT output (text, segments, language, duration, confidence)
      speech_sufficiency — sufficiency gate result (if available)
      features    — extracted features dict, or None
      error       — error message if any stage failed
    """

    # ----------------------------------------------------------------
    # Stage 1: Audio quality gate
    # ----------------------------------------------------------------
    print("[AUDIO] Validating audio quality thresholds")
    quality = quality_stage.run(audio_path)

    if not quality.get("passed"):
        print(f"[AUDIO] Quality check rejected: {quality.get('reason')}")
        return {
            "status": "rejected",
            "quality": quality,
            "transcription": None,
            "features": None,
            "error": quality.get("reason"),
        }

    # ----------------------------------------------------------------
    # Stage 2: Whisper STT (Real Transcription)
    # ----------------------------------------------------------------
    try:
        transcription = transcription_stage.run(audio_path, language=language)
    except Exception as exc:
        try:
            print(f"[STT] Transcription error: {exc!r}")
        except Exception:
            pass
        return {
            "status": "transcription_failed",
            "quality": quality,
            "transcription": None,
            "features": None,
            "error": str(exc),
        }

    text = (transcription.get("text") or "").strip()
    segments = transcription.get("segments", [])

    if not text:
        print("[STT] Transcription yielded empty text.")
        return {
            "status": "transcription_failed",
            "quality": quality,
            "transcription": transcription,
            "features": None,
            "error": "No speech detected in audio file.",
        }

    # ----------------------------------------------------------------
    # Stage 3: Speech sufficiency gate
    # ----------------------------------------------------------------
    duration_sec = float(quality.get("duration_seconds") or transcription.get("duration") or 0.0)
    sufficiency = sufficiency_stage.run(
        text=text,
        segments=segments,
        total_duration_seconds=duration_sec,
    )

    if not sufficiency.get("passed"):
        print("[PIPELINE] Insufficient speech detected for clinical feature extraction.")
        return {
            "status": "insufficient_speech",
            "quality": quality,
            "transcription": transcription,
            "speech_sufficiency": sufficiency,
            "features": None,
        }

    # ----------------------------------------------------------------
    # Stage 4: Feature extraction
    # ----------------------------------------------------------------
    print("[PIPELINE] Extracting acoustic and lexical features")
    features = feature_stage.run(
        text=text,
        segments=segments,
        total_duration_seconds=duration_sec,
    )

    print("[PIPELINE] Audio processing pipeline completed successfully.")
    return {
        "status": "processed",
        "quality": quality,
        "transcription": transcription,
        "speech_sufficiency": sufficiency,
        "features": features,
    }