from __future__ import annotations

import re
from typing import Any


def _normalize_tokens(text: str) -> list[str]:
    """Tokenize and normalize text into clean words."""
    if not text:
        return []
    # Remove punctuation except word characters and intra-word hyphens/apostrophes
    cleaned = re.sub(r"[^\w\s']", " ", text.lower())
    return [w.strip("'") for w in cleaned.split() if w.strip("'")]


def _calculate_ngram_repetition(tokens: list[str], n: int = 3) -> tuple[float, int]:
    """
    Calculate repetition ratio for n-grams.
    Returns (repetition_ratio, max_consecutive_repetitions).
    """
    if len(tokens) < n:
        return 0.0, 0

    ngrams = [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]
    if not ngrams:
        return 0.0, 0

    total_ngrams = len(ngrams)
    unique_ngrams = len(set(ngrams))
    repetition_ratio = max(0.0, (total_ngrams - unique_ngrams) / total_ngrams)

    # Check max consecutive identical n-grams
    max_consecutive = 1
    current_consecutive = 1
    for i in range(1, len(ngrams)):
        if ngrams[i] == ngrams[i - 1]:
            current_consecutive += 1
            if current_consecutive > max_consecutive:
                max_consecutive = current_consecutive
        else:
            current_consecutive = 1

    return float(repetition_ratio), max_consecutive


def _detect_repeated_phrases(text: str, min_words: int = 2, max_words: int = 6) -> list[str]:
    """
    Detect exact repeating phrase loops such as 'get a chance to get a chance to'.
    Returns list of repeated phrases detected.
    """
    tokens = _normalize_tokens(text)
    if len(tokens) < min_words * 2:
        return []

    repeated: list[str] = []
    for k in range(min_words, min(max_words + 1, len(tokens) // 2 + 1)):
        for i in range(len(tokens) - 2 * k + 1):
            phrase_1 = tokens[i : i + k]
            phrase_2 = tokens[i + k : i + 2 * k]
            if phrase_1 == phrase_2:
                # Count how many consecutive times it repeats
                repeats = 2
                cursor = i + 2 * k
                while cursor + k <= len(tokens) and tokens[cursor : cursor + k] == phrase_1:
                    repeats += 1
                    cursor += k
                if repeats >= 3:
                    phrase_str = " ".join(phrase_1)
                    if phrase_str not in repeated:
                        repeated.append(f"'{phrase_str}' repeated {repeats}x")

    return repeated


def validate_asr_quality(
    text: str,
    duration_seconds: float,
    raw_text: str | None = None,
) -> dict[str, Any]:
    """
    Validate speech-to-text transcript quality to detect pathological ASR decoding failures.

    Checks:
      1. Excessive repeated phrases / loops (e.g. 'get a chance to' repeated 3+ times)
      2. Abnormally high n-gram repetition ratio
      3. Transcript much longer than expected for audio duration (words per second > 4.5)
      4. Extremely low vocabulary diversity (Type-Token Ratio < 0.25 on long speech)
      5. Repetitive single-word stuttering / looping

    Returns:
        dict containing:
            transcription_status: 'ok' or 'quality_warning'
            quality_passed: bool
            quality_flags: list[str]
            metrics: dict
            details: list[str]
    """
    eval_text = text or ""
    tokens = _normalize_tokens(eval_text)
    word_count = len(tokens)
    duration = max(float(duration_seconds or 0.0), 0.1)

    # Metrics
    unique_words = len(set(tokens))
    unique_word_ratio = float(unique_words / word_count) if word_count > 0 else 1.0
    transcript_duration_ratio = float(word_count / duration)  # words per second

    rep_ratio_3gram, max_consecutive_3grams = _calculate_ngram_repetition(tokens, n=3)
    rep_ratio_2gram, max_consecutive_2grams = _calculate_ngram_repetition(tokens, n=2)
    overall_repetition_ratio = max(rep_ratio_2gram, rep_ratio_3gram)

    detected_loops = _detect_repeated_phrases(eval_text)

    quality_flags: list[str] = []
    details: list[str] = []

    # Flag 1: Excessive repeated phrases / loops
    if detected_loops or max_consecutive_3grams >= 3 or max_consecutive_2grams >= 4:
        quality_flags.append("excessive_repetition")
        if detected_loops:
            details.extend(detected_loops)
        else:
            details.append(f"High consecutive n-gram repetition ({max(max_consecutive_2grams, max_consecutive_3grams)}x)")

    # Flag 2: Abnormally high repetition ratio
    if word_count >= 15 and overall_repetition_ratio >= 0.40:
        if "excessive_repetition" not in quality_flags:
            quality_flags.append("excessive_repetition")
        details.append(f"High n-gram repetition ratio: {overall_repetition_ratio:.2f}")

    # Flag 3: Abnormal speech rate (words per second > 4.5)
    # Normal conversational speech is 2.0-3.0 wps. > 4.5 wps over > 5 seconds is a strong sign of ASR hallucination
    if duration >= 5.0 and transcript_duration_ratio > 4.5 and word_count > 30:
        quality_flags.append("high_speech_rate_anomaly")
        details.append(f"Abnormally high speech rate: {transcript_duration_ratio:.1f} wps ({word_count} words in {duration:.1f}s)")

    # Flag 4: Extremely low vocabulary diversity
    if word_count >= 25 and unique_word_ratio < 0.25:
        quality_flags.append("low_vocabulary_diversity")
        details.append(f"Extremely low unique word ratio: {unique_word_ratio:.2f}")

    # Flag 5: Suspicious phrase loop if raw_text has massive repeated tokens
    if raw_text and raw_text != text:
        raw_tokens = _normalize_tokens(raw_text)
        if len(raw_tokens) > len(tokens) * 2 and len(raw_tokens) > 40:
            if "excessive_repetition" not in quality_flags:
                quality_flags.append("excessive_repetition")
            details.append(f"Raw transcript had extreme duplicate token collapse ({len(raw_tokens)} -> {len(tokens)} words)")

    quality_passed = len(quality_flags) == 0
    transcription_status = "ok" if quality_passed else "quality_warning"

    # Structured logging requirement
    print(
        f"[ASR QUALITY]\n"
        f"transcript_duration_ratio={transcript_duration_ratio:.2f}\n"
        f"word_count={word_count}\n"
        f"unique_word_ratio={unique_word_ratio:.2f}\n"
        f"repetition_ratio={overall_repetition_ratio:.2f}\n"
        f"quality_flags={quality_flags}"
    )

    return {
        "transcription_status": transcription_status,
        "quality_passed": quality_passed,
        "quality_flags": quality_flags,
        "metrics": {
            "word_count": word_count,
            "unique_word_count": unique_words,
            "unique_word_ratio": round(unique_word_ratio, 3),
            "transcript_duration_ratio": round(transcript_duration_ratio, 2),
            "repetition_ratio": round(overall_repetition_ratio, 3),
            "audio_duration": round(duration, 2),
            "max_consecutive_ngrams": max(max_consecutive_2grams, max_consecutive_3grams),
        },
        "details": details,
    }
