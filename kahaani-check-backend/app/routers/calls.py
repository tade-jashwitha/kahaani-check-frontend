import os
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.core.auth import verify_supabase_jwt
from app.pipeline.orchestrator import process_audio
from app.schemas.check_in import CheckInStatus
from app.services.baseline_service import (
    get_baseline,
    save_baseline,
)
from app.services.supabase_client import (
    get_supabase_client,
)
from app.services.trajectory_engine import (
    compare_with_baseline,
    evaluate_longitudinal_change,
    get_neutral_status,
)


router = APIRouter(
    prefix="/v1/calls",
    tags=["calls"],
)


# =========================================================
# Configuration
# =========================================================

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".flac",
}

STORAGE_BUCKET = "call-recordings"

MIN_BASELINE_SAMPLES = 3

MIN_LONGITUDINAL_SAMPLES = 3

CONSENT_TYPE = "weekly_voice_checkin"

CONFIRMED_CONSENT_STATUS = "confirmed"


# =========================================================
# Upload call
# =========================================================

@router.post("/upload")
async def upload_call(
    elder_id: str = Form(...),
    check_in_id: str | None = Form(None),
    audio: UploadFile = File(...),
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):
    """
    Upload and process one elder voice recording.

    Processing is allowed only when the elder has
    confirmed consent for the weekly voice check-in.

    Pipeline:

        Authenticate caregiver
          ↓
        Verify elder
          ↓
        Verify linked check-in (if supplied)
          ↓
        Verify confirmed consent
          ↓
        Validate audio
          ↓
        Store raw audio
          ↓
        Audio quality
          ↓
        Whisper transcription
          ↓
        Speech sufficiency
          ↓
        Features
          ↓
        Baseline / longitudinal trajectory

    IMPORTANT:

    A single unusual call is NOT treated as cognitive
    decline.

    A recording classified as insufficient_speech is
    excluded from longitudinal speech analysis.

    Audio is not stored or processed when there is no
    confirmed consent.
    """

    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    # =====================================================
    # 1. VERIFY ELDER
    # =====================================================

    elder_result = (
        supabase
        .table("elders")
        .select("*")
        .eq(
            "id",
            elder_id,
        )
        .eq(
            "caregiver_id",
            caregiver_id,
        )
        .maybe_single()
        .execute()
    )

    if (
        elder_result is None
        or not elder_result.data
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    elder = elder_result.data

    # =====================================================
    # 1B. VERIFY CHECK-IN (OPTIONAL)
    # =====================================================
    # When a check-in ID is supplied, it must belong to this
    # elder and still be waiting for its audio upload.
    # This prevents a recording from being attached to the
    # wrong elder or to an already-finished check-in.

    check_in = None

    if check_in_id:
        check_in_result = (
            supabase
            .table("check_ins")
            .select("id, elder_id, status")
            .eq("id", check_in_id)
            .eq("elder_id", elder_id)
            .maybe_single()
            .execute()
        )

        if check_in_result is None or not check_in_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Check-in not found for this elder.",
            )

        check_in = check_in_result.data
        check_in_status = check_in.get("status")

        if check_in_status not in {
            CheckInStatus.SCHEDULED.value,
            CheckInStatus.INITIATED.value,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Check-in cannot receive an audio upload "
                    f"because its current status is '{check_in_status}'."
                ),
            )

    # =====================================================
    # 2. VERIFY CONSENT
    # =====================================================
    #
    # IMPORTANT:
    #
    # This check happens BEFORE:
    #     - reading the audio into processing flow
    #     - storing raw audio
    #     - Whisper transcription
    #     - feature extraction
    #
    # Only the LATEST consent decision for the
    # weekly_voice_checkin is considered.
    # =====================================================

    consent_result = (
        supabase
        .table("consents")
        .select(
            """
            id,
            elder_id,
            consent_type,
            status,
            captured_via,
            captured_at,
            expires_at
            """
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

    consent_rows = (
        consent_result.data
        if consent_result is not None
        else []
    )

    # -----------------------------------------------------
    # No consent record
    # -----------------------------------------------------

    if not consent_rows:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Voice processing is not allowed "
                "because no consent has been confirmed."
            ),
        )

    latest_consent = consent_rows[0]

    latest_consent_status = (
        latest_consent.get("status")
    )

    # -----------------------------------------------------
    # Consent must currently be confirmed
    # -----------------------------------------------------

    if (
        latest_consent_status
        != CONFIRMED_CONSENT_STATUS
    ):

        if latest_consent_status == "declined":

            detail = (
                "Voice processing is not allowed "
                "because the elder declined the "
                "weekly voice check-in."
            )

        elif latest_consent_status == "withdrawn":

            detail = (
                "Voice processing is not allowed "
                "because the elder withdrew consent."
            )

        else:

            detail = (
                "Voice processing is not allowed "
                "because confirmed consent is not present."
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )

    # -----------------------------------------------------
    # Check consent expiry if an expiry date exists.
    #
    # The database currently returns expires_at as
    # nullable. If it is null, the confirmed consent
    # remains valid according to the current schema.
    #
    # Detailed expiry handling can be added later if the
    # product requires expiring consent.
    # -----------------------------------------------------

    expires_at = (
        latest_consent.get("expires_at")
    )

    if expires_at:
        # The current MVP does not automatically interpret
        # arbitrary expiry formats here. The consent record
        # itself remains the source of truth.
        pass

    # =====================================================
    # 3. PREFERRED LANGUAGE
    # =====================================================

    preferred_language = (
        elder.get(
            "preferred_call_language"
        )
    )

    # The current orchestrator uses configured Hindi
    # as the MVP language.
    #
    # We retain the elder's preferred language here so
    # per-elder language wiring can be added cleanly.
    _ = preferred_language

    # =====================================================
    # 4. VALIDATE AUDIO
    # =====================================================

    filename = audio.filename or "audio"

    extension = Path(
        filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported audio format. "
                "Use WAV, MP3, M4A, OGG, or FLAC."
            ),
        )

    file_bytes = await audio.read()

    if not file_bytes:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty",
        )

    # =====================================================
    # 5. RECORDING ID + STORAGE PATH
    # =====================================================

    recording_id = str(
        uuid4()
    )

    storage_path = (
        f"{elder_id}/"
        f"{recording_id}"
        f"{extension}"
    )

    # =====================================================
    # 6. STORE RAW AUDIO
    # =====================================================

    try:

        supabase.storage.from_(
            STORAGE_BUCKET
        ).upload(
            storage_path,
            file_bytes,
            {
                "content-type": (
                    audio.content_type
                    or "application/octet-stream"
                ),
                "upsert": "false",
            },
        )

    except Exception as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"Failed to store audio: {exc}"
            ),
        )

    # Mark the check-in as initiated once its recording has
    # actually been accepted for processing.
    if check_in_id and check_in:
        (
            supabase
            .table("check_ins")
            .update({
                "status": CheckInStatus.INITIATED.value,
            })
            .eq("id", check_in_id)
            .execute()
        )

    # =====================================================
    # 7. TEMPORARY LOCAL FILE
    # =====================================================

    temp_path: str | None = None

    try:

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp_file:

            temp_file.write(
                file_bytes
            )

            temp_path = temp_file.name

        # =================================================
        # 8. PROCESS AUDIO
        # =================================================

        pipeline_result = process_audio(
            temp_path
        )

        pipeline_status = (
            pipeline_result.get(
                "status"
            )
        )

        quality = (
            pipeline_result.get(
                "quality",
                {},
            )
        )

        # =================================================
        # 9. QUALITY REJECTED
        # =================================================

        if pipeline_status == "rejected":

            recording_result = (
                supabase
                .table("call_recordings")
                .insert(
                    {
                        "id": recording_id,
                        "elder_id": elder_id,
                        "storage_path": (
                            storage_path
                        ),
                        "original_filename": (
                            filename
                        ),
                        "duration_seconds": (
                            quality.get(
                                "duration_seconds",
                                0.0,
                            )
                        ),
                        "quality_status": (
                            "rejected"
                        ),
                        "quality_reason": (
                            quality.get(
                                "reason"
                            )
                        ),
                    }
                )
                .execute()
            )

            if check_in_id:
                (
                    supabase
                    .table("check_ins")
                    .update({
                        "status": CheckInStatus.POOR_AUDIO.value,
                        "call_id": recording_id,
                    })
                    .eq("id", check_in_id)
                    .execute()
                )

            return {
                "status": "rejected",

                "recording": (
                    recording_result.data[0]
                    if recording_result.data
                    else None
                ),

                "quality": quality,

                "message": (
                    "Recording was rejected "
                    "because audio quality was "
                    "not sufficient for analysis."
                ),
            }

        # =================================================
        # 10. INSUFFICIENT SPEECH
        # =================================================

        if (
            pipeline_status
            == "insufficient_speech"
        ):

            speech_sufficiency = (
                pipeline_result.get(
                    "speech_sufficiency",
                    {},
                )
            )

            reason = (
                speech_sufficiency.get(
                    "reason"
                )
            )

            recording_result = (
                supabase
                .table("call_recordings")
                .insert(
                    {
                        "id": recording_id,
                        "elder_id": elder_id,
                        "storage_path": (
                            storage_path
                        ),
                        "original_filename": (
                            filename
                        ),
                        "duration_seconds": (
                            quality.get(
                                "duration_seconds",
                                0.0,
                            )
                        ),
                        "quality_status": (
                            "insufficient_speech"
                        ),
                        "quality_reason": reason,
                    }
                )
                .execute()
            )

            if not recording_result.data:

                raise HTTPException(
                    status_code=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    detail=(
                        "Failed to save "
                        "insufficient-speech recording"
                    ),
                )

            # -------------------------------------------------
            # IMPORTANT:
            #
            # No features.
            # No baseline.
            # No trajectory.
            #
            # Insufficient speech is NOT cognitive decline.
            # -------------------------------------------------

            if check_in_id:
                (
                    supabase
                    .table("check_ins")
                    .update({
                        "status": CheckInStatus.INSUFFICIENT_SPEECH.value,
                        "call_id": recording_id,
                    })
                    .eq("id", check_in_id)
                    .execute()
                )

            return {
                "status": (
                    "insufficient_speech"
                ),

                "recording": (
                    recording_result.data[0]
                ),

                "quality": quality,

                "speech_sufficiency": (
                    speech_sufficiency
                ),

                "message": (
                    "Not enough usable speech "
                    "was detected. This recording "
                    "will not be used for "
                    "longitudinal speech analysis."
                ),
            }

        # =================================================
        # 11. UNEXPECTED PIPELINE STATUS
        # =================================================

        if pipeline_status != "processed":

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Unexpected audio processing "
                    f"status: {pipeline_status}"
                ),
            )

        # =================================================
        # 12. SAVE SUCCESSFUL RECORDING
        # =================================================

        recording_result = (
            supabase
            .table("call_recordings")
            .insert(
                {
                    "id": recording_id,
                    "elder_id": elder_id,
                    "storage_path": (
                        storage_path
                    ),
                    "original_filename": (
                        filename
                    ),
                    "duration_seconds": (
                        quality.get(
                            "duration_seconds",
                            0.0,
                        )
                    ),
                    "quality_status": (
                        "passed"
                    ),
                    "quality_reason": None,
                }
            )
            .execute()
        )

        if not recording_result.data:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Failed to save call recording"
                ),
            )

        recording = (
            recording_result.data[0]
        )

        # =================================================
        # 13. SAVE TRANSCRIPT
        # =================================================

        transcription = (
            pipeline_result[
                "transcription"
            ]
        )

        transcript_result = (
            supabase
            .table("transcripts")
            .insert(
                {
                    "call_recording_id": (
                        recording["id"]
                    ),
                    "text": (
                        transcription["text"]
                    ),
                    "language": (
                        transcription["language"]
                    ),
                    "model_name": (
                        transcription[
                            "model_name"
                        ]
                    ),
                }
            )
            .execute()
        )

        if not transcript_result.data:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Failed to save transcript"
                ),
            )

        # =================================================
        # 14. SAVE TIER-1 FEATURES
        # =================================================

        features = (
            pipeline_result[
                "features"
            ]
        )

        if features is None:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Processed recording has "
                    "no extracted features"
                ),
            )

        features_result = (
            supabase
            .table("speech_features")
            .insert(
                {
                    "call_recording_id": (
                        recording["id"]
                    ),
                    "speaking_rate_wpm": (
                        features[
                            "speaking_rate_wpm"
                        ]
                    ),
                    "pause_density": (
                        features[
                            "pause_density"
                        ]
                    ),
                    "lexical_diversity_ttr": (
                        features[
                            "lexical_diversity_ttr"
                        ]
                    ),
                    "speech_duration_seconds": (
                        features[
                            "speech_duration_seconds"
                        ]
                    ),
                }
            )
            .execute()
        )

        if not features_result.data:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Failed to save speech features"
                ),
            )

        # =================================================
        # 15. BASELINE
        # =================================================

        trajectory_result = None

        baseline_created = False

        baseline = get_baseline(
            elder_id
        )

        # -------------------------------------------------
        # Create frozen baseline once 3 successful
        # recordings exist.
        # -------------------------------------------------

        if baseline is None:

            baseline = save_baseline(
                elder_id
            )

            if baseline is not None:

                baseline_created = True

        # =================================================
        # 16. POST-BASELINE TRAJECTORY
        # =================================================

        if (
            baseline is not None
            and not baseline_created
            and baseline.get(
                "sample_count",
                0,
            ) >= MIN_BASELINE_SAMPLES
        ):

            # -------------------------------------------------
            # Compare current call with frozen baseline.
            # -------------------------------------------------

            trajectory = (
                compare_with_baseline(
                    current_features=features,
                    baseline=baseline,
                )
            )

            # -------------------------------------------------
            # Get previous post-baseline trajectory records.
            # -------------------------------------------------

            previous_result = (
                supabase
                .table("trajectory_results")
                .select(
                    """
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
                .eq(
                    "baseline_id",
                    baseline["id"],
                )
                .order(
                    "created_at",
                    desc=True,
                )
                .limit(2)
                .execute()
            )

            previous_rows = (
                previous_result.data or []
            )

            # -------------------------------------------------
            # Reconstruct longitudinal history.
            # -------------------------------------------------

            history = []

            for row in reversed(
                previous_rows
            ):

                history.append(
                    {
                        "overall_status": (
                            row.get(
                                "overall_status"
                            )
                        ),

                        "features": {
                            "speaking_rate": {
                                "z_score": (
                                    row.get(
                                        "speaking_rate_z_score",
                                        0.0,
                                    )
                                ),
                                "status": (
                                    row.get(
                                        "speaking_rate_status",
                                        "stable",
                                    )
                                ),
                            },

                            "pause_density": {
                                "z_score": (
                                    row.get(
                                        "pause_density_z_score",
                                        0.0,
                                    )
                                ),
                                "status": (
                                    row.get(
                                        "pause_density_status",
                                        "stable",
                                    )
                                ),
                            },

                            "lexical_diversity": {
                                "z_score": (
                                    row.get(
                                        "lexical_diversity_z_score",
                                        0.0,
                                    )
                                ),
                                "status": (
                                    row.get(
                                        "lexical_diversity_status",
                                        "stable",
                                    )
                                ),
                            },
                        },
                    }
                )

            # -------------------------------------------------
            # Add current observation.
            # -------------------------------------------------

            history.append(
                trajectory
            )

            usable_call_count = (
                len(previous_rows) + 1
            )

            # -------------------------------------------------
            # Evaluate longitudinal persistence.
            # -------------------------------------------------

            longitudinal = (
                evaluate_longitudinal_change(
                    trajectory_history=history,
                    usable_call_count=(
                        usable_call_count
                    ),
                )
            )

            neutral_status = (
                get_neutral_status(
                    longitudinal
                )
            )

            # -------------------------------------------------
            # Save neutral longitudinal status.
            # -------------------------------------------------

            trajectory_db_result = (
                supabase
                .table("trajectory_results")
                .insert(
                    {
                        "elder_id": elder_id,

                        "call_recording_id": (
                            recording["id"]
                        ),

                        "baseline_id": (
                            baseline["id"]
                        ),

                        "overall_status": (
                            neutral_status
                        ),

                        "speaking_rate_z_score": (
                            trajectory[
                                "features"
                            ][
                                "speaking_rate"
                            ][
                                "z_score"
                            ]
                        ),

                        "speaking_rate_status": (
                            trajectory[
                                "features"
                            ][
                                "speaking_rate"
                            ][
                                "status"
                            ]
                        ),

                        "pause_density_z_score": (
                            trajectory[
                                "features"
                            ][
                                "pause_density"
                            ][
                                "z_score"
                            ]
                        ),

                        "pause_density_status": (
                            trajectory[
                                "features"
                            ][
                                "pause_density"
                            ][
                                "status"
                            ]
                        ),

                        "lexical_diversity_z_score": (
                            trajectory[
                                "features"
                            ][
                                "lexical_diversity"
                            ][
                                "z_score"
                            ]
                        ),

                        "lexical_diversity_status": (
                            trajectory[
                                "features"
                            ][
                                "lexical_diversity"
                            ][
                                "status"
                            ]
                        ),
                    }
                )
                .execute()
            )

            if not trajectory_db_result.data:

                raise HTTPException(
                    status_code=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    detail=(
                        "Failed to save "
                        "trajectory result"
                    ),
                )

            trajectory_result = (
                trajectory_db_result.data[0]
            )

            # -------------------------------------------------
            # Add longitudinal interpretation to response.
            # -------------------------------------------------

            trajectory_result = {
                **trajectory_result,

                "longitudinal_status": (
                    longitudinal[
                        "status"
                    ]
                ),

                "neutral_status": (
                    neutral_status
                ),

                "reason": (
                    longitudinal.get(
                        "reason"
                    )
                ),

                "repeated_features": (
                    longitudinal.get(
                        "repeated_features",
                        [],
                    )
                ),

                "usable_post_baseline_calls": (
                    usable_call_count
                ),
            }

        # =================================================
        # 17. COMPLETE LINKED CHECK-IN
        # =================================================

        if check_in_id:
            check_in_update = (
                supabase
                .table("check_ins")
                .update({
                    "status": CheckInStatus.COMPLETED.value,
                    "call_id": recording["id"],
                })
                .eq("id", check_in_id)
                .execute()
            )

            if not check_in_update.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to link completed check-in to call recording.",
                )

        # =================================================
        # 18. RESPONSE
        # =================================================

        return {
            "status": "processed",

            "recording": recording,

            "transcript": (
                transcript_result.data[0]
            ),

            "features": (
                features_result.data[0]
            ),

            "baseline": {
                "created": (
                    baseline_created
                ),

                "available": (
                    baseline is not None
                ),

                "sample_count": (
                    baseline.get(
                        "sample_count"
                    )
                    if baseline
                    else 0
                ),
            },

            "trajectory": (
                trajectory_result
            ),

            "quality": quality,

            "consent": {
                "status": (
                    latest_consent["status"]
                ),
                "consent_type": (
                    latest_consent[
                        "consent_type"
                    ]
                ),
                "captured_via": (
                    latest_consent[
                        "captured_via"
                    ]
                ),
            },

            "check_in": {
                "id": check_in_id,
                "status": (
                    CheckInStatus.COMPLETED.value
                    if check_in_id
                    else None
                ),
                "call_id": (
                    recording["id"]
                    if check_in_id
                    else None
                ),
            },
        }

    finally:

        # =================================================
        # 18. CLEAN TEMP FILE
        # =================================================

        if (
            temp_path
            and os.path.exists(
                temp_path
            )
        ):

            os.remove(
                temp_path
            )