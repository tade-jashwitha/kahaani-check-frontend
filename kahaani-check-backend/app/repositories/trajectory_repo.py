from __future__ import annotations

from app.services.supabase_client import get_supabase_client


# ============================================================
# Trajectory Repository
# ============================================================
# All database access for the `trajectory_results` table lives here.
# No business logic — no z-score calculations, no status logic.
# ============================================================


def get_observations_for_elder(elder_id: str) -> list[dict]:
    """
    Return all trajectory observations for an elder in
    chronological order (oldest first).

    Only the columns needed for longitudinal evaluation are fetched.
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
        .eq("elder_id", elder_id)
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []


def save_result(
    elder_id: str,
    recording_id: str,
    baseline_id: str,
    comparison: dict,
) -> dict:
    """
    Persist a trajectory comparison result.

    Raises RuntimeError if the insert fails (should be treated as
    a hard error — trajectory data is critical for trend analysis).
    """
    supabase = get_supabase_client()

    payload = {
        "elder_id": elder_id,
        "call_recording_id": recording_id,
        "baseline_id": baseline_id,
        "overall_status": comparison.get("overall_status"),
        "speaking_rate_z_score": comparison.get("speaking_rate_z_score"),
        "speaking_rate_status": comparison.get("speaking_rate_status"),
        "pause_density_z_score": comparison.get("pause_density_z_score"),
        "pause_density_status": comparison.get("pause_density_status"),
        "lexical_diversity_z_score": comparison.get("lexical_diversity_z_score"),
        "lexical_diversity_status": comparison.get("lexical_diversity_status"),
    }

    result = (
        supabase
        .table("trajectory_results")
        .insert(payload)
        .execute()
    )

    if not result or not result.data:
        raise RuntimeError("Failed to save trajectory result")

    return result.data[0]
