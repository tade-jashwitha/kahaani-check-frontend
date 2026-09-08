from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status

from app.services.supabase_client import get_supabase_client


# Kahaani-Check mapping:
# 0 = Sunday
# 1 = Monday
# 2 = Tuesday
# 3 = Wednesday
# 4 = Thursday
# 5 = Friday
# 6 = Saturday
#
# Python datetime.weekday():
# Monday = 0
# ...
# Sunday = 6


def calculate_next_scheduled_datetime(
    day_of_week: int,
    preferred_time,
    timezone_name: str,
) -> datetime:
    """
    Calculate the next weekly scheduled datetime
    in the elder's configured timezone.

    Returns a timezone-aware datetime.
    """

    try:
        local_timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone_name}",
        )

    now_local = datetime.now(local_timezone)

    # Convert Kahaani mapping to Python weekday mapping.
    #
    # Kahaani:
    # Sunday=0, Monday=1 ... Saturday=6
    #
    # Python:
    # Monday=0 ... Sunday=6
    python_target_weekday = (day_of_week - 1) % 7

    days_ahead = (
        python_target_weekday - now_local.weekday()
    ) % 7

    candidate_date = now_local.date() + timedelta(days=days_ahead)

    candidate_local = datetime.combine(
        candidate_date,
        preferred_time,
        tzinfo=local_timezone,
    )

    # If today's scheduled time already passed,
    # move to next week.
    if candidate_local <= now_local:
        candidate_local += timedelta(days=7)

    return candidate_local


def get_latest_confirmed_consent(elder_id: str):
    """
    Return latest weekly voice consent record.

    Raises 403 unless latest consent is confirmed.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("consents")
        .select("*")
        .eq("elder_id", elder_id)
        .eq("consent_type", "weekly_voice_checkin")
        .order("captured_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirmed elder consent is required before scheduling a voice check-in.",
        )

    latest_consent = result.data[0]

    if latest_consent.get("status") != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elder consent is not currently confirmed.",
        )

    return latest_consent


def create_next_check_in(elder_id: str) -> dict:
    """
    Create the elder's next scheduled weekly check-in.

    Rules:
    - weekly schedule must exist
    - schedule must be enabled
    - consent must currently be confirmed
    - duplicate check-ins for the same scheduled time are not created
    """

    supabase = get_supabase_client()

    schedule_result = (
        supabase.table("weekly_schedules")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    if not schedule_result or not schedule_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly schedule not found.",
        )

    schedule = schedule_result.data

    if not schedule.get("enabled", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Weekly schedule is disabled.",
        )

    # Do not schedule a voice check-in without active consent.
    get_latest_confirmed_consent(elder_id)

    preferred_time_value = schedule["preferred_time"]

    # Supabase may return TIME as:
    # 18:00:00
    # or sometimes 18:00:00+00
    #
    # We only need the local clock time stored in the schedule.
    from datetime import time

    if isinstance(preferred_time_value, str):
        clean_time = preferred_time_value.split("+")[0]

        try:
            preferred_time = time.fromisoformat(clean_time)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stored schedule time is invalid.",
            )
    else:
        preferred_time = preferred_time_value

    next_local = calculate_next_scheduled_datetime(
        day_of_week=int(schedule["day_of_week"]),
        preferred_time=preferred_time,
        timezone_name=schedule["timezone"],
    )

    # Store/query timestamptz using UTC.
    next_utc = next_local.astimezone(timezone.utc)

    # Strip microseconds so duplicate detection is deterministic.
    next_utc = next_utc.replace(microsecond=0)

    scheduled_for_iso = next_utc.isoformat()

    #
    # DUPLICATE PROTECTION
    #
    # Rather than relying only on string formatting equality,
    # search inside the exact second.
    #
    window_end = next_utc + timedelta(seconds=1)

    existing_result = (
        supabase.table("check_ins")
        .select("*")
        .eq("elder_id", elder_id)
        .gte("scheduled_for", scheduled_for_iso)
        .lt("scheduled_for", window_end.isoformat())
        .limit(1)
        .execute()
    )

    if existing_result.data:
        return {
            "created": False,
            "check_in": existing_result.data[0],
            "schedule": {
                "day_of_week": schedule["day_of_week"],
                "preferred_time": schedule["preferred_time"],
                "timezone": schedule["timezone"],
            },
            "scheduled_local": next_local.replace(
                microsecond=0
            ).isoformat(),
        }

    insert_result = (
        supabase.table("check_ins")
        .insert(
            {
                "elder_id": elder_id,
                "scheduled_for": scheduled_for_iso,
                "status": "scheduled",
                "notes": "Automatically created from weekly schedule.",
            }
        )
        .execute()
    )

    if not insert_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create scheduled check-in.",
        )

    return {
        "created": True,
        "check_in": insert_result.data[0],
        "schedule": {
            "day_of_week": schedule["day_of_week"],
            "preferred_time": schedule["preferred_time"],
            "timezone": schedule["timezone"],
        },
        "scheduled_local": next_local.replace(
            microsecond=0
        ).isoformat(),
    }