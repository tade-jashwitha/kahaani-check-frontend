from __future__ import annotations

from typing import Any, Optional


# ============================================================
# Neutral Language Constants (strictly non-diagnostic)
# ============================================================

DISCLAIMER_TEXT = (
    "Kahaani-Check provides supportive acoustic observations only. "
    "These measurements reflect natural conversational speech patterns and "
    "do not evaluate medical conditions, clinical status, or healthcare outcomes."
)


def _format_diff(val: Optional[float], unit: str = "") -> str:
    if val is None:
        return "—"
    sign = "+" if val > 0 else ""
    return f"{sign}{val:.1f}{unit}" if unit else f"{sign}{val:.2f}"


def generate_caregiver_summary(
    observations: list[dict],
    baseline: Optional[dict],
) -> dict:
    """
    Generate a caregiver-friendly observational summary from longitudinal
    speech observations and personal baseline data.

    Strictly uses neutral, non-diagnostic terminology.
    """
    if not observations:
        return {
            "status": "insufficient_data",
            "headline": "Awaiting Initial Voice Check-ins",
            "observations_count": 0,
            "baseline_sample_count": 0,
            "current_session": None,
            "previous_session_comparison": None,
            "key_observations": [
                "No completed voice check-ins recorded yet.",
                "Complete weekly conversations to establish an individual acoustic baseline.",
            ],
            "longitudinal_direction": "Insufficient historical data",
            "disclaimer": DISCLAIMER_TEXT,
        }

    obs_count = len(observations)
    current_obs = observations[-1]
    prev_obs = observations[-2] if obs_count > 1 else None

    # Check baseline status
    is_baseline_ready = bool(baseline and baseline.get("sample_count", 0) >= 3)
    baseline_sample_count = baseline.get("sample_count", 3) if is_baseline_ready else min(obs_count, 3)

    # 1. Current Session Details
    curr_features = current_obs.get("features") or {}
    curr_transcript = current_obs.get("transcript") or {}
    curr_comparisons = current_obs.get("biomarker_comparisons") or {}

    # Extract biomarker comparisons safely
    sr_comp = curr_comparisons.get("speaking_rate") or {}
    pd_comp = curr_comparisons.get("pause_density") or {}
    ld_comp = curr_comparisons.get("lexical_diversity") or {}

    # Speaking Rate
    sr_val = curr_features.get("speaking_rate_wpm")
    sr_base = baseline.get("speaking_rate_mean") if baseline else None
    sr_diff = sr_comp.get("absolute_diff")
    sr_pct = sr_comp.get("percentage_diff")
    sr_label = sr_comp.get("comparison_label") or (
        "Consistent with personal baseline" if is_baseline_ready else "Calibrating baseline"
    )

    # Pause Density
    pd_val = curr_features.get("pause_density")
    pd_base = baseline.get("pause_density_mean") if baseline else None
    pd_diff = pd_comp.get("absolute_diff")
    pd_pct = pd_comp.get("percentage_diff")
    pd_label = pd_comp.get("comparison_label") or (
        "Consistent with personal baseline" if is_baseline_ready else "Calibrating baseline"
    )

    # Lexical Diversity
    ld_val = curr_features.get("lexical_diversity_ttr")
    ld_base = baseline.get("lexical_diversity_mean") if baseline else None
    ld_diff = ld_comp.get("absolute_diff")
    ld_pct = ld_comp.get("percentage_diff")
    ld_label = ld_comp.get("comparison_label") or (
        "Consistent with personal baseline" if is_baseline_ready else "Calibrating baseline"
    )

    current_session_summary = {
        "session_number": current_obs.get("observation_number", obs_count),
        "recorded_at": current_obs.get("recorded_at"),
        "transcript_snippet": curr_transcript.get("text"),
        "language": curr_transcript.get("language"),
        "confidence": curr_transcript.get("confidence"),
        "biomarkers": {
            "speaking_rate": {
                "current_value": round(sr_val, 1) if sr_val is not None else None,
                "baseline_value": round(sr_base, 1) if sr_base is not None else None,
                "unit": "WPM",
                "absolute_diff": sr_diff,
                "percentage_diff": sr_pct,
                "trend_direction": sr_comp.get("trend_direction", "calibrating" if not is_baseline_ready else "typical"),
                "status_label": sr_label,
            },
            "pause_density": {
                "current_value": round(pd_val, 2) if pd_val is not None else None,
                "baseline_value": round(pd_base, 2) if pd_base is not None else None,
                "unit": "ratio",
                "absolute_diff": pd_diff,
                "percentage_diff": pd_pct,
                "trend_direction": pd_comp.get("trend_direction", "calibrating" if not is_baseline_ready else "typical"),
                "status_label": pd_label,
            },
            "lexical_diversity": {
                "current_value": round(ld_val, 2) if ld_val is not None else None,
                "baseline_value": round(ld_base, 2) if ld_base is not None else None,
                "unit": "TTR",
                "absolute_diff": ld_diff,
                "percentage_diff": ld_pct,
                "trend_direction": ld_comp.get("trend_direction", "calibrating" if not is_baseline_ready else "typical"),
                "status_label": ld_label,
            },
        },
    }

    # 2. Previous Session Comparison
    previous_session_summary = None
    if prev_obs:
        prev_features = prev_obs.get("features") or {}
        prev_sr = prev_features.get("speaking_rate_wpm")
        prev_pd = prev_features.get("pause_density")
        prev_ld = prev_features.get("lexical_diversity_ttr")

        sr_change = (sr_val - prev_sr) if (sr_val is not None and prev_sr is not None) else None
        pd_change = (pd_val - prev_pd) if (pd_val is not None and prev_pd is not None) else None
        ld_change = (ld_val - prev_ld) if (ld_val is not None and prev_ld is not None) else None

        has_change = any(
            d is not None and abs(d) > 0.05
            for d in [pd_change, ld_change]
        ) or (sr_change is not None and abs(sr_change) > 10.0)

        changes_desc = []
        if sr_change is not None and abs(sr_change) >= 5.0:
            direction = "faster" if sr_change > 0 else "slower"
            changes_desc.append(f"speaking rate was {direction} by {abs(sr_change):.0f} WPM")
        if pd_change is not None and abs(pd_change) >= 0.03:
            direction = "more pauses" if pd_change > 0 else "fewer pauses"
            changes_desc.append(f"{direction} ({abs(pd_change):.2f})")

        if changes_desc:
            summary_text = f"Compared with previous session, {', '.join(changes_desc)}."
        elif has_change:
            summary_text = "Changed from previous session across conversational rhythm."
        else:
            summary_text = "Consistent speech tempo and pause patterns compared with previous session."

        previous_session_summary = {
            "session_label": "Changed from previous session" if has_change else "Consistent with previous session",
            "summary_text": summary_text,
            "speaking_rate_diff": round(sr_change, 1) if sr_change is not None else None,
            "pause_density_diff": round(pd_change, 2) if pd_change is not None else None,
            "lexical_diversity_diff": round(ld_change, 2) if ld_change is not None else None,
        }

    # 3. Key Observations (Plain Language)
    key_observations = []

    if not is_baseline_ready:
        remaining = max(0, 3 - obs_count)
        key_observations.append(
            f"Personal baseline calibration in progress: {obs_count} of 3 check-in sessions completed."
        )
        if remaining > 0:
            key_observations.append(
                f"{remaining} more check-in{'s' if remaining > 1 else ''} needed to establish personalized acoustic baseline."
            )
        if sr_val is not None:
            key_observations.append(
                f"Current speaking rate is {sr_val:.0f} WPM with {pd_val:.2f} pause density."
            )
    else:
        # Check changes relative to baseline
        elevated = []
        reduced = []
        steady = []

        if sr_diff is not None:
            if sr_comp.get("trend_direction") == "higher":
                elevated.append(f"speaking rate (+{sr_diff:.0f} WPM, {sr_pct:+.1f}%)")
            elif sr_comp.get("trend_direction") == "lower":
                reduced.append(f"speaking rate ({sr_diff:.0f} WPM, {sr_pct:.1f}%)")
            else:
                steady.append(f"speaking rate ({sr_val:.0f} WPM)")

        if pd_diff is not None:
            if pd_comp.get("trend_direction") == "higher":
                elevated.append(f"pause density ({pd_diff:+.2f})")
            elif pd_comp.get("trend_direction") == "lower":
                reduced.append(f"pause density ({pd_diff:+.2f})")
            else:
                steady.append("pause density")

        if ld_diff is not None:
            if ld_comp.get("trend_direction") == "higher":
                elevated.append(f"vocabulary diversity ({ld_diff:+.2f})")
            elif ld_comp.get("trend_direction") == "lower":
                reduced.append(f"vocabulary diversity ({ld_diff:+.2f})")
            else:
                steady.append("vocabulary diversity")

        if elevated:
            key_observations.append(f"Higher than usual: {', '.join(elevated)} compared with personal baseline.")
        if reduced:
            key_observations.append(f"Lower than usual: {', '.join(reduced)} compared with personal baseline.")
        if steady:
            key_observations.append(f"Within personal baseline: {', '.join(steady)} aligns with established speech cadence.")

        if not elevated and not reduced:
            key_observations.append("All core acoustic biomarkers remain consistent with the elder's personal baseline.")

    # 4. Longitudinal Direction & Headline
    if not is_baseline_ready:
        status_category = "baseline_calibrating"
        headline = "Personal Baseline Calibration Active"
        longitudinal_direction = "Baseline calibration in progress (3 check-ins required)"
    else:
        status_category = "baseline_active"
        # Determine recent direction from last 3 observations
        recent_obs = observations[-3:]
        any_deviations = any(
            (o.get("biomarker_comparisons", {}).get("speaking_rate", {}).get("trend_direction") in ("higher", "lower"))
            or (o.get("biomarker_comparisons", {}).get("pause_density", {}).get("trend_direction") in ("higher", "lower"))
            for o in recent_obs
        )

        if any_deviations:
            headline = "Recent Sessions Show Notable Shifts from Baseline"
            longitudinal_direction = "Recent sessions show changes in speaking pace and pause frequency compared with personal baseline"
        else:
            headline = "Stable Speech Patterns Consistent with Baseline"
            longitudinal_direction = "Recent sessions show consistent cadence within personal baseline"

    return {
        "status": status_category,
        "headline": headline,
        "observations_count": obs_count,
        "baseline_sample_count": baseline_sample_count,
        "current_session": current_session_summary,
        "previous_session_comparison": previous_session_summary,
        "key_observations": key_observations,
        "longitudinal_direction": longitudinal_direction,
        "disclaimer": DISCLAIMER_TEXT,
    }
