from __future__ import annotations

import statistics
import uuid
from typing import Optional

from app.services.supabase_client import get_supabase_client


# ============================================================
# Configuration
# ============================================================

MIN_BASELINE_SAMPLES = 3

FEATURE_COLUMNS = {
    "speaking_rate": "speaking_rate_wpm",
    "pause_density": "pause_density",
    "lexical_diversity": "lexical_diversity_ttr",
}


# ============================================================
# Get existing frozen baseline
# ============================================================

def get_baseline(elder_id: str) -> Optional[dict]:
    """
    Return the elder's frozen baseline if one exists.

    The baseline is created once after the first 3 usable
    recordings and is not automatically replaced.
    """

    supabase = get_supabase_client()

    result = (
        supabase
        .table("baselines")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    if result and result.data:
        return result.data

    return None


# ============================================================
# Collect baseline samples
# ============================================================

def get_baseline_samples(elder_id: str) -> list[dict]:
    """
    Get the first 3 usable speech-feature samples for an elder.

    Only recordings with quality_status='passed' are considered.
    """

    supabase = get_supabase_client()

    result = (
        supabase
        .table("speech_features")
        .select(
            """
            call_recording_id,
            speaking_rate_wpm,
            pause_density,
            lexical_diversity_ttr,
            call_recordings!inner(
                elder_id,
                quality_status,
                created_at
            )
            """
        )
        .eq(
            "call_recordings.elder_id",
            elder_id,
        )
        .eq(
            "call_recordings.quality_status",
            "passed",
        )
        .order(
            "call_recordings(created_at)",
            desc=False,
        )
        .limit(MIN_BASELINE_SAMPLES)
        .execute()
    )

    if not result or not result.data:
        return []

    usable = []

    for row in result.data:
        if (
            row.get("speaking_rate_wpm") is not None
            and row.get("pause_density") is not None
            and row.get("lexical_diversity_ttr") is not None
        ):
            usable.append(row)

    return usable


# ============================================================
# Calculate baseline statistics
# ============================================================

def calculate_baseline(elder_id: str) -> Optional[dict]:
    """
    Calculate baseline statistics from the first 3 usable samples.

    Returns None until at least 3 usable samples exist.
    """

    samples = get_baseline_samples(elder_id)

    if len(samples) < MIN_BASELINE_SAMPLES:
        return None

    speaking_rates = [
        float(row["speaking_rate_wpm"])
        for row in samples
    ]

    pause_densities = [
        float(row["pause_density"])
        for row in samples
    ]

    lexical_diversities = [
        float(row["lexical_diversity_ttr"])
        for row in samples
    ]

    return {
        "elder_id": elder_id,

        "speaking_rate_mean": statistics.mean(
            speaking_rates
        ),
        "speaking_rate_stddev": statistics.stdev(
            speaking_rates
        ),

        "pause_density_mean": statistics.mean(
            pause_densities
        ),
        "pause_density_stddev": statistics.stdev(
            pause_densities
        ),

        "lexical_diversity_mean": statistics.mean(
            lexical_diversities
        ),
        "lexical_diversity_stddev": statistics.stdev(
            lexical_diversities
        ),

        "sample_count": MIN_BASELINE_SAMPLES,
    }


# ============================================================
# Save frozen baseline
# ============================================================

def save_baseline(elder_id: str) -> Optional[dict]:
    """
    Create the baseline if enough usable samples exist.

    If a baseline already exists, return it unchanged.

    This makes the baseline frozen.
    """

    existing = get_baseline(elder_id)

    if existing:
        return existing

    calculated = calculate_baseline(elder_id)

    if not calculated:
        return None

    supabase = get_supabase_client()

    baseline_id = str(uuid.uuid4())

    insert_data = {
        "id": baseline_id,
        "elder_id": elder_id,

        "speaking_rate_mean": calculated[
            "speaking_rate_mean"
        ],
        "speaking_rate_stddev": calculated[
            "speaking_rate_stddev"
        ],

        "pause_density_mean": calculated[
            "pause_density_mean"
        ],
        "pause_density_stddev": calculated[
            "pause_density_stddev"
        ],

        "lexical_diversity_mean": calculated[
            "lexical_diversity_mean"
        ],
        "lexical_diversity_stddev": calculated[
            "lexical_diversity_stddev"
        ],

        "sample_count": calculated[
            "sample_count"
        ],
    }

    result = (
        supabase
        .table("baselines")
        .insert(insert_data)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None