from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.services.supabase_client import get_supabase_client


# ============================================================
# Check-in Repository
# ============================================================
# All database access for the `check_ins` table lives here.
# No business logic — only data reads and writes.
# ============================================================

ACTIVE_STATUSES = ["scheduled", "initiated"]


def get_active_for_elder(elder_id: str) -> dict | None:
    """
    Return the most recent active (scheduled or initiated) check-in
    for the given elder, or None if none exists.
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .select("*")
        .eq("elder_id", elder_id)
        .in_("status", ACTIVE_STATUSES)
        .order("scheduled_for", desc=True)
        .limit(1)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None


def get_by_id(check_in_id: str, caregiver_id: str) -> dict | None:
    """
    Return a check-in by ID, enforcing caregiver ownership via an
    inner join on the elders table.
    """
    supabase = get_supabase_client()

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
        .eq("id", check_in_id)
        .eq("elders.caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    return result.data if result else None


def list_for_elder(elder_id: str) -> list[dict]:
    """Return all check-ins for the given elder, newest first."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .select("*")
        .eq("elder_id", elder_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


def create_immediate(elder_id: str) -> dict:
    """
    Create an ad-hoc check-in with status = 'initiated'.

    Used as a fallback when no scheduled check-in exists but the
    caregiver wants to start one immediately.

    Raises RuntimeError if the insert fails.
    """
    supabase = get_supabase_client()
    now = datetime.now(timezone.utc)

    payload = {
        "id": str(uuid.uuid4()),
        "elder_id": elder_id,
        "scheduled_for": now.isoformat(),
        "status": "initiated",
    }

    result = (
        supabase
        .table("check_ins")
        .insert(payload)
        .execute()
    )

    if not result or not result.data:
        raise RuntimeError("Failed to create check-in")

    return result.data[0]


def create_scheduled(elder_id: str, scheduled_for_iso: str) -> dict | None:
    """
    Insert a new scheduled check-in at the given UTC timestamp.

    Returns None if the insert produced no data (should not happen
    under normal conditions but is treated safely).
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .insert({
            "elder_id": elder_id,
            "scheduled_for": scheduled_for_iso,
            "status": "scheduled",
            "notes": "Automatically created from weekly schedule.",
        })
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None


def update_status(check_in_id: str, status: str) -> dict | None:
    """Update the status field of a check-in row."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .update({
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", check_in_id)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None


def find_in_window(
    elder_id: str,
    window_start_iso: str,
    window_end_iso: str,
) -> dict | None:
    """
    Return an existing check-in that falls within the given UTC
    timestamp window, or None.  Used for duplicate detection.
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("check_ins")
        .select("*")
        .eq("elder_id", elder_id)
        .gte("scheduled_for", window_start_iso)
        .lt("scheduled_for", window_end_iso)
        .limit(1)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None


def get_upcoming(elder_id: str, limit: int = 5) -> list[dict]:
    """Return the next N upcoming scheduled check-ins for an elder."""
    supabase = get_supabase_client()
    now_utc = datetime.now(timezone.utc).isoformat()

    result = (
        supabase
        .table("check_ins")
        .select("*")
        .eq("elder_id", elder_id)
        .eq("status", "scheduled")
        .gte("scheduled_for", now_utc)
        .order("scheduled_for", desc=False)
        .limit(limit)
        .execute()
    )

    return result.data or []
