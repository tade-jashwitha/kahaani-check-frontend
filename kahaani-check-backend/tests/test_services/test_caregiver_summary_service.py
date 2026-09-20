from __future__ import annotations

import pytest

from app.services.caregiver_summary_service import generate_caregiver_summary


FORBIDDEN_WORDS = [
    "diagnos",
    "disease",
    "dementia",
    "normal",
    "abnormal",
    "healthy",
    "unhealthy",
    "cognitive decline",
    "at risk",
]


def _assert_no_medical_jargon(data: dict):
    """Recursively ensure no medical or diagnostic terminology appears anywhere."""
    text_corpus = []

    def _collect(obj):
        if isinstance(obj, str):
            text_corpus.append(obj.lower())
        elif isinstance(obj, dict):
            for v in obj.values():
                _collect(v)
        elif isinstance(obj, list):
            for item in obj:
                _collect(item)

    _collect(data)
    combined = " ".join(text_corpus)
    for word in FORBIDDEN_WORDS:
        assert word not in combined, f"Forbidden diagnostic word '{word}' found in summary output!"


def test_1_fewer_than_three_sessions():
    """Calibration state with fewer than 3 sessions."""
    observations = [
        {
            "observation_number": 1,
            "recorded_at": "2026-09-18T10:00:00Z",
            "features": {"speaking_rate_wpm": 180.0, "pause_density": 0.20, "lexical_diversity_ttr": 0.50},
            "transcript": {"text": "Hello there.", "language": "en", "confidence": 0.9},
            "biomarker_comparisons": None,
        }
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=None)

    assert summary["status"] == "baseline_calibrating"
    assert summary["observations_count"] == 1
    assert summary["baseline_sample_count"] == 1
    assert "calibration" in summary["headline"].lower()
    assert summary["current_session"]["session_number"] == 1
    assert summary["previous_session_comparison"] is None
    _assert_no_medical_jargon(summary)


def test_2_exactly_three_baseline_sessions():
    """Exactly 3 sessions where baseline is established."""
    baseline = {
        "speaking_rate_mean": 200.0,
        "speaking_rate_stddev": 10.0,
        "pause_density_mean": 0.22,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.55,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
    }
    observations = [
        {
            "observation_number": 1,
            "recorded_at": "2026-09-10T10:00:00Z",
            "features": {"speaking_rate_wpm": 195.0, "pause_density": 0.21, "lexical_diversity_ttr": 0.53},
        },
        {
            "observation_number": 2,
            "recorded_at": "2026-09-15T10:00:00Z",
            "features": {"speaking_rate_wpm": 205.0, "pause_density": 0.23, "lexical_diversity_ttr": 0.57},
        },
        {
            "observation_number": 3,
            "recorded_at": "2026-09-20T10:00:00Z",
            "features": {"speaking_rate_wpm": 200.0, "pause_density": 0.22, "lexical_diversity_ttr": 0.55},
            "transcript": {"text": "Third check-in speech sample.", "language": "en"},
            "biomarker_comparisons": {
                "speaking_rate": {
                    "current_value": 200.0,
                    "baseline_value": 200.0,
                    "absolute_diff": 0.0,
                    "percentage_diff": 0.0,
                    "trend_direction": "typical",
                    "comparison_label": "Consistent with personal baseline",
                },
                "pause_density": {
                    "current_value": 0.22,
                    "baseline_value": 0.22,
                    "absolute_diff": 0.0,
                    "percentage_diff": 0.0,
                    "trend_direction": "typical",
                    "comparison_label": "Consistent with personal baseline",
                },
                "lexical_diversity": {
                    "current_value": 0.55,
                    "baseline_value": 0.55,
                    "absolute_diff": 0.0,
                    "percentage_diff": 0.0,
                    "trend_direction": "typical",
                    "comparison_label": "Consistent with personal baseline",
                },
            },
        },
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    assert summary["status"] == "baseline_active"
    assert summary["baseline_sample_count"] == 3
    assert summary["observations_count"] == 3
    assert summary["previous_session_comparison"] is not None
    _assert_no_medical_jargon(summary)


def test_3_multiple_sessions():
    """Multiple sessions (> 3) with longitudinal progression."""
    baseline = {
        "speaking_rate_mean": 190.0,
        "speaking_rate_stddev": 15.0,
        "pause_density_mean": 0.20,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.50,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
    }
    observations = [
        {"observation_number": i, "features": {"speaking_rate_wpm": 190.0, "pause_density": 0.20, "lexical_diversity_ttr": 0.50}}
        for i in range(1, 6)
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    assert summary["observations_count"] == 5
    assert summary["status"] == "baseline_active"
    assert "consistent" in summary["longitudinal_direction"].lower() or "baseline" in summary["longitudinal_direction"].lower()
    _assert_no_medical_jargon(summary)


def test_4_missing_feature_values():
    """Observation with missing features handled gracefully without crash."""
    observations = [
        {
            "observation_number": 1,
            "recorded_at": "2026-09-20T10:00:00Z",
            "features": {},  # empty features
            "transcript": None,
            "biomarker_comparisons": None,
        }
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=None)

    assert summary["current_session"] is not None
    assert summary["current_session"]["biomarkers"]["speaking_rate"]["current_value"] is None
    _assert_no_medical_jargon(summary)


def test_5_unchanged_values():
    """Observations match baseline values exactly -> within personal baseline."""
    baseline = {
        "speaking_rate_mean": 180.0,
        "speaking_rate_stddev": 10.0,
        "pause_density_mean": 0.20,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.50,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
    }
    observations = [
        {
            "observation_number": 4,
            "features": {"speaking_rate_wpm": 180.0, "pause_density": 0.20, "lexical_diversity_ttr": 0.50},
            "biomarker_comparisons": {
                "speaking_rate": {"absolute_diff": 0.0, "percentage_diff": 0.0, "trend_direction": "typical", "comparison_label": "Consistent with personal baseline"},
                "pause_density": {"absolute_diff": 0.0, "percentage_diff": 0.0, "trend_direction": "typical", "comparison_label": "Consistent with personal baseline"},
                "lexical_diversity": {"absolute_diff": 0.0, "percentage_diff": 0.0, "trend_direction": "typical", "comparison_label": "Consistent with personal baseline"},
            },
        }
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    assert any("within personal baseline" in obs.lower() or "consistent" in obs.lower() for obs in summary["key_observations"])
    _assert_no_medical_jargon(summary)


def test_6_higher_than_baseline_values():
    """Higher than baseline values formatted as Higher than usual."""
    baseline = {
        "speaking_rate_mean": 180.0,
        "speaking_rate_stddev": 10.0,
        "pause_density_mean": 0.20,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.50,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
    }
    observations = [
        {
            "observation_number": 4,
            "features": {"speaking_rate_wpm": 220.0, "pause_density": 0.30, "lexical_diversity_ttr": 0.70},
            "biomarker_comparisons": {
                "speaking_rate": {"absolute_diff": 40.0, "percentage_diff": 22.2, "trend_direction": "higher", "comparison_label": "Higher than usual"},
                "pause_density": {"absolute_diff": 0.10, "percentage_diff": 50.0, "trend_direction": "higher", "comparison_label": "Higher than usual"},
                "lexical_diversity": {"absolute_diff": 0.20, "percentage_diff": 40.0, "trend_direction": "higher", "comparison_label": "Higher than usual"},
            },
        }
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    assert any("higher than usual" in obs.lower() for obs in summary["key_observations"])
    assert summary["current_session"]["biomarkers"]["speaking_rate"]["status_label"] == "Higher than usual"
    _assert_no_medical_jargon(summary)


def test_7_lower_than_baseline_values():
    """Lower than baseline values formatted as Lower than usual."""
    baseline = {
        "speaking_rate_mean": 200.0,
        "speaking_rate_stddev": 10.0,
        "pause_density_mean": 0.25,
        "pause_density_stddev": 0.02,
        "lexical_diversity_mean": 0.60,
        "lexical_diversity_stddev": 0.05,
        "sample_count": 3,
    }
    observations = [
        {
            "observation_number": 4,
            "features": {"speaking_rate_wpm": 160.0, "pause_density": 0.15, "lexical_diversity_ttr": 0.40},
            "biomarker_comparisons": {
                "speaking_rate": {"absolute_diff": -40.0, "percentage_diff": -20.0, "trend_direction": "lower", "comparison_label": "Lower than usual"},
                "pause_density": {"absolute_diff": -0.10, "percentage_diff": -40.0, "trend_direction": "lower", "comparison_label": "Lower than usual"},
                "lexical_diversity": {"absolute_diff": -0.20, "percentage_diff": -33.3, "trend_direction": "lower", "comparison_label": "Lower than usual"},
            },
        }
    ]
    summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    assert any("lower than usual" in obs.lower() for obs in summary["key_observations"])
    assert summary["current_session"]["biomarkers"]["speaking_rate"]["status_label"] == "Lower than usual"
    _assert_no_medical_jargon(summary)
