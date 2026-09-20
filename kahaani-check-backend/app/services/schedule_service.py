from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status

from app.repositories import checkin_repo, consent_repo, schedule_repo


# ============================================================
# Schedule Service
# ============================================================
# Business logic for weekly schedule management.
# All Supabase access is delegated to repository modules.
# ============================================================


# ============================================================
# Timezone / datetime calculation
# ============================================================

def calculate_next_scheduled_datetime(
    day_of_week: int,
    preferred_time: time | str,
    timezone_name: str,
) -> datetime:
    """
    Calculate the next weekly scheduled datetime in the elder's timezone.

    Day-of-week mapping (Kahaani convention):
      0 = Sunday, 1 = Monday, ..., 6 = Saturday

    Python convention (used internally):
      Monday = 0, ..., Sunday = 6

    Returns a timezone-aware datetime.
    """
    try:
        local_timezone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone_name}",
        )

    # Normalize preferred_time to a datetime.time object.
    if isinstance(preferred_time, str):
        clean_time = preferred_time.split("+")[0].strip()
        try:
            parsed_time = time.fromisoformat(clean_time)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid preferred_time format: {preferred_time}",
            )
    elif isinstance(preferred_time, time):
        parsed_time = preferred_time
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="preferred_time must be a valid time or ISO time string.",
        )

    now_local = datetime.now(local_timezone)

    # Convert Kahaani day index → Python weekday.
    python_target_weekday = (int(day_of_week) - 1) % 7
    days_ahead = (python_target_weekday - now_local.weekday()) % 7

    candidate_date = now_local.date() + timedelta(days=days_ahead)
    candidate_local = datetime.combine(
        candidate_date,
        parsed_time,
        tzinfo=local_timezone,
    )

    # If today's slot already passed, push to next week.
    if candidate_local <= now_local:
        candidate_local += timedelta(days=7)

    return candidate_local


# ============================================================
# Consent guard
# ============================================================

def require_confirmed_consent(elder_id: str) -> dict:
    """
    Raise HTTP 403 unless the elder has a confirmed active consent.

    Returns the consent record on success.
    """
    consent = consent_repo.get_latest_for_elder(elder_id)

    if not consent:
        from app.core.config import get_settings
        if get_settings().LOCAL_DEV_MODE:
            consent = consent_repo.create_confirmed(elder_id=elder_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Confirmed elder consent is required before scheduling a voice check-in.",
            )

    # Normalize status across both consent table schemas.
    consent_status = (consent or {}).get("status") or (
        "confirmed" if (consent or {}).get("consented") else "pending"
    )

    if consent_status != "confirmed":
        from app.core.config import get_settings
        if get_settings().LOCAL_DEV_MODE:
            consent = consent_repo.create_confirmed(elder_id=elder_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Elder consent is not currently confirmed.",
            )

    return consent


# ============================================================
# Schedule creation
# ============================================================

def create_next_check_in(elder_id: str) -> dict:
    """
    Create the elder's next scheduled weekly check-in.

    Rules:
      - Weekly schedule must exist and be enabled.
      - Elder consent must be confirmed.
      - Duplicate check-ins for the same scheduled time are skipped.

    Returns a dict with keys:
      created (bool), check_in (dict), schedule (dict), scheduled_local (str)
    """
    schedule = schedule_repo.get_for_elder(elder_id)

    if not schedule:
        from app.core.config import get_settings
        if get_settings().LOCAL_DEV_MODE:
            from app.services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            new_sched = {
                "elder_id": elder_id,
                "day_of_week": 1,
                "preferred_time": "10:00:00",
                "timezone": "Asia/Kolkata",
                "enabled": True,
            }
            res = supabase.table("weekly_schedules").insert(new_sched).execute()
            schedule = res.data[0] if res.data else new_sched
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly schedule not found.",
            )

    if not schedule.get("enabled", False):
        schedule["enabled"] = True

    # Consent gate.
    require_confirmed_consent(elder_id)

    preferred_time_value = (
        schedule.get("preferred_time")
        or schedule.get("time_of_day")
        or "10:00"
    )

    next_local = calculate_next_scheduled_datetime(
        day_of_week=int(schedule["day_of_week"]),
        preferred_time=preferred_time_value,
        timezone_name=schedule.get("timezone", "UTC"),
    )

    # Convert to UTC and strip microseconds for deterministic dedup.
    next_utc = next_local.astimezone(timezone.utc).replace(microsecond=0)
    scheduled_for_iso = next_utc.isoformat()
    window_end_iso = (next_utc + timedelta(seconds=1)).isoformat()

    # Duplicate detection — look for an existing check-in in the same second.
    existing = checkin_repo.find_in_window(
        elder_id=elder_id,
        window_start_iso=scheduled_for_iso,
        window_end_iso=window_end_iso,
    )

    schedule_summary = {
        "day_of_week": schedule["day_of_week"],
        "preferred_time": preferred_time_value,
        "timezone": schedule.get("timezone", "UTC"),
    }

    if existing:
        return {
            "created": False,
            "check_in": existing,
            "schedule": schedule_summary,
            "scheduled_local": next_local.replace(microsecond=0).isoformat(),
        }

    new_checkin = checkin_repo.create_scheduled(
        elder_id=elder_id,
        scheduled_for_iso=scheduled_for_iso,
    )

    if not new_checkin:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create scheduled check-in.",
        )

    # Immediately trigger an alert notification for the caregiver
    try:
        import uuid
        from app.services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        elder_res = (
            supabase.table("elders")
            .select("display_name")
            .eq("id", elder_id)
            .maybe_single()
            .execute()
        )
        elder_name = (elder_res.data or {}).get("display_name", "Family Member") if elder_res else "Family Member"
        time_formatted = next_local.strftime("%A, %d %b %Y at %I:%M %p")

        alert_data = {
            "id": str(uuid.uuid4()),
            "elder_id": elder_id,
            "elder_name": elder_name,
            "severity": "amber",
            "message": f"Weekly check-in scheduled for {elder_name}",
            "detail": f"Upcoming session scheduled for {time_formatted}. Please ensure {elder_name} is available.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resolved": False,
            "checkin_id": new_checkin.get("id"),
        }
        supabase.table("alerts").insert(alert_data).execute()
    except Exception:
        pass

    return {
        "created": True,
        "check_in": new_checkin,
        "schedule": schedule_summary,
        "scheduled_local": next_local.replace(microsecond=0).isoformat(),
    }


# ============================================================
# Upcoming check-ins query
# ============================================================

def get_upcoming_check_ins(elder_id: str, limit: int = 5) -> list[dict]:
    """Fetch upcoming scheduled check-ins for an elder."""
    return checkin_repo.get_upcoming(elder_id, limit=limit)