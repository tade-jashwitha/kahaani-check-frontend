from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.schemas.schedule import (
    WeeklyScheduleCreate,
    WeeklyScheduleResponse,
)
from app.services.schedule_service import create_next_check_in
from app.services.supabase_client import get_supabase_client


router = APIRouter(
    prefix="/v1/schedules",
    tags=["schedules"],
)


def verify_elder_access(
    elder_id: str,
    current_user: dict,
):
    supabase = get_supabase_client()

    result = (
        supabase.table("elders")
        .select("id")
        .eq("id", elder_id)
        .eq("caregiver_id", current_user["id"])
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found.",
        )


@router.put(
    "/{elder_id}",
    response_model=WeeklyScheduleResponse,
)
def create_or_update_schedule(
    elder_id: str,
    payload: WeeklyScheduleCreate,
    current_user: dict = Depends(verify_supabase_jwt),
):
    verify_elder_access(
        elder_id=elder_id,
        current_user=current_user,
    )

    supabase = get_supabase_client()

    existing = (
        supabase.table("weekly_schedules")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    schedule_data = {
        "elder_id": elder_id,
        "day_of_week": payload.day_of_week,
        "preferred_time": payload.preferred_time.isoformat(),
        "timezone": payload.timezone,
        "enabled": payload.enabled,
    }

    if existing and existing.data:
        result = (
            supabase.table("weekly_schedules")
            .update(schedule_data)
            .eq("elder_id", elder_id)
            .execute()
        )
    else:
        result = (
            supabase.table("weekly_schedules")
            .insert(schedule_data)
            .execute()
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save weekly schedule.",
        )

    return result.data[0]


@router.get(
    "/{elder_id}",
    response_model=WeeklyScheduleResponse,
)
def get_schedule(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    verify_elder_access(
        elder_id=elder_id,
        current_user=current_user,
    )

    supabase = get_supabase_client()

    result = (
        supabase.table("weekly_schedules")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly schedule not found.",
        )

    return result.data


@router.patch(
    "/{elder_id}/toggle",
    response_model=WeeklyScheduleResponse,
)
def toggle_schedule(
    elder_id: str,
    enabled: bool,
    current_user: dict = Depends(verify_supabase_jwt),
):
    verify_elder_access(
        elder_id=elder_id,
        current_user=current_user,
    )

    supabase = get_supabase_client()

    result = (
        supabase.table("weekly_schedules")
        .update({"enabled": enabled})
        .eq("elder_id", elder_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly schedule not found.",
        )

    return result.data[0]


@router.post("/{elder_id}/next-check-in")
def generate_next_check_in(
    elder_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Generate the next real weekly check-in.

    Requires:
    - caregiver owns elder
    - enabled weekly schedule
    - confirmed elder consent

    Duplicate check-ins for the same weekly slot
    are automatically avoided.
    """

    verify_elder_access(
        elder_id=elder_id,
        current_user=current_user,
    )

    return create_next_check_in(elder_id)