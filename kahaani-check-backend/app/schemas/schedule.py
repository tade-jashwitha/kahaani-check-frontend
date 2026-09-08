from datetime import time
from pydantic import BaseModel, Field


class WeeklyScheduleCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    preferred_time: time
    timezone: str = "Asia/Kolkata"
    enabled: bool = True


class WeeklyScheduleResponse(BaseModel):
    id: str
    elder_id: str
    day_of_week: int
    preferred_time: time
    timezone: str
    enabled: bool
    created_at: str
    updated_at: str