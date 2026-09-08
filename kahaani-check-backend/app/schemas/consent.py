from enum import Enum

from pydantic import BaseModel


# =========================================================
# Consent enums
# =========================================================


class ConsentType(str, Enum):
    WEEKLY_VOICE_CHECKIN = "weekly_voice_checkin"


class ConsentStatus(str, Enum):
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"


class ConsentCapturedVia(str, Enum):
    IVR_DTMF = "ivr_dtmf"
    IVR_VERBAL = "ivr_verbal"
    CAREGIVER_RECORDED = "caregiver_recorded"


# =========================================================
# Create consent
# =========================================================


class ConsentCreate(BaseModel):
    """
    Request body for recording explicit elder consent.
    """

    consent_type: ConsentType = (
        ConsentType.WEEKLY_VOICE_CHECKIN
    )

    status: ConsentStatus

    captured_via: ConsentCapturedVia = (
        ConsentCapturedVia.IVR_DTMF
    )


# =========================================================
# Consent response
# =========================================================


class ConsentResponse(BaseModel):
    id: str

    elder_id: str

    consent_type: ConsentType

    status: ConsentStatus

    captured_via: ConsentCapturedVia

    captured_at: str

    expires_at: str | None = None