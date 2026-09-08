import asyncio
import logging

from app.services.supabase_client import get_supabase_client
from app.services.schedule_service import create_next_check_in


logger = logging.getLogger("kahaani.scheduler")


async def run_scheduler_once():
    """
    Scan all enabled weekly schedules and make sure each elder
    has their next weekly check-in created.

    Duplicate protection is handled by the schedule service
    and the database unique index.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("weekly_schedules")
        .select("elder_id")
        .eq("enabled", True)
        .execute()
    )

    schedules = result.data or []

    logger.info(
        "Scheduler scan started: %d enabled schedules",
        len(schedules),
    )

    for schedule in schedules:
        elder_id = schedule["elder_id"]

        try:
            result = create_next_check_in(elder_id)

            if result["created"]:
                logger.info(
                    "Created check-in for elder %s: %s",
                    elder_id,
                    result["check_in"]["id"],
                )
            else:
                logger.info(
                    "Check-in already exists for elder %s: %s",
                    elder_id,
                    result["check_in"]["id"],
                )

        except Exception:
            logger.exception(
                "Scheduler failed for elder %s",
                elder_id,
            )

    logger.info("Scheduler scan completed.")


async def scheduler_loop():
    """
    Production background scheduler.

    Runs once every 5 minutes.
    """

    logger.info("Kahaani-Check scheduler started.")

    while True:
        try:
            await run_scheduler_once()

        except Exception:
            logger.exception(
                "Unexpected scheduler error."
            )

        # Run again after 5 minutes.
        await asyncio.sleep(300)