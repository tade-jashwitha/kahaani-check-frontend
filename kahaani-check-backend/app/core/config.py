from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------------------------------------------------------
    # Supabase
    # ---------------------------------------------------------

    SUPABASE_URL: str = "http://localhost:54321"
    SUPABASE_SECRET_KEY: str = "local-dev-secret-key"
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    AUDIO_STORAGE_BUCKET: str = "recordings"    
    
    # ---------------------------------------------------------
    # Local Development & Speech processing
    # ---------------------------------------------------------

    LOCAL_DEV_MODE: bool = True
    WHISPER_MODEL_SIZE: str = "tiny"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    WHISPER_LANGUAGE: str = "hi"

    BHASHINI_API_KEY: str | None = None

    # ---------------------------------------------------------
    # Pydantic settings
    # ---------------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.SUPABASE_SERVICE_ROLE_KEY and s.SUPABASE_SECRET_KEY == "local-dev-secret-key":
        s.SUPABASE_SECRET_KEY = s.SUPABASE_SERVICE_ROLE_KEY
    return s