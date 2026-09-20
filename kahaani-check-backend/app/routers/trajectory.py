from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.services.supabase_client import get_supabase_client


router = APIRouter(
    prefix="/v1/elders",
    tags=["trajectory"],
)


@router.get("/{elder_id}/baseline")
def get_elder_baseline(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    elder_result = (
        supabase
        .table("elders")
        .select("id")
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    if not elder_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    result = (
        supabase
        .table("baselines")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        from app.services.baseline_service import save_baseline
        saved = save_baseline(elder_id)
        if saved:
            return {
                "elder_id": elder_id,
                "baseline": saved,
            }
        return {
            "elder_id": elder_id,
            "baseline": None,
            "message": "No baseline available yet",
        }

    return {
        "elder_id": elder_id,
        "baseline": result.data,
    }


@router.get("/{elder_id}/trajectory")
def get_trajectory_history(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    # -----------------------------------------------------
    # Verify elder belongs to caregiver
    # -----------------------------------------------------

    elder_result = (
        supabase
        .table("elders")
        .select("id")
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    if not elder_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    # -----------------------------------------------------
    # Get baseline (auto-create if >= 3 usable samples exist)
    # -----------------------------------------------------

    baseline_result = (
        supabase
        .table("baselines")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    baseline = (
        baseline_result.data
        if baseline_result and baseline_result.data
        else None
    )

    if not baseline:
        from app.services.baseline_service import save_baseline
        baseline = save_baseline(elder_id)

    # -----------------------------------------------------
    # Get all recordings for this elder with speech features
    # -----------------------------------------------------

    all_recordings_result = (
        supabase
        .table("call_recordings")
        .select("id, original_filename, created_at, quality_status")
        .eq("elder_id", elder_id)
        .order("created_at", desc=False)
        .execute()
    )

    all_recordings = all_recordings_result.data or []

    # Get trajectory observations (for deviation scores)
    trajectory_result = (
        supabase
        .table("trajectory_results")
        .select("*")
        .eq("elder_id", elder_id)
        .order("created_at", desc=False)
        .execute()
    )

    trajectory_rows = trajectory_result.data or []
    trajectory_by_recording = {
        row["call_recording_id"]: row for row in trajectory_rows if "call_recording_id" in row
    }

    observations = []

    for recording in all_recordings:
        recording_id = recording["id"]

        features_result = (
            supabase
            .table("speech_features")
            .select(
                """
                speaking_rate_wpm,
                pause_density,
                lexical_diversity_ttr,
                speech_duration_seconds
                """
            )
            .eq("call_recording_id", recording_id)
            .maybe_single()
            .execute()
        )

        features = (
            features_result.data
            if features_result and features_result.data
            else None
        )

        if not features:
            continue

        transcript_result = (
            supabase
            .table("transcripts")
            .select("id, text, language, confidence, created_at")
            .eq("call_recording_id", recording_id)
            .maybe_single()
            .execute()
        )
        transcript = (
            transcript_result.data
            if transcript_result and transcript_result.data
            else None
        )

        traj_row = trajectory_by_recording.get(recording_id)

        # Compute or read biomarker comparisons
        biomarker_comparisons = None
        if baseline and features:
            from app.services.trajectory_engine import compare_with_baseline
            comp = compare_with_baseline(features, baseline)
            biomarker_comparisons = comp.get("biomarker_comparisons")

        if traj_row:
            traj_id = traj_row["id"]
            overall_status = traj_row["overall_status"]
            deviations = {
                "speaking_rate": {
                    "z_score": traj_row.get("speaking_rate_z_score"),
                    "status": traj_row.get("speaking_rate_status"),
                },
                "pause_density": {
                    "z_score": traj_row.get("pause_density_z_score"),
                    "status": traj_row.get("pause_density_status"),
                },
                "lexical_diversity": {
                    "z_score": traj_row.get("lexical_diversity_z_score"),
                    "status": traj_row.get("lexical_diversity_status"),
                },
            }
        elif baseline and features:
            traj_id = None
            overall_status = comp.get("overall_status") or "stable"
            deviations = {
                "speaking_rate": {
                    "z_score": comp.get("speaking_rate_z_score"),
                    "status": comp.get("speaking_rate_status"),
                },
                "pause_density": {
                    "z_score": comp.get("pause_density_z_score"),
                    "status": comp.get("pause_density_status"),
                },
                "lexical_diversity": {
                    "z_score": comp.get("lexical_diversity_z_score"),
                    "status": comp.get("lexical_diversity_status"),
                },
            }
        else:
            traj_id = None
            overall_status = "baseline_collecting"
            deviations = None

        # Compare against previous session
        prev_session_comparison = None
        if observations:
            prev_obs = observations[-1]
            prev_feats = prev_obs.get("features") or {}

            rate_now = features.get("speaking_rate_wpm")
            rate_prev = prev_feats.get("speaking_rate_wpm")
            rate_diff = (rate_now - rate_prev) if (rate_now is not None and rate_prev is not None) else None

            pause_now = features.get("pause_density")
            pause_prev = prev_feats.get("pause_density")
            pause_diff = (pause_now - pause_prev) if (pause_now is not None and pause_prev is not None) else None

            ttr_now = features.get("lexical_diversity_ttr")
            ttr_prev = prev_feats.get("lexical_diversity_ttr")
            ttr_diff = (ttr_now - ttr_prev) if (ttr_now is not None and ttr_prev is not None) else None

            has_change = any(
                d is not None and abs(d) > 0.05
                for d in [pause_diff, ttr_diff]
            ) or (rate_diff is not None and abs(rate_diff) > 10.0)

            prev_session_comparison = {
                "speaking_rate_diff": round(rate_diff, 1) if rate_diff is not None else None,
                "pause_density_diff": round(pause_diff, 2) if pause_diff is not None else None,
                "lexical_diversity_diff": round(ttr_diff, 2) if ttr_diff is not None else None,
                "session_label": "Changed from previous session" if has_change else "Similar to previous session",
            }

        observations.append(
            {
                "observation_number": len(observations) + 1,
                "trajectory_id": traj_id,
                "call_recording_id": recording_id,
                "recorded_at": recording.get("created_at"),
                "overall_status": overall_status,
                "features": features,
                "deviations": deviations,
                "biomarker_comparisons": biomarker_comparisons,
                "previous_session_comparison": prev_session_comparison,
                "recording": recording,
                "transcript": transcript,
            }
        )

    # -----------------------------------------------------
    # Determine overall status and baseline progress
    # -----------------------------------------------------

    if not observations:
        latest_status = "Insufficient data"
    elif not baseline:
        latest_status = "baseline_collecting"
    else:
        # Latest trajectory observation if available, otherwise baseline created
        latest_status = (
            observations[-1]["overall_status"]
            if observations[-1]["overall_status"] != "baseline_collecting"
            else "baseline_created"
        )

    # -----------------------------------------------------
    # Generate Caregiver Observational Summary
    # -----------------------------------------------------
    from app.services.caregiver_summary_service import generate_caregiver_summary
    caregiver_summary = generate_caregiver_summary(observations=observations, baseline=baseline)

    return {
        "elder_id": elder_id,
        "status": latest_status,
        "baseline": baseline,
        "observation_count": len(observations),
        "baseline_progress": {
            "completed": min(len(observations), 3),
            "required": 3,
            "ready": baseline is not None,
        },
        "caregiver_summary": caregiver_summary,
        "observations": observations,
    }


@router.get("/{elder_id}/caregiver-summary")
def get_caregiver_summary_endpoint(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    history = get_trajectory_history(elder_id=elder_id, current_user=current_user)
    return {
        "elder_id": elder_id,
        "caregiver_summary": history.get("caregiver_summary"),
        "baseline": history.get("baseline"),
        "status": history.get("status"),
    }

@router.get("/{elder_id}/checkins/{call_id}")
def get_checkin_result(
    elder_id: str,
    call_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    elder_result = (
        supabase
        .table("elders")
        .select("id")
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    if not elder_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    recording_result = (
        supabase
        .table("call_recordings")
        .select("*")
        .eq("id", call_id)
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    if not recording_result or not recording_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call recording not found",
        )

    transcript_result = (
        supabase
        .table("transcripts")
        .select("*")
        .eq("call_recording_id", call_id)
        .maybe_single()
        .execute()
    )

    features_result = (
        supabase
        .table("speech_features")
        .select("*")
        .eq("call_recording_id", call_id)
        .maybe_single()
        .execute()
    )

    trajectory_result = (
        supabase
        .table("trajectory_results")
        .select("*")
        .eq("call_recording_id", call_id)
        .maybe_single()
        .execute()
    )

    return {
        "elder_id": elder_id,
        "call_recording": recording_result.data,
        "transcript": (
            transcript_result.data
            if transcript_result and transcript_result.data
            else None
        ),
        "features": (
            features_result.data
            if features_result and features_result.data
            else None
        ),
        "trajectory": (
            trajectory_result.data
            if trajectory_result and trajectory_result.data
            else None
        ),
    }