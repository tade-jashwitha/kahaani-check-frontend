import logging
from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.services.local_dev_store import get_local_dev_client

logger = logging.getLogger("kahaani.supabase_client")


@lru_cache
def get_supabase_client() -> Any:
    """
    Create and cache the server-side Supabase client.

    When LOCAL_DEV_MODE is enabled (or Supabase credentials are placeholder values),
    this returns an in-memory/local dev store that mimics Supabase's Python client.
    """
    settings = get_settings()

    is_placeholder = (
        "localhost" in settings.SUPABASE_URL
        or "127.0.0.1" in settings.SUPABASE_URL
        or "example.com" in settings.SUPABASE_URL
        or settings.SUPABASE_SECRET_KEY == "local-dev-secret-key"
    )

    if settings.LOCAL_DEV_MODE or is_placeholder:
        logger.info("Using LocalDevStore for database and storage (LOCAL_DEV_MODE active).")
        return get_local_dev_client()

    try:
        from supabase import create_client
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
        )
    except Exception as exc:
        logger.warning(
            "Failed to initialize remote Supabase client (%s). Falling back to LocalDevStore.",
            exc,
        )
        return get_local_dev_client()