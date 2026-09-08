from functools import lru_cache

from faster_whisper import WhisperModel

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_whisper_model() -> WhisperModel:
    """
    Load and cache the Whisper model.

    The model is loaded once and reused for subsequent
    transcription requests.
    """

    settings = get_settings()

    print(
        "[Whisper] Loading model: "
        f"{settings.WHISPER_MODEL_SIZE}"
    )

    print(
        "[Whisper] Device: "
        f"{settings.WHISPER_DEVICE}"
    )

    print(
        "[Whisper] Compute type: "
        f"{settings.WHISPER_COMPUTE_TYPE}"
    )

    return WhisperModel(
        settings.WHISPER_MODEL_SIZE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )


def transcribe(
    audio_path: str,
    language: str | None = None,
) -> dict:
    """
    High-quality transcription for Kahaani-Check.

    Designed for:
    - real elder speech
    - conversational Hindi
    - Indian-accented speech
    - natural pauses
    - Hindi/English code-switching

    The original uploaded audio is preserved separately.
    This function only performs transcription.
    """

    settings = get_settings()

    model = get_whisper_model()

    # ---------------------------------------------------------
    # Language
    # ---------------------------------------------------------

    language_to_use = (
        language
        or settings.WHISPER_LANGUAGE
        or "hi"
    )

    print(
        "[Whisper] Language: "
        f"{language_to_use}"
    )

    # ---------------------------------------------------------
    # Transcription
    # ---------------------------------------------------------
    #
    # IMPORTANT:
    # VAD is intentionally disabled.
    #
    # Real elder recordings can contain quiet speech,
    # breathing, short pauses and low-energy speech.
    # Aggressive VAD previously reduced R1 to only 2.8 sec
    # of detected speech.
    #
    # Whisper's own decoding logic is used to handle
    # uncertain portions instead.
    # ---------------------------------------------------------

    segments, info = model.transcribe(
        audio_path,

        language=language_to_use,

        # -----------------------------------------------------
        # High-quality beam search
        # -----------------------------------------------------

        beam_size=8,

        best_of=5,

        patience=1.0,

        # Allow Whisper to retry difficult segments using
        # different decoding temperatures.
        temperature=(
            0.0,
            0.2,
            0.4,
            0.6,
            0.8,
        ),

        # -----------------------------------------------------
        # Context
        # -----------------------------------------------------

        # Keeping previous context helps conversational speech
        # where a sentence continues across segments.
        condition_on_previous_text=True,

        # -----------------------------------------------------
        # Hallucination / low-confidence protection
        # -----------------------------------------------------

        compression_ratio_threshold=2.4,

        log_prob_threshold=-1.0,

        no_speech_threshold=0.6,

        # -----------------------------------------------------
        # Repetition protection
        # -----------------------------------------------------

        repetition_penalty=1.05,

        no_repeat_ngram_size=3,

        # -----------------------------------------------------
        # Timing
        # -----------------------------------------------------

        word_timestamps=True,

        # -----------------------------------------------------
        # VAD
        # -----------------------------------------------------

        vad_filter=False,

        # -----------------------------------------------------
        # Punctuation handling for word timestamps
        # -----------------------------------------------------

        prepend_punctuations="\"'“¿([{-",

        append_punctuations="\"'.。,，!！?？:：”)]}、",

    )

    # ---------------------------------------------------------
    # Collect segments
    # ---------------------------------------------------------

    segment_list: list[dict] = []

    total_logprob = 0.0
    total_no_speech_probability = 0.0
    confidence_count = 0

    for segment in segments:

        text = segment.text.strip()

        if not text:
            continue

        start = float(segment.start)
        end = float(segment.end)

        if end <= start:
            continue

        avg_logprob = float(
            getattr(
                segment,
                "avg_logprob",
                0.0,
            )
        )

        no_speech_prob = float(
            getattr(
                segment,
                "no_speech_prob",
                0.0,
            )
        )

        compression_ratio = float(
            getattr(
                segment,
                "compression_ratio",
                0.0,
            )
        )

        segment_list.append(
            {
                "start": start,
                "end": end,
                "text": text,
                "avg_logprob": avg_logprob,
                "no_speech_prob": no_speech_prob,
                "compression_ratio": compression_ratio,
            }
        )

        total_logprob += avg_logprob
        total_no_speech_probability += no_speech_prob

        confidence_count += 1

    # ---------------------------------------------------------
    # Combine transcript
    # ---------------------------------------------------------

    text = " ".join(
        segment["text"]
        for segment in segment_list
    ).strip()

    # ---------------------------------------------------------
    # Average confidence information
    # ---------------------------------------------------------

    if confidence_count > 0:

        average_logprob = (
            total_logprob
            / confidence_count
        )

        average_no_speech_probability = (
            total_no_speech_probability
            / confidence_count
        )

    else:

        average_logprob = 0.0
        average_no_speech_probability = 1.0

    # ---------------------------------------------------------
    # Log useful diagnostics
    # ---------------------------------------------------------

    print(
        "[Whisper] Segments: "
        f"{len(segment_list)}"
    )

    print(
        "[Whisper] Average log probability: "
        f"{average_logprob:.4f}"
    )

    print(
        "[Whisper] Average no-speech probability: "
        f"{average_no_speech_probability:.4f}"
    )

    print(
        "[Whisper] Transcript words: "
        f"{len(text.split())}"
    )

    # ---------------------------------------------------------
    # Return
    # ---------------------------------------------------------

    return {
        "text": text,

        "language": info.language,

        "language_probability": float(
            info.language_probability
        ),

        "model_name": (
            settings.WHISPER_MODEL_SIZE
        ),

        "segments": segment_list,

        "segment_count": len(
            segment_list
        ),

        "average_logprob": (
            average_logprob
        ),

        "average_no_speech_probability": (
            average_no_speech_probability
        ),
    }