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
    # Get baseline
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

    # -----------------------------------------------------
    # Get trajectory observations
    # Oldest -> newest for graph plotting
    # -----------------------------------------------------

    trajectory_result = (
        supabase
        .table("trajectory_results")
        .select("*")
        .eq("elder_id", elder_id)
        .order("created_at", desc=False)
        .execute()
    )

    trajectory_rows = trajectory_result.data or []

    observations = []

    # -----------------------------------------------------
    # Attach actual speech features to every observation
    # -----------------------------------------------------

    for index, row in enumerate(trajectory_rows, start=1):

        recording_id = row["call_recording_id"]

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

        recording_result = (
            supabase
            .table("call_recordings")
            .select(
                """
                id,
                original_filename,
                created_at,
                quality_status
                """
            )
            .eq("id", recording_id)
            .maybe_single()
            .execute()
        )

        recording = (
            recording_result.data
            if recording_result and recording_result.data
            else None
        )

        observations.append(
            {
                "observation_number": index,

                "trajectory_id": row["id"],

                "call_recording_id": recording_id,

                "recorded_at": (
                    recording.get("created_at")
                    if recording
                    else row["created_at"]
                ),

                "overall_status": row["overall_status"],

                "features": features,

                "deviations": {
                    "speaking_rate": {
                        "z_score": row[
                            "speaking_rate_z_score"
                        ],
                        "status": row[
                            "speaking_rate_status"
                        ],
                    },

                    "pause_density": {
                        "z_score": row[
                            "pause_density_z_score"
                        ],
                        "status": row[
                            "pause_density_status"
                        ],
                    },

                    "lexical_diversity": {
                        "z_score": row[
                            "lexical_diversity_z_score"
                        ],
                        "status": row[
                            "lexical_diversity_status"
                        ],
                    },
                },

                "recording": recording,
            }
        )

    # -----------------------------------------------------
    # Latest overall status
    # -----------------------------------------------------

    latest_status = (
        observations[-1]["overall_status"]
        if observations
        else "Insufficient data"
    )

    return {
        "elder_id": elder_id,

        "status": latest_status,

        "baseline": baseline,

        "observation_count": len(observations),

        "observations": observations,
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