from __future__ import annotations

from typing import Optional


# ============================================================
# Thresholds
# ============================================================

STABLE_Z_THRESHOLD = 1.0
SIGNIFICANT_Z_THRESHOLD = 2.0


# ============================================================
# Z-score
# ============================================================

def calculate_z_score(
    current_value: Optional[float],
    baseline_mean: Optional[float],
    baseline_stddev: Optional[float],
) -> Optional[float]:
    """
    Calculate a z-score against the frozen baseline.

    If the baseline standard deviation is zero or unavailable,
    return 0.0 instead of dividing by zero.
    """

    if current_value is None:
        return None

    if baseline_mean is None:
        return None

    if baseline_stddev is None:
        return None

    stddev = float(baseline_stddev)

    if stddev <= 0:
        return 0.0

    return (
        float(current_value) - float(baseline_mean)
    ) / stddev


# ============================================================
# Classify z-score
# ============================================================

def classify_z_score(
    z_score: Optional[float],
) -> Optional[str]:
    """
    Classify a feature's deviation from baseline.
    """

    if z_score is None:
        return None

    absolute_z = abs(float(z_score))

    if absolute_z < STABLE_Z_THRESHOLD:
        return "stable"

    if absolute_z < SIGNIFICANT_Z_THRESHOLD:
        return "changed"

    return "significant_change"


# ============================================================
# Compare current features with baseline
# ============================================================

def compare_with_baseline(
    current_features: dict,
    baseline: dict,
) -> dict:
    """
    Compare current speech features against frozen baseline.
    """

    speaking_rate_z = calculate_z_score(
        current_features.get("speaking_rate_wpm"),
        baseline.get("speaking_rate_mean"),
        baseline.get("speaking_rate_stddev"),
    )

    pause_density_z = calculate_z_score(
        current_features.get("pause_density"),
        baseline.get("pause_density_mean"),
        baseline.get("pause_density_stddev"),
    )

    lexical_diversity_z = calculate_z_score(
        current_features.get("lexical_diversity_ttr"),
        baseline.get("lexical_diversity_mean"),
        baseline.get("lexical_diversity_stddev"),
    )

    speaking_rate_status = classify_z_score(
        speaking_rate_z
    )

    pause_density_status = classify_z_score(
        pause_density_z
    )

    lexical_diversity_status = classify_z_score(
        lexical_diversity_z
    )

    statuses = [
        speaking_rate_status,
        pause_density_status,
        lexical_diversity_status,
    ]

    changed_count = sum(
        status in {
            "changed",
            "significant_change",
        }
        for status in statuses
        if status is not None
    )

    if changed_count >= 2:
        overall_status = "change_detected"
    else:
        overall_status = "stable"

    return {
        "overall_status": overall_status,

        "speaking_rate_z_score": speaking_rate_z,
        "speaking_rate_status": speaking_rate_status,

        "pause_density_z_score": pause_density_z,
        "pause_density_status": pause_density_status,

        "lexical_diversity_z_score": lexical_diversity_z,
        "lexical_diversity_status": lexical_diversity_status,
    }


# ============================================================
# Longitudinal trend evaluation
# ============================================================

def evaluate_longitudinal_change(
    observations: list[dict],
) -> str:
    """
    Evaluate repeated changes over the latest 3 observations.

    A single unusual recording should not trigger a longitudinal
    change signal.

    Requires at least 3 post-baseline observations.

    Returns:
        stable_trend
        change_worth_reviewing
        insufficient_data
    """

    if len(observations) < 3:
        return "insufficient_data"

    latest = observations[-3:]

    feature_statuses = {
        "speaking_rate": [],
        "pause_density": [],
        "lexical_diversity": [],
    }

    for observation in latest:
        feature_statuses["speaking_rate"].append(
            observation.get("speaking_rate_status")
        )

        feature_statuses["pause_density"].append(
            observation.get("pause_density_status")
        )

        feature_statuses["lexical_diversity"].append(
            observation.get("lexical_diversity_status")
        )

    repeated_changed_features = 0

    for statuses in feature_statuses.values():

        changed_observations = sum(
            status in {
                "changed",
                "significant_change",
            }
            for status in statuses
        )

        if changed_observations >= 2:
            repeated_changed_features += 1

    if repeated_changed_features >= 2:
        return "change_worth_reviewing"

    return "stable_trend"


# ============================================================
# Neutral status for API/UI
# ============================================================

def get_neutral_status(
    status: Optional[str],
) -> str:
    """
    Convert internal statuses into neutral user-facing language.

    This deliberately avoids diagnostic terminology.
    """

    mapping = {
        "stable": "Stable trend",
        "stable_trend": "Stable trend",
        "change_detected": "Change worth reviewing",
        "change_worth_reviewing": "Change worth reviewing",
        "insufficient_data": "Insufficient data",
    }

    if status is None:
        return "Insufficient data"

    return mapping.get(
        status,
        "Insufficient data",
    )