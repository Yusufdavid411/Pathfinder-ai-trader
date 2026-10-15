from pydantic import BaseModel, EmailStr


class AuthenticatedUser(BaseModel):
    uid: str
    email: EmailStr | None = None
    display_name: str | None = None
    photo_url: str | None = None
