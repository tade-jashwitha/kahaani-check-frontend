from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import verify_supabase_jwt
from app.repositories import checkin_repo, elder_repo
from app.services.checkin_service import get_or_create_current_checkin


# ============================================================
# Check-ins Router
# ============================================================
# HTTP layer only: parse request, call service/repo, return response.
# No Supabase calls, no elder-lookup business logic.
# ============================================================

router = APIRouter(
    prefix="/v1/check-ins",
    tags=["check-ins"],
)


# ============================================================
# CURRENT CHECK-IN
# IMPORTANT: This route MUST appear before /{check_in_id}
# ============================================================

@router.get("/current")
def get_current_checkin(
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Return the active check-in for the caregiver's first elder.

    If no active check-in exists, create one.
    """
    # Find the first elder belonging to the caregiver.
    elders = elder_repo.list_by_caregiver(current_user["id"])

    if not elders:
        from app.core.config import get_settings
        if get_settings().LOCAL_DEV_MODE:
            new_elder = elder_repo.create({
                "caregiver_id": current_user["id"],
                "display_name": "Family Elder",
                "phone_e164": "+919876543210",
                "preferred_call_language": "hi",
                "dob_year_range": "1945-1950",
                "timezone": "Asia/Kolkata",
                "status": "active",
            })
            elders = [new_elder]
        else:
            raise HTTPException(
                status_code=404,
                detail="No elder found for this caregiver",
            )

    elder = elders[0]

    try:
        checkin = get_or_create_current_checkin(elder["id"])
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
# ALL CHECK-INS FOR A SPECIFIC ELDER
# ============================================================

@router.get("/elder/{elder_id}")
def get_elder_checkins(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Return all check-ins for the given elder.

    The elder must belong to the authenticated caregiver.
    """
    # Ownership verification.
    elder = elder_repo.get_by_id(elder_id, current_user["id"])

    if not elder:
        raise HTTPException(status_code=404, detail="Elder not found")

    return checkin_repo.list_for_elder(elder_id)


# ============================================================
# START / GET ACTIVE CHECK-IN FOR A SPECIFIC ELDER
# ============================================================

@router.post("/elder/{elder_id}/start")
@router.get("/elder/{elder_id}/current")
def start_elder_checkin(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Get or create the active check-in for a specific elder.

    The elder must belong to the authenticated caregiver.
    """
    elder = elder_repo.get_by_id(elder_id, current_user["id"])

    if not elder:
        raise HTTPException(
            status_code=404,
            detail="Elder not found or unauthorized",
        )

    try:
        checkin = get_or_create_current_checkin(elder_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start check-in: {exc}",
        )

    return {
        "success": True,
        "elder": elder,
        "check_in": checkin,
    }


# ============================================================
# GET CHECK-IN BY ID
# ============================================================

@router.get("/{check_in_id}")
def get_checkin(
    check_in_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """Return a single check-in by ID (must belong to authenticated caregiver)."""
    checkin = checkin_repo.get_by_id(check_in_id, current_user["id"])

    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")

    return {
        "success": True,
        "check_in": checkin,
    }