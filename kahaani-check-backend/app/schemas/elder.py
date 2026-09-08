from pydantic import BaseModel, ConfigDict, Field


class ElderCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=200)
    phone_e164: str = Field(min_length=8, max_length=20)
    preferred_call_language: str = Field(default="hi", min_length=2, max_length=20)
    dob_year_range: str | None = Field(default=None, max_length=20)
    timezone: str = Field(default="Asia/Kolkata", max_length=100)


class ElderResponse(BaseModel):
    id: str
    caregiver_id: str
    display_name: str
    phone_e164: str
    preferred_call_language: str
    dob_year_range: str | None
    timezone: str
    status: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)