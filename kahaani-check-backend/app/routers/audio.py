from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from app.core.auth import verify_supabase_jwt
from app.core.config import get_settings
from app.pipeline.orchestrator import process_audio
from app.services.supabase_client import get_supabase_client
from app.services.checkin_processing_service import (
    verify_voice_consent,
    finalize_checkin_analysis,
)


router = APIRouter(
    prefix="/v1/check-ins",
    tags=["audio"],
)


# ============================================================
# Configuration
# ============================================================

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".webm",
    ".ogg",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


# ============================================================
# Helper: current UTC timestamp
# ============================================================

def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


# ============================================================
# Helper: update check-in status
# ============================================================

def update_checkin_status(
    supabase,
    check_in_id: str,
    new_status: str,
) -> dict:
    result = (
        supabase
        .table("check_ins")
        .update(
            {
                "status": new_status,
                "updated_at": utc_now_iso(),
            }
        )
        .eq(
            "id",
            check_in_id,
        )
        .execute()
    )

    if not result or not result.data:
        raise RuntimeError(
            f"Failed to update check-in "
            f"{check_in_id} to status '{new_status}'"
        )

    return result.data[0]


# ============================================================
# Helper: mark processing failure
# ============================================================

def mark_processing_failure(
    supabase,
    check_in_id: str,
    recording_id: str,
    reason: str,
) -> None:
    """
    Best-effort transition to technical_failure.

    This helper intentionally does not raise because it is
    itself called while handling another failure.
    """

    try:
        update_checkin_status(
            supabase,
            check_in_id,
            "technical_failure",
        )
    except Exception as exc:
        print(
            "ERROR: Failed to mark check-in "
            f"{check_in_id} as technical_failure: {exc}"
        )

    try:
        (
            supabase
            .table("call_recordings")
            .update(
                {
                    "quality_status": "failed",
                    "quality_reason": reason,
                }
            )
            .eq(
                "id",
                recording_id,
            )
            .execute()
        )
    except Exception as exc:
        print(
            "ERROR: Failed to mark recording "
            f"{recording_id} as failed: {exc}"
        )


# ============================================================
# Helper: verify caregiver access
# ============================================================

def verify_check_in_access(
    check_in_id: str,
    current_user: dict,
) -> dict:

    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .select(
            """
            id,
            elder_id,
            call_id,
            status,
            scheduled_for,
            created_at,
            updated_at,
            elders!inner(
                id,
                caregiver_id
            )
            """
        )
        .eq(
            "id",
            check_in_id,
        )
        .eq(
            "elders.caregiver_id",
            current_user["id"],
        )
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found",
        )

    return result.data


# ============================================================
# Helper: upload to Supabase Storage
# ============================================================

def upload_to_storage(
    supabase,
    bucket: str,
    storage_path: str,
    audio_bytes: bytes,
    content_type: str | None,
) -> None:

    file_options = {}

    if content_type:
        file_options["content-type"] = content_type

    supabase.storage.from_(bucket).upload(
        path=storage_path,
        file=audio_bytes,
        file_options=file_options,
    )


# ============================================================
# Helper: download from Supabase Storage
# ============================================================

def download_from_storage(
    supabase,
    bucket: str,
    storage_path: str,
) -> bytes:

    return supabase.storage.from_(
        bucket
    ).download(
        storage_path
    )


# ============================================================
# Helper: delete from Supabase Storage
# ============================================================

def delete_from_storage(
    supabase,
    bucket: str,
    storage_path: str,
) -> None:

    try:
        supabase.storage.from_(
            bucket
        ).remove(
            [storage_path]
        )
    except Exception as exc:
        print(
            "WARNING: Failed to delete Storage object "
            f"{storage_path}: {exc}"
        )


# ============================================================
# Helper: build response
# ============================================================

def build_result_payload(
    *,
    check_in_id: str,
    recording_id: str,
    elder_id: str,
    storage_path: str,
    original_filename: str,
    content_type: str | None,
    size_bytes: int,
    processing: dict,
    analysis: dict | None,
) -> dict:

    return {
        "success": True,
        "recording_id": recording_id,
        "check_in_id": check_in_id,
        "elder_id": elder_id,
        "storage_path": storage_path,
        "original_filename": original_filename,
        "content_type": content_type,
        "size_bytes": size_bytes,
        "processing": processing,
        "analysis": analysis,
    }


# ============================================================
# POST: Upload and process audio
# ============================================================

@router.post("/{check_in_id}/audio")
async def upload_audio(
    check_in_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):

    settings = get_settings()

    supabase = get_supabase_client()

    bucket = settings.AUDIO_STORAGE_BUCKET

    # --------------------------------------------------------
    # 1. Verify caregiver access
    # --------------------------------------------------------

    check_in = verify_check_in_access(
        check_in_id,
        current_user,
    )

    elder_id = check_in["elder_id"]

    # --------------------------------------------------------
    # 2. Check check-in lifecycle
    # --------------------------------------------------------

    current_status = check_in.get(
        "status"
    )

    if current_status == "completed":

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This check-in has already been completed."
            ),
        )

    if current_status == "technical_failure":

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This check-in has already failed. "
                "Create or use another check-in for a retry."
            ),
        )

    if current_status not in {
        "scheduled",
        "initiated",
    }:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Audio upload is not allowed for a "
                f"check-in with status '{current_status}'."
            ),
        )

    # --------------------------------------------------------
    # 3. Verify active voice consent
    # --------------------------------------------------------

    try:

        consent_valid = verify_voice_consent(
            elder_id
        )

    except Exception as exc:

        print(
            "ERROR: Consent verification failed: "
            f"{exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify voice consent.",
        )

    if not consent_valid:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Active consent for weekly voice "
                "check-ins is required."
            ),
        )

    # --------------------------------------------------------
    # 4. Validate filename / extension
    # --------------------------------------------------------

    original_filename = (
        file.filename
        or "recording"
    )

    extension = (
        Path(original_filename)
        .suffix
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported audio format: {extension}. "
                f"Allowed formats: "
                f"{', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # --------------------------------------------------------
    # 5. Read uploaded audio
    # --------------------------------------------------------

    try:

        audio_bytes = await file.read()

    except Exception as exc:

        print(
            "ERROR: Failed to read uploaded audio: "
            f"{exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to read uploaded audio.",
        )

    if not audio_bytes:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty.",
        )

    if len(audio_bytes) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "Audio file is too large. "
                "Maximum size is 25 MB."
            ),
        )

    # --------------------------------------------------------
    # 6. Generate recording ID
    # --------------------------------------------------------

    recording_id = str(
        uuid.uuid4()
    )

    # --------------------------------------------------------
    # 7. Generate private Storage path
    # --------------------------------------------------------
    #
    # Example:
    #
    # recordings/
    #   elder_id/
    #       check_in_id/
    #           recording_id.mp3
    #
    # The bucket itself is "recordings".
    # --------------------------------------------------------

    storage_path = (
        f"{elder_id}/"
        f"{check_in_id}/"
        f"{recording_id}"
        f"{extension}"
    )

    # Temporary local file used only by the processing
    # pipeline.
    #
    # This file is deleted after processing.
    # --------------------------------------------------------

    temp_dir = Path("data/tmp")

    temp_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    temp_audio_path = (
        temp_dir
        / (
            f"{recording_id}"
            f"{extension}"
        )
    )

    # --------------------------------------------------------
    # 8. Upload audio to Supabase Storage
    # --------------------------------------------------------

    try:

        upload_to_storage(
            supabase=supabase,
            bucket=bucket,
            storage_path=storage_path,
            audio_bytes=audio_bytes,
            content_type=file.content_type,
        )

    except Exception as exc:

        print(
            "ERROR: Failed to upload audio to "
            f"Supabase Storage: {exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded audio.",
        )

    # --------------------------------------------------------
    # 9. Create call_recordings row
    # --------------------------------------------------------

    try:

        recording_result = (
            supabase
            .table("call_recordings")
            .insert(
                {
                    "id": recording_id,
                    "elder_id": elder_id,
                    "storage_path": storage_path,
                    "original_filename": (
                        original_filename
                    ),
                    "quality_status": "processing",
                }
            )
            .execute()
        )

        if (
            not recording_result
            or not recording_result.data
        ):

            raise RuntimeError(
                "Failed to create call_recordings row."
            )

    except Exception as exc:

        print(
            "ERROR: Failed to create recording row: "
            f"{exc}"
        )

        delete_from_storage(
            supabase,
            bucket,
            storage_path,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create audio recording.",
        )

    # --------------------------------------------------------
    # 10. Link recording to check-in
    # --------------------------------------------------------

    try:

        update_result = (
            supabase
            .table("check_ins")
            .update(
                {
                    "call_id": recording_id,
                    "status": "initiated",
                    "updated_at": utc_now_iso(),
                }
            )
            .eq(
                "id",
                check_in_id,
            )
            .eq(
                "status",
                current_status,
            )
            .execute()
        )

        if (
            not update_result
            or not update_result.data
        ):

            raise RuntimeError(
                "Failed to link recording to check-in."
            )

    except Exception as exc:

        print(
            "ERROR: Failed to link recording "
            f"to check-in: {exc}"
        )

        try:

            (
                supabase
                .table("call_recordings")
                .delete()
                .eq(
                    "id",
                    recording_id,
                )
                .execute()
            )

        except Exception as cleanup_exc:

            print(
                "WARNING: Failed to delete recording "
                f"row: {cleanup_exc}"
            )

        delete_from_storage(
            supabase,
            bucket,
            storage_path,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link audio to check-in.",
        )

    # --------------------------------------------------------
    # 11. Download Storage object to temporary local file
    # --------------------------------------------------------

    try:

        stored_audio = download_from_storage(
            supabase=supabase,
            bucket=bucket,
            storage_path=storage_path,
        )

        if not stored_audio:

            raise RuntimeError(
                "Stored audio could not be downloaded."
            )

        temp_audio_path.write_bytes(
            stored_audio
        )

    except Exception as exc:

        print(
            "ERROR: Failed to retrieve stored audio: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Failed to retrieve stored audio.",
        )

        delete_from_storage(
            supabase,
            bucket,
            storage_path,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve stored audio.",
        )

    # --------------------------------------------------------
    # 12. Run complete audio pipeline
    # --------------------------------------------------------

    try:

        processing_result = process_audio(
            str(temp_audio_path)
        )

    except Exception as exc:

        print(
            "ERROR: Audio processing failed: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Audio processing failed.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio processing failed.",
        )

    finally:

        # The permanent copy is in Supabase Storage.
        # This local copy is temporary.
        try:
            temp_audio_path.unlink(
                missing_ok=True
            )
        except Exception as exc:
            print(
                "WARNING: Failed to delete temporary "
                f"audio file: {exc}"
            )

    # --------------------------------------------------------
    # 13. Extract quality result
    # --------------------------------------------------------

    quality = (
        processing_result.get(
            "quality"
        )
        or {}
    )

    quality_passed = quality.get(
        "passed"
    )

    # IMPORTANT:
    #
    # call_recordings.quality_status describes AUDIO QUALITY,
    # not the overall processing status.
    # --------------------------------------------------------

    if quality_passed is True:

        quality_status = "passed"

    elif quality_passed is False:

        quality_status = "rejected"

    else:

        quality_status = "failed"

    quality_reason = quality.get(
        "reason"
    )

    quality_update = {
        "quality_status": quality_status,
    }

    if quality_reason is not None:

        quality_update[
            "quality_reason"
        ] = str(
            quality_reason
        )

    if quality.get("duration_seconds") is not None:

        quality_update[
            "duration_seconds"
        ] = quality.get(
            "duration_seconds"
        )

    if quality.get("sample_rate") is not None:

        quality_update[
            "sample_rate"
        ] = quality.get(
            "sample_rate"
        )

    if quality.get("channels") is not None:

        quality_update[
            "channels"
        ] = quality.get(
            "channels"
        )

    # --------------------------------------------------------
    # 14. Persist quality information
    # --------------------------------------------------------

    try:

        quality_result = (
            supabase
            .table("call_recordings")
            .update(
                quality_update
            )
            .eq(
                "id",
                recording_id,
            )
            .execute()
        )

        if (
            not quality_result
            or not quality_result.data
        ):

            raise RuntimeError(
                "Quality information was not persisted."
            )

    except Exception as exc:

        print(
            "ERROR: Failed to persist recording "
            f"quality: {exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Failed to persist audio quality.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save audio quality information.",
        )

    # --------------------------------------------------------
    # 15. Handle quality failure
    # --------------------------------------------------------

    if quality_status in {
        "rejected",
        "failed",
    }:

        if quality_status == "rejected":

            target_checkin_status = "poor_audio"

        else:

            target_checkin_status = (
                "technical_failure"
            )

        try:

            update_checkin_status(
                supabase,
                check_in_id,
                target_checkin_status,
            )

        except Exception as exc:

            print(
                "ERROR: Failed to update check-in "
                f"after quality failure: {exc}"
            )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to finalize audio quality status.",
            )

        if quality_status == "rejected":

            return build_result_payload(
                check_in_id=check_in_id,
                recording_id=recording_id,
                elder_id=elder_id,
                storage_path=storage_path,
                original_filename=original_filename,
                content_type=file.content_type,
                size_bytes=len(audio_bytes),
                processing=processing_result,
                analysis={
                    "status": "poor_audio",
                    "neutral_status": "Insufficient data",
                    "baseline": None,
                    "trajectory": None,
                },
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio quality processing failed.",
        )

    # --------------------------------------------------------
    # 16. Save transcript
    # --------------------------------------------------------

    transcription = (
        processing_result.get(
            "transcription"
        )
        or {}
    )

    transcript_text = (
        transcription.get(
            "text"
        )
    )

    if not transcript_text:

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Speech transcription produced no text.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio transcription failed.",
        )

    try:

        transcript_result = (
            supabase
            .table("transcripts")
            .insert(
                {
                    "call_recording_id": (
                        recording_id
                    ),
                    "text": (
                        transcript_text
                    ),
                    "language": (
                        transcription.get(
                            "language"
                        )
                    ),
                    "model_name": (
                        transcription.get(
                            "model_name"
                        )
                    ),
                }
            )
            .execute()
        )

        if (
            not transcript_result
            or not transcript_result.data
        ):

            raise RuntimeError(
                "Transcript was not persisted."
            )

    except Exception as exc:

        print(
            "ERROR: Failed to save transcript: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Failed to persist transcript.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save transcript.",
        )

    # --------------------------------------------------------
    # 17. Get processing status and features
    # --------------------------------------------------------

    processing_status = (
        processing_result.get(
            "status"
        )
    )

    features = (
        processing_result.get(
            "features"
        )
        or {}
    )

    # --------------------------------------------------------
    # 18. Handle insufficient speech
    # --------------------------------------------------------

    if processing_status == "insufficient_speech":

        try:

            update_checkin_status(
                supabase,
                check_in_id,
                "completed",
            )

        except Exception as exc:

            print(
                "ERROR: Failed to complete "
                f"insufficient-speech check-in: {exc}"
            )

            mark_processing_failure(
                supabase=supabase,
                check_in_id=check_in_id,
                recording_id=recording_id,
                reason=(
                    "Failed to finalize insufficient-speech "
                    "check-in."
                ),
            )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to finalize check-in.",
            )

        return build_result_payload(
            check_in_id=check_in_id,
            recording_id=recording_id,
            elder_id=elder_id,
            storage_path=storage_path,
            original_filename=original_filename,
            content_type=file.content_type,
            size_bytes=len(audio_bytes),
            processing=processing_result,
            analysis={
                "status": "insufficient_data",
                "neutral_status": "Insufficient data",
                "baseline": None,
                "trajectory": None,
            },
        )

    # --------------------------------------------------------
    # 19. Require usable features
    # --------------------------------------------------------

    if not features:

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Speech features were not produced.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio features could not be extracted.",
        )

    # --------------------------------------------------------
    # 20. Persist speech features
    # --------------------------------------------------------

    try:

        features_result = (
            supabase
            .table("speech_features")
            .insert(
                {
                    "call_recording_id": (
                        recording_id
                    ),
                    "speaking_rate_wpm": (
                        features.get(
                            "speaking_rate_wpm"
                        )
                    ),
                    "pause_density": (
                        features.get(
                            "pause_density"
                        )
                    ),
                    "lexical_diversity_ttr": (
                        features.get(
                            "lexical_diversity_ttr"
                        )
                    ),
                    "speech_duration_seconds": (
                        features.get(
                            "speech_duration_seconds"
                        )
                    ),
                }
            )
            .execute()
        )

        if (
            not features_result
            or not features_result.data
        ):

            raise RuntimeError(
                "Speech features were not persisted."
            )

    except Exception as exc:

        print(
            "ERROR: Failed to save speech features: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Failed to persist speech features.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save speech features.",
        )

    # --------------------------------------------------------
    # 21. Verify successful processing
    # --------------------------------------------------------

    if processing_status != "processed":

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Unexpected audio processing status.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Audio processing did not complete successfully."
            ),
        )

    # --------------------------------------------------------
    # 22. Baseline + trajectory analysis
    # --------------------------------------------------------

    try:

        analysis = finalize_checkin_analysis(
            elder_id=elder_id,
            recording_id=recording_id,
            features=features,
        )

    except Exception as exc:

        print(
            "ERROR: Analysis failed: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason=(
                "Baseline or trajectory analysis failed."
            ),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio analysis failed.",
        )

    # --------------------------------------------------------
    # 23. Complete check-in
    # --------------------------------------------------------

    try:

        update_checkin_status(
            supabase,
            check_in_id,
            "completed",
        )

    except Exception as exc:

        print(
            "ERROR: Failed to complete check-in: "
            f"{exc}"
        )

        mark_processing_failure(
            supabase=supabase,
            check_in_id=check_in_id,
            recording_id=recording_id,
            reason="Failed to finalize check-in status.",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize check-in.",
        )

    # --------------------------------------------------------
    # 24. Return complete result
    # --------------------------------------------------------

    return build_result_payload(
        check_in_id=check_in_id,
        recording_id=recording_id,
        elder_id=elder_id,
        storage_path=storage_path,
        original_filename=original_filename,
        content_type=file.content_type,
        size_bytes=len(audio_bytes),
        processing=processing_result,
        analysis=analysis,
    )


# ============================================================
# GET: Retrieve complete audio result
# ============================================================

@router.get("/{check_in_id}/audio")
def get_audio_result(
    check_in_id: str,
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):

    check_in = verify_check_in_access(
        check_in_id,
        current_user,
    )

    elder_id = check_in["elder_id"]

    call_id = check_in.get(
        "call_id"
    )

    supabase = get_supabase_client()

    # --------------------------------------------------------
    # No recording yet
    # --------------------------------------------------------

    if not call_id:

        return {
            "success": True,
            "check_in_id": check_in_id,
            "elder_id": elder_id,
            "recording": None,
            "transcript": None,
            "features": None,
            "trajectory": None,
        }

    # --------------------------------------------------------
    # Get recording
    # --------------------------------------------------------

    recording_result = (
        supabase
        .table("call_recordings")
        .select("*")
        .eq(
            "id",
            call_id,
        )
        .maybe_single()
        .execute()
    )

    recording = (
        recording_result.data
        if recording_result
        else None
    )

    if not recording:

        return {
            "success": True,
            "check_in_id": check_in_id,
            "elder_id": elder_id,
            "recording": None,
            "transcript": None,
            "features": None,
            "trajectory": None,
        }

    recording_id = recording["id"]

    # --------------------------------------------------------
    # Get transcript
    # --------------------------------------------------------

    transcript_result = (
        supabase
        .table("transcripts")
        .select("*")
        .eq(
            "call_recording_id",
            recording_id,
        )
        .maybe_single()
        .execute()
    )

    transcript = (
        transcript_result.data
        if transcript_result
        else None
    )

    # --------------------------------------------------------
    # Get speech features
    # --------------------------------------------------------

    features_result = (
        supabase
        .table("speech_features")
        .select("*")
        .eq(
            "call_recording_id",
            recording_id,
        )
        .maybe_single()
        .execute()
    )

    features = (
        features_result.data
        if features_result
        else None
    )

    # --------------------------------------------------------
    # Get trajectory
    # --------------------------------------------------------

    trajectory_result = (
        supabase
        .table("trajectory_results")
        .select("*")
        .eq(
            "call_recording_id",
            recording_id,
        )
        .maybe_single()
        .execute()
    )

    trajectory = (
        trajectory_result.data
        if trajectory_result
        else None
    )

    # --------------------------------------------------------
    # Return complete result
    # --------------------------------------------------------

    return {
        "success": True,
        "check_in_id": check_in_id,
        "elder_id": elder_id,
        "recording": recording,
        "transcript": transcript,
        "features": features,
        "trajectory": trajectory,
    }