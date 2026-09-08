from __future__ import annotations

from typing import Optional

from app.services.supabase_client import get_supabase_client
from app.services.baseline_service import (
    get_baseline,
    save_baseline,
)
from app.services.trajectory_engine import (
    compare_with_baseline,
    evaluate_longitudinal_change,
    get_neutral_status,
)


# ============================================================
# Consent
# ============================================================

CONSENT_TYPE = "weekly_voice_checkin"
CONFIRMED_STATUS = "confirmed"


def verify_voice_consent(
    elder_id: str,
) -> bool:
    """
    Verify that the elder has active consent for weekly
    voice check-ins.

    A confirmed consent is valid only if:
      - status = confirmed
      - expires_at is NULL OR expires_at is in the future
    """

    supabase = get_supabase_client()

    result = (
        supabase
        .table("consents")
        .select(
            "id, status, captured_at, expires_at"
        )
        .eq(
            "elder_id",
            elder_id,
        )
        .eq(
            "consent_type",
            CONSENT_TYPE,
        )
        .order(
            "captured_at",
            desc=True,
        )
        .limit(1)
        .execute()
    )

    if not result or not result.data:
        return False

    consent = result.data[0]

    if consent.get("status") != CONFIRMED_STATUS:
        return False

    expires_at = consent.get("expires_at")

    if expires_at:
        from datetime import datetime, timezone

        try:
            expiry = datetime.fromisoformat(
                expires_at.replace(
                    "Z",
                    "+00:00",
                )
            )

            if expiry <= datetime.now(timezone.utc):
                return False

        except Exception:
            # If an expiry exists but cannot be safely parsed,
            # fail closed.
            return False

    return True


# ============================================================
# Get current baseline
# ============================================================

def get_or_create_baseline(
    elder_id: str,
) -> Optional[dict]:
    """
    Return the frozen baseline.

    If it does not exist yet, attempt to create it.

    The baseline is created only when 3 usable samples exist.
    """

    baseline = get_baseline(elder_id)

    if baseline:
        return baseline

    return save_baseline(elder_id)


# ============================================================
# Get previous trajectory observations
# ============================================================

def get_previous_observations(
    elder_id: str,
) -> list[dict]:
    """
    Read previous trajectory results for this elder.

    Returns lightweight observations suitable for longitudinal
    evaluation.
    """

    supabase = get_supabase_client()

    result = (
        supabase
        .table("trajectory_results")
        .select(
            """
            id,
            elder_id,
            call_recording_id,
            baseline_id,
            overall_status,
            speaking_rate_z_score,
            speaking_rate_status,
            pause_density_z_score,
            pause_density_status,
            lexical_diversity_z_score,
            lexical_diversity_status,
            created_at
            """
        )
        .eq(
            "elder_id",
            elder_id,
        )
        .order(
            "created_at",
            desc=False,
        )
        .execute()
    )

    if not result or not result.data:
        return []

    observations = []

    for row in result.data:
        observations.append(
            {
                "id": row.get("id"),
                "call_recording_id": row.get(
                    "call_recording_id"
                ),
                "overall_status": row.get(
                    "overall_status"
                ),

                "speaking_rate_z_score": row.get(
                    "speaking_rate_z_score"
                ),
                "speaking_rate_status": row.get(
                    "speaking_rate_status"
                ),

                "pause_density_z_score": row.get(
                    "pause_density_z_score"
                ),
                "pause_density_status": row.get(
                    "pause_density_status"
                ),

                "lexical_diversity_z_score": row.get(
                    "lexical_diversity_z_score"
                ),
                "lexical_diversity_status": row.get(
                    "lexical_diversity_status"
                ),

                "created_at": row.get(
                    "created_at"
                ),
            }
        )

    return observations


# ============================================================
# Save trajectory result
# ============================================================

def save_trajectory_result(
    elder_id: str,
    recording_id: str,
    baseline_id: str,
    comparison: dict,
) -> dict:
    """
    Persist the comparison result into trajectory_results.
    """

    supabase = get_supabase_client()

    insert_data = {
        "elder_id": elder_id,
        "call_recording_id": recording_id,
        "baseline_id": baseline_id,

        "overall_status": comparison.get(
            "overall_status"
        ),

        "speaking_rate_z_score": comparison.get(
            "speaking_rate_z_score"
        ),
        "speaking_rate_status": comparison.get(
            "speaking_rate_status"
        ),

        "pause_density_z_score": comparison.get(
            "pause_density_z_score"
        ),
        "pause_density_status": comparison.get(
            "pause_density_status"
        ),

        "lexical_diversity_z_score": comparison.get(
            "lexical_diversity_z_score"
        ),
        "lexical_diversity_status": comparison.get(
            "lexical_diversity_status"
        ),
    }

    result = (
        supabase
        .table("trajectory_results")
        .insert(insert_data)
        .execute()
    )

    if not result or not result.data:
        raise RuntimeError(
            "Failed to save trajectory result"
        )

    return result.data[0]


# ============================================================
# Finalize analysis
# ============================================================

def finalize_checkin_analysis(
    elder_id: str,
    recording_id: str,
    features: dict,
) -> dict:
    """
    Complete baseline + trajectory processing after a recording
    has successfully produced usable speech features.

    This function is intentionally safe for:
      - first recordings
      - baseline creation
      - post-baseline recordings
      - insufficient longitudinal history
    """

    # --------------------------------------------------------
    # 1. Validate features
    # --------------------------------------------------------

    required_features = [
        "speaking_rate_wpm",
        "pause_density",
        "lexical_diversity_ttr",
    ]

    for feature in required_features:
        if features.get(feature) is None:
            return {
                "status": "insufficient_data",
                "neutral_status": "Insufficient data",
                "baseline": None,
                "trajectory": None,
            }

    # --------------------------------------------------------
    # 2. Check existing baseline
    # --------------------------------------------------------

    baseline = get_baseline(elder_id)

    # --------------------------------------------------------
    # 3. No baseline yet
    # --------------------------------------------------------

    if not baseline:

        baseline = get_or_create_baseline(
            elder_id
        )

        # Still collecting baseline samples.
        if not baseline:
            return {
                "status": "baseline_collecting",
                "neutral_status": "Insufficient data",
                "baseline": None,
                "trajectory": None,
            }

        # The current recording may have become the third
        # sample that created the baseline.
        #
        # We do NOT compare the baseline against itself.
        #
        # Future recordings will be compared against it.

        return {
            "status": "baseline_created",
            "neutral_status": "Insufficient data",
            "baseline": baseline,
            "trajectory": None,
        }

    # --------------------------------------------------------
    # 4. Baseline already exists
    # --------------------------------------------------------

    comparison = compare_with_baseline(
        current_features=features,
        baseline=baseline,
    )

    # --------------------------------------------------------
    # 5. Save this trajectory observation
    # --------------------------------------------------------

    trajectory_row = save_trajectory_result(
        elder_id=elder_id,
        recording_id=recording_id,
        baseline_id=baseline["id"],
        comparison=comparison,
    )

    # --------------------------------------------------------
    # 6. Evaluate longitudinal trend
    # --------------------------------------------------------

    previous_observations = (
        get_previous_observations(
            elder_id
        )
    )

    longitudinal_status = (
        evaluate_longitudinal_change(
            previous_observations
        )
    )

    # --------------------------------------------------------
    # 7. Neutral user-facing status
    # --------------------------------------------------------

    neutral_status = get_neutral_status(
        longitudinal_status
    )

    return {
        "status": longitudinal_status,
        "neutral_status": neutral_status,
        "baseline": baseline,
        "trajectory": {
            **trajectory_row,
            "longitudinal_status": (
                longitudinal_status
            ),
        },
    }