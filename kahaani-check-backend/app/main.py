import asyncio
import logging
import os
import sys

# Ensure UTF-8 output on Windows consoles/subprocesses to prevent charmap encoding errors
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

from app.routers.elders import router as elders_router
from app.routers.consent import router as consent_router
from app.routers.calls import router as calls_router
from app.routers.trajectory import router as trajectory_router
from app.routers.checkins import router as checkins_router
from app.routers.schedules import router as schedules_router
from app.routers.audio import router as audio_router
from app.routers.alerts import router as alerts_router

from app.workers import schedule_worker


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kahaani")

settings = get_settings()

_scheduler_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Start and stop Kahaani-Check background workers
    together with the FastAPI application.
    """
    global _scheduler_task

    logger.info("Starting Kahaani-Check API...")

    _scheduler_task = asyncio.create_task(
        schedule_worker.scheduler_loop(),
        name="kahaani-scheduler",
    )

    logger.info("Background scheduler started.")

    yield

    logger.info("Stopping Kahaani-Check API...")

    if _scheduler_task:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass

    logger.info("Background scheduler stopped.")


app = FastAPI(
    title="Kahaani-Check API",
    version="0.1.0",
    lifespan=lifespan,
)


cors_origins_raw = os.getenv("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=custom_origins or ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict:
    """
    Health check endpoint.

    Includes scheduler status for observability.
    """
    scheduler_last_run = (
        schedule_worker.last_run_at.isoformat()
        if schedule_worker.last_run_at
        else None
    )

    return {
        "status": "ok",
        "scheduler": {
            "last_run_at": scheduler_last_run,
            "last_run_status": schedule_worker.last_run_status,
        },
    }


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Kahaani-Check API",
        "version": "0.1.0",
        "status": "running",
    }


app.include_router(elders_router)
app.include_router(consent_router)
app.include_router(calls_router)
app.include_router(trajectory_router)
app.include_router(schedules_router)
app.include_router(audio_router)
app.include_router(checkins_router)
app.include_router(alerts_router)