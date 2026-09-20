from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_supabase_jwt
from app.services.supabase_client import get_supabase_client


router = APIRouter(
    prefix="/v1/alerts",
    tags=["alerts"],
)


def _sync_trajectory_alerts(caregiver_id: str, supabase: Any) -> None:
    """
    Check longitudinal trajectory status for all elders belonging to caregiver.
    If an elder has a notable shift from personal baseline (e.g. 'change_detected'),
    ensure an alert notification is created in the alerts store if not already present.
    """
    try:
        from app.core.config import get_settings
        settings = get_settings()
        if settings.LOCAL_DEV_MODE:
            elders_res = supabase.table("elders").select("id, display_name, caregiver_id").execute()
        else:
            elders_res = (
                supabase
                .table("elders")
                .select("id, display_name, caregiver_id")
                .eq("caregiver_id", caregiver_id)
                .execute()
            )
        elders = elders_res.data or []

        existing_alerts_res = (
            supabase
            .table("alerts")
            .select("*")
            .execute()
        )
        existing_alerts = existing_alerts_res.data or []
        existing_checkin_ids = {a.get("checkin_id") for a in existing_alerts if a.get("checkin_id")}

        for elder in elders:
            elder_id = elder["id"]
            elder_name = elder.get("display_name", "Family Member")
            elder_caregiver = elder.get("caregiver_id") or caregiver_id

            # Check trajectory
            from app.routers.trajectory import get_trajectory_history
            dummy_user = {"id": elder_caregiver}
            try:
                history = get_trajectory_history(elder_id=elder_id, current_user=dummy_user)
            except Exception:
                continue

            observations = history.get("observations") or []
            if not observations:
                continue

            latest_obs = observations[-1]
            recording_id = latest_obs.get("call_recording_id")
            overall_status = history.get("status", "")
            caregiver_summary = history.get("caregiver_summary") or {}

            # Generate alert if status is change_detected or notable shifts exist
            has_shift = (
                overall_status == "change_detected"
                or overall_status == "consecutive_deviations"
                or any(
                    comp.get("trend_direction") in ("higher", "lower")
                    for comp in (latest_obs.get("biomarker_comparisons") or {}).values()
                )
            )

            if has_shift and recording_id and recording_id not in existing_checkin_ids:
                longitudinal_msg = caregiver_summary.get("longitudinal_direction") or (
                    "Recent sessions show acoustic variations compared with established personal baseline."
                )

                new_alert = {
                    "id": str(uuid.uuid4()),
                    "elder_id": elder_id,
                    "elder_name": elder_name,
                    "severity": "amber",
                    "message": f"Speech pattern shift noted for {elder_name}",
                    "detail": longitudinal_msg,
                    "created_at": latest_obs.get("recorded_at") or datetime.now(timezone.utc).isoformat(),
                    "resolved": False,
                    "checkin_id": recording_id,
                }
                supabase.table("alerts").insert(new_alert).execute()
                existing_checkin_ids.add(recording_id)

    except Exception as exc:
        import logging
        logging.getLogger("kahaani.alerts").warning(f"Error syncing trajectory alerts: {exc}")


def _sync_scheduled_session_alerts(caregiver_id: str, supabase: Any) -> None:
    """
    Ensure alerts/notifications exist for any scheduled or in-progress check-ins
    for elders belonging to the caregiver.
    """
    try:
        from app.core.config import get_settings
        settings = get_settings()
        if settings.LOCAL_DEV_MODE:
            elders_res = supabase.table("elders").select("id, display_name, caregiver_id").execute()
        else:
            elders_res = (
                supabase
                .table("elders")
                .select("id, display_name, caregiver_id")
                .eq("caregiver_id", caregiver_id)
                .execute()
            )
        elders = elders_res.data or []
        elder_map = {e["id"]: e.get("display_name", "Family Member") for e in elders}

        existing_alerts_res = (
            supabase
            .table("alerts")
            .select("*")
            .execute()
        )
        existing_alerts = existing_alerts_res.data or []
        existing_checkin_ids = {a.get("checkin_id") for a in existing_alerts if a.get("checkin_id")}

        # Check check_ins table
        checkins_res = (
            supabase
            .table("check_ins")
            .select("*")
            .execute()
        )
        all_checkins = checkins_res.data or []

        for checkin in all_checkins:
            elder_id = checkin.get("elder_id")
            if elder_id not in elder_map:
                continue

            status = (checkin.get("status") or "").lower()
            checkin_id = checkin.get("id")

            # Check if this check-in is scheduled or initiated
            if status in ("scheduled", "initiated") and checkin_id not in existing_checkin_ids:
                elder_name = elder_map[elder_id]
                scheduled_for = checkin.get("scheduled_for") or checkin.get("created_at") or datetime.now(timezone.utc).isoformat()

                try:
                    dt = datetime.fromisoformat(str(scheduled_for).replace("Z", "+00:00"))
                    date_str = dt.strftime("%d %b %Y at %I:%M %p")
                except Exception:
                    date_str = str(scheduled_for)

                new_alert = {
                    "id": str(uuid.uuid4()),
                    "elder_id": elder_id,
                    "elder_name": elder_name,
                    "severity": "amber",
                    "message": f"Weekly check-in scheduled for {elder_name}",
                    "detail": f"A voice session is scheduled for {date_str}. Please ensure {elder_name} is available for the check-in.",
                    "created_at": checkin.get("created_at") or datetime.now(timezone.utc).isoformat(),
                    "resolved": False,
                    "checkin_id": checkin_id,
                }
                supabase.table("alerts").insert(new_alert).execute()
                existing_checkin_ids.add(checkin_id)

    except Exception as exc:
        import logging
        logging.getLogger("kahaani.alerts").warning(f"Error syncing scheduled session alerts: {exc}")


@router.get("")
def list_alerts(
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Retrieve all observational alerts and notifications for the caregiver.
    """
    from app.core.config import get_settings
    settings = get_settings()
    supabase = get_supabase_client()
    caregiver_id = current_user["id"]

    # Sync trajectory alerts and scheduled session notifications
    _sync_trajectory_alerts(caregiver_id, supabase)
    _sync_scheduled_session_alerts(caregiver_id, supabase)

    # Fetch alerts
    alerts_res = (
        supabase
        .table("alerts")
        .select("*")
        .execute()
    )
    all_alerts = alerts_res.data or []

    if settings.LOCAL_DEV_MODE:
        caregiver_alerts = all_alerts
    else:
        elders_res = (
            supabase
            .table("elders")
            .select("id")
            .eq("caregiver_id", caregiver_id)
            .execute()
        )
        elder_ids = {e["id"] for e in (elders_res.data or [])}
        caregiver_alerts = [
            a for a in all_alerts
            if a.get("elder_id") in elder_ids or not elder_ids
        ]

    # Sort descending by created_at
    caregiver_alerts.sort(
        key=lambda x: str(x.get("created_at", "")),
        reverse=True,
    )

    unread_count = sum(1 for a in caregiver_alerts if not a.get("resolved", False))

    return {
        "alerts": caregiver_alerts,
        "unread_count": unread_count,
    }


@router.patch("/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    current_user: dict = Depends(verify_supabase_jwt),
):
    """
    Mark an observational alert as resolved / reviewed.
    """
    supabase = get_supabase_client()

    update_res = (
        supabase
        .table("alerts")
        .update({"resolved": True})
        .eq("id", alert_id)
        .execute()
    )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return {
        "success": True,
        "alert": update_res.data[0] if isinstance(update_res.data, list) else update_res.data,
    }
