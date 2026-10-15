from datetime import datetime, timezone
from typing import Protocol

from models.auth import AuthenticatedUser
from models.user_profile import UserProfile, UserProfileUpdate


class UserProfileRepository(Protocol):
    def get_or_create(self, authenticated_user: AuthenticatedUser) -> UserProfile:
        """Load a user profile or create one from trusted auth claims."""

    def update(
        self, authenticated_user: AuthenticatedUser, update: UserProfileUpdate
    ) -> UserProfile:
        """Update mutable profile fields for the authenticated user."""


class InMemoryUserProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, UserProfile] = {}

    def get_or_create(self, authenticated_user: AuthenticatedUser) -> UserProfile:
        existing = self._profiles.get(authenticated_user.uid)
        if existing is not None:
            return existing

        profile = UserProfile(
            uid=authenticated_user.uid,
            email=authenticated_user.email,
            display_name=authenticated_user.display_name,
            photo_url=authenticated_user.photo_url,
        )
        self._profiles[authenticated_user.uid] = profile
        return profile

    def update(
        self, authenticated_user: AuthenticatedUser, update: UserProfileUpdate
    ) -> UserProfile:
        profile = self.get_or_create(authenticated_user)
        changed = profile.model_copy(
            update={
                "display_name": update.display_name,
                "photo_url": update.photo_url,
                "updated_at": datetime.now(timezone.utc),
            }
        )
        self._profiles[authenticated_user.uid] = changed
        return changed


class FirestoreUserProfileRepository:
    collection_name = "users"

    def __init__(self) -> None:
        import firebase_admin
        from firebase_admin import firestore

        if not firebase_admin._apps:
            firebase_admin.initialize_app()

        self._client = firestore.client()

    def get_or_create(self, authenticated_user: AuthenticatedUser) -> UserProfile:
        document = self._client.collection(self.collection_name).document(
            authenticated_user.uid
        )
        snapshot = document.get()

        if snapshot.exists:
            return UserProfile.model_validate(snapshot.to_dict())

        profile = UserProfile(
            uid=authenticated_user.uid,
            email=authenticated_user.email,
            display_name=authenticated_user.display_name,
            photo_url=authenticated_user.photo_url,
        )
        document.set(profile.model_dump(mode="json"))
        return profile

    def update(
        self, authenticated_user: AuthenticatedUser, update: UserProfileUpdate
    ) -> UserProfile:
        existing = self.get_or_create(authenticated_user)
        updated = existing.model_copy(
            update={
                "display_name": update.display_name,
                "photo_url": update.photo_url,
                "updated_at": datetime.now(timezone.utc),
            }
        )
        self._client.collection(self.collection_name).document(
            authenticated_user.uid
        ).set(updated.model_dump(mode="json"), merge=True)
        return updated
