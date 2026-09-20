from __future__ import annotations

from typing import Optional

from app.repositories import baseline_repo, consent_repo, trajectory_repo
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
# Check-in Processing Service
# ============================================================
# Orchestrates post-recording analysis:
#   consent verification → baseline management → trajectory comparison
#
# All Supabase access is delegated to repository modules.
# All ML/statistical logic is delegated to trajectory_engine.
# ============================================================


# ============================================================
# Consent verification
# ============================================================

def verify_voice_consent(elder_id: str) -> bool:
    """
    Verify that the elder has active consent for weekly voice check-ins.

    A consent is valid only if:
      - status = 'confirmed'
      - expires_at is NULL OR expires_at is in the future
    """
    consent = consent_repo.get_latest_for_elder(elder_id)

    if not consent:
        return False

    # Normalize status across both consent table schemas.
    status = consent.get("status") or (
        "confirmed" if consent.get("consented") else "pending"
    )

    if status != "confirmed":
        return False

    expires_at = consent.get("expires_at")

    if expires_at:
        from datetime import datetime, timezone

        try:
            expiry = datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            )
            if expiry <= datetime.now(timezone.utc):
                return False
        except Exception:
            # Unparseable expiry — fail closed.
            return False

    return True


# ============================================================
# Baseline management
# ============================================================

def get_or_create_baseline(elder_id: str) -> Optional[dict]:
    """
    Return the frozen baseline.

    Attempts to create it from existing samples if it does not
    exist yet.  Returns None if fewer than 3 usable samples exist.
    """
    baseline = get_baseline(elder_id)
    if baseline:
        return baseline

    return save_baseline(elder_id)


# ============================================================
# Full post-recording analysis
# ============================================================

def finalize_checkin_analysis(
    elder_id: str,
    recording_id: str,
    features: dict,
) -> dict:
    """
    Complete baseline + trajectory processing after a recording
    has successfully produced usable speech features.

    Safe for:
      - first recordings (baseline not yet created)
      - baseline creation recordings (third usable sample)
      - post-baseline recordings (trajectory comparison)
      - insufficient longitudinal history

    Returns a result dict with keys:
      status, neutral_status, baseline, trajectory
    """

    # --------------------------------------------------------
    # 1. Validate required features are present
    # --------------------------------------------------------

    required = [
        "speaking_rate_wpm",
        "pause_density",
        "lexical_diversity_ttr",
    ]

    for feature in required:
        if features.get(feature) is None:
            return {
                "status": "insufficient_data",
                "neutral_status": "Insufficient data",
                "baseline": None,
                "trajectory": None,
            }

    # --------------------------------------------------------
    # 2. Check whether a frozen baseline already exists
    # --------------------------------------------------------

    baseline = get_baseline(elder_id)

    # --------------------------------------------------------
    # 3. No baseline yet — try to create one
    # --------------------------------------------------------

    if not baseline:
        baseline = get_or_create_baseline(elder_id)

        # Still collecting samples.
        if not baseline:
            return {
                "status": "baseline_collecting",
                "neutral_status": "Insufficient data",
                "baseline": None,
                "trajectory": None,
            }

        # The current recording may have triggered baseline creation.
        # We do NOT compare the baseline against itself.
        return {
            "status": "baseline_created",
            "neutral_status": "Insufficient data",
            "baseline": baseline,
            "trajectory": None,
        }

    # --------------------------------------------------------
    # 4. Baseline exists — compare current features against it
    # --------------------------------------------------------

    comparison = compare_with_baseline(
        current_features=features,
        baseline=baseline,
    )

    # --------------------------------------------------------
    # 5. Persist this trajectory observation
    # --------------------------------------------------------

    trajectory_row = trajectory_repo.save_result(
        elder_id=elder_id,
        recording_id=recording_id,
        baseline_id=baseline["id"],
        comparison=comparison,
    )

    # --------------------------------------------------------
    # 6. Evaluate longitudinal trend across all observations
    # --------------------------------------------------------

    observations = trajectory_repo.get_observations_for_elder(elder_id)
    longitudinal_status = evaluate_longitudinal_change(observations)
    neutral_status = get_neutral_status(longitudinal_status)

    return {
        "status": longitudinal_status,
        "neutral_status": neutral_status,
        "baseline": baseline,
        "trajectory": {
            **trajectory_row,
            "longitudinal_status": longitudinal_status,
        },
    }