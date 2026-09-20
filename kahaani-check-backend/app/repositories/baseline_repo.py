from __future__ import annotations

import uuid
from typing import Optional

from app.services.supabase_client import get_supabase_client


# ============================================================
# Baseline Repository
# ============================================================
# All database access for the `baselines` and `speech_features`
# tables lives here.
# No business logic — no statistics, no mean/stddev calculations.
# ============================================================

MIN_BASELINE_SAMPLES = 3


def get_for_elder(elder_id: str) -> dict | None:
    """Return the frozen baseline for an elder, or None if not yet created."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("baselines")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    return result.data if result and result.data else None


def get_usable_samples(elder_id: str, limit: int = MIN_BASELINE_SAMPLES) -> list[dict]:
    """
    Return the first N usable speech-feature samples for baseline calculation.

    Only recordings with quality_status='passed' and all three core
    feature columns populated are considered usable.
    """
    supabase = get_supabase_client()

    recordings_result = (
        supabase
        .table("call_recordings")
        .select("id, created_at, quality_status")
        .eq("elder_id", elder_id)
        .eq("quality_status", "passed")
        .order("created_at", desc=False)
        .execute()
    )

    recordings = recordings_result.data or []
    if not recordings:
        return []

    usable = []
    for rec in recordings:
        rec_id = rec.get("id")
        if not rec_id:
            continue

        feat_result = (
            supabase
            .table("speech_features")
            .select("call_recording_id, speaking_rate_wpm, pause_density, lexical_diversity_ttr")
            .eq("call_recording_id", rec_id)
            .maybe_single()
            .execute()
        )

        row = feat_result.data if feat_result and feat_result.data else None
        if (
            row
            and row.get("speaking_rate_wpm") is not None
            and row.get("pause_density") is not None
            and row.get("lexical_diversity_ttr") is not None
        ):
            usable.append(row)
            if len(usable) >= limit:
                break

    return usable


def save(elder_id: str, stats: dict) -> dict | None:
    """
    Persist the calculated baseline statistics for an elder.

    `stats` must contain the six mean/stddev pairs for
    speaking_rate, pause_density, and lexical_diversity,
    plus sample_count.

    Returns the saved row, or None on failure.
    """
    supabase = get_supabase_client()

    payload = {
        "id": str(uuid.uuid4()),
        "elder_id": elder_id,
        **stats,
    }

    result = (
        supabase
        .table("baselines")
        .insert(payload)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None
