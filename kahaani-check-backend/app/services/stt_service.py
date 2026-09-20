from __future__ import annotations

from typing import Any
from app.services.transcription_service import get_whisper_model, transcribe

__all__ = ["get_whisper_model", "transcribe"]