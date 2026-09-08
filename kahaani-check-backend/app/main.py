import asyncio
import logging

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

from app.services.scheduler_worker import scheduler_loop

from app.routers.audio import router as audio_router
logging.basicConfig(
    level=logging.INFO,
)

logger = logging.getLogger("kahaani")


settings = get_settings()


scheduler_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Start and stop the Kahaani-Check background scheduler
    together with the FastAPI application.
    """

    global scheduler_task

    logger.info("Starting Kahaani-Check API...")

    scheduler_task = asyncio.create_task(
        scheduler_loop()
    )

    logger.info("Background scheduler started.")

    yield

    logger.info("Stopping Kahaani-Check API...")

    if scheduler_task:
        scheduler_task.cancel()

        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass

    logger.info("Background scheduler stopped.")


app = FastAPI(
    title="Kahaani-Check API",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {
        "status": "ok"
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