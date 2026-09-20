from __future__ import annotations

from app.services.supabase_client import get_supabase_client


# ============================================================
# Elder Repository
# ============================================================
# All database access for the `elders` table lives here.
# No business logic — only data reads and writes.
# ============================================================


def list_by_caregiver(caregiver_id: str) -> list[dict]:
    """Return all elders belonging to the given caregiver, newest first."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("elders")
        .select("*")
        .eq("caregiver_id", caregiver_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


def get_by_id(elder_id: str, caregiver_id: str) -> dict | None:
    """
    Return a single elder by ID.

    Returns None if the elder does not exist or does not belong
    to the given caregiver (ownership enforced at data layer).
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("elders")
        .select("*")
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .maybe_single()
        .execute()
    )

    return result.data if result else None


def create(caregiver_id: str, fields: dict) -> dict | None:
    """
    Insert a new elder row and return the created record.

    `fields` must contain at minimum: display_name, phone_e164,
    preferred_call_language.  Optional: dob_year_range, timezone.
    """
    supabase = get_supabase_client()

    payload = {"caregiver_id": caregiver_id, **fields}

    result = (
        supabase
        .table("elders")
        .insert(payload)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None


def update(elder_id: str, caregiver_id: str, fields: dict) -> dict | None:
    """
    Patch an existing elder row.

    Ownership check is applied at the DB query level.
    Returns None if the elder was not found or not updated.
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("elders")
        .update(fields)
        .eq("id", elder_id)
        .eq("caregiver_id", caregiver_id)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None
