from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.services.supabase_client import get_supabase_client
from app.schemas.elder import ElderCreate, ElderResponse


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
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    result = (
        supabase
        .table("elders")
        .insert({
            "caregiver_id": caregiver_id,
            "display_name": elder.display_name,
            "phone_e164": elder.phone_e164,
            "preferred_call_language": elder.preferred_call_language,
            "dob_year_range": elder.dob_year_range,
            "timezone": elder.timezone,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create elder",
        )

    return result.data[0]


@router.get(
    "",
    response_model=list[ElderResponse],
)
def list_elders(
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    result = (
        supabase
        .table("elders")
        .select("*")
        .eq("caregiver_id", caregiver_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data


@router.get(
    "/{elder_id}",
    response_model=ElderResponse,
)
def get_elder(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    supabase = get_supabase_client()

    caregiver_id = current_user["id"]

    result = (
        supabase
        .table("elders")
        .select("*")
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found",
        )

    return result.data