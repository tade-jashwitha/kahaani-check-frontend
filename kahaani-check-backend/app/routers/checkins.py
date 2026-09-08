from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import verify_supabase_jwt
from app.services.supabase_client import get_supabase_client
from app.services.checkin_service import (
    get_or_create_current_checkin,
)


router = APIRouter(
    prefix="/v1/check-ins",
    tags=["check-ins"],
)


# ============================================================
# CURRENT CHECK-IN
# IMPORTANT:
# This route MUST appear before /{check_in_id}
# ============================================================

@router.get("/current")
def get_current_checkin(
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):
    """
    Return the current active check-in for the
    caregiver's elder.

    If no active check-in exists, create one.
    """

    supabase = get_supabase_client()

    # --------------------------------------------------------
    # Find elder belonging to logged-in caregiver
    # --------------------------------------------------------

    elder_result = (
        supabase
        .table("elders")
        .select("*")
        .eq(
            "caregiver_id",
            current_user["id"],
        )
        .limit(1)
        .execute()
    )

    if not elder_result or not elder_result.data:
        raise HTTPException(
            status_code=404,
            detail="No elder found for this caregiver",
        )

    elder = elder_result.data[0]

    # --------------------------------------------------------
    # Get or create active check-in
    # --------------------------------------------------------

    try:

        checkin = get_or_create_current_checkin(
            elder["id"]
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to get current check-in: {exc}",
        )

    return {
        "success": True,
        "elder": elder,
        "check_in": checkin,
    }


# ============================================================
# GET ALL CHECK-INS FOR AN ELDER
# ============================================================

@router.get("/elder/{elder_id}")
def get_elder_checkins(
    elder_id: str,
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):
    """
    Return all check-ins belonging to the specified elder.

    The elder must belong to the currently authenticated
    caregiver.
    """

    supabase = get_supabase_client()

    # --------------------------------------------------------
    # First verify that this elder belongs to the caregiver
    # --------------------------------------------------------

    elder_result = (
        supabase
        .table("elders")
        .select(
            "id, caregiver_id, display_name"
        )
        .eq(
            "id",
            elder_id,
        )
        .eq(
            "caregiver_id",
            current_user["id"],
        )
        .maybe_single()
        .execute()
    )

    if not elder_result or not elder_result.data:
        raise HTTPException(
            status_code=404,
            detail="Elder not found",
        )

    # --------------------------------------------------------
    # Get all check-ins for this elder
    # --------------------------------------------------------

    result = (
        supabase
        .table("check_ins")
        .select("*")
        .eq(
            "elder_id",
            elder_id,
        )
        .order(
            "created_at",
            desc=True,
        )
        .execute()
    )

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to load check-ins",
        )

    # --------------------------------------------------------
    # Return check-ins
    #
    # We return the list directly because the frontend
    # already expects an array from this endpoint.
    # --------------------------------------------------------

    return result.data


# ============================================================
# GET CHECK-IN BY ID
# ============================================================

@router.get("/{check_in_id}")
def get_checkin(
    check_in_id: str,
    current_user: dict = Depends(
        verify_supabase_jwt
    ),
):

    supabase = get_supabase_client()

    # --------------------------------------------------------
    # Verify the check-in belongs to caregiver's elder
    # --------------------------------------------------------

    result = (
        supabase
        .table("check_ins")
        .select(
            """
            *,
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
            status_code=404,
            detail="Check-in not found",
        )

    return {
        "success": True,
        "check_in": result.data,
    }