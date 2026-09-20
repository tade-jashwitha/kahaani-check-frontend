from __future__ import annotations

from app.services.transcription_service import transcribe


# ============================================================
# Stage 2: Transcription (Whisper STT)
# ============================================================
# Converts audio to text using the configured STT backend.
#
# Input:  audio_path (str), language (str | None)
# Output: {"text": str, "segments": list[dict], "language": str, "duration": float, "confidence": float}
# ============================================================


def run(audio_path: str, language: str | None = None) -> dict:
    """
    Run STT transcription on the given audio file.

    Returns the full transcription dict including:
      - text:       full transcript string
      - segments:   list of timed word/phrase dicts
      - language:   detected or specified language code
      - duration:   audio duration
      - confidence: transcription confidence
    """
    return transcribe(audio_path, language=language)
