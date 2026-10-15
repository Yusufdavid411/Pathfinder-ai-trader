from datetime import datetime, timezone

from pydantic import BaseModel, EmailStr, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserProfile(BaseModel):
    uid: str
    email: EmailStr | None = None
    display_name: str | None = None
    photo_url: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class UserProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    photo_url: str | None = Field(default=None, max_length=2048)
