from typing import Annotated

from fastapi import APIRouter, Depends

from dependencies import get_current_user, get_user_profile_repository
from models.auth import AuthenticatedUser
from models.user_profile import UserProfile, UserProfileUpdate
from repositories.user_profiles import UserProfileRepository

router = APIRouter(prefix="/v1/me", tags=["profile"])


@router.get("", response_model=UserProfile)
def get_my_profile(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    profiles: Annotated[
        UserProfileRepository, Depends(get_user_profile_repository)
    ],
) -> UserProfile:
    return profiles.get_or_create(current_user)


@router.patch("", response_model=UserProfile)
def update_my_profile(
    update: UserProfileUpdate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    profiles: Annotated[
        UserProfileRepository, Depends(get_user_profile_repository)
    ],
) -> UserProfile:
    return profiles.update(current_user, update)
