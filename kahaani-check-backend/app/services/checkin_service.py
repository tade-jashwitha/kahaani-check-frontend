from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.services.supabase_client import get_supabase_client


ACTIVE_STATUSES = ["scheduled", "initiated"]


def get_or_create_current_checkin(
    elder_id: str,
) -> dict:
    """
    Get the current active check-in.

    Active check-ins are:
    - scheduled
    - initiated

    Completed and technical_failure check-ins are historical.
    """

    supabase = get_supabase_client()

    # --------------------------------------------------------
    # 1. Look for an existing active check-in
    # --------------------------------------------------------

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
        checkin = result.data[0]

        # ----------------------------------------------------
        # 2. A scheduled check-in becomes initiated when
        #    the caregiver/elder opens it.
        # ----------------------------------------------------

        if checkin["status"] == "scheduled":
            updated = (
                supabase
                .table("check_ins")
                .update({
                    "status": "initiated",
                    "updated_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                })
                .eq("id", checkin["id"])
                .execute()
            )

            if updated and updated.data:
                return updated.data[0]

        return checkin

    # --------------------------------------------------------
    # 3. No active check-in exists.
    #
    # This fallback is useful for prototype/manual testing.
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    checkin_id = str(uuid.uuid4())

    insert_data = {
        "id": checkin_id,
        "elder_id": elder_id,
        "scheduled_for": now.isoformat(),
        "status": "initiated",
    }

    created = (
        supabase
        .table("check_ins")
        .insert(insert_data)
        .execute()
    )

    if not created or not created.data:
        raise RuntimeError(
            "Failed to create check-in"
        )

    return created.data[0]