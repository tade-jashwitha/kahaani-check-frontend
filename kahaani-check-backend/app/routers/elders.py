from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.repositories import elder_repo, consent_repo
from app.schemas.elder import ElderCreate, ElderResponse, ElderUpdate


# ============================================================
# Elders Router
# ============================================================
# HTTP layer only: parse request, call service/repo, return response.
# No Supabase calls, no business logic.
# ============================================================

router = APIRouter(
    prefix="/v1/elders",
    tags=["elders"],
)


@router.post(
    "",
    response_model=ElderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_elder(
    elder: ElderCreate,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Register a new elder under the authenticated caregiver.

    Automatically records confirmed consent for weekly voice check-ins
    as part of the registration flow.
    """
    caregiver_id = current_user["id"]

    new_elder = elder_repo.create(
        caregiver_id=caregiver_id,
        fields={
            "display_name": elder.display_name,
            "phone_e164": elder.phone_e164,
            "preferred_call_language": elder.preferred_call_language,
            "dob_year_range": elder.dob_year_range,
            "timezone": elder.timezone,
        },
    )

    if not new_elder:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create elder",
        )

    # Best-effort consent creation — non-critical, never blocks registration.
    try:
        consent_repo.create_confirmed(elder_id=new_elder["id"])
    except Exception:
        pass

    return new_elder


@router.get(
    "",
    response_model=list[ElderResponse],
)
def list_elders(
    current_user: dict = Depends(verify_supabase_jwt),
):
    """Return all elders belonging to the authenticated caregiver."""
    return elder_repo.list_by_caregiver(current_user["id"])


@router.get(
    "/{elder_id}",
    response_model=ElderResponse,
)
def get_elder(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """Return a single elder by ID (must belong to authenticated caregiver)."""
    elder = elder_repo.get_by_id(elder_id, current_user["id"])

    if not elder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    return elder


@router.patch(
    "/{elder_id}",
    response_model=ElderResponse,
)
def update_elder(
    elder_id: str,
    update_data: ElderUpdate,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """Update a subset of fields on an existing elder record."""
    fields = {
        k: v
        for k, v in update_data.model_dump(exclude_unset=True).items()
        if v is not None
    }

    if not fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    updated = elder_repo.update(elder_id, current_user["id"], fields)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found or update failed",
        )

    return updated