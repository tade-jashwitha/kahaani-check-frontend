from __future__ import annotations

import statistics
import uuid
from typing import Optional

from app.repositories import baseline_repo


# ============================================================
# Baseline Service
# ============================================================
# Pure business logic for baseline creation and management.
# All Supabase access is delegated to baseline_repo.
# ============================================================

MIN_BASELINE_SAMPLES = 3


def get_baseline(elder_id: str) -> Optional[dict]:
    """
    Return the elder's frozen baseline if one exists.

    The baseline is created once after the first 3 usable
    recordings and is never automatically replaced.
    """
    return baseline_repo.get_for_elder(elder_id)


def calculate_baseline(elder_id: str) -> Optional[dict]:
    """
    Calculate baseline statistics from the first 3 usable samples.

    Returns None until at least 3 usable samples exist.
    """
    samples = baseline_repo.get_usable_samples(elder_id, limit=MIN_BASELINE_SAMPLES)

    if len(samples) < MIN_BASELINE_SAMPLES:
        return None

    speaking_rates = [float(row["speaking_rate_wpm"]) for row in samples]
    pause_densities = [float(row["pause_density"]) for row in samples]
    lexical_diversities = [float(row["lexical_diversity_ttr"]) for row in samples]

    return {
        "speaking_rate_mean": statistics.mean(speaking_rates),
        "speaking_rate_stddev": statistics.stdev(speaking_rates),
        "pause_density_mean": statistics.mean(pause_densities),
        "pause_density_stddev": statistics.stdev(pause_densities),
        "lexical_diversity_mean": statistics.mean(lexical_diversities),
        "lexical_diversity_stddev": statistics.stdev(lexical_diversities),
        "sample_count": MIN_BASELINE_SAMPLES,
    }


def save_baseline(elder_id: str) -> Optional[dict]:
    """
    Create the baseline if enough usable samples exist.

    If a baseline already exists, return it unchanged (frozen).
    """
    existing = baseline_repo.get_for_elder(elder_id)
    if existing:
        return existing

    stats = calculate_baseline(elder_id)
    if not stats:
        return None

    return baseline_repo.save(elder_id, stats)