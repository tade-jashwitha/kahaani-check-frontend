from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.schemas.consent import ConsentCreate, ConsentResponse
from app.services.supabase_client import get_supabase_client


router = APIRouter(
    prefix="/v1/consents",
    tags=["consents"],
)


@router.post(
    "/{elder_id}/ivr-capture",
    response_model=ConsentResponse,
    status_code=status.HTTP_201_CREATED,
)
def capture_consent(
    elder_id: str,
    consent: ConsentCreate,
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    # First verify that this elder belongs to the authenticated caregiver.
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
        .table("consents")
        .insert({
            "elder_id": elder_id,
            "consent_type": consent.consent_type,
            "status": consent.status,
            "captured_via": consent.captured_via,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record consent",
        )

    return result.data[0]