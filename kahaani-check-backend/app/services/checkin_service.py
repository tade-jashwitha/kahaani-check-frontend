from __future__ import annotations

from datetime import datetime, timezone

from app.repositories import checkin_repo


# ============================================================
# Check-in Service
# ============================================================
# Business logic for retrieving and starting check-ins.
# All Supabase access is delegated to checkin_repo.
# ============================================================


def get_or_create_current_checkin(elder_id: str) -> dict:
    """
    Get the current active check-in for an elder.

    Active check-ins are those with status 'scheduled' or 'initiated'.

    - If a 'scheduled' check-in exists, it is transitioned to 'initiated'
      (the caregiver/elder has opened it).
    - If no active check-in exists, a new one is created immediately
      (useful for ad-hoc and prototype use cases).

    Raises RuntimeError if a new check-in cannot be created.
    """
    checkin = checkin_repo.get_active_for_elder(elder_id)

    if checkin:
        # Transition from 'scheduled' → 'initiated' on open.
        if checkin["status"] == "scheduled":
            updated = checkin_repo.update_status(checkin["id"], "initiated")
            if updated:
                return updated

        return checkin

    # No active check-in found — create one on the spot.
    return checkin_repo.create_immediate(elder_id)