from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.repositories import schedule_repo
from app.services.schedule_service import create_next_check_in


# ============================================================
# Schedule Worker
# ============================================================
# Scans all enabled weekly schedules and ensures each elder
# has their next weekly check-in created.
#
# Duplicate protection is handled by checkin_repo.find_in_window
# and the database unique index — running the scan multiple
# times is safe.
# ============================================================

logger = logging.getLogger("kahaani.scheduler")

# How often the scheduler runs (seconds).
SCAN_INTERVAL_SECONDS = 300  # 5 minutes

# Maximum consecutive failures before the worker backs off.
MAX_CONSECUTIVE_FAILURES = 5
BACKOFF_MULTIPLIER = 2.0
MAX_BACKOFF_SECONDS = 3600  # 1 hour cap

# Exposed for health-check reporting.
last_run_at: datetime | None = None
last_run_status: str = "not_started"


async def run_once() -> None:
    """
    Perform a single scheduler scan.

    Iterates all enabled weekly schedules and creates any
    missing upcoming check-ins.
    """
    global last_run_at, last_run_status

    schedules = schedule_repo.list_enabled()

    logger.info(
        "Scheduler scan started: %d enabled schedule(s)",
        len(schedules),
    )

    successes = 0
    failures = 0

    for schedule in schedules:
        elder_id = schedule["elder_id"]

        try:
            result = create_next_check_in(elder_id)

            if result["created"]:
                logger.info(
                    "Created check-in for elder %s → %s",
                    elder_id,
                    result["check_in"]["id"],
                )
            else:
                logger.debug(
                    "Check-in already exists for elder %s → %s",
                    elder_id,
                    result["check_in"]["id"],
                )

            successes += 1

        except Exception:
            logger.exception("Scheduler failed for elder %s", elder_id)
            failures += 1

    last_run_at = datetime.now(timezone.utc)
    last_run_status = f"ok ({successes} succeeded, {failures} failed)"

    logger.info(
        "Scheduler scan completed: %d succeeded, %d failed",
        successes,
        failures,
    )


async def scheduler_loop() -> None:
    """
    Background scheduler loop.

    Runs `run_once()` every SCAN_INTERVAL_SECONDS.
    On repeated consecutive failures, backs off exponentially
    up to MAX_BACKOFF_SECONDS to avoid log spam and resource waste.
    """
    global last_run_status

    logger.info("Kahaani-Check scheduler started.")

    consecutive_failures = 0
    current_interval = SCAN_INTERVAL_SECONDS

    while True:
        try:
            await run_once()
            # Reset backoff on any successful scan.
            consecutive_failures = 0
            current_interval = SCAN_INTERVAL_SECONDS

        except Exception:
            consecutive_failures += 1
            logger.exception(
                "Unexpected scheduler error (consecutive failure #%d).",
                consecutive_failures,
            )
            last_run_status = f"error (consecutive failures: {consecutive_failures})"

            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                current_interval = min(
                    SCAN_INTERVAL_SECONDS * (BACKOFF_MULTIPLIER ** consecutive_failures),
                    MAX_BACKOFF_SECONDS,
                )
                logger.warning(
                    "Scheduler backing off — next scan in %.0f seconds.",
                    current_interval,
                )

        await asyncio.sleep(current_interval)
