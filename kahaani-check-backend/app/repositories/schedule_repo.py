from __future__ import annotations

from app.services.supabase_client import get_supabase_client


# ============================================================
# Schedule Repository
# ============================================================
# All database access for the `weekly_schedules` table lives here.
# No business logic — no timezone calculations, no consent checks.
# ============================================================


def get_for_elder(elder_id: str) -> dict | None:
    """Return the weekly schedule for a given elder, or None."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("weekly_schedules")
        .select("*")
        .eq("elder_id", elder_id)
        .maybe_single()
        .execute()
    )

    return result.data if result else None


def list_enabled() -> list[dict]:
    """Return all enabled weekly schedules (used by the background scheduler)."""
    supabase = get_supabase_client()

    result = (
        supabase
        .table("weekly_schedules")
        .select("elder_id")
        .eq("enabled", True)
        .execute()
    )

    return result.data or []
