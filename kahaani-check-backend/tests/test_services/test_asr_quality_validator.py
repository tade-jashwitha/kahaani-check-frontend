import pytest
from app.services.asr_quality_validator import validate_asr_quality, _detect_repeated_phrases


def test_clean_conversational_transcript():
    """Verify normal conversational transcript passes quality validation with no flags."""
    text = (
        "My name is Kamla. I live in Delhi. Today my son came to visit me at home. "
        "We went to the market and had tea together. The weather was pleasant and we discussed family plans."
    )
    result = validate_asr_quality(text=text, duration_seconds=15.0)

    assert result["transcription_status"] == "ok"
    assert result["quality_passed"] is True
    assert result["quality_flags"] == []
    assert result["metrics"]["word_count"] > 20
    assert result["metrics"]["unique_word_ratio"] > 0.60
    assert result["metrics"]["transcript_duration_ratio"] < 3.5


def test_pathological_repetition_loop_detection():
    """Verify pathological repetition loop (e.g. 'get a chance to' repeated) is flagged."""
    repeated_phrase = "get a chance to " * 30
    text = f"I went home but then {repeated_phrase} and left."

    result = validate_asr_quality(text=text, duration_seconds=20.0)

    assert result["transcription_status"] == "quality_warning"
    assert result["quality_passed"] is False
    assert "excessive_repetition" in result["quality_flags"]
    assert any("get a chance to" in d for d in result["details"])


def test_high_speech_rate_anomaly_detection():
    """Verify hallucinated rapid token generation (words/sec > 4.5) is flagged."""
    # 200 words in 10 seconds -> 20 words/sec
    text = " ".join([f"word_{i}" for i in range(100)])

    result = validate_asr_quality(text=text, duration_seconds=10.0)

    assert result["transcription_status"] == "quality_warning"
    assert "high_speech_rate_anomaly" in result["quality_flags"]


def test_low_lexical_diversity_detection():
    """Verify repetitive low diversity text is flagged."""
    # Only 3 unique words repeated across 60 tokens
    text = "yes okay right " * 20

    result = validate_asr_quality(text=text, duration_seconds=30.0)

    assert result["transcription_status"] == "quality_warning"
    assert ("low_vocabulary_diversity" in result["quality_flags"] or "excessive_repetition" in result["quality_flags"])


def test_detect_repeated_phrases_helper():
    """Test the phrase repeat detector helper."""
    text = "he said hello friend hello friend hello friend and goodbye"
    loops = _detect_repeated_phrases(text, min_words=2, max_words=4)
    assert len(loops) > 0
    assert any("hello friend" in loop for loop in loops)
