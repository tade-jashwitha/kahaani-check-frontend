from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from faster_whisper import WhisperModel
from app.core.config import get_settings


# Reconfigure streams if possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def _safe_print(msg: str) -> None:
    """Print safely to stdout without charmap / cp1252 codec errors on Windows."""
    try:
        if hasattr(sys.stdout, "buffer"):
            sys.stdout.buffer.write((msg + "\n").encode("utf-8", errors="replace"))
            sys.stdout.buffer.flush()
        else:
            print(msg)
    except Exception:
        try:
            print(msg.encode("ascii", errors="backslashreplace").decode("ascii"))
        except Exception:
            pass


from app.services.asr_quality_validator import validate_asr_quality


@lru_cache(maxsize=1)
def get_whisper_model() -> WhisperModel:
    """
    Load and cache the faster-whisper model.
    """
    settings = get_settings()
    model_size = settings.WHISPER_MODEL_SIZE or "tiny"
    device = settings.WHISPER_DEVICE or "cpu"
    compute_type = settings.WHISPER_COMPUTE_TYPE or "int8"

    _safe_print(f"[STT] Loading Whisper model: '{model_size}' on {device} ({compute_type})")
    model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
        cpu_threads=4,
    )
    _safe_print(f"[STT] Whisper model '{model_size}' loaded successfully.")
    return model


def _clean_transcript(text: str) -> str:
    """
    Clean up accidental repetitive tokens or artifact spacing while preserving original words.
    """
    if not text:
        return ""
    words = text.split()
    cleaned = []
    for w in words:
        if not cleaned or w.lower() != cleaned[-1].lower():
            cleaned.append(w)
        elif len(cleaned) >= 2 and w.lower() == cleaned[-1].lower() and w.lower() == cleaned[-2].lower():
            continue  # drop triple repetitions
        else:
            cleaned.append(w)
    return " ".join(cleaned).strip()


def transcribe(
    audio_path: str,
    language: str | None = None,
) -> dict[str, Any]:
    """
    Transcribe speech from a normalized 16kHz mono WAV file with enhanced accuracy and repetition safeguards.

    Parameters:
        audio_path: Path to the audio file
        language: Language code ('hi', 'en', etc.) or None for auto-detection

    Returns:
        dict containing:
            text: Cleaned transcribed string
            raw_transcript: Unmodified raw transcript
            cleaned_transcript: Cleaned transcript
            segments: List of segment objects with start, end, text, avg_logprob
            language: Detected or specified language code
            duration: Audio duration in seconds
            confidence: Overall confidence score (0.0 to 1.0)
            model_name: Name/size of the Whisper model used
            transcription_status: 'ok' or 'quality_warning'
            quality_flags: List of quality issue flags
            quality_metrics: Detailed metrics from ASR quality validator
    """
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"[STT] Audio file not found: {audio_path}")

    settings = get_settings()
    model = get_whisper_model()

    # Determine language: elder preferred language when explicitly configured, else auto-detect.
    # Never hardcode Hindi; do not force English unless configured.
    target_language: str | None = None
    initial_prompt: str | None = None

    if language and language.lower() not in {"auto", "none", "", "null"}:
        norm_lang = language.lower().strip()
        if norm_lang.startswith("en"):
            target_language = "en"
        elif norm_lang.startswith("hi"):
            target_language = "hi"
        else:
            target_language = norm_lang
    else:
        # None signals Whisper to auto-detect language without prompt bias
        target_language = None
        initial_prompt = None

    _safe_print(
        f"[STT] Starting transcription for {path.name} "
        f"(requested language: {target_language or 'auto-detect'})"
    )

    # Robust decoding parameters to prevent pathological repetition loops:
    # 1. repetition_penalty=1.2: suppresses recurrent token loops in beam search
    # 2. no_repeat_ngram_size=3: strictly forbids identical 3-grams repeating consecutively
    # 3. temperature fallback list: steps up temperature when compression ratio fails
    # 4. vad_filter with conservative silence threshold: prevents trailing silence hallucinations
    # 5. condition_on_previous_text=False: prevents looping context bleed across 30s segments
    # Optimized decoding parameters for fast, responsive processing:
    # 1. beam_size=1, best_of=1: greedy decoding is 5-10x faster on CPU and avoids timeouts
    # 2. repetition_penalty=1.2: suppresses recurrent token loops
    # 3. no_repeat_ngram_size=3: strictly forbids identical 3-grams repeating consecutively
    # 4. vad_filter with conservative silence threshold: prevents trailing silence hallucinations
    # 5. condition_on_previous_text=False: prevents looping context bleed across segments
    beam_size = 1
    best_of = 1
    patience = 1.0
    temperatures = [0.0]
    repetition_penalty = 1.2
    no_repeat_ngram_size = 3
    vad_params = dict(min_silence_duration_ms=500, speech_pad_ms=200, threshold=0.5)

    segments_gen, info = model.transcribe(
        str(path),
        language=target_language,
        task="transcribe",
        initial_prompt=initial_prompt,
        beam_size=beam_size,
        best_of=best_of,
        patience=patience,
        temperature=temperatures,
        repetition_penalty=repetition_penalty,
        no_repeat_ngram_size=no_repeat_ngram_size,
        condition_on_previous_text=False,
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        no_speech_threshold=0.6,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=vad_params,
    )

    detected_language = getattr(info, "language", target_language or "unknown")
    lang_prob = getattr(info, "language_probability", 1.0)
    audio_duration = float(getattr(info, "duration", 0.0))

    _safe_print(f"[STT] Language detected: {detected_language} (prob: {lang_prob:.2f})")

    # Structured logging requirement
    _safe_print(
        f"[ASR]\n"
        f"audio_duration={audio_duration:.2f}\n"
        f"detected_language={detected_language}\n"
        f"requested_language={target_language or 'auto-detect'}\n"
        f"model={settings.WHISPER_MODEL_SIZE or 'tiny'}\n"
        f"beam_size={beam_size}\n"
        f"vad_filter=True\n"
        f"condition_on_previous_text=False"
    )

    segment_list: list[dict[str, Any]] = []
    total_logprob = 0.0
    valid_segments_count = 0

    for seg in segments_gen:
        seg_text = seg.text.strip()
        if not seg_text:
            continue

        start = float(seg.start)
        end = float(seg.end)
        avg_logprob = float(getattr(seg, "avg_logprob", 0.0))
        no_speech_prob = float(getattr(seg, "no_speech_prob", 0.0))

        segment_list.append(
            {
                "start": start,
                "end": end,
                "text": seg_text,
                "avg_logprob": avg_logprob,
                "no_speech_prob": no_speech_prob,
            }
        )
        total_logprob += avg_logprob
        valid_segments_count += 1

    # Preserve RAW transcript before any cleanup
    raw_text = " ".join(s["text"] for s in segment_list).strip()
    cleaned_text = _clean_transcript(raw_text)

    # Calculate overall confidence
    if valid_segments_count > 0:
        avg_logprob = total_logprob / valid_segments_count
        import math
        confidence = float(max(0.0, min(1.0, math.exp(avg_logprob))))
    else:
        confidence = 0.0

    _safe_print(f"[STT] Segments: {len(segment_list)}")
    _safe_print(f"[STT] Raw transcript length: {len(raw_text)} characters")
    _safe_print(f"[STT] Cleaned transcript length: {len(cleaned_text)} characters")

    # Post-ASR Quality Validation Stage
    quality_result = validate_asr_quality(
        text=cleaned_text,
        duration_seconds=audio_duration,
        raw_text=raw_text,
    )

    return {
        "text": cleaned_text,
        "raw_transcript": raw_text,
        "cleaned_transcript": cleaned_text,
        "segments": segment_list,
        "language": detected_language,
        "duration": audio_duration,
        "confidence": confidence,
        "model_name": settings.WHISPER_MODEL_SIZE or "tiny",
        "transcription_status": quality_result["transcription_status"],
        "quality_flags": quality_result["quality_flags"],
        "quality_metrics": quality_result["metrics"],
    }

