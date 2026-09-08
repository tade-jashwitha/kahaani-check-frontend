from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class CheckInStatus(str, Enum):
    SCHEDULED = "scheduled"
    INITIATED = "initiated"
    COMPLETED = "completed"
    MISSED = "missed"
    POOR_AUDIO = "poor_audio"
    INSUFFICIENT_SPEECH = "insufficient_speech"
    PAUSE_REQUESTED = "pause_requested"
    DISTRESS_CONFUSION = "distress_confusion"
    TECHNICAL_FAILURE = "technical_failure"


class CheckInCreate(BaseModel):
    scheduled_for: datetime


class CheckInStatusUpdate(BaseModel):
    status: CheckInStatus
    notes: str | None = None


class CheckInResponse(BaseModel):
    id: str
    elder_id: str
    scheduled_for: datetime
    status: CheckInStatus
    call_id: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime