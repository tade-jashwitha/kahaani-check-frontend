from __future__ import annotations

from datetime import datetime, timezone

from app.services.supabase_client import get_supabase_client


# ============================================================
# Consent Repository
# ============================================================
# All database access for the `consents` and `elder_consents`
# tables lives here.
# No business logic — no expiry logic, no status validation.
# ============================================================

CONSENT_TYPE_WEEKLY = "weekly_voice_checkin"
CONFIRMED_STATUS = "confirmed"


def get_latest_for_elder(
    elder_id: str,
    consent_type: str = CONSENT_TYPE_WEEKLY,
) -> dict | None:
    """
    Return the most recently captured consent record for the elder.

    Falls back to the `elder_consents` table if the primary
    `consents` table returns nothing (legacy table support).
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("consents")
        .select("id, status, captured_at, expires_at")
        .eq("elder_id", elder_id)
        .eq("consent_type", consent_type)
        .order("captured_at", desc=True)
        .limit(1)
        .execute()
    )

    if result and result.data:
        return result.data[0]

    # Legacy fallback
    fallback = (
        supabase
        .table("elder_consents")
        .select("*")
        .eq("elder_id", elder_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if fallback and fallback.data:
        return fallback.data[0]

    return None


def create_confirmed(
    elder_id: str,
    consent_type: str = CONSENT_TYPE_WEEKLY,
    captured_via: str = "caregiver_portal",
) -> dict | None:
    """
    Insert a confirmed consent record for the elder.

    Returns None silently if the insert produces no data
    (non-critical — consent creation is best-effort on elder
    registration).
    """
    supabase = get_supabase_client()

    result = (
        supabase
        .table("consents")
        .insert({
            "elder_id": elder_id,
            "consent_type": consent_type,
            "status": CONFIRMED_STATUS,
            "captured_via": captured_via,
        })
        .execute()
    )

    if result and result.data:
        return result.data[0]

    return None
